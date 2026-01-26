import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL') || ''
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY') || ''
const defaultInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'moveis-pro';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const { action, phone, content, mediaUrl, mediaType, instanceId } = body

        const instance = instanceId || defaultInstanceName;

        // --- MANAGEMENT ACTIONS (status, connect, logout) ---
        if (action) {
            console.log(`[whatsapp-send+mgmt] Action: ${action}, Instance: ${instance}`);

            let responseData;

            if (action === 'status') {
                const resp = await fetch(`${evolutionApiUrl}/instance/connectionState/${instance}`, {
                    headers: { 'apikey': evolutionApiKey }
                });

                if (resp.status === 404) {
                    const allResp = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
                        headers: { 'apikey': evolutionApiKey }
                    });
                    if (allResp.ok) {
                        const allData = await allResp.json();
                        const list = Array.isArray(allData) ? allData : (allData.instance || allData.value || []);
                        const found = list.find((i: any) => i.name === instance);
                        responseData = found
                            ? { exists: true, state: found.connectionStatus === 'open' ? 'open' : found.connectionStatus }
                            : { exists: false, state: 'not_found' };
                    } else {
                        responseData = { exists: false, state: 'error' };
                    }
                } else {
                    const data = await resp.json();
                    responseData = { exists: true, state: data.instance?.state || data.state, data };
                }

            } else if (action === 'connect') {
                const resp = await fetch(`${evolutionApiUrl}/instance/connect/${instance}`, {
                    headers: { 'apikey': evolutionApiKey }
                });
                const data = await resp.json();
                if (data.base64) {
                    responseData = { qrcode: data.base64, pairingCode: data.pairingCode };
                } else if (data.instance && (data.instance.state === 'open' || data.instance.state === 'connecting')) {
                    responseData = { status: 'connected', instance: data.instance };
                } else {
                    responseData = data;
                }

            } else if (action === 'logout') {
                const resp = await fetch(`${evolutionApiUrl}/instance/logout/${instance}`, {
                    method: 'DELETE',
                    headers: { 'apikey': evolutionApiKey }
                });
                responseData = await resp.json();
            } else {
                throw new Error(`Unknown action: ${action}`);
            }

            return new Response(JSON.stringify(responseData), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // --- SEND MESSAGES (original logic) ---
        if (!phone || (!content && !mediaUrl)) {
            return new Response('Missing phone or content', { status: 400, headers: corsHeaders })
        }

        let endpoint = '/message/sendText'
        let apiBody: any = {
            number: phone,
            options: { delay: 1200, presence: "composing", linkPreview: false },
            textMessage: { text: content }
        }

        if (mediaUrl) {
            endpoint = '/message/sendMedia'
            apiBody = {
                number: phone,
                options: { delay: 1200, presence: "composing" },
                mediaMessage: { mediatype: mediaType || 'image', caption: content, media: mediaUrl }
            }
        }

        const url = `${evolutionApiUrl}${endpoint}/${instance}`
        console.log(`Sending to ${url}...`)

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
            body: JSON.stringify(apiBody)
        })

        const result = await response.json()

        if (!response.ok) {
            console.error('Evolution API Error:', result)
            throw new Error(result?.message || 'Failed to send message via Evolution API')
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (err) {
        console.error(err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
