import { createClient } from 'jsr:@supabase/supabase-js@2'

// You would typically use openai or similar SDK
// import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
// const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const { conversation_id } = await req.json()

        if (!conversation_id) {
            return new Response('Missing conversation_id', { status: 400 })
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
            `${m.direction === 'inbound' ? 'Cliente' : 'Agente'}: ${m.content}`
        ).join('\n')

        // 3. Call AI (Mocked for now as we don't have API Key confirmed in env)
        // Replace this with actual OpenAI/Gemini call
        const prompt = `Você é um assistente de vendas experiente de uma loja de móveis.
    Baseado no histórico abaixo, sugira 3 respostas curtas e profissionais para o cliente.
    
    Histórico:
    ${history}
    
    Sugestões:`

        // MOCK RESPONSE
        const suggestions = [
            "Olá! Como posso ajudar você a encontrar o móvel perfeito hoje?",
            "Temos diversas opções de sofás em promoção. Gostaria de ver o catálogo?",
            "Vi que você se interessou pela mesa de jantar. Ela está com entrega grátis!"
        ]

        // In real implementation:
        // const chatCompletion = await openai.chat.completions.create({ ... })
        // const suggestions = ...

        return new Response(JSON.stringify({ suggestions }), {
            headers: { 'Content-Type': 'application/json' },
        })

    } catch (err) {
        console.error(err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
})
