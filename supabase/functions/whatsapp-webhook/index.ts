import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload = await req.json()
    console.log('Webhook payload:', JSON.stringify(payload, null, 2))

    // Evolution API payload structure support checks
    // This is a simplified handler. You'll need to adapt based on exact Evolution API version events.
    const type = payload.type || payload.event
    
    // Handle specific events (like 'messages.upsert')
    if (type === 'messages.upsert' || payload.data?.message) {
      const data = payload.data
      const messageData = data.message || data
      const key = data.key || data.message?.key
      const remoteJid = key?.remoteJid
      const fromMe = key?.fromMe
      
      if (!remoteJid) {
          return new Response('No remoteJid found', { status: 400 })
      }
      
      const phone = remoteJid.split('@')[0]
      const name = data.pushName || payload.sender || phone
      let content = ''
      let mediaUrl = null
      let mediaType = 'text'

      // Extract content (simplified text extraction)
      if (messageData.conversation) {
        content = messageData.conversation
      } else if (messageData.extendedTextMessage?.text) {
        content = messageData.extendedTextMessage.text
      } else if (messageData.imageMessage) {
        mediaType = 'image'
        content = messageData.imageMessage.caption || ''
        // Media handling would require downloading content via Evolution API typically
      } else if (messageData.audioMessage) {
          mediaType = 'audio'
      }

      // 1. Find or create User/Client/Lead
      // For now, we associate with a default user or find based on phone if 'client' exists
      // This part requires business logic: which 'user_id' owns this contact?
      // We might look up existing conversation to find the user_id.

      // Check existence of conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('phone', phone)
        .maybeSingle()

      let conversationId = conversation?.id
      let userId = conversation?.user_id

      // If no conversation, we need to decide who owns this new lead.
      // Ideally, there's a default user or based on instance name.
      // For this implementation, we abort if no user found, OR we assume a default admin user ID if provided in env
      // But we can't create a message without user_id.
      
      // FALLBACK: If we can't find a conversation, we try to match a client by phone
      if (!userId) {
         const { data: client } = await supabase
            .from('clients')
            .select('user_id')
            .eq('phone', phone)
            .maybeSingle()
         if (client) userId = client.user_id
      }
      
      // If still no user, we might log and exit, or assign to a "default" system user if configured.
      if (!userId) {
          // fetch first admin user? specific ID?
          // For now, let's log error.
          console.error('Could not determine user_id for phone:', phone)
          return new Response('Unknown contact owner', { status: 200 }) // Return 200 to ACK webhook
      }

      if (!conversationId) {
          // Create conversation
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
                user_id: userId,
                phone: phone,
                name: name,
                status: 'open',
                last_message_at: new Date().toISOString()
            })
            .select()
            .single()
          
          if (convError) {
              console.error('Error creating conversation:', convError)
              return new Response('Error creating conversation', { status: 500 })
          }
          conversationId = newConv.id
      } else {
          // Update conversation
          await supabase
            .from('conversations')
            .update({
                last_message_at: new Date().toISOString(),
                unread_count: (conversation.unread_count || 0) + 1,
                // name: name // update name if changed?
            })
            .eq('id', conversationId)
      }

      // 2. Insert Message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
            user_id: userId,
            conversation_id: conversationId,
            contact_phone: phone,
            contact_name: name,
            content: content,
            media_url: mediaUrl,
            media_type: mediaType,
            direction: fromMe ? 'outbound' : 'inbound',
            status: 'delivered' 
        })

      if (msgError) {
          console.error('Error saving message:', msgError)
          return new Response('Error saving message', { status: 500 })
      }

      // 3. Trigger Automations (Async invocation ideally, or direct call)
      // We can call another function 'automation-runner'
      // await supabase.functions.invoke('automation-runner', { ... })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
