-- Row Level Security policies.
-- The base rule: a user sees a row iff they are a member of its business
-- (or, for firm-level rows, a member of its firm).

-- Helper: is the calling user a member of this firm?
create or replace function is_firm_member(target_firm uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from firm_members
    where firm_id = target_firm and user_id = auth.uid()
  );
$$;

-- Helper: is the calling user a member of this business?
create or replace function is_business_member(target_business uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from business_members
    where business_id = target_business and user_id = auth.uid()
  );
$$;

-- ---------- firms ----------
alter table firms enable row level security;

drop policy if exists firms_select on firms;
create policy firms_select on firms for select
  using (is_firm_member(id));

drop policy if exists firms_update on firms;
create policy firms_update on firms for update
  using (exists (
    select 1 from firm_members
    where firm_id = firms.id and user_id = auth.uid() and role = 'owner'
  ));

-- Inserts go through the service role during sign-up; no policy here.

-- ---------- firm_members ----------
alter table firm_members enable row level security;

drop policy if exists firm_members_select on firm_members;
create policy firm_members_select on firm_members for select
  using (user_id = auth.uid() or is_firm_member(firm_id));

-- ---------- businesses ----------
alter table businesses enable row level security;

drop policy if exists businesses_select on businesses;
create policy businesses_select on businesses for select
  using (is_business_member(id) or is_firm_member(firm_id));

drop policy if exists businesses_update on businesses;
create policy businesses_update on businesses for update
  using (is_firm_member(firm_id));

drop policy if exists businesses_insert on businesses;
create policy businesses_insert on businesses for insert
  with check (is_firm_member(firm_id));

-- ---------- business_members ----------
alter table business_members enable row level security;

drop policy if exists business_members_select on business_members;
create policy business_members_select on business_members for select
  using (
    user_id = auth.uid()
    or is_business_member(business_id)
    or exists (
      select 1 from businesses b
      where b.id = business_id and is_firm_member(b.firm_id)
    )
  );

-- ---------- user_prefs ----------
alter table user_prefs enable row level security;

drop policy if exists user_prefs_self on user_prefs;
create policy user_prefs_self on user_prefs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- connections ----------
-- Read: any business member can see whether the integration is connected.
-- Write: only firm members (bookkeepers) can mutate tokens.
alter table connections enable row level security;

drop policy if exists connections_select on connections;
create policy connections_select on connections for select
  using (is_business_member(business_id));

drop policy if exists connections_modify on connections;
create policy connections_modify on connections for all
  using (
    exists (
      select 1 from businesses b
      where b.id = connections.business_id and is_firm_member(b.firm_id)
    )
  )
  with check (
    exists (
      select 1 from businesses b
      where b.id = connections.business_id and is_firm_member(b.firm_id)
    )
  );

-- ---------- inbox_messages ----------
alter table inbox_messages enable row level security;

drop policy if exists inbox_messages_select on inbox_messages;
create policy inbox_messages_select on inbox_messages for select
  using (
    (business_id is not null and is_business_member(business_id))
    or (firm_id is not null and is_firm_member(firm_id))
  );

-- Writes happen via the service role from the Postmark webhook, so no
-- write policy is exposed to the anon/authenticated keys.

-- ---------- sender_routes ----------
alter table sender_routes enable row level security;

drop policy if exists sender_routes_select on sender_routes;
create policy sender_routes_select on sender_routes for select
  using (is_firm_member(firm_id));
