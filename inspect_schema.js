
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function inspect() {
    console.log("🔍 Inspetando tabelas...\n");

    // Check user_settings columns by selecting one row
    const { data: settings } = await supabase.from('user_settings').select('*').limit(1);
    console.log("Tabela user_settings:", settings && settings.length > 0 ? Object.keys(settings[0]) : "Vazia");

    // Check profiles columns
    const { data: profiles } = await supabase.from('profiles').select('*').limit(1);
    console.log("Tabela profiles:", profiles && profiles.length > 0 ? Object.keys(profiles[0]) : "Vazia");
}

inspect();
