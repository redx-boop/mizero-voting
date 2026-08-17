-- ============================================================================
-- MIZERO AWARDS — Database Schema (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- HOW TO USE:
--   1. Create a free project at https://supabase.com
--   2. Open your project → SQL Editor
--   3. Paste the ENTIRE contents of this file and press Run
--
-- This file creates:
--   profiles     – one row per user (name, student ID, class, role)
--   categories   – award categories (Miss Mizero, Best Team, ...)
--   candidates   – people/teams nominated inside a category
--   votes        – one vote per student per category
--   settings     – a single row holding the global election configuration
--   helper functions + Row Level Security policies
--
-- It is safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: is the current logged-in user an admin?
--
-- WHY 'security definer'? By default a function runs with the permissions of
-- whoever calls it, and RLS would apply to its internal queries. Marking it
-- SECURITY DEFINER makes it run as its owner (postgres), so it can read the
-- profiles table without re-triggering the profiles RLS policies (which would
-- cause infinite recursion).
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================================
-- 1. PROFILES
-- ----------------------------------------------------------------------------
-- Linked 1-to-1 with Supabase Auth users (auth.users). Contains the school
-- identity: student ID, full name, class and role.
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_id text unique,                       -- e.g. MIZ-2026-001
  full_name text not null,
  class_name text,                              -- e.g. Senior 6
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

-- Automatically create a profile row whenever someone signs up with Supabase
-- Auth. The row starts with the full name and class sent in the sign-up
-- metadata (student_id stays NULL — students no longer need one); the
-- registration form finalizes it when a session is available.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, class_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Student'),
    coalesce(nullif(new.raw_user_meta_data->>'class_name', ''), null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Students must not be able to change their identity after registration
-- (student ID is fixed once set) and never their role. Only admins may
-- change roles. This trigger is the final safety net even if a policy
-- is misconfigured later.
create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.student_id is distinct from old.student_id and old.student_id is not null then
    raise exception 'student_id cannot be changed after registration';
  end if;
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'only an admin can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_identity on public.profiles;
create trigger protect_profile_identity
  before update on public.profiles
  for each row execute function public.protect_profile_identity();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY on profiles
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Students can only read their OWN profile. Admins can read all profiles
-- (needed for the admin dashboard statistics). No one can read profiles
-- while logged out.
create policy "users can read their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "admins can read all profiles"
  on public.profiles for select to authenticated
  using (public.is_admin());

-- The registration flow inserts / updates the user's own profile row.
create policy "users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "admins can update any profile"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- 2. CATEGORIES
-- ============================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,                   -- url-friendly name, e.g. miss-mizero
  description text,
  icon text not null default '🏆',
  image_url text,
  is_active boolean not null default true,
  voting_start timestamptz,                    -- optional per-category window
  voting_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

-- Categories are public information (shown on the homepage to everyone).
create policy "categories are publicly readable"
  on public.categories for select using (true);

-- Only admins can create, change or delete categories.
create policy "only admins can create categories"
  on public.categories for insert to authenticated
  with check (public.is_admin());

create policy "only admins can update categories"
  on public.categories for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "only admins can delete categories"
  on public.categories for delete to authenticated
  using (public.is_admin());

-- ============================================================================
-- 3. CANDIDATES
-- ============================================================================
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  description text,
  class_name text,
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists candidates_category_idx on public.candidates(category_id);

alter table public.candidates enable row level security;

-- Candidate names/photos are public information.
create policy "candidates are publicly readable"
  on public.candidates for select using (true);

-- Only admins can create, change or delete candidates.
create policy "only admins can create candidates"
  on public.candidates for insert to authenticated
  with check (public.is_admin());

create policy "only admins can update candidates"
  on public.candidates for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "only admins can delete candidates"
  on public.candidates for delete to authenticated
  using (public.is_admin());

-- ============================================================================
-- 4. VOTES  ⛔ the most security-critical table
-- ----------------------------------------------------------------------------
-- One row = one student voting for one candidate in one category.
--
-- DUPLICATE VOTE PROTECTION:
--   constraint votes_user_category_unique UNIQUE (user_id, category_id)
--
-- PostgreSQL refuses to store two rows with the same (user_id, category_id),
-- so a student can NEVER vote twice in the same category — no matter what the
-- frontend or a malicious user tries. This is a database-level guarantee,
-- independent of any JavaScript code.
-- ============================================================================
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint votes_user_category_unique unique (user_id, category_id)
);

create index if not exists votes_category_idx on public.votes(category_id);
create index if not exists votes_candidate_idx on public.votes(candidate_id);

alter table public.votes enable row level security;

-- Students may only insert votes:
--   • for themselves (user_id must be their own id)
--   • for an ACTIVE candidate that belongs to the category they chose
--   • in an ACTIVE category that is inside its voting window
--   • while the global election is open
-- The UNIQUE constraint above is what stops a second vote per category.
create policy "students can cast their own votes"
  on public.votes for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.candidates c
      where c.id = candidate_id
        and c.category_id = votes.category_id
        and c.is_active
    )
    and exists (
      select 1 from public.categories cat
      where cat.id = votes.category_id
        and cat.is_active
        and (cat.voting_start is null or cat.voting_start <= now())
        and (cat.voting_end is null or cat.voting_end >= now())
    )
    and (
      select (s.voting_start is null or s.voting_start <= now())
         and (s.voting_end is null or s.voting_end >= now())
      from public.settings s
      where s.id = 1
    )
  );

-- Students can only read their OWN votes (the vote page shows them what they
-- already voted for). Admins can read everything for results & statistics.
create policy "students can read their own votes"
  on public.votes for select to authenticated
  using (auth.uid() = user_id);

create policy "admins can read all votes"
  on public.votes for select to authenticated
  using (public.is_admin());

-- There is deliberately NO update policy: a vote can never be edited.
-- Only admins may delete a vote (e.g. to fix an accidental wrong vote).
create policy "admins can delete votes"
  on public.votes for delete to authenticated
  using (public.is_admin());

-- ============================================================================
-- 5. SETTINGS (single-row configuration table)
-- ----------------------------------------------------------------------------
-- Holds the global election window, results visibility and whether student
-- registration is allowed. 'after_close' = results are shown to students
-- only once voting has ended.
-- ============================================================================
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  election_name text not null default 'Mizero Awards',
  election_year text not null default '2026',
  voting_start timestamptz,
  voting_end timestamptz,
  results_visibility text not null default 'after_close'
    check (results_visibility in ('hidden', 'visible', 'after_close')),
  allow_registration boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

alter table public.settings enable row level security;

create policy "settings are publicly readable"
  on public.settings for select using (true);

create policy "only admins can insert settings"
  on public.settings for insert to authenticated
  with check (public.is_admin());

create policy "only admins can update settings"
  on public.settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- 6. RESULTS FUNCTION
-- ----------------------------------------------------------------------------
-- Why a function instead of letting the app read the votes table directly?
-- The votes table is private (RLS only lets you read your own votes), so the
-- results page could never count votes. This SECURITY DEFINER function runs
-- as the database owner and returns ONLY aggregated counts — never individual
-- voters. It also enforces the admin's results-visibility setting, so the
-- "hidden results" rule is enforced by the database itself, not just the UI.
-- ============================================================================
create or replace function public.get_category_results()
returns table (
  category_id uuid,
  category_name text,
  candidate_id uuid,
  candidate_name text,
  candidate_class text,
  photo_url text,
  vote_count bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_settings public.settings%rowtype;
begin
  select * into v_settings from public.settings where id = 1;

  -- Hide results according to the admin configuration.
  -- Admins can always see results, even while voting is active.
  if not public.is_admin() then
    if v_settings.results_visibility = 'hidden' then
      return;  -- returns zero rows
    end if;
    if v_settings.results_visibility = 'after_close'
       and (v_settings.voting_end is null or now() < v_settings.voting_end) then
      return;
    end if;
  end if;

  return query
    select
      cat.id,
      cat.name,
      cand.id,
      cand.name,
      cand.class_name,
      cand.photo_url,
      count(v.id)::bigint
    from public.categories cat
    join public.candidates cand on cand.category_id = cat.id
    left join public.votes v on v.candidate_id = cand.id
    where cand.is_active
    group by cat.id, cand.id
    order by cat.name, count(v.id) desc;
end;
$$;

grant execute on function public.get_category_results() to anon, authenticated;

-- ============================================================================
-- 7. STORAGE — candidate photos
-- ----------------------------------------------------------------------------
-- Creates a public bucket where admins upload candidate photos. The app only
-- ever stores the photo's public URL in the candidates table.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('candidate-photos', 'candidate-photos', true)
on conflict (id) do nothing;

drop policy if exists "candidate photos are publicly readable" on storage.objects;
create policy "candidate photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'candidate-photos');

drop policy if exists "admins can upload candidate photos" on storage.objects;
create policy "admins can upload candidate photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'candidate-photos' and public.is_admin());

drop policy if exists "admins can update candidate photos" on storage.objects;
create policy "admins can update candidate photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'candidate-photos' and public.is_admin());

drop policy if exists "admins can delete candidate photos" on storage.objects;
create policy "admins can delete candidate photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'candidate-photos' and public.is_admin());

-- ============================================================================
-- DONE ✅  Next: run supabase/seed.sql for demo data.
-- ============================================================================
