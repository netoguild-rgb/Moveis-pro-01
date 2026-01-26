import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action } = await req.json();

        // Configurações vindas das variáveis de ambiente
        const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
        const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
        const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'moveis-pro';

        if (!evolutionUrl || !evolutionKey) {
            console.error('Configuration missing: EVOLUTION_API_URL or EVOLUTION_API_KEY');
            throw new Error('Erro de configuração no servidor (Evolution API)');
        }

        let responseData;
        console.log(`[whatsapp-mgmt] Action: ${action}, Instance: ${instanceName}`);

        if (action === 'status') {
            // Tenta pegar o estado da conexao
            const resp = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
                headers: { 'apikey': evolutionKey }
            });

            console.log(`[whatsapp-mgmt] Status response: ${resp.status}`);

            if (resp.status === 404) {
                // 404 pode ser instância inexistente ou desligada.
                // Vamos verificar se ela existe na lista geral
                const allResp = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
                    headers: { 'apikey': evolutionKey }
                });

                if (allResp.ok) {
                    const allDataJson = await allResp.json();
                    // A Evolution retorna { instance: [], count: 0 } ou array direto dependendo da versão
                    const instances = Array.isArray(allDataJson) ? allDataJson : (allDataJson.instance || allDataJson.value || []);

                    const found = instances.find((i: any) => i.name === instanceName);

                    if (found) {
                        responseData = {
                            exists: true,
                            state: found.connectionStatus === 'open' ? 'open' : found.connectionStatus,
                            details: found
                        };
                    } else {
                        responseData = { exists: false, state: 'not_found' };
                    }
                } else {
                    responseData = { exists: false, state: 'error_fetching_instances' };
                }
            } else {
                const data = await resp.json();
                // Evolution retorna { instance: { state: 'open' } }
                responseData = {
                    exists: true,
                    state: data.instance?.state || data.state,
                    data
                };
            }

        } else if (action === 'connect') {
            // Solicita conexão (QR Code)
            const resp = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
                headers: { 'apikey': evolutionKey }
            });

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(`Falha ao conectar: ${resp.status} - ${errText}`);
            }

            const data = await resp.json();

            // Formatar retorno para o frontend
            if (data.base64) {
                responseData = {
                    qrcode: data.base64,
                    pairingCode: data.pairingCode,
                    code: data.code
                };
            } else if (data.instance && (data.instance.state === 'open' || data.instance.state === 'connecting')) {
                responseData = { status: 'connected', instance: data.instance };
            } else {
                responseData = data;
            }

        } else if (action === 'logout') {
            const resp = await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
                method: 'DELETE',
                headers: { 'apikey': evolutionKey }
            });

            if (resp.ok) {
                responseData = await resp.json();
            } else {
                // As vezes retorna erro se já estiver deslogado, mas consideramos ok
                responseData = { success: true, message: 'Logout attempted' };
            }
        } else {
            throw new Error(`Ação desconhecida: ${action}`);
        }

        return new Response(JSON.stringify(responseData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('[whatsapp-mgmt] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
