-- ============================================================================
-- S-14: PMO Automations Engine — DDL
-- Tabla: pmo_automations
-- Propósito: Motor de reglas reactivas "When X → Then Y" para tableros PMO.
-- ============================================================================

CREATE TABLE IF NOT EXISTS pmo_automations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          TEXT NOT NULL,
    board_id        UUID NOT NULL REFERENCES pmo_boards(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    trigger_type    TEXT NOT NULL CHECK (trigger_type IN ('on_status_change', 'on_column_change')),
    trigger_config  JSONB NOT NULL DEFAULT '{}',
    action_type     TEXT NOT NULL CHECK (action_type IN ('set_column', 'notify')),
    action_config   JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index: Fast lookup por board + active
CREATE INDEX IF NOT EXISTS idx_pmo_automations_board_active
    ON pmo_automations (board_id, is_active)
    WHERE is_active = true;

-- Index: Multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_pmo_automations_org
    ON pmo_automations (org_id);

-- ============================================================================
-- RLS: Aislamiento por org_id
-- ============================================================================
ALTER TABLE pmo_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pmo_automations_tenant_isolation"
    ON pmo_automations
    FOR ALL
    USING (org_id = current_setting('app.current_org_id', true))
    WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- Bypass para service_role (Server Actions)
CREATE POLICY "pmo_automations_service_role_bypass"
    ON pmo_automations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
