import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const { lead_id } = await req.json()

        if (!lead_id) {
            return new Response('Missing lead_id', { status: 400 })
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

        // 2. Analyze with AI (Mocked)
        // Gather context from interactions
        // const conversationHistory = lead.conversations...

        // Mock Logic: Calculate "temperature" based on interaction count
        let score = 'cold'
        const interactionCount = (lead.conversations?.[0]?.messages?.length || 0) + (lead.visits?.length || 0)

        if (interactionCount > 10) score = 'hot'
        else if (interactionCount > 5) score = 'warm'

        let insights = "Lead com pouca interação."
        if (score === 'hot') insights = "Lead muito engajado. Alta probabilidade de fechamento."

        // 3. Update Lead Score
        await supabase.from('leads').update({
            score: score,
            notes: (lead.notes || '') + `\n[IA]: ${insights}`
        }).eq('id', lead_id)

        // 4. Generate Insight Record
        if (score === 'hot') {
            const { data: userLink } = await supabase.from('leads').select('user_id').eq('id', lead_id).single()
            if (userLink) {
                await supabase.from('ai_insights').insert({
                    user_id: userLink.user_id,
                    type: 'opportunity',
                    title: 'Lead Quente Detectado',
                    description: `O lead ${lead.name} está demonstrando alto engajamento basedo em ${interactionCount} interações.`,
                    action_label: 'Contatar Agora',
                    action_data: { lead_id: lead_id }
                })
            }
        }

        return new Response(JSON.stringify({ success: true, score, insights }), {
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
