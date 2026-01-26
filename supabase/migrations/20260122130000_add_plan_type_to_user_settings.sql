-- Adicionar coluna plan_type na tabela user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'starter';

-- Opcional: Adicionar constraint para validar valores permitidos
ALTER TABLE user_settings 
ADD CONSTRAINT check_plan_type CHECK (plan_type IN ('starter', 'pro', 'enterprise'));

-- Atualizar comentários
COMMENT ON COLUMN user_settings.plan_type IS 'Tipo de plano do usuário: starter, pro ou enterprise';
