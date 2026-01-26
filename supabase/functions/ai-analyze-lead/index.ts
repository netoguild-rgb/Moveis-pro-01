/**
 * AI Analyze Lead Function - Moveis.pro CRM
 * 
 * Analisa o comportamento do lead e calcula score usando Google Gemini 1.5 Flash.
 * Gera insights automáticos para oportunidades quentes.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface AnalysisResult {
    score: 'cold' | 'warm' | 'hot'
    reasoning: string
    action_suggestion: string
}

Deno.serve(async (req) => {
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
        const { lead_id } = await req.json()

        if (!lead_id) {
            return new Response('Missing lead_id', { status: 400, headers: corsHeaders })
        }

        // 1. Fetch Lead Data & Interactions
        const { data: lead, error } = await supabase
            .from('leads')
            .select(`
            *,
            visits (*),
            conversations (
                messages (content, direction, created_at)
            )
        `)
            .eq('id', lead_id)
            .single()

        if (error) throw error

        let analysis: AnalysisResult;

        if (!geminiApiKey || geminiApiKey === 'sua_chave_gemini_aqui') {
            // Mock Fallback
            console.warn('GEMINI_API_KEY not configured, using simple logic')
            const interactionCount = (lead.conversations?.[0]?.messages?.length || 0) + (lead.visits?.length || 0)
            const score = interactionCount > 10 ? 'hot' : (interactionCount > 5 ? 'warm' : 'cold')
            analysis = {
                score,
                reasoning: `Baseado apenas na contagem de ${interactionCount} interações (modo offline).`,
                action_suggestion: score === 'hot' ? 'Ligar imediatamente' : 'Enviar catálogo'
            }
        } else {
            // 2. Prepare Context for AI
            const interactions = lead.conversations?.map((c: any) =>
                c.messages?.map((m: any) => `[${m.created_at}] ${m.direction}: ${m.content}`).join('\n')
            ).join('\n---\n') || 'Sem mensagens trocadas.'

            const visits = lead.visits?.map((v: any) =>
                `[${v.date}] Visita agendada. Status: ${v.event_status}`
            ).join('\n') || 'Sem visitas agendadas.'

            const prompt = `Analise este lead de uma loja de móveis e determine seu potencial de compra (Temperature Score).

DADOS DO LEAD:
Nome: ${lead.name}
Telefone: ${lead.phone}
Interesse: ${lead.notes || 'Não especificado'}

HISTÓRICO DE INTERAÇÕES:
${interactions}

VISITAS/AGENDAMENTOS:
${visits}

Responda EXATAMENTE neste formato JSON:
{
  "score": "cold" | "warm" | "hot",
  "reasoning": "Explicação breve em 1 frase do motivo da pontuação.",
  "action_suggestion": "Uma ação recomendada para o vendedor agora."
}`;

            // 3. Call Gemini
            console.log('Analyzing lead with Gemini...')
            const genAI = new GoogleGenerativeAI(geminiApiKey)
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: "application/json" } })

            const result = await model.generateContent(prompt)
            analysis = JSON.parse(result.response.text())
        }

        // 4. Update Lead Score
        await supabase.from('leads').update({
            score: analysis.score,
            notes: (lead.notes || '') + `\n[IA Analysis ${new Date().toLocaleDateString()}]: ${analysis.reasoning}`
        }).eq('id', lead_id)

        // 5. Generate Insight Record if Hot
        if (analysis.score === 'hot') {
            const { data: userLink } = await supabase.from('leads').select('user_id').eq('id', lead_id).single()
            if (userLink) {
                await supabase.from('ai_insights').insert({
                    user_id: userLink.user_id,
                    type: 'opportunity',
                    title: '🔥 Lead Quente Identificado',
                    description: `${analysis.reasoning}`,
                    action_label: analysis.action_suggestion,
                    action_data: { lead_id: lead_id }
                })
            }
        }

        return new Response(JSON.stringify({ success: true, ...analysis }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })

    } catch (err) {
        console.error(err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
    }
})
