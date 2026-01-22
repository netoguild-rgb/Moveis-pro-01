Plano

# **Prompt para IA de Codificação \- Backend Moveis.pro**

## **Visão Geral do Projeto**

Moveis.pro é um CRM completo para lojas de móveis com foco em vendas via WhatsApp. O sistema gerencia leads, clientes, produtos, pedidos, agendamentos e campanhas de marketing, com recursos de IA para automação e insights.

---

## **Stack Tecnológica Recomendada**

### **Principal de Back-end**

* Supabase como BaaS (Backend as a Service)  
  * PostgreSQL para banco de dados  
  * Row Level Security (RLS) para isolamento de dados  
  * Edge Functions (Deno) para lógica personalizada  
  * Realtime para atualizações em tempo real  
  * Armazenamento para arquivos e imagens  
* 

### **Integrações Externas**

* API do WhatsApp Business (via API Evolution ou Baileys)  
* OpenAI/Google AI para recursos de IA  
* API de conversão Meta para rastreamento  
* Google Analytics 4 para métricas  
* Reenviar/SendGrid para e-mails transacionais

---

## **Estrutura de Banco de Dados**

### **Tabelas Existentes (já renovadas)**

\-- profiles (perfis de usuários)  
\-- leads (leads de vendas)  
\-- clients (clientes)  
\-- products (catálogo de produtos)  
\-- orders \+ order\_items (pedidos)  
\-- campaigns (campanhas de marketing)  
\-- visits (agenda e eventos)  
\-- workspaces (multi-tenant)  
\-- team\_members (equipe)  
\-- team\_invitations (convites)

### **Tabelas a Adicionar**

\-- 1\. Mensagens do WhatsApp  
CREATE TABLE messages (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  user\_id UUID NOT NULL,  
  conversation\_id UUID NOT NULL,  
  contact\_phone TEXT NOT NULL,  
  contact\_name TEXT,  
  content TEXT,  
  media\_url TEXT,  
  media\_type TEXT, \-- text, image, audio, video, document  
  direction TEXT NOT NULL, \-- inbound, outbound  
  status TEXT DEFAULT 'pending', \-- pending, sent, delivered, read, failed  
  ai\_suggested BOOLEAN DEFAULT false,  
  created\_at TIMESTAMPTZ DEFAULT now()  
);

\-- 2\. Conversas/Contatos  
CREATE TABLE conversations (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  user\_id UUID NOT NULL,  
  client\_id UUID REFERENCES clients(id),  
  lead\_id UUID REFERENCES leads(id),  
  phone TEXT NOT NULL,  
  name TEXT,  
  last\_message\_at TIMESTAMPTZ,  
  unread\_count INTEGER DEFAULT 0,  
  status TEXT DEFAULT 'open', \-- open, waiting, responded, closed  
  assigned\_to UUID, \-- membro da equipe  
  created\_at TIMESTAMPTZ DEFAULT now()  
);

\-- 3\. Automações  
CREATE TABLE automations (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  user\_id UUID NOT NULL,  
  name TEXT NOT NULL,  
  trigger\_type TEXT NOT NULL, \-- new\_contact, no\_response, lead\_score, deal\_closed  
  trigger\_config JSONB,  
  action\_type TEXT NOT NULL, \-- send\_message, create\_lead, notify, move\_pipeline  
  action\_config JSONB,  
  is\_active BOOLEAN DEFAULT true,  
  execution\_count INTEGER DEFAULT 0,  
  last\_executed\_at TIMESTAMPTZ,  
  created\_at TIMESTAMPTZ DEFAULT now()  
);

\-- 4\. Logs de Automação  
CREATE TABLE automation\_logs (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  automation\_id UUID REFERENCES automations(id),  
  trigger\_data JSONB,  
  result TEXT, \-- success, failed  
  error\_message TEXT,  
  created\_at TIMESTAMPTZ DEFAULT now()  
);

\-- 5\. Notificações  
CREATE TABLE notifications (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  user\_id UUID NOT NULL,  
  type TEXT NOT NULL, \-- new\_lead, new\_message, followup\_reminder, deal\_closed  
  title TEXT NOT NULL,  
  body TEXT,  
  data JSONB,  
  read BOOLEAN DEFAULT false,  
  created\_at TIMESTAMPTZ DEFAULT now()  
);

\-- 6\. Configurações do Usuário  
CREATE TABLE user\_settings (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  user\_id UUID NOT NULL UNIQUE,  
  whatsapp\_instance\_id TEXT,  
  whatsapp\_connected BOOLEAN DEFAULT false,  
  meta\_pixel\_id TEXT,  
  meta\_access\_token TEXT,  
  ga4\_id TEXT,  
  gtm\_id TEXT,  
  notification\_preferences JSONB,  
  created\_at TIMESTAMPTZ DEFAULT now(),  
  updated\_at TIMESTAMPTZ DEFAULT now()  
);

\-- 7\. Relatórios de IA  
CREATE TABLE ai\_insights (  
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  user\_id UUID NOT NULL,  
  type TEXT NOT NULL, \-- opportunity, trend, alert  
  title TEXT NOT NULL,  
  description TEXT,  
  action\_label TEXT,  
  action\_data JSONB,  
  is\_read BOOLEAN DEFAULT false,  
  expires\_at TIMESTAMPTZ,  
  created\_at TIMESTAMPTZ DEFAULT now()  
);

### **Políticas RLS (Segurança Crítica)**

\-- Padrão para todas as tabelas de usuário  
ALTER TABLE \[table\_name\] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own data"  
ON \[table\_name\]  
FOR ALL  
TO authenticated  
USING (auth.uid() \= user\_id)  
WITH CHECK (auth.uid() \= user\_id);

\-- Para mensagens (baseado em workspace/equipe)  
CREATE POLICY "Team members can view workspace messages"  
ON messages FOR SELECT TO authenticated  
USING (  
  user\_id \= auth.uid() OR  
  EXISTS (  
    SELECT 1 FROM team\_members tm  
    WHERE tm.user\_id \= auth.uid()  
    AND tm.workspace\_id \= (  
      SELECT workspace\_id FROM team\_members   
      WHERE user\_id \= messages.user\_id  
    )  
  )  
);

---

## **Funções de Borda e Implementador**

### **1\. webhook do WhatsApp**

Recebe mensagens do WhatsApp e processa

// Endpoint: POST /functions/v1/whatsapp-webhook  
// Funções:  
// \- Receber mensagens inbound  
// \- Salvar em messages table  
// \- Atualizar conversation  
// \- Disparar automações  
// \- Gerar notificação

// \- Se IA ativa: gerar sugestão de resposta

### **2\. enviar pelo WhatsApp**

Enviar via WhatsApp

// Endpoint: POST /functions/v1/whatsapp-send  
// Body: { phone, message, media\_url?, template? }  
// Funções:  
// \- Validar permissões  
// \- Chamar Evolution API/Baileys  
// \- Salvar mensagem outbound

// \- Atualizar status

### **3\. ai-suggest-response**

Gera sugestões de resposta com IA

// Endpoint: POST /functions/v1/ai-suggest-response  
// Body: { conversation\_id, context? }  
// Funções:  
// \- Buscar histórico da conversa  
// \- Buscar dados do cliente/lead  
// \- Buscar produtos relacionados  
// \- Chamar OpenAI/Gemini

// \- Retornar sugestões contextualizadas

### **4\. ai-analisar-lead**

Análise e pontuação levam automaticamente

// Endpoint: POST /functions/v1/ai-analyze-lead  
// Body: { lead\_id } ou trigger por webhook  
// Funções:  
// \- Analisar comportamento do lead  
// \- Calcular score baseado em interações  
// \- Atualizar lead.score

// \- Gerar insight se lead quente

### **5\. processador de campanha**

Processo de envio de campanhas em massa

// Endpoint: POST /functions/v1/campaign-processor  
// Body: { campaign\_id }  
// Funções:  
// \- Buscar contatos da lista  
// \- Processar em batches (rate limiting)  
// \- Enviar mensagens com delay  
// \- Atualizar estatísticas

// \- Respeitar opt-out

### **6\. executor de automação**

Execução de automatizações definidas

// Endpoint: POST /functions/v1/automation-runner  
// Trigger: Webhook ou CRON  
// Funções:  
// \- Verificar triggers pendentes  
// \- Executar ações configuradas  
// \- Registrar logs

// \- Notificar usuário

### **7\. lembrete de acompanhamento**

Envia lembretes de acompanhamento

// Endpoint: Triggered by CRON (a cada 30min)  
// Funções:  
// \- Buscar follow-ups com data \<= now  
// \- Enviar notificação push/email

// \- Criar notification no banco

### **8\. relatório diário**

Relatório Gera

// Endpoint: Triggered by CRON (8h)  
// Funções:  
// \- Agregar métricas do dia anterior  
// \- Gerar insights com IA

// \- Enviar email/notificação

### **9\. meta-conversões**

Envia eventos para Meta Conversion API

// Endpoint: POST /functions/v1/meta-conversions  
// Body: { event\_name, event\_data, user\_data }  
// Funções:  
// \- Formatar evento para Meta API  
// \- Enviar com hash de dados do usuário

// \- Registrar log

---

## **Integrações ✓**

### **WhatsApp Business (Prioridade Alta)**

Opção 1: Evolution API (recomendado)

// Biblioteca: evolution-api SDK  
// URL: https://doc.evolution-api.com/

const config \= {  
  baseUrl: Deno.env.get("EVOLUTION\_API\_URL"),  
  apiKey: Deno.env.get("EVOLUTION\_API\_KEY"),  
  instanceName: "moveis-pro"  
};

// Endpoints principais:  
// POST /instance/create \- Criar instância  
// GET /instance/qrcode \- Gerar QR Code  
// POST /message/sendText \- Enviar texto  
// POST /message/sendMedia \- Enviar mídia

// POST /webhook/set \- Configurar webhook

Opção 2: WhatsApp Cloud API (oficial)

// Para contas verificadas do Meta Business  
const config \= {  
  phoneNumberId: Deno.env.get("WHATSAPP\_PHONE\_ID"),  
  accessToken: Deno.env.get("WHATSAPP\_ACCESS\_TOKEN"),  
  webhookVerifyToken: Deno.env.get("WHATSAPP\_VERIFY\_TOKEN")

};

### **IA \- Sugestões e Análises**

// Usar Lovable AI (já disponível no projeto)  
// Modelos suportados:  
// \- google/gemini-2.5-flash (recomendado para chat)  
// \- openai/gpt-5-mini (alternativa)

// Implementar:  
// 1\. Análise de sentimento de mensagens  
// 2\. Sugestão de respostas contextualizadas  
// 3\. Scoring preditivo de leads  
// 4\. Detecção de intenção de compra  
// 5\. Geração de relatórios automáticos

### **API de conversão de metadados**

// Biblioteca: Fetch nativo  
// Endpoint: graph.facebook.com/v18.0/{pixel\_id}/events

const sendEvent \= async (event: ConversionEvent) \=\> {  
  const response \= await fetch(  
    \`https://graph.facebook.com/v18.0/${pixelId}/events\`,  
    {  
      method: "POST",  
      headers: { "Content-Type": "application/json" },  
      body: JSON.stringify({  
        data: \[{  
          event\_name: event.name, // Lead, Purchase, etc.  
          event\_time: Math.floor(Date.now() / 1000),  
          user\_data: hashUserData(event.user),  
          custom\_data: event.data  
        }\],  
        access\_token: accessToken  
      })  
    }  
  );  
};

---

## **Fluxos Críticos de Implementação**

### **1\. Fluxo de Nova Mensagem WhatsApp**

\[WhatsApp\] → \[Webhook\] → \[Função Edge\]  
                              ↓  
                    \[Mensagem de Salvação\]  
                              ↓  
                    \[Atualizar conversa\]  
                              ↓  
              \[Verificar automatizações\] ←→ \[Executar ação\]  
                              ↓  
                    \[Gerar notificação\]  
                              ↓  
              \[Se IA ativa: Sugerir resposta\]  
                              ↓  
                    \[Transmissão em tempo real\]

### **2\. Fluxo de Agendamento \+ Acompanhamento**

\[Criar Evento\] → \[Salvar em visitas\]  
                        ↓  
         \[Se has\_followup: Criar lembrete\]  
                        ↓  
              \[Lembretes de verificação CRON\]  
                        ↓  
         \[Enviar notificação/push\]  
                        ↓  
              \[Atualizar status\]

### **3\. Fluxo de Campanha de Disparo**

\[Criar campanha\] → \[Selecionar lista\]  
                          ↓  
              \[Processar contatos\]  
                          ↓  
    \[Fila com limitação de taxa (100 mensagens/min)\]  
                          ↓  
              \[Enviar via WhatsApp\]  
                          ↓  
         \[Atualizar estatísticas\]  
                          ↓  
    \[Registrar eventos (Meta API)\]

---

## **Segredos Necessários**

\# WhatsApp  
EVOLUTION\_API\_URL=  
EVOLUTION\_API\_KEY=

\# IA (Lovable AI já integrado, não precisa de chave)

\# Meta  
META\_PIXEL\_ID=  
META\_ACCESS\_TOKEN=

\# Email (para notificações)  
RESEND\_API\_KEY=

\# Push Notifications (opcional)  
VAPID\_PUBLIC\_KEY=  
VAPID\_PRIVATE\_KEY=

---

## **Checklist de Segurança**

*  RLS ativo em TODAS as tabelas  
*  Políticas verificam auth.uid() ou associação  
*  Funções de borda validam JWT com getClaims()  
*  Entradas sanitizadas com Zod  
*  Webhooks validam assinaturas  
*  Segredos nunca expostos no frontend  
*  Limitação de taxa em endpoints públicos  
*  Logs de auditoria para ações críticas

---

## **Realtime \- Tabelas para Habilitar**

ALTER PUBLICATION supabase\_realtime ADD TABLE messages;  
ALTER PUBLICATION supabase\_realtime ADD TABLE conversations;  
ALTER PUBLICATION supabase\_realtime ADD TABLE notifications;  
ALTER PUBLICATION supabase\_realtime ADD TABLE visits;

---

## **Ordem de Implementação Sugerida**

1. Fase 1 \- Fundação  
   * Criar tabelas adicionais (mensagens, conversas, etc.)  
   * Configurar RLS em todas as tabelas  
   * Implementar função de borda de verificação de saúde  
2.   
3. Fase 2 \- Núcleo do WhatsApp  
   * API de Evolução Integrar  
   * Implementar whatsapp-webhook  
   * Implementar whatsapp-end  
   * Habilitar tempo real para mensagens  
4.   
5. Fase 3 \- Automações  
   * Criar sistema de triggers  
   * Implementar automação-executor  
   * Tarefas CRON  
6.   
7. Fase 4 \- IA  
   * Implementar ai-suggest-response  
   * Implementar ai-analisar-liderar  
   * Gerar insights automáticos  
8.   
9. Fase 5 \- Marketing  
   * Implementar processador de campanha  
   * API de conversão de metadados Integrar  
   * Painel de análise  
10.   
11. Fase 6 \- Notificação  
    * Notificações push (Web Push)  
    * Transações de e-mail  
    * Lembretes de acompanhamento

