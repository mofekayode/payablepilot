-- Field extraction status on inbox_messages + realtime publication.
--
-- Extraction is the second stage after routing. Once a message lands
-- in a business inbox, a worker pulls the attachment from
-- parsed_json.attachments[0].base64, calls Claude, and writes the
-- structured fields back here.

alter table inbox_messages
  add column if not exists extracted_fields jsonb,
  add column if not exists extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'extracting', 'done', 'failed', 'skipped')),
  add column if not exists extraction_error text;

-- Add inbox_messages to the Realtime publication so the client can
-- subscribe to row changes (INSERT / UPDATE) and reflect routing +
-- extraction status without polling.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'inbox_messages'
     )
  then
    execute 'alter publication supabase_realtime add table inbox_messages';
  end if;
end $$;
