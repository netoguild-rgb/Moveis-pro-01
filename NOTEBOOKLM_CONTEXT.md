# Moveis.pro - Contexto Completo do Projeto

> **Este documento contém TODO o contexto do projeto para auxiliar no desenvolvimento.**
> Upload este arquivo no NotebookLM para ter um assistente especializado no projeto.

---

## 📋 Visão Geral

**Moveis.pro** é um CRM completo para lojas de móveis focado em vendas via WhatsApp.

### Objetivo do Sistema
Gerenciar leads, clientes, produtos, pedidos, agendamentos e campanhas de marketing, com recursos de IA para automação e insights.

### Público-Alvo
Lojas de móveis que vendem principalmente via WhatsApp e precisam organizar seu funil de vendas.

---

## 🛠️ Stack Tecnológica

### Frontend
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.8.3 | Tipagem estática |
| Vite | 5.4.19 | Build tool |
| Tailwind CSS | 3.4.17 | Estilização |
| shadcn/ui | - | Componentes UI |
| React Router | 6.30.1 | Roteamento |
| TanStack Query | 5.83.0 | Estado servidor |
| Recharts | 2.15.4 | Gráficos |
| React Hook Form + Zod | - | Formulários |

### Backend (Supabase)
| Serviço | Propósito |
|---------|-----------|
| PostgreSQL | Banco de dados |
| Row Level Security (RLS) | Segurança multi-tenant |
| Edge Functions (Deno) | Lógica serverless |
| Realtime | Updates em tempo real |
| Storage | Arquivos e imagens |

### Integrações
| Serviço | Propósito |
|---------|-----------|
| Evolution API v2.3.1 | WhatsApp Business |
| Google Gemini 2.5 Flash | IA para chat e análises |
| Meta Conversion API | Rastreamento |
| Google Analytics 4 | Métricas |

### Infraestrutura Local
- Docker Compose para Evolution API + PostgreSQL + Redis
- Supabase CLI para backend local

---

## 📁 Estrutura do Projeto

```
Moveis.pro 0.1/
├── frontend/                    # Aplicação React
│   ├── src/
│   │   ├── pages/              # 12 páginas do app
│   │   │   ├── Auth.tsx        # Login/Registro
│   │   │   ├── Dashboard.tsx   # Painel principal
│   │   │   ├── Inbox.tsx       # Chat WhatsApp (35KB)
│   │   │   ├── Clientes.tsx    # Gestão clientes (30KB)
│   │   │   ├── Pipeline.tsx    # Funil de vendas
│   │   │   ├── Catalogo.tsx    # Produtos (24KB)
│   │   │   ├── Agenda.tsx      # Calendário
│   │   │   ├── Disparos.tsx    # Campanhas (20KB)
│   │   │   ├── Inteligencia.tsx# IA insights (17KB)
│   │   │   ├── Configuracoes.tsx# Config (32KB)
│   │   │   ├── Convite.tsx     # Convites equipe
│   │   │   └── NotFound.tsx
│   │   ├── components/         # 73+ componentes
│   │   │   ├── ui/             # 56 componentes shadcn
│   │   │   ├── agenda/         # Calendário
│   │   │   ├── chat/           # WhatsApp chat
│   │   │   ├── dashboard/
│   │   │   ├── delivery/
│   │   │   ├── notifications/
│   │   │   └── team/
│   │   ├── hooks/              # 17 custom hooks
│   │   ├── contexts/           # Context providers
│   │   ├── integrations/       # Supabase client
│   │   └── lib/                # Utilitários
│   └── package.json
│
├── supabase/
│   ├── functions/              # 10 Edge Functions
│   │   ├── whatsapp-webhook/   # Recebe mensagens
│   │   ├── whatsapp-send/      # Envia mensagens
│   │   ├── whatsapp-manager/   # Gerencia instância
│   │   ├── ai-suggest-response/# Sugestões IA
│   │   ├── ai-analyze-lead/    # Scoring leads
│   │   ├── automation-runner/  # Executa automações
│   │   ├── campaign-processor/ # Disparo em massa
│   │   ├── followup-reminder/  # Lembretes
│   │   ├── daily-report/       # Relatório diário
│   │   └── meta-conversions/   # Meta Pixel API
│   │
│   ├── migrations/             # 10 migrações SQL
│   └── config.toml
│
├── docker-compose.yml          # Evolution API stack
├── docker-compose.prod.yml     # Produção
├── .env                        # Variáveis locais
└── VPS_GUIDE.md               # Guia deploy
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Existentes (já implementadas)
| Tabela | Propósito |
|--------|-----------|
| profiles | Perfis de usuários |
| leads | Leads de vendas |
| clients | Clientes cadastrados |
| products | Catálogo de produtos |
| orders + order_items | Pedidos |
| campaigns | Campanhas marketing |
| visits | Agenda e eventos |
| workspaces | Multi-tenant |
| team_members | Equipe |
| team_invitations | Convites |

### Tabelas do Backend (implementadas na migration)
| Tabela | Propósito |
|--------|-----------|
| messages | Mensagens WhatsApp |
| conversations | Conversas/Contatos |
| automations | Regras de automação |
| automation_logs | Logs de execução |
| notifications | Notificações do sistema |
| user_settings | Configurações usuário |
| ai_insights | Relatórios IA |

### Campos Importantes da Tabela `messages`
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL -- Dono da mensagem
conversation_id UUID NOT NULL
contact_phone TEXT NOT NULL
content TEXT
direction TEXT NOT NULL -- 'inbound' ou 'outbound'
status TEXT -- 'pending', 'sent', 'delivered', 'read', 'failed'
ai_suggested BOOLEAN DEFAULT false
created_at TIMESTAMPTZ
```

### Campos Importantes da Tabela `conversations`
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL -- Dono
phone TEXT NOT NULL
name TEXT
status TEXT -- 'open', 'waiting', 'responded', 'closed'
unread_count INTEGER DEFAULT 0
last_message_at TIMESTAMPTZ
```

---

## 🔐 Segurança (RLS)

Todas as tabelas têm **Row Level Security** habilitado.

### Política Padrão
```sql
CREATE POLICY "Users can manage their own data"
ON [tabela] FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Política de Equipe (mensagens)
Membros da equipe podem ver mensagens do mesmo workspace.

---

## 🤖 Integração WhatsApp (Evolution API)

### Fluxo de Mensagem Recebida
```
WhatsApp → Evolution API → Webhook → Edge Function
                                         ↓
                                  Salva mensagem no DB
                                         ↓
                                  Atualiza conversa
                                         ↓
                                  Se IA ativa: Gera resposta
                                         ↓
                                  Envia via Evolution API
                                         ↓
                                  Realtime atualiza Frontend
```

### Configuração Docker
```yaml
evolution-api:
  image: evoapicloud/evolution-api:v2.3.1
  ports: "8085:8080"
  depends_on: redis, postgres_evolution
```

### Variáveis de Ambiente
```env
EVOLUTION_API_KEY=moveispro_dev_key_2026
EVOLUTION_API_URL=http://host.docker.internal:8085
EVOLUTION_INSTANCE_NAME=moveis-pro
```

---

## 🧠 Integração IA (Google Gemini)

### Modelo Usado
`gemini-2.5-flash` - Otimizado para chat rápido

### Persona da IA
**Ana** - Consultora da Confort Maison, especialista em Salas de Estar e Jantar.

### Regras de Triagem
1. Identifica: Produto desejado, Estilo, Urgência
2. Se cliente pede preço/desconto → `[ACTION: HANDOVER]` (transfere para humano)
3. Se cliente irritado → `[ACTION: HANDOVER]`
4. Caso contrário → `[ACTION: CONTINUE]`

### Código da Chamada
```typescript
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { maxOutputTokens: 300 }
});
const chat = model.startChat({ history: chatHistory });
const result = await chat.sendMessage(incomingText);
```

---

## 📱 Páginas do Frontend

### 1. Auth (Login/Registro)
- Login com email/senha
- Registro de novos usuários
- Recuperação de senha

### 2. Dashboard
- Métricas principais (leads, vendas, conversões)
- Gráficos de desempenho
- Atalhos rápidos

### 3. Inbox (Chat WhatsApp) - **Maior página: 35KB**
- Lista de conversas
- Chat em tempo real
- Integração com IA
- Status de conexão WhatsApp

### 4. Clientes - **30KB**
- CRUD completo
- Histórico de compras
- Tags e segmentação

### 5. Pipeline (Funil de Vendas)
- Kanban drag-and-drop
- Stages configuráveis
- Valor por etapa

### 6. Catálogo - **24KB**
- Produtos com fotos
- Preços e estoque
- Categorias

### 7. Agenda
- Calendário de visitas
- Entregas agendadas
- Follow-ups

### 8. Disparos (Campanhas) - **20KB**
- Campanhas em massa
- Templates de mensagem
- Estatísticas de envio

### 9. Inteligência (IA) - **17KB**
- Insights automáticos
- Scoring de leads
- Previsões de vendas

### 10. Configurações - **32KB**
- Conexão WhatsApp
- Integrações (Meta, GA4)
- Preferências de notificação
- Gestão de equipe

---

## 🔧 Edge Functions Implementadas

| Função | Endpoint | Propósito |
|--------|----------|-----------|
| whatsapp-webhook | POST /whatsapp-webhook | Recebe mensagens do WhatsApp |
| whatsapp-send | POST /whatsapp-send | Envia mensagens |
| whatsapp-manager | POST /whatsapp-manager | Gerencia instância |
| ai-suggest-response | POST /ai-suggest-response | Sugere respostas |
| ai-analyze-lead | POST /ai-analyze-lead | Analisa e pontua leads |
| automation-runner | POST /automation-runner | Executa automações |
| campaign-processor | POST /campaign-processor | Processa campanhas |
| followup-reminder | CRON | Lembretes de follow-up |
| daily-report | CRON | Relatório diário |
| meta-conversions | POST /meta-conversions | Envia eventos Meta |

---

## 🚀 Deploy

### Local (Desenvolvimento)
```bash
# Backend Supabase
supabase start

# Evolution API
docker compose up -d

# Frontend
cd frontend && npm run dev
```

### VPS (Produção)
Ver arquivo `VPS_GUIDE.md` para instruções completas.

---

## ⚠️ Problemas Conhecidos (Verificação Recente)

### UX Audit - 21 Issues
1. **Formulários sem labels** em 5 arquivos
2. **Cores PURPLE detectadas** (banidas) em 3 arquivos:
   - EventCard.tsx
   - EventDetailSheet.tsx
   - DashboardContent.tsx
3. Animações de propriedades caras
4. Falta de `prefers-reduced-motion`
5. Glassmorphism mal implementado

### SEO Check - 4 Issues
1. Missing `<title>` tag
2. Missing meta description
3. Missing Open Graph tags
4. Multiple H1 tags (2)

---

## 📝 Próximos Passos Sugeridos

### Fase 1 - Correções Críticas
- [ ] Remover cores purple (regra Maestro)
- [ ] Adicionar labels em formulários
- [ ] Corrigir SEO no AppLayout

### Fase 2 - Finalizar Integrações
- [ ] Testar conexão WhatsApp end-to-end
- [ ] Validar fluxo de IA completo
- [ ] Configurar webhooks em produção

### Fase 3 - Deploy
- [ ] Configurar VPS
- [ ] Deploy frontend
- [ ] Deploy Edge Functions
- [ ] Configurar domínio

---

## 🔑 Variáveis de Ambiente Necessárias

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Evolution API (WhatsApp)
EVOLUTION_API_KEY=
EVOLUTION_API_URL=
EVOLUTION_INSTANCE_NAME=

# Google AI
GEMINI_API_KEY=

# Meta (opcional)
META_PIXEL_ID=
META_ACCESS_TOKEN=

# Email (opcional)
RESEND_API_KEY=
```

---

## 📞 Suporte

Este projeto foi desenvolvido com auxílio de IA (Gemini/Antigravity) seguindo as práticas do **Antigravity Kit**.

Para continuar o desenvolvimento, use este documento como contexto no NotebookLM ou em qualquer assistente de código.
