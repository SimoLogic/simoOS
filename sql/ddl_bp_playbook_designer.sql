-- ============================================================================
-- MIGRATION: Business Plan — Playbook Designer
-- Tables: bp_playbooks, bp_playbook_steps
-- Created: 2026-03-15
-- Module: Business Plan > Playbook Designer
-- ============================================================================

-- ─── bp_playbooks ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bp_playbooks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'GROWTH',       -- CORE | GROWTH | ELITE
  family          TEXT NOT NULL DEFAULT 'COMMERCIAL',   -- COMMERCIAL | OPERATIONAL
  strategy        TEXT NOT NULL DEFAULT 'B2B',          -- B2B | B2C | NPPM
  purpose         TEXT,
  status          TEXT NOT NULL DEFAULT 'DRAFT',        -- DRAFT | SUBMITTED
  global_owners   TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Multi-tenant FK (references organizations.id)
  CONSTRAINT fk_bp_playbooks_org
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bp_playbooks_org_id ON bp_playbooks(org_id);

-- ─── bp_playbook_steps ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bp_playbook_steps (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      TEXT NOT NULL,
  playbook_id                 UUID NOT NULL,
  uid                         TEXT NOT NULL,           -- Business UID e.g. "HBT032"
  step_num                    TEXT NOT NULL,           -- "01", "02", ...
  name                        TEXT NOT NULL,           -- UPPERCASE activity name
  type_of_activity            TEXT,
  purpose                     TEXT,
  activity_description        TEXT,
  deliverable                 TEXT,
  deliverable_description     TEXT,
  stakeholder                 TEXT,
  frequency                   TEXT NOT NULL DEFAULT 'DAILY',
  repetitions                 INT NOT NULL DEFAULT 1,
  freq_notes                  TEXT,
  scheduler_value             INT NOT NULL DEFAULT 0,  -- Workday offset (WorkdayHelper Llave #2)
  supporting_task             TEXT,
  counteraction_description   TEXT,
  requested_to                TEXT,                    -- Employee ID
  sla                         TEXT,
  sla_description             TEXT,
  is_locked                   BOOLEAN NOT NULL DEFAULT FALSE,    -- Shield Protocol
  is_repeatable               BOOLEAN NOT NULL DEFAULT FALSE,    -- Library membership
  position                    INT NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_bp_playbook_steps_playbook
    FOREIGN KEY (playbook_id) REFERENCES bp_playbooks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bp_playbook_steps_org_id      ON bp_playbook_steps(org_id);
CREATE INDEX IF NOT EXISTS idx_bp_playbook_steps_playbook_id ON bp_playbook_steps(playbook_id);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_bp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bp_playbooks_updated_at
  BEFORE UPDATE ON bp_playbooks
  FOR EACH ROW EXECUTE FUNCTION update_bp_updated_at();

CREATE TRIGGER trg_bp_playbook_steps_updated_at
  BEFORE UPDATE ON bp_playbook_steps
  FOR EACH ROW EXECUTE FUNCTION update_bp_updated_at();
