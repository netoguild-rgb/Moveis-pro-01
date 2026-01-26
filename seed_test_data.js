/**
 * Seed Script - Moveis.pro
 * 
 * Popula o banco com dados de teste para desenvolvimento.
 * Execute com: node seed_test_data.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração - ajuste conforme seu ambiente
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
    console.log('🌱 Iniciando seed do banco de dados...\n');

    try {
        // 1. Criar usuário de teste
        console.log('👤 Criando usuário de teste...');
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: 'teste@moveis.pro',
            password: 'teste123',
            email_confirm: true,
        });

        if (authError && !authError.message.includes('already')) {
            throw authError;
        }

        const userId = authUser?.user?.id || (await supabase
            .from('profiles')
            .select('id')
            .eq('email', 'teste@moveis.pro')
            .single()).data?.id;

        if (!userId) {
            console.log('   ⚠️  Usando primeiro usuário existente...');
            const { data: existingUser } = await supabase.from('profiles').select('id').limit(1).single();
            if (!existingUser) throw new Error('Nenhum usuário encontrado');
        }

        const testUserId = userId;
        console.log(`   ✅ Usuário: teste@moveis.pro / teste123\n`);

        // 2. Criar leads de teste
        console.log('📊 Criando leads de teste...');
        const leads = [
            { user_id: testUserId, name: 'Maria Silva', phone: '11999001111', email: 'maria@email.com', value: 4500, source: 'whatsapp', score: 'hot', stage: 'novo', product_interest: 'Sofá Retrátil' },
            { user_id: testUserId, name: 'João Santos', phone: '11999002222', email: 'joao@email.com', value: 8900, source: 'instagram', score: 'warm', stage: 'qualificado', product_interest: 'Mesa de Jantar' },
            { user_id: testUserId, name: 'Ana Oliveira', phone: '11999003333', email: 'ana@email.com', value: 12500, source: 'site', score: 'hot', stage: 'proposta', product_interest: 'Quarto Completo' },
            { user_id: testUserId, name: 'Carlos Lima', phone: '11999004444', email: 'carlos@email.com', value: 6200, source: 'indicacao', score: 'cold', stage: 'novo', product_interest: 'Poltrona' },
            { user_id: testUserId, name: 'Patricia Costa', phone: '11999005555', email: 'patricia@email.com', value: 15800, source: 'whatsapp', score: 'hot', stage: 'fechado', product_interest: 'Sala Completa' },
        ];

        const { error: leadsError } = await supabase.from('leads').insert(leads);
        if (leadsError) console.log('   ⚠️ Leads já existem ou erro:', leadsError.message);
        else console.log(`   ✅ ${leads.length} leads criados\n`);

        // 3. Criar conversas de teste
        console.log('💬 Criando conversas de teste...');
        const conversations = [
            { user_id: testUserId, phone: '5511999001111', name: 'Maria Silva', status: 'open', unread_count: 2 },
            { user_id: testUserId, phone: '5511999002222', name: 'João Santos', status: 'waiting', unread_count: 0 },
            { user_id: testUserId, phone: '5511999003333', name: 'Ana Oliveira', status: 'open', unread_count: 5 },
        ];

        const { data: createdConvs, error: convsError } = await supabase
            .from('conversations')
            .insert(conversations)
            .select();

        if (convsError) console.log('   ⚠️ Conversas já existem ou erro:', convsError.message);
        else console.log(`   ✅ ${conversations.length} conversas criadas\n`);

        // 4. Criar mensagens de teste
        if (createdConvs && createdConvs.length > 0) {
            console.log('📨 Criando mensagens de teste...');
            const messages = [
                { user_id: testUserId, conversation_id: createdConvs[0].id, contact_phone: '5511999001111', content: 'Olá! Vi o sofá no Instagram, quanto custa?', direction: 'inbound', status: 'received' },
                { user_id: testUserId, conversation_id: createdConvs[0].id, contact_phone: '5511999001111', content: 'Olá Maria! O sofá retrátil está R$ 4.500. Quer agendar uma visita?', direction: 'outbound', status: 'sent' },
                { user_id: testUserId, conversation_id: createdConvs[0].id, contact_phone: '5511999001111', content: 'Sim! Pode ser sábado?', direction: 'inbound', status: 'received' },
                { user_id: testUserId, conversation_id: createdConvs[1].id, contact_phone: '5511999002222', content: 'Bom dia, vocês entregam em Campinas?', direction: 'inbound', status: 'received' },
            ];

            const { error: msgsError } = await supabase.from('messages').insert(messages);
            if (msgsError) console.log('   ⚠️ Mensagens erro:', msgsError.message);
            else console.log(`   ✅ ${messages.length} mensagens criadas\n`);
        }

        // 5. Criar produtos de teste
        console.log('🛋️ Criando produtos de teste...');
        const products = [
            { user_id: testUserId, name: 'Sofá Retrátil 3 Lugares', description: 'Sofá confortável com tecido suede', price: 4500, category: 'Sofás', stock: 5, image_url: null },
            { user_id: testUserId, name: 'Mesa de Jantar 6 Lugares', description: 'Mesa em madeira maciça', price: 3200, category: 'Mesas', stock: 3, image_url: null },
            { user_id: testUserId, name: 'Poltrona Giratória', description: 'Poltrona moderna em couro sintético', price: 1800, category: 'Poltronas', stock: 8, image_url: null },
            { user_id: testUserId, name: 'Cama Box Queen', description: 'Cama box com colchão ortopédico', price: 2900, category: 'Camas', stock: 4, image_url: null },
        ];

        const { error: prodsError } = await supabase.from('products').insert(products);
        if (prodsError) console.log('   ⚠️ Produtos já existem ou erro:', prodsError.message);
        else console.log(`   ✅ ${products.length} produtos criados\n`);

        console.log('═══════════════════════════════════════════');
        console.log('🎉 Seed concluído com sucesso!');
        console.log('═══════════════════════════════════════════');
        console.log('\n📧 Login de teste:');
        console.log('   Email: teste@moveis.pro');
        console.log('   Senha: teste123\n');

    } catch (error) {
        console.error('❌ Erro no seed:', error.message);
        process.exit(1);
    }
}

seedDatabase();
