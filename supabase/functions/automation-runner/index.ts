import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const { trigger_type, data } = await req.json()

        // 1. Fetch active automations for this trigger type
        // In a real scenario, we'd filter by user_id too
        const { data: automations, error } = await supabase
            .from('automations')
            .select('*')
            .eq('is_active', true)
            .eq('trigger_type', trigger_type)

        if (error) throw error

        const results = []

        for (const automation of automations) {
            // 2. Validate Trigger Config
            // e.g., if trigger is 'lead_score', check if score matches condition in automation.trigger_config

            let match = true
            // Logic to check match...

            if (match) {
                // 3. Execute Action
                if (automation.action_type === 'send_message') {
                    // Call whatsapp-send
                    // await fetch(functionsUrl + 'whatsapp-send', ...)
                    console.log(`Executing automation ${automation.name}: Sending message...`)
                } else if (automation.action_type === 'notify') {
                    // Create notification
                    await supabase.from('notifications').insert({
                        user_id: automation.user_id,
                        type: 'automation',
                        title: 'Automação executada',
                        body: `A automação ${automation.name} foi disparada.`
                    })
                }

                // 4. Log Execution
                await supabase.from('automation_logs').insert({
                    automation_id: automation.id,
                    trigger_data: data,
                    result: 'success'
                })

                // Update stats
                await supabase.rpc('increment_automation_count', { automation_id: automation.id }) // needs rpc or simpler update

                results.push({ automation: automation.name, status: 'executed' })
            }
        }

        return new Response(JSON.stringify({ executed: results.length, details: results }), {
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
