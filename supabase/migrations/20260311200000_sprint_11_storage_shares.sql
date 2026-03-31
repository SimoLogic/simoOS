-- Migration: Sprint 11 - Deep Collaboration (Storage & Sharing)
-- Objective: Attachments table, Storage Buckets config, and Public Links

-- ─── 1. SECURE ATTACHMENTS TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_attachments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id TEXT NOT NULL, 
    task_id TEXT NOT NULL REFERENCES public.pmo_tasks(id) ON DELETE CASCADE,
    uploader_id TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pmo_attachments_task_idx ON public.pmo_attachments (task_id);

ALTER TABLE public.pmo_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_org_attachments ON public.pmo_attachments
    FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()::text));

CREATE POLICY insert_org_attachments ON public.pmo_attachments
    FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()::text));

CREATE POLICY delete_own_attachments ON public.pmo_attachments
    FOR DELETE USING (uploader_id = auth.uid()::text);


-- ─── 2. PUBLIC BOARD SHARES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pmo_board_shares (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id TEXT NOT NULL,
    board_id TEXT NOT NULL REFERENCES public.pmo_boards(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL, -- Secure random string
    expires_at TIMESTAMP WITH TIME ZONE, -- Null meaning never expires
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pmo_board_shares ENABLE ROW LEVEL SECURITY;

-- Anyone within the org can create/see shares for their boards
CREATE POLICY all_org_shares ON public.pmo_board_shares
    FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()::text));

-- Unauthenticated (Public) Access Rule: 
-- Public users MUST NOT be able to list all shares. They can only access via Edge API using the exact string token.
-- Therefore, we don't grant anon select on the table. The Server Action will use Service Role to resolve the token.

-- ─── 3. SUPABASE STORAGE BUCKET SCRIPTING ──────────────────────────────────
-- (Assuming pg_catalog.storage exists or this will be handled via Studio)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pmo-files', 
  'pmo-files', 
  false, 
  10485760, -- 10MB in bytes 
  '{"image/*", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"}'
)
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = 10485760,
  public = false;

-- Storage Policies
-- 1. Read access to authenticated users of the org (handled at application layer via signed URLs)
-- 2. Insert access limited to authenticated users
CREATE POLICY "Users can upload PMO files" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pmo-files');

CREATE POLICY "Users can view PMO files" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'pmo-files');

CREATE POLICY "Users can delete their own PMO files" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'pmo-files' AND auth.uid() = owner);
