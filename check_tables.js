
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function listTables() {
    const { data, error } = await supabase
        .rpc('get_tables'); // Tentar RPC se existir, senão query direta no information_schema é difícil via js client padrão sem permissions, mas vou tentar listar via inspection bruta se der erro

    // Workaround: Listar algumas tabelas comuns para ver se existem
    const tables = ['subscriptions', 'plans', 'saas_settings', 'organization'];

    for (const t of tables) {
        const { error } = await supabase.from(t).select('count').limit(1);
        if (!error) console.log(`✅ Tabela encontrada: ${t}`);
        else console.log(`❌ Tabela não encontrada: ${t}`);
    }
}

listTables();
