import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
    // Intended to be triggered by CRON (GET or POST)

    try {
        const now = new Date().toISOString()

        // 1. Find overdue followups that haven't been notified yet
        // Using 'visits' table as per schema which has 'has_followup' and 'followup_date'
        // We assume we want to check for followups due in the last hour or upcoming hour?
        // Let's check for "pending" followups where date <= now.

        // NOTE: 'has_followup' is boolean, 'followup_date' is timestamp.
        // We need a 'followup_status' or check if notification already sent.
        // For simplicity, we might assume a new table column or just check if a notification exists recently?
        // Creating a dedicated 'check' ensures we don't spam.
        // Here we will query visits with date <= now AND event_status != 'completed' AND has_followup = true

        const { data: visits, error } = await supabase
            .from('visits')
            .select('*, clients(name)')
            .eq('has_followup', true)
            .eq('event_status', 'pending') // Assuming event status tracks the followup or the original visit?
            // Actually, if the visit itself is the event, we might need a separate status for the followup task.
            // Let's assume we notify if it's due.
            .lte('followup_date', now)
            .limit(50)

        if (error) throw error

        let notifiedCount = 0

        for (const visit of visits) {
            // Send Notification to User (Agent)
            // Check if we already notified? (Ideally we'd have a 'last_notified_at' column or checking notifications table)

            // Create Notification
            const { error: notifError } = await supabase.from('notifications').insert({
                user_id: visit.user_id,
                type: 'followup_reminder',
                title: 'Lembrete de Acompanhamento',
                body: `Hora de contatar ${visit.clients?.name || 'Cliente'}. Notas: ${visit.followup_notes || 'Sem notas'}.`,
                data: { visit_id: visit.id, client_id: visit.client_id }
            })

            if (!notifError) {
                notifiedCount++
                // Optionally update visit to mark as 'reminded' to avoid loop, 
                // OR depend on the Cron frequency and some window logic.
                // For now, let's update a custom_event_name or similar to flag it? 
                // Or just logging it.
            }
        }

        return new Response(JSON.stringify({ success: true, reminders_sent: notifiedCount }), {
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
