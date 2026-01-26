
/**
 * Script de Simulação de Webhook - Moveis.pro (Node.js Version - Auth Fixed + API Key)
 */

const http = require('http');

const WEBHOOK_URL = 'http://127.0.0.1:54321/functions/v1/whatsapp-webhook';
// Usando Service Role Key para garantir permissão total e bypass RLS se necessário
const SUPABASE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const MOCK_PAYLOAD = {
    event: "messages.upsert",
    instance: "moveis-pro",
    data: {
        key: {
            remoteJid: "5511999887766@s.whatsapp.net",
            fromMe: false,
            id: "MOCK_MSG_ID_" + Date.now()
        },
        pushName: "Kelson Cliente",
        message: {
            conversation: "Olá Ana! Gostaria de saber se vocês têm poltronas reclináveis para sala de TV?"
        },
        messageType: "conversation",
        messageTimestamp: Math.floor(Date.now() / 1000)
    },
    sender: "5511999887766@s.whatsapp.net"
};

console.log("🚀 Iniciando Simulação de Webhook (Node.js)...");
console.log(`📡 URL: ${WEBHOOK_URL}`);
console.log("📦 Payload:", JSON.stringify(MOCK_PAYLOAD, null, 2));
console.log("-".repeat(50));

const postData = JSON.stringify(MOCK_PAYLOAD);

const options = {
    hostname: '127.0.0.1',
    port: 54321,
    path: '/functions/v1/whatsapp-webhook',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
    }
};

const req = http.request(options, (res) => {
    console.log(`\n✅ Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log("📝 Resposta do Servidor:");
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));

            if (json.success) {
                console.log("\n🎉 SUCESSO! O fluxo completou corretamente.");
                console.log(`🤖 Ação da IA: ${json.action?.toUpperCase()}`);
                if (json.message_sent) {
                    console.log("📨 Mensagem de resposta enviada (simulado)");
                }
            } else {
                console.log("\n⚠️ ALERTA: Resposta com aviso/erro.");
            }
        } catch (e) {
            console.log("Resposta Raw:", data);
        }
    });
});

req.on('error', (e) => {
    console.error(`\n❌ ERRO NA REQUISIÇÃO: ${e.message}`);
});

req.write(postData);
req.end();
