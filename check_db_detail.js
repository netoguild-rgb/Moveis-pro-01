/**
 * Verificar mensagens detalhadas
 */
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function check() {
    console.log("📋 Verificando mensagens da conversa...\n");

    const { data: conv } = await supabase.from('conversations').select('id').eq('phone', '5511999887766').single();
    if (!conv) { console.log("Conversa não encontrada"); return; }

    const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true }); // Ordem cronológica

    console.log(`Mensagens encontradas: ${msgs?.length}`);
    msgs?.forEach(m => {
        console.log(`[${m.created_at}] ${m.direction.toUpperCase()}: ${m.content}`);
    });
}
check();
