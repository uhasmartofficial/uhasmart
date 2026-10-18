-- ==============================================================================
-- UHASMART - COMPLETE ALL-IN-ONE FIX SCRIPT
-- ==============================================================================
-- Run this script in your Supabase Dashboard -> SQL Editor:
-- https://supabase.com/dashboard/project/fjhlczvwmlvtxdxcnhxi/sql/new
--
-- This script guarantees:
-- 1. All required columns exist on profiles and listings (safe, idempotent)
-- 2. Seller role upgrade & persistence across page refreshes
-- 3. Security Definer RPCs for upgrading to seller and activating subscriptions
-- 4. Subscription payments table creation with RLS and permissions
-- 5. Storage bucket permissions for listing images
-- ==============================================================================

-- 1. ENSURE PROFILES COLUMNS EXIST
alter table public.profiles
  add column if not exists subscription_status text not null default 'trial',
  add column if not exists subscription_tier text default 'free_trial',
  add column if not exists trial_started_at timestamptz default now(),
  add column if not exists trial_ends_at timestamptz default (now() + interval '30 days'),
  add column if not exists subscription_expires_at timestamptz default (now() + interval '30 days'),
  add column if not exists subscription_reminder_sent boolean default false;

-- Backfill any existing profiles missing subscription dates
update public.profiles
set
  trial_started_at = coalesce(trial_started_at, created_at, now()),
  trial_ends_at = coalesce(trial_ends_at, coalesce(created_at, now()) + interval '30 days'),
  subscription_expires_at = coalesce(subscription_expires_at, coalesce(created_at, now()) + interval '30 days'),
  subscription_status = coalesce(subscription_status, 'trial')
where subscription_expires_at is null;

-- 2. ENSURE LISTINGS COLUMNS EXIST (Photos, Flyers, Price Ranges)
alter table public.listings
  add column if not exists listing_type text not null default 'product',
  add column if not exists gallery_images text[] default '{}',
  add column if not exists price_type text not null default 'fixed',
  add column if not exists price_max_ghs numeric(10, 2),
  add column if not exists contact_phone text;

alter table public.listings drop constraint if exists listings_listing_type_check;
alter table public.listings add constraint listings_listing_type_check
  check (listing_type in ('product', 'flyer'));

alter table public.listings drop constraint if exists listings_price_type_check;
alter table public.listings add constraint listings_price_type_check
  check (price_type in ('fixed', 'range'));

-- 3. TABLE PERMISSIONS & RLS POLICIES FOR PROFILES
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

-- 4. SECURITY DEFINER RPC: UPGRADE TO SELLER
create or replace function public.upgrade_to_seller(
  p_business_name text,
  p_phone_number text,
  p_campus_location text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_display_name text;
  v_existing_created_at timestamptz;
  v_expires_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'You must be signed in to register or upgrade a business';
  end if;

  -- Get current display name or fallback
  select display_name, created_at, subscription_expires_at
  into v_display_name, v_existing_created_at, v_expires_at
  from public.profiles
  where id = v_user_id;

  if v_display_name is null then
    select coalesce(
      raw_user_meta_data ->> 'display_name',
      split_part(email, '@', 1),
      'UHASMART Seller'
    ) into v_display_name
    from auth.users
    where id = v_user_id;
  end if;

  if v_expires_at is null then
    v_expires_at := now() + interval '30 days';
  end if;

  -- Upsert profile row with seller role and 30-day trial/active status
  insert into public.profiles (
    id,
    display_name,
    role,
    business_name,
    phone_number,
    campus_location,
    subscription_status,
    subscription_tier,
    trial_started_at,
    trial_ends_at,
    subscription_expires_at,
    subscription_reminder_sent
  )
  values (
    v_user_id,
    coalesce(v_display_name, 'UHASMART Seller'),
    'seller'::public.account_role,
    p_business_name,
    p_phone_number,
    p_campus_location,
    'trial',
    'free_trial',
    now(),
    v_expires_at,
    v_expires_at,
    false
  )
  on conflict (id) do update
  set
    role = 'seller'::public.account_role,
    business_name = excluded.business_name,
    phone_number = excluded.phone_number,
    campus_location = excluded.campus_location,
    subscription_status = coalesce(public.profiles.subscription_status, 'trial'),
    subscription_tier = coalesce(public.profiles.subscription_tier, 'free_trial'),
    subscription_expires_at = coalesce(public.profiles.subscription_expires_at, now() + interval '30 days');

  -- Also update auth.users raw_user_meta_data for immediate token consistency
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role', 'seller',
    'business_name', p_business_name,
    'phone_number', p_phone_number,
    'campus_location', p_campus_location
  )
  where id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'role', 'seller',
    'business_name', p_business_name,
    'phone_number', p_phone_number,
    'campus_location', p_campus_location
  );
end;
$$;

grant execute on function public.upgrade_to_seller(text, text, text) to authenticated;

-- 5. AUTO-SYNC ANY EXISTING USERS WHO REQUESTED SELLER IN AUTH METADATA
update public.profiles p
set
  role = 'seller'::public.account_role,
  business_name = coalesce(p.business_name, nullif(u.raw_user_meta_data ->> 'business_name', '')),
  phone_number = coalesce(p.phone_number, nullif(u.raw_user_meta_data ->> 'phone_number', '')),
  campus_location = coalesce(p.campus_location, nullif(u.raw_user_meta_data ->> 'campus_location', ''))
from auth.users u
where p.id = u.id
  and lower(coalesce(u.raw_user_meta_data ->> 'role', '')) = 'seller'
  and p.role <> 'seller';

-- 6. SUBSCRIPTION PAYMENTS TABLE (Guaranteed existence & grants)
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  amount_ghs numeric(10, 2) not null check (amount_ghs >= 0),
  plan_name text not null,
  duration_days integer not null default 30,
  payment_method text not null default 'paystack',
  momo_number text,
  momo_network text,
  reference text not null unique,
  status text not null default 'success' check (status in ('pending', 'success', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.subscription_payments enable row level security;
grant select, insert on public.subscription_payments to authenticated;
grant select on public.subscription_payments to anon;

drop policy if exists "Users view own subscription payments" on public.subscription_payments;
create policy "Users view own subscription payments"
  on public.subscription_payments for select
  using (seller_id = (select auth.uid()));

drop policy if exists "Users insert own subscription payments" on public.subscription_payments;
create policy "Users insert own subscription payments"
  on public.subscription_payments for insert to authenticated
  with check (seller_id = (select auth.uid()));

-- 7. SECURITY DEFINER RPC: ACTIVATE SELLER SUBSCRIPTION (PAYSTACK & SYSTEM BY USER ID)
create or replace function public.activate_seller_subscription_for_user(
  p_user_id uuid,
  p_plan_name text,
  p_duration_days integer,
  p_amount_ghs numeric,
  p_payment_method text,
  p_momo_number text,
  p_momo_network text,
  p_reference text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_expiry timestamptz;
  v_new_expiry timestamptz;
begin
  if p_user_id is null then
    raise exception 'User ID must be provided';
  end if;

  -- Prevent duplicate activation if reference was already recorded, but ensure profile is active
  if exists (select 1 from public.subscription_payments where reference = p_reference and status = 'success') then
    select subscription_expires_at into v_new_expiry from public.profiles where id = p_user_id;
    update public.profiles
    set
      role = 'seller'::public.account_role,
      subscription_status = 'active',
      subscription_tier = coalesce(p_plan_name, subscription_tier),
      subscription_expires_at = coalesce(v_new_expiry, now() + (p_duration_days || ' days')::interval)
    where id = p_user_id;
    return json_build_object('success', true, 'new_expiry', coalesce(v_new_expiry, now() + (p_duration_days || ' days')::interval), 'message', 'Already processed');
  end if;

  -- Fetch current expiry timestamp
  select subscription_expires_at into v_current_expiry
  from public.profiles
  where id = p_user_id;

  -- If still active, extend; else start from now
  if v_current_expiry is not null and v_current_expiry > now() then
    v_new_expiry := v_current_expiry + (p_duration_days || ' days')::interval;
  else
    v_new_expiry := now() + (p_duration_days || ' days')::interval;
  end if;

  -- Record the payment
  insert into public.subscription_payments (
    seller_id,
    amount_ghs,
    plan_name,
    duration_days,
    payment_method,
    momo_number,
    momo_network,
    reference,
    status
  ) values (
    p_user_id,
    p_amount_ghs,
    p_plan_name,
    p_duration_days,
    p_payment_method,
    p_momo_number,
    p_momo_network,
    p_reference,
    'success'
  );

  -- Update seller profile and ensure role is 'seller'
  update public.profiles
  set
    role = 'seller'::public.account_role,
    subscription_status = 'active',
    subscription_tier = p_plan_name,
    subscription_expires_at = v_new_expiry,
    subscription_reminder_sent = false
  where id = p_user_id;

  return json_build_object(
    'success', true,
    'new_expiry', v_new_expiry,
    'plan', p_plan_name
  );
end;
$$;

grant execute on function public.activate_seller_subscription_for_user(uuid, text, integer, numeric, text, text, text, text) to authenticated, anon;

-- 8. SECURITY DEFINER RPC: ACTIVATE SELLER SUBSCRIPTION (AUTH.UID() CALLER CONVENIENCE)
create or replace function public.activate_seller_subscription(
  p_plan_name text,
  p_duration_days integer,
  p_amount_ghs numeric,
  p_payment_method text,
  p_momo_number text,
  p_momo_network text,
  p_reference text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'User must be authenticated';
  end if;

  return public.activate_seller_subscription_for_user(
    v_user_id,
    p_plan_name,
    p_duration_days,
    p_amount_ghs,
    p_payment_method,
    p_momo_number,
    p_momo_network,
    p_reference
  );
end;
$$;

grant execute on function public.activate_seller_subscription(text, integer, numeric, text, text, text, text) to authenticated;

-- 9. ENSURE STORAGE BUCKET PERMISSIONS
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public Access for Listing Images" on storage.objects;
create policy "Public Access for Listing Images"
  on storage.objects for select
  using (bucket_id = 'listing-images');

drop policy if exists "Authenticated Users Upload Listing Images" on storage.objects;
create policy "Authenticated Users Upload Listing Images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images');

drop policy if exists "Users Manage Their Own Listing Images" on storage.objects;
create policy "Users Manage Their Own Listing Images"
  on storage.objects for all to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
