import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt da Ana (Consultora)
const SYSTEM_PROMPT = `
Você é a Ana, Consultora da Confort Maison, especialista em Salas de Estar e Jantar.
Seu objetivo é acolher o cliente, entender o estilo dele e preparar o terreno para o vendedor técnico.
NUNCA diga que é uma IA. Aja com naturalidade, empatia e sofisticação. Use emojis moderados (🛋️, ✨).

REGRAS DE TRIAGEM:
1. Identifique: Produto desejado, Estilo e Urgência.
2. Se o cliente perguntar preço exato, prazo de fábrica ou pedir desconto: Diga "Vou confirmar esse detalhe com nosso especialista e já te retorno" e use a tag [ACTION: HANDOVER].
3. Se o cliente pedir para falar com humano ou estiver irritado: use tag [ACTION: HANDOVER].
4. Se ainda estiver entendendo o cliente: termine com [ACTION: CONTINUE].

IMPORTANTE: Responda APENAS o texto da mensagem seguido da tag.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { event, data } = await req.json();

    // --- 1. Validação Básica ---
    if (event !== 'messages.upsert') {
      return new Response(JSON.stringify({ message: 'Ignored event' }), { headers: corsHeaders });
    }

    const messageData = data.data || data;
    const remoteJid = messageData.key?.remoteJid;
    const incomingText = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text;
    const pushName = messageData.pushName || "Cliente";

    if (!remoteJid || !incomingText || remoteJid.includes('@g.us')) {
      return new Response(JSON.stringify({ message: 'Ignored message type' }), { headers: corsHeaders });
    }

    const phone = remoteJid.split('@')[0];

    // --- 2. Setup ---
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Inicialização do SDK do Google
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

    // Usar gemini-2.5-flash (mais recente disponível)
    const genAI = new GoogleGenerativeAI(apiKey);

    // --- 3. Gestão da Conversa no Supabase ---
    let { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone', phone)
      .single();

    if (!conversation) {
      // Buscar um admin padrão se não houver user específico
      const adminId = Deno.env.get('DEFAULT_ADMIN_USER_ID') ||
        (await supabase.from('profiles').select('id').limit(1).single()).data?.id;

      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          phone: phone,
          name: pushName,
          status: 'open',
          user_id: adminId
        })
        .select()
        .single();

      if (createError) throw createError;
      conversation = newConv;
    }

    // Salvar Inbound
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      user_id: conversation.user_id, // Obrigatório para consistência
      content: incomingText,
      direction: 'inbound',
      status: 'received'
    });

    if (conversation.status !== 'open') {
      return new Response(JSON.stringify({ message: 'Human handled' }), { headers: corsHeaders });
    }

    // --- 4. Preparar Histórico ---
    const { data: history } = await supabase
      .from('messages')
      .select('content, direction')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Montagem do histórico com System Prompt injetado
    const chatHistory = [
      {
        role: "user",
        parts: [{ text: `INSTRUÇÕES DO SISTEMA:\n${SYSTEM_PROMPT}` }]
      },
      {
        role: "model",
        parts: [{ text: "Entendido. Sou a Ana da Confort Maison. 🛋️✨ Como posso ajudar?" }]
      },
      ...(history || []).reverse().map(msg => ({
        role: msg.direction === 'inbound' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    ];

    // --- 5. Chamada ao Modelo (GEMINI 2.5 FLASH) ---
    const modelName = "gemini-2.5-flash";

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { maxOutputTokens: 300 }
    });

    const chat = model.startChat({ history: chatHistory });

    console.log(`Gerando resposta com modelo: ${modelName}`);
    const result = await chat.sendMessage(incomingText);
    const aiResponse = result.response.text();

    // --- 6. Processar Resposta ---
    let finalMessage = aiResponse;
    let action = 'CONTINUE';

    if (aiResponse.includes('[ACTION: HANDOVER]')) {
      action = 'HANDOVER';
      finalMessage = aiResponse.replace('[ACTION: HANDOVER]', '').trim();
    } else if (aiResponse.includes('[ACTION: CONTINUE]')) {
      finalMessage = aiResponse.replace('[ACTION: CONTINUE]', '').trim();
    }
    finalMessage = finalMessage.replace(/\[ACTION:.*?\]/g, '').trim();

    if (finalMessage) {
      console.log(`[DEBUG] Resposta IA: ${finalMessage}`);

      // Salvar Outbound (Resposta da IA)
      // IMPORTANTE: Adicionado try/catch para garantir que o insert não falhe silenciosamente
      const { error: insertError } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        user_id: conversation.user_id, // CORREÇÃO: user_id é obrigatório
        content: finalMessage,
        direction: 'outbound',
        ai_suggested: true,
        status: 'pending'
      });

      if (insertError) {
        console.error('[ERROR] Falha ao salvar mensagem outbound:', insertError);
      } else {
        console.log('[SUCCESS] Mensagem outbound salva.');
      }

      // Enviar via Evolution API (Fire & Forget com Try/Catch para não travar se offline)
      try {
        const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
        const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
        const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

        if (evolutionUrl && evolutionKey && instanceName) {
          console.log(`[INFO] Tentando enviar para Evolution API: ${evolutionUrl}`);
          const evoRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
            body: JSON.stringify({ number: phone, text: finalMessage })
          });

          if (!evoRes.ok) {
            console.warn(`[WARN] Evolution API retornou erro: ${evoRes.status}`);
          }
        }
      } catch (evoError) {
        console.warn(`[WARN] Evolution API inacessível (Docker/Rede): ${evoError.message}`);
        // Não relançar erro, fluxo seguiu com sucesso no banco
      }
    }

    if (action === 'HANDOVER') {
      await supabase.from('conversations')
        .update({ status: 'waiting' })
        .eq('id', conversation.id);

      // Notificação (sem validação estrita de user_id admin)
      if (conversation.user_id) {
        await supabase.from('notifications').insert({
          user_id: conversation.user_id,
          type: 'new_lead',
          title: '⚠️ Handover: Ana chamou ajuda',
          body: `Cliente ${pushName} transferido.`,
          data: { conversation_id: conversation.id }
        });
      }
    }

    return new Response(JSON.stringify({ success: true, model: modelName, action }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('CRITICAL ERROR:', error);
    return new Response(JSON.stringify({
      error: error.message,
      hint: "Verifique logs do Supabase Functions"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
