-- RPC Function: increment_automation_count
-- Incrementa o contador de execuções de uma automação

CREATE OR REPLACE FUNCTION increment_automation_count(p_automation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.automations
  SET 
    execution_count = execution_count + 1,
    last_executed_at = now()
  WHERE id = p_automation_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_automation_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_automation_count(UUID) TO service_role;
