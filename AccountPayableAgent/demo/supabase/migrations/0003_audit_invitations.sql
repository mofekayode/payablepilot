-- Audit log + invitation system.
-- Audit log: every meaningful state change. Append-only, firm-scoped.
-- Invitations: bookkeeper invites a teammate (admin) or client user (viewer)
-- to a specific business. Token in the URL; expires after 7 days.

-- ---------- audit_log ----------

create table if not exists audit_log (
  id            bigserial primary key,
  firm_id       uuid references firms(id) on delete cascade,
  business_id   uuid references businesses(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  -- e.g. 'firm.create', 'business.create', 'connection.set', 'connection.clear',
  -- 'business.switch', 'invite.create', 'invite.accept', 'member.role_change'
  action        text not null,
  -- Free-form structured details: target ids, before/after values, etc.
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists audit_log_firm_idx on audit_log(firm_id, created_at desc);
create index if not exists audit_log_business_idx on audit_log(business_id, created_at desc);
create index if not exists audit_log_actor_idx on audit_log(actor_user_id, created_at desc);

alter table audit_log enable row level security;

drop policy if exists audit_log_select on audit_log;
create policy audit_log_select on audit_log for select
  using (
    (firm_id is not null and is_firm_member(firm_id))
    or (business_id is not null and is_business_member(business_id))
  );

-- Writes happen through the service role client (server-side helper). No
-- write policies — clients can never directly insert audit rows.

-- ---------- business_invitations ----------

create table if not exists business_invitations (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  firm_id      uuid not null references firms(id) on delete cascade,
  email        text not null,
  -- 'admin' = client_owner (full access to their business)
  -- 'viewer' = client_viewer (read-only)
  -- 'bookkeeper' = teammate inside the firm (gains firm_member access)
  role         text not null check (role in ('admin','viewer','bookkeeper')),
  token        text not null unique,
  invited_by   uuid references auth.users(id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users(id) on delete set null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists business_invitations_business_idx on business_invitations(business_id);
create index if not exists business_invitations_firm_idx on business_invitations(firm_id);
create unique index if not exists business_invitations_pending_email
  on business_invitations(business_id, lower(email))
  where accepted_at is null and revoked_at is null;

alter table business_invitations enable row level security;

drop policy if exists business_invitations_select on business_invitations;
create policy business_invitations_select on business_invitations for select
  using (is_firm_member(firm_id) or is_business_member(business_id));

-- All writes through the service role; no direct insert/update from clients.
