import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL') || ''
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const { phone, content, mediaUrl, mediaType, instanceId } = await req.json()

        // 1. Validation
        if (!phone || (!content && !mediaUrl)) {
            return new Response('Missing phone or content', { status: 400 })
        }

        // 2. Call Evolution API
        let endpoint = '/message/sendText'
        let body: any = {
            number: phone,
            options: {
                delay: 1200,
                presence: "composing",
                linkPreview: false
            },
            textMessage: {
                text: content
            }
        }

        if (mediaUrl) {
            endpoint = '/message/sendMedia'
            body = {
                number: phone,
                options: {
                    delay: 1200,
                    presence: "composing"
                },
                mediaMessage: {
                    mediatype: mediaType || 'image',
                    caption: content,
                    media: mediaUrl
                }
            }
        }

        // Construct full URL (handle specific instance routing if needed)
        // Assuming instanceId is part of URL or header, or fixed single instance
        const instance = instanceId || 'moveis-pro' // Default or dynamic
        const url = `${evolutionApiUrl}${endpoint}/${instance}`

        // NOTE: Evolution API API structure varies by version. 
        // Adapting to standard v2 structures usually seen.

        console.log(`Sending to ${url}...`)

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionApiKey
            },
            body: JSON.stringify(body)
        })

        const result = await response.json()

        if (!response.ok) {
            console.error('Evolution API Error:', result)
            throw new Error(result?.message || 'Failed to send message via Evolution API')
        }

        // Success response
        return new Response(JSON.stringify(result), {
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
