-- S-14: Automations Engine DDL
-- Apply this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pmo_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL,
    board_id UUID NOT NULL,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- e.g., 'on_status_change'
    trigger_config JSONB NOT NULL,
    action_type TEXT NOT NULL, -- e.g., 'set_column'
    action_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pmo_automations_board ON pmo_automations (board_id);
CREATE INDEX IF NOT EXISTS idx_pmo_automations_active ON pmo_automations (is_active);

-- Enable RLS
ALTER TABLE pmo_automations ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policy (Isolation by org_id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pmo_automations' AND policyname = 'pmo_automations_isolation_policy'
    ) THEN
        CREATE POLICY pmo_automations_isolation_policy ON pmo_automations
        USING (org_id = CURRENT_SETTING('app.current_org_id', TRUE));
    END IF;
END $$;
