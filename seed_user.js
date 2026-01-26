
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function seed() {
    console.log("🌱 Creating test user...");

    // 1. Create Auth User
    const email = 'kelson@moveis.pro';
    const password = 'password123';

    // Clean up if exists
    // const { data: existing } = await supabase.auth.admin.listUsers();
    // ... logic to delete if needed, but createUser usually fails if exists or returns user

    const { data: { user }, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Kelson Admin' }
    });

    if (error) {
        console.log("Notice creating user (might exist):", error.message);
    }

    const userId = user ? user.id : (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id;

    if (!userId) {
        console.error("❌ Failed to get userId");
        return;
    }

    console.log("✅ User ID:", userId);

    // 2. Ensure Profile exists (Trigger might have created it, but let's upsert to be safe)
    console.log("👤 Upserting profile...");
    await supabase.from('profiles').upsert({
        id: userId,
        full_name: 'Kelson Admin',
        role: 'admin'
    });

    // 3. Create User Settings (Essential for Webhook logic)
    console.log("⚙️ Creating user settings...");
    const { error: settingsError } = await supabase.from('user_settings').upsert({
        user_id: userId,
        whatsapp_connected: true,
        whatsapp_instance_id: 'moveis-pro'
    }, { onConflict: 'user_id' });

    if (settingsError) console.error("Error settings:", settingsError);
    else console.log("✅ User settings configured.");

}

seed();
