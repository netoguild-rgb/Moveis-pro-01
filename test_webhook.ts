
/**
 * Script de Simulação de Webhook - Moveis.pro
 * 
 * Este script simula o envio de uma mensagem de um cliente via WhatsApp (Evolution API)
 * para testar o fluxo completo do backend:
 * 1. Webhook recebe mensagem
 * 2. Cria/Encontra conversa no Supabase
 * 3. Chama Gemini IA
 * 4. Processa resposta e salva no banco
 */

const WEBHOOK_URL = 'http://127.0.0.1:54321/functions/v1/whatsapp-webhook';

// Dados simulados do cliente
const MOCK_PAYLOAD = {
    event: "messages.upsert",
    instance: "moveis-pro",
    data: {
        key: {
            remoteJid: "5511999887766@s.whatsapp.net",
            fromMe: false,
            id: "MOCK_MSG_ID_" + Date.now()
        },
        pushName: "Cliente Teste",
        message: {
            conversation: "Olá, estou procurando um sofá confortável para minha sala de estar, estilo moderno."
        },
        messageType: "conversation",
        messageTimestamp: Math.floor(Date.now() / 1000)
    },
    sender: "5511999887766@s.whatsapp.net"
};

console.log("🚀 Iniciando Simulação de Webhook...");
console.log(`📡 URL: ${WEBHOOK_URL}`);
console.log("📦 Payload:", JSON.stringify(MOCK_PAYLOAD, null, 2));
console.log("-".repeat(50));

try {
    const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': 'Bearer ...' // Se necessário, mas functions locais geralmente aceitam request direto se anon key for passada ou ignorada em dev
        },
        body: JSON.stringify(MOCK_PAYLOAD)
    });

    const data = await response.json();

    console.log(`\n✅ Status: ${response.status}`);
    console.log("📝 Resposta do Servidor:");
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
        console.log("\n🎉 SUCESSO! O fluxo completou corretamente.");
        if (data.action === 'continue') {
            console.log("🤖 A IA decidiu CONTINUAR a conversa.");
        } else {
            console.log("👤 A IA decidiu passar para HUMANO (Handover).");
        }
    } else {
        console.log("\n⚠️ ALERTA: Ocorreu um erro ou aviso no processamento.");
    }

} catch (error) {
    console.error("\n❌ ERRO CRÍTICO na requisição:");
    console.error(error);
}
