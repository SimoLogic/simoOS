-- ============================================================
-- MIGRACIÓN: add_pmo_ical_feed_tokens
-- Aplicar en Supabase SQL Editor si prisma migrate dev falla
-- por DATABASE_URL no configurada localmente.
-- ============================================================

CREATE TABLE IF NOT EXISTS pmo_ical_feed_tokens (
  id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id        TEXT        NOT NULL UNIQUE,
  org_id         TEXT        NOT NULL,
  token          TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  last_access_at TIMESTAMPTZ,
  filters        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pmo_ical_feed_tokens_token
  ON pmo_ical_feed_tokens(token);

-- Verificación — debe retornar 8 filas:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'pmo_ical_feed_tokens'
-- ORDER BY ordinal_position;
