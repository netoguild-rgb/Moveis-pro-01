-- 1. Mensagens do WhatsApp
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  conversation_id UUID NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  content TEXT,
  media_url TEXT,
  media_type TEXT, -- text, image, audio, video, document
  direction TEXT NOT NULL, -- inbound, outbound
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, read, failed
  ai_suggested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Conversas/Contatos
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID REFERENCES public.clients(id),
  lead_id UUID REFERENCES public.leads(id),
  phone TEXT NOT NULL,
  name TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open', -- open, waiting, responded, closed
  assigned_to UUID, -- membro da equipe
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Automações
CREATE TABLE public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- new_contact, no_response, lead_score, deal_closed
  trigger_config JSONB,
  action_type TEXT NOT NULL, -- send_message, create_lead, notify, move_pipeline
  action_config JSONB,
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Logs de Automação
CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES public.automations(id),
  trigger_data JSONB,
  result TEXT, -- success, failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Notificações
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL, -- new_lead, new_message, followup_reminder, deal_closed
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Configurações do Usuário
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  whatsapp_instance_id TEXT,
  whatsapp_connected BOOLEAN DEFAULT false,
  meta_pixel_id TEXT,
  meta_access_token TEXT,
  ga4_id TEXT,
  gtm_id TEXT,
  notification_preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Relatórios de IA
CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL, -- opportunity, trend, alert
  title TEXT NOT NULL,
  description TEXT,
  action_label TEXT,
  action_data JSONB,
  is_read BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Generic Policy: "Users can manage their own data"
CREATE POLICY "Users can manage their own messages" ON public.messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own conversations" ON public.conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own automations" ON public.automations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own settings" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own insights" ON public.ai_insights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Automation Logs Policy (view/insert triggered by system/owner)
-- Maybe logs don't have user_id directly, they link to automation.
-- So we check automation user_id.
CREATE POLICY "Users can view logs of their automations" ON public.automation_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.automations WHERE automations.id = automation_logs.automation_id AND automations.user_id = auth.uid()));

-- Team Policy for Messages (from prompt)
CREATE POLICY "Team members can view workspace messages"
ON public.messages FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.workspace_id = (
      SELECT workspace_id FROM public.team_members
      WHERE user_id = messages.user_id
        LIMIT 1 -- Simplified assumption: user belongs to one workspace context or we pick one? 
        -- The original prompt query was a bit ambiguous if user is in multiple workspaces.
        -- Let's stick to the prompt logic but fix syntax if needed.
        -- Prompt: WHERE user_id = messages.user_id (this refers to the owner of the message)
    )
  )
);

-- Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- visits is already there (or should be added if not)
ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;
