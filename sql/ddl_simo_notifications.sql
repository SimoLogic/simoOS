CREATE TABLE IF NOT EXISTS public.simo_notifications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          TEXT        NOT NULL,
    user_id         TEXT        NOT NULL,
    type            TEXT        NOT NULL CHECK (type IN ('APPROVAL','TASK','FORM','ALERT')),
    module          TEXT        NOT NULL,
    title           TEXT        NOT NULL,
    summary         TEXT,
    action_url      TEXT        NOT NULL,
    entity_id       TEXT,
    entity_type     TEXT,
    status          TEXT        NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','READ','RESOLVED','DISMISSED')),
    priority        TEXT        NOT NULL DEFAULT 'NORMAL'
                    CHECK (priority IN ('HIGH','NORMAL','LOW')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_simo_notifications_user 
    ON public.simo_notifications(org_id, user_id, status);
