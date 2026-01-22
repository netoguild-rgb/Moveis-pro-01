import { createClient } from 'jsr:@supabase/supabase-js@2'

// Helper for hashing (SHA256) - simplified for Deno
async function hashUserData(data: string) {
    if (!data) return null;
    const msgUint8 = new TextEncoder().encode(data.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const { event_name, event_data, user_data, pixel_id, access_token } = await req.json()

        if (!pixel_id || !access_token) {
            return new Response('Missing pixel_id or access_token', { status: 400 })
        }

        // 1. Hash User Data
        const hashedUserData: any = {}
        if (user_data.email) hashedUserData.em = await hashUserData(user_data.email)
        if (user_data.phone) hashedUserData.ph = await hashUserData(user_data.phone)
        if (user_data.ln) hashedUserData.ln = await hashUserData(user_data.ln)
        if (user_data.fn) hashedUserData.fn = await hashUserData(user_data.fn)

        // 2. Construct Payload
        const payload = {
            data: [{
                event_name: event_name,
                event_time: Math.floor(Date.now() / 1000),
                action_source: "website", // or "system"
                user_data: hashedUserData,
                custom_data: event_data
            }],
            access_token: access_token
        }

        // 3. Send to Meta Graph API
        const url = `https://graph.facebook.com/v18.0/${pixel_id}/events`

        console.log(`Sending event ${event_name} to Meta...`)

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const result = await response.json()

        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
            status: response.status
        })

    } catch (err) {
        console.error(err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
})
