-- PayablePilot multi-tenant schema
-- Run in Supabase SQL Editor (or `supabase db push` if using the CLI).

create extension if not exists "pgcrypto";

-- ---------- Tenancy ----------

-- A bookkeeping firm. The top-level tenant. Created on first sign-up.
create table if not exists firms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Users who belong to a bookkeeping firm. role: owner | bookkeeper.
create table if not exists firm_members (
  firm_id     uuid not null references firms(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'bookkeeper' check (role in ('owner','bookkeeper')),
  created_at  timestamptz not null default now(),
  primary key (firm_id, user_id)
);
create index if not exists firm_members_user_idx on firm_members(user_id);

-- A client business managed by a firm. Each business has its own
-- Gmail/QBO connections, inbox, vendors, bills.
create table if not exists businesses (
  id            uuid primary key default gen_random_uuid(),
  firm_id       uuid not null references firms(id) on delete cascade,
  name          text not null,
  legal_name    text,
  dba           text,
  ein           text,
  -- Stable, short alias used as the inbound forwarding address suffix:
  -- e.g. inbox+<alias>@inbound.payablepilot.com.
  inbox_alias   text not null unique,
  -- Optional billing/shipping addresses, used by AI content-match routing.
  addresses     jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists businesses_firm_idx on businesses(firm_id);

-- Membership on a specific business. Bookkeepers in the firm get rows here
-- automatically; client sub-logins get rows scoped to their one business.
-- role: bookkeeper | client_owner | client_viewer
create table if not exists business_members (
  business_id uuid not null references businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'bookkeeper' check (role in ('bookkeeper','client_owner','client_viewer')),
  created_at  timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index if not exists business_members_user_idx on business_members(user_id);

-- Per-user UI prefs. Tracks the last business the user was looking at.
create table if not exists user_prefs (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  last_business_id   uuid references businesses(id) on delete set null,
  updated_at         timestamptz not null default now()
);

-- ---------- Integrations ----------

-- OAuth tokens for a (business, provider) pair. Replaces cookie-based storage.
create table if not exists connections (
  business_id   uuid not null references businesses(id) on delete cascade,
  provider      text not null check (provider in ('gmail','qbo')),
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  -- Provider extras: realmId (QBO), email address (gmail), etc.
  extra         jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (business_id, provider)
);

-- ---------- Inbound mail ----------

-- Every inbound email that hits the Postmark webhook. business_id may be
-- null until routing assigns one; routing_status tracks the state machine.
create table if not exists inbox_messages (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid references businesses(id) on delete set null,
  firm_id        uuid references firms(id) on delete cascade,
  source         text not null check (source in ('gmail','postmark')),
  message_id     text,
  from_email     text,
  from_name      text,
  to_email       text,
  subject        text,
  received_at    timestamptz not null default now(),
  raw_storage_path text,
  parsed_json    jsonb not null default '{}'::jsonb,
  -- 'auto_alias' | 'auto_sender_history' | 'auto_content_match' | 'unmatched' | 'manual_assigned'
  routing_status text not null default 'unmatched',
  routing_confidence numeric,
  created_at     timestamptz not null default now()
);
create index if not exists inbox_messages_business_idx on inbox_messages(business_id, received_at desc);
create index if not exists inbox_messages_firm_unmatched_idx on inbox_messages(firm_id) where routing_status = 'unmatched';

-- Sender → business memory for the routing layer. Updated when the user
-- assigns an unmatched email; the next time the same sender shows up, we
-- can route automatically.
create table if not exists sender_routes (
  firm_id      uuid not null references firms(id) on delete cascade,
  from_email   text not null,
  business_id  uuid not null references businesses(id) on delete cascade,
  hit_count    integer not null default 1,
  updated_at   timestamptz not null default now(),
  primary key (firm_id, from_email)
);

-- ---------- Updated-at trigger ----------

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_connections_updated_at on connections;
create trigger trg_connections_updated_at before update on connections
  for each row execute function set_updated_at();

drop trigger if exists trg_user_prefs_updated_at on user_prefs;
create trigger trg_user_prefs_updated_at before update on user_prefs
  for each row execute function set_updated_at();
