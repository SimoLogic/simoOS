-- Sprint 8: Activity Log and Human Factor
-- Create table for tracking granular changes to PMO Tasks

CREATE TABLE IF NOT EXISTS public.pmo_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- e.g., 'STATUS_CHANGE', 'TITLE_CHANGE', 'ASSIGNEE_CHANGE'
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying on Side Peek
CREATE INDEX IF NOT EXISTS idx_pmo_activity_logs_task_id ON public.pmo_activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_pmo_activity_logs_org_id ON public.pmo_activity_logs(org_id);

-- RLS Policies
ALTER TABLE public.pmo_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity logs in their org"
    ON public.pmo_activity_logs
    FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert activity logs in their org"
    ON public.pmo_activity_logs
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

-- Note: We do not allow UPDATE or DELETE on activity logs to maintain true audit trail.
