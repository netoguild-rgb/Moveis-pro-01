/**
 * AI Suggest Response Function - Moveis.pro CRM
 * 
 * Gera sugestões de resposta para o vendedor usando Google Gemini 1.5 Flash.
 * Analisa o histórico da conversa para sugerir 3 opções contextualizadas.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

Deno.serve(async (req) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    try {
        const { conversation_id } = await req.json()

        if (!conversation_id) {
            return new Response('Missing conversation_id', { status: 400, headers: corsHeaders })
        }

        if (!geminiApiKey || geminiApiKey === 'sua_chave_gemini_aqui') {
            // Fallback se não tiver chave configurada para não quebrar a demo
            console.warn('GEMINI_API_KEY not configured, using mock')
            return new Response(JSON.stringify({
                suggestions: [
                    "Olá! Vi seu interesse em nossos móveis. Como posso ajudar?",
                    "Gostaria de agendar uma visita ao nosso showroom?",
                    "Temos ótimas condições de pagamento nesta semana."
                ],
                warning: "Using mock data. Configure GEMINI_API_KEY."
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 1. Fetch conversation history
        const { data: messages, error } = await supabase
            .from('messages')
            .select('content, direction, created_at')
            .eq('conversation_id', conversation_id)
            .order('created_at', { ascending: true })
            .limit(20)

        if (error) throw error

        // 2. Construct context for AI
        const history = messages.map(m =>
            `${m.direction === 'inbound' ? 'Cliente' : 'Vendedor'}: ${m.content}`
        ).join('\n')

        // 3. Call Gemini AI
        console.log('Generating suggestions with Gemini...')
        const genAI = new GoogleGenerativeAI(geminiApiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        const prompt = `Você é um assistente de vendas experiente de uma loja de móveis de alto padrão (Confort Maison).
    Baseado no histórico da conversa abaixo, sugira 3 opções de resposta curtas, profissionais e persuasivas para o vendedor enviar ao cliente.
    
    As opções devem variar em tom:
    1. Uma pergunta engajadora
    2. Uma oferta de ajuda direta
    3. Um convite para ação (visita ou ligação)

    Histórico da Conversa:
    ${history || '(Início da conversa)'}
    
    Responda APENAS com as 3 sugestões, uma por linha, sem numeração ou texto adicional.`;

        const result = await model.generateContent(prompt)
        const responseText = await result.response.text()

        // Processar resposta em array
        const suggestions = responseText
            .split('\n')
            .map(s => s.trim().replace(/^[\d-]\.\s*/, '').replace(/^"|"$/g, ''))
            .filter(s => s.length > 0)
            .slice(0, 3)

        return new Response(JSON.stringify({ suggestions }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (err) {
        console.error(err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
    }
})
