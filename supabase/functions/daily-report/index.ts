import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
    try {
        // 1. Calculate Metrics for Yesterday
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const startOfDay = yesterday.toISOString().split('T')[0] + 'T00:00:00'
        const endOfDay = yesterday.toISOString().split('T')[0] + 'T23:59:59'

        // Count new leads
        const { count: leadCount } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)

        // Count sales (orders)
        const { count: orderCount, data: orders } = await supabase
            .from('orders')
            .select('total_value')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)

        const totalSales = orders?.reduce((sum, order) => sum + (order.total_value || 0), 0) || 0

        // 2. Generate Report Content
        const reportTitle = `Relatório Diário - ${yesterday.toLocaleDateString()}`
        const reportBody = `
      Novos Leads: ${leadCount}
      Vendas: R$ ${totalSales.toFixed(2)} (${orderCount} pedidos)
    `.trim()

        // 3. Notify All Admins/Owners
        // First find users
        // For now, let's just insert one 'system' notification or valid for a specific user passed in params?
        // Usually a Cron job would iterate over workspaces.

        // For this demo, we assume we find one main user/owner or loop all users.
        const { data: users } = await supabase.from('user_settings').select('user_id')

        if (users) {
            const notifications = users.map(u => ({
                user_id: u.user_id,
                type: 'daily_report',
                title: reportTitle,
                body: reportBody,
                data: { leadCount, totalSales, orderCount }
            }))

            await supabase.from('notifications').insert(notifications)
        }

        return new Response(JSON.stringify({ success: true, report: reportBody }), {
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
