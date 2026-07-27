-- =====================================================================
-- 0013_realtime.sql
-- Adds the tables the frontend subscribes to (via Supabase Realtime)
-- to the supabase_realtime publication: new emails, new documents,
-- AI drafts/requests, notifications.
-- =====================================================================

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.emails;
alter publication supabase_realtime add table public.email_drafts;
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.tasks;

-- Ensure full row data is available on UPDATE events (needed to diff
-- old vs new status, e.g. document processing status transitions).
alter table public.notifications replica identity full;
alter table public.emails replica identity full;
alter table public.email_drafts replica identity full;
alter table public.documents replica identity full;
alter table public.tasks replica identity full;
