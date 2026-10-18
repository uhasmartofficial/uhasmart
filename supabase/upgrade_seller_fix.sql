-- ==============================================================================
-- UHASMART - FIX SELLER UPGRADE & ROLE PERSISTENCE
-- ==============================================================================
-- Run this script in your Supabase Dashboard -> SQL Editor:
-- https://supabase.com/dashboard/project/fjhlczvwmlvtxdxcnhxi/sql/new
--
-- This script fixes:
-- 1. Automatic & persistent upgrading of customer accounts to student sellers
-- 2. Security Definer RPC function that guarantees role persistence across refreshes
-- 3. Grants & RLS policies on public.profiles so authenticated users can insert/update their profile
-- 4. Instant sync between auth.users metadata and public.profiles table
-- ==============================================================================

-- 1. TABLE PERMISSIONS & RLS POLICIES FOR PROFILES
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;

-- Ensure RLS is active but permits users to manage their own row
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

-- 2. SECURITY DEFINER RPC: UPGRADE TO SELLER
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

-- 3. AUTO-SYNC ANY EXISTING USERS WHO REQUESTED SELLER IN AUTH METADATA
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
