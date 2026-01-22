-- Enable pg_cron extension
create extension if not exists pg_cron with schema extensions;

-- Grant usage to postgres
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- 1. Agendamento: Lembrete de Acompanhamento (Every 30 minutes)
-- Invokes the followup-reminder Edge Function via http request (or local invocation if possible in pg_net, 
-- but usually in Supabase we use pg_net to call the function Endpoint)

-- Note: for local dev, calling 'localhost' from within postgres container might need 'host.docker.internal' or network alias.
-- We will assume standard Supabase Edge Function URL structure.
-- Authorization header might be needed (Service Role Key).

select cron.schedule(
    'followup-reminder-job',
    '*/30 * * * *', -- Every 30 mins
    $$
    select
        net.http_post(
            url:='http://edge_runtime:8081/functions/v1/followup-reminder',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);

-- 2. Agendamento: Relatório Diário (Every day at 8:00 AM)
select cron.schedule(
    'daily-report-job',
    '0 8 * * *', -- At 08:00
    $$
    select
        net.http_post(
            url:='http://edge_runtime:8081/functions/v1/daily-report',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);

-- Note: 'app.settings.service_role_key' is a placeholder. 
-- In migration, we can't easily access env vars directly unless set in postgres config.
-- Alternative: We hardcode the key OR usage of vault.
-- For local dev, we might skip the key or use the known 'ey...' default if strictly local.
-- BUT, `pg_net` is the standard way.

-- Let's try to simple `select 1` for now if we can't get the key, OR just set up the cron structure.
-- A safer approach for migration without exposing keys:
-- Just enable the extension. The actual schedule often needs to be run as a one-off query with the key injected, 
-- or we rely on the function validating `anon` if we open it up (bad practice).

-- REVISED STRATEGY: 
-- Just enable the extension here. 
-- We will document that the SCHEDULE needs to be applied via SQL Editor or Seed because of Secret Key dependency.
