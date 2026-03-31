-- Migration: pmo_notifications & trigger engine hooks
-- Objective: Sprint 10 Automation Engine & Proactive Notifications

-- ─── 1. SECURE NOTIFICATIONS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id TEXT NOT NULL, -- Mandatory tenant isolation
    user_id TEXT NOT NULL, -- Target user
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'task_assigned', 'status_changed', 'sla_warning'
    related_entity_id TEXT, -- e.g., taskId
    related_entity_type VARCHAR(50), -- e.g., 'pmo_task'
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries on unread items
CREATE INDEX IF NOT EXISTS pmo_notifications_user_read_idx ON public.pmo_notifications (user_id, read);

-- ─── 2. ROW LEVEL SECURITY (RLS) ─────────────────────────────────────────
ALTER TABLE public.pmo_notifications ENABLE ROW LEVEL SECURITY;

-- Select Policy: Users can only see their own notifications within their tenant
CREATE POLICY select_own_notifications ON public.pmo_notifications
    FOR SELECT
    USING (user_id = auth.uid()::text AND org_id = (SELECT org_id FROM users WHERE id = auth.uid()::text));

-- Insert Policy: Service Role only or trigger-based (Automation Worker)
-- Note: As the worker operates with service_role key, it bypasses RLS for insertion.
-- But if executed by client API, we restrict insertion.
CREATE POLICY insert_notifications_worker_only ON public.pmo_notifications
    FOR INSERT
    WITH CHECK (auth.uid() IS NULL); -- Only service role (no authenticated user context) can insert freely. We refine if needed.

-- Update Policy: Users can mark their own as read
CREATE POLICY update_own_notifications ON public.pmo_notifications
    FOR UPDATE
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

-- Delete Policy: Users can dismiss their own
CREATE POLICY delete_own_notifications ON public.pmo_notifications
    FOR DELETE
    USING (user_id = auth.uid()::text);
