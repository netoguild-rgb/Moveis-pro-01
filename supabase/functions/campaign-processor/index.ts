import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const { campaign_id } = await req.json()

        if (!campaign_id) {
            return new Response('Missing campaign_id', { status: 400 })
        }

        // 1. Fetch Campaign Details
        const { data: campaign, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaign_id)
            .single()

        if (error) throw error

        // 2. Fetch Target Audience (Mocked logic mostly)
        // Assume campaign.contact_list is a tag or filter.
        // For now, let's just pick all clients as a demo if no list specified.

        // Check Status
        if (campaign.status !== 'scheduled' && campaign.status !== 'draft') { // Allow draft for manual trigger test
            return new Response('Campaign already processed or paused', { status: 400 })
        }

        await supabase.from('campaigns').update({ status: 'sending' }).eq('id', campaign_id)

        // Fetch contacts (simplified: all clients)
        // In real app: use campaign.contact_list to filter
        const { data: contacts } = await supabase.from('clients').select('id, phone, name').limit(50) // Limit for safety

        if (!contacts || contacts.length === 0) {
            await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaign_id)
            return new Response(JSON.stringify({ message: 'No contacts found' }), { headers: { 'Content-Type': 'application/json' } })
        }

        let sent = 0

        // 3. Process Batch
        for (const contact of contacts) {
            if (!contact.phone) continue;

            // Replace variables
            const message = campaign.message.replace('{{name}}', contact.name)

            // Call whatsapp-send function
            // Note: In Deno Edge Functions we might want to call via fetch to the other function URL
            // or import logic. Fetching localhost functions inside Docker might be tricky depending on network.
            // We will assume we can invoke it or duplicate logic. 
            // Invoking via supabase.functions.invoke is best practice.

            const { error: invokeError } = await supabase.functions.invoke('whatsapp-send', {
                body: {
                    phone: contact.phone,
                    content: message,
                    // instanceId: ...
                }
            })

            if (!invokeError) {
                sent++
                // Create message record (handled by whatsapp-send usually, but for campaign tracking we might want explicit link)
            }

            // Rate limit sleep (e.g. 1 sec)
            // await new Promise(r => setTimeout(r, 1000))
        }

        // 4. Update Campaign Stats
        await supabase.from('campaigns').update({
            status: 'completed',
            sent_count: sent,
            delivered_count: sent // approximation
        }).eq('id', campaign_id)

        return new Response(JSON.stringify({ success: true, processed: contacts.length, sent }), {
            headers: { 'Content-Type': 'application/json' },
        })

    } catch (err) {
        console.error(err)
        // Attempt to reset status if failed
        // await supabase.from('campaigns').update({ status: 'paused' }).eq('id', campaign_id)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
})
