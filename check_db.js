
/**
 * Verificar mensagens salvas no banco após teste
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function check() {
    console.log("📋 Verificando dados no banco...\n");

    // Check conversations
    const { data: convs } = await supabase.from('conversations').select('*');
    console.log(`💬 Conversas: ${convs?.length || 0}`);
    convs?.forEach(c => console.log(`   - ${c.phone} | ${c.name} | status: ${c.status}`));

    // Check messages
    const { data: msgs } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(5);
    console.log(`\n📨 Últimas mensagens: ${msgs?.length || 0}`);
    msgs?.forEach(m => console.log(`   [${m.direction}] ${m.content?.substring(0, 80)}...`));
}

check();
