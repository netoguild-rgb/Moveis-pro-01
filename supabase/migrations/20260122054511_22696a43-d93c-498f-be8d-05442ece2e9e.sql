-- Add new columns to visits table for event types, follow-up, and status
ALTER TABLE public.visits 
ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'visita',
ADD COLUMN IF NOT EXISTS custom_event_name text,
ADD COLUMN IF NOT EXISTS event_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS has_followup boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS followup_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS followup_notes text,
ADD COLUMN IF NOT EXISTS conversation_notes text;

-- Add constraint for event_type values (drop first if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visits_event_type_check') THEN
    ALTER TABLE public.visits ADD CONSTRAINT visits_event_type_check 
    CHECK (event_type IN ('visita', 'medicao', 'entrega', 'pos_venda', 'custom'));
  END IF;
END $$;

-- Add constraint for event_status values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visits_event_status_check') THEN
    ALTER TABLE public.visits ADD CONSTRAINT visits_event_status_check 
    CHECK (event_status IN ('pending', 'completed', 'cancelled'));
  END IF;
END $$;

-- Create index for follow-up queries (finding overdue follow-ups)
CREATE INDEX IF NOT EXISTS idx_visits_followup ON public.visits (followup_date) WHERE has_followup = true;

-- Create index for event status queries
CREATE INDEX IF NOT EXISTS idx_visits_event_status ON public.visits (event_status);