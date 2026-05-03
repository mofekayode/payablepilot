-- Posting columns on inbox_messages.
--
-- After extraction, the bookkeeper posts the bill to QuickBooks. We
-- record what we wrote so the same invoice can't be re-posted twice
-- (the qbo_bill_id is the proof) and so the audit trail is complete.

alter table inbox_messages
  add column if not exists posted_at        timestamptz,
  add column if not exists qbo_bill_id      text,
  add column if not exists qbo_vendor_id    text,
  add column if not exists qbo_project_id   text,
  add column if not exists posting_error    text;

create index if not exists inbox_messages_pending_post_idx
  on inbox_messages(business_id, received_at desc)
  where posted_at is null and extraction_status = 'done';
