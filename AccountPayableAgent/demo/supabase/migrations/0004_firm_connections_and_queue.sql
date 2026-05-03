-- Pivot to firm-level Gmail connections + Postgres-backed processing queue.
-- The bookkeeper now connects ONE Gmail mailbox at the firm level. Inbound
-- messages are routed to the right business by a worker that reads jobs
-- off `processing_jobs`.

-- ---------- connections: support firm-level rows ----------

-- The current PK is (business_id, provider). We need to allow firm-level
-- connections too, where business_id is null. Switch to a synthetic id PK
-- with two partial-unique indexes enforcing one connection per
-- (business, provider) and one per (firm, provider).

alter table connections
  add column if not exists id uuid not null default gen_random_uuid();

-- Drop the existing composite PK if present.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'connections_pkey' and conrelid = 'connections'::regclass
  ) then
    alter table connections drop constraint connections_pkey;
  end if;
end $$;

alter table connections add primary key (id);

alter table connections
  add column if not exists firm_id uuid references firms(id) on delete cascade;

alter table connections alter column business_id drop not null;

alter table connections drop constraint if exists connections_scope_check;
alter table connections add constraint connections_scope_check
  check ((firm_id is not null) <> (business_id is not null));

create unique index if not exists connections_business_provider_uniq
  on connections(business_id, provider) where business_id is not null;

create unique index if not exists connections_firm_provider_uniq
  on connections(firm_id, provider) where firm_id is not null;

-- RLS: read for any firm member (firm-level conns) or business member
-- (business-level conns). Writes still gated to firm members via the
-- existing connections_modify policy — extend it to firm-level rows.

drop policy if exists connections_select on connections;
create policy connections_select on connections for select
  using (
    (business_id is not null and is_business_member(business_id))
    or (firm_id is not null and is_firm_member(firm_id))
  );

drop policy if exists connections_modify on connections;
create policy connections_modify on connections for all
  using (
    (firm_id is not null and is_firm_member(firm_id))
    or exists (
      select 1 from businesses b
      where b.id = connections.business_id and is_firm_member(b.firm_id)
    )
  )
  with check (
    (firm_id is not null and is_firm_member(firm_id))
    or exists (
      select 1 from businesses b
      where b.id = connections.business_id and is_firm_member(b.firm_id)
    )
  );

-- ---------- gmail_sync_state ----------

-- Per-connection sync bookkeeping. last_history_id tracks where we are in
-- Gmail's history feed (used by both polling and push notifications).
create table if not exists gmail_sync_state (
  connection_id     uuid primary key references connections(id) on delete cascade,
  last_history_id   text,
  last_polled_at    timestamptz,
  watch_expires_at  timestamptz,
  updated_at        timestamptz not null default now()
);

alter table gmail_sync_state enable row level security;
-- Service-role only; no user-facing policies.

drop trigger if exists trg_gmail_sync_state_updated_at on gmail_sync_state;
create trigger trg_gmail_sync_state_updated_at before update on gmail_sync_state
  for each row execute function set_updated_at();

-- ---------- processing_jobs ----------

-- Postgres-as-queue. Workers claim batches via FOR UPDATE SKIP LOCKED.
create table if not exists processing_jobs (
  id           bigserial primary key,
  firm_id      uuid not null references firms(id) on delete cascade,
  type         text not null,
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending'
                 check (status in ('pending', 'running', 'done', 'failed', 'dead')),
  attempts     integer not null default 0,
  max_attempts integer not null default 5,
  next_run_at  timestamptz not null default now(),
  claimed_at   timestamptz,
  claimed_by   text,
  last_error   text,
  result       jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists processing_jobs_pending_idx
  on processing_jobs(next_run_at) where status = 'pending';
create index if not exists processing_jobs_firm_idx
  on processing_jobs(firm_id, created_at desc);

alter table processing_jobs enable row level security;

drop policy if exists processing_jobs_select on processing_jobs;
create policy processing_jobs_select on processing_jobs for select
  using (is_firm_member(firm_id));

-- Writes only via the service role (worker + enqueue helper).

drop trigger if exists trg_processing_jobs_updated_at on processing_jobs;
create trigger trg_processing_jobs_updated_at before update on processing_jobs
  for each row execute function set_updated_at();

-- ---------- claim_jobs RPC ----------

-- Atomically claims up to `batch_size` pending jobs whose next_run_at has
-- passed, marks them running, and returns them. Uses FOR UPDATE SKIP LOCKED
-- so concurrent workers don't double-claim the same job.

create or replace function claim_jobs(batch_size int)
returns setof processing_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update processing_jobs j
     set status = 'running',
         claimed_at = now(),
         attempts = j.attempts + 1
   where j.id in (
     select id from processing_jobs
      where status = 'pending'
        and next_run_at <= now()
      order by next_run_at asc
      limit batch_size
      for update skip locked
   )
  returning *;
end;
$$;

revoke all on function claim_jobs(int) from public;
-- Caller will be the service role through the admin Supabase client.
