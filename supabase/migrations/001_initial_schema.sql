-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  email_notifications boolean default true,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- TRACKED SITES
-- ─────────────────────────────────────────
create table public.tracked_sites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  url text not null,
  type text not null check (type in ('website', 'rss', 'twitter', 'linkedin', 'telegram')),
  category text default 'job' check (category in ('job', 'internship', 'attachment', 'tender', 'all')),
  check_interval_hours int default 6,
  last_checked_at timestamptz,
  last_found_count int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.tracked_sites enable row level security;
create policy "Users manage own sites" on public.tracked_sites for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- JOBS
-- ─────────────────────────────────────────
create table public.jobs (
  id uuid default uuid_generate_v4() primary key,
  -- source tracking
  source_site_id uuid references public.tracked_sites(id) on delete set null,
  source_name text,
  source_url text,
  external_id text, -- dedup key from source
  -- job data
  title text not null,
  company text not null,
  location text default 'Kenya',
  type text default 'job' check (type in ('job', 'internship', 'attachment', 'tender')),
  description text,
  requirements text,
  salary text,
  deadline date,
  apply_url text,
  -- metadata
  posted_at timestamptz,
  discovered_at timestamptz default now(),
  is_active boolean default true,
  -- dedup
  unique(external_id, source_name)
);

-- Jobs are public (anyone can read)
alter table public.jobs enable row level security;
create policy "Jobs are publicly readable" on public.jobs for select using (true);
create policy "Service role can insert jobs" on public.jobs for insert with check (true);
create policy "Service role can update jobs" on public.jobs for update using (true);

-- ─────────────────────────────────────────
-- SAVED JOBS (per user)
-- ─────────────────────────────────────────
create table public.saved_jobs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  job_id uuid references public.jobs(id) on delete cascade not null,
  status text default 'saved' check (status in ('saved', 'applied', 'shortlisted', 'rejected')),
  notes text,
  saved_at timestamptz default now(),
  unique(user_id, job_id)
);

alter table public.saved_jobs enable row level security;
create policy "Users manage own saved jobs" on public.saved_jobs for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  job_id uuid references public.jobs(id) on delete cascade,
  title text not null,
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "Users see own notifications" on public.notifications for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- DEFAULT TRACKED SITES (seeded for all users)
-- ─────────────────────────────────────────
-- These are system-level sites. Per-user sites live in tracked_sites.
create table public.system_sources (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  url text not null,
  type text not null,
  rss_url text,
  category text default 'all',
  is_active boolean default true,
  last_checked_at timestamptz,
  created_at timestamptz default now()
);

-- System sources are readable by all
alter table public.system_sources enable row level security;
create policy "System sources are public" on public.system_sources for select using (true);

-- Seed system sources
insert into public.system_sources (name, url, type, rss_url, category) values
  ('Fuzu Kenya', 'https://fuzu.com/kenya', 'website', 'https://fuzu.com/kenya/jobs.rss', 'job'),
  ('BrighterMonday Kenya', 'https://www.brightermonday.co.ke', 'website', 'https://www.brightermonday.co.ke/rss/jobs', 'job'),
  ('MyJobMag Kenya', 'https://www.myjobmag.co.ke', 'website', null, 'job'),
  ('PPRA Tenders', 'https://www.ppra.go.ke/tenders', 'website', null, 'tender'),
  ('Kenyatta University Jobs', 'https://www.ku.ac.ke/vacancies', 'website', null, 'job'),
  ('Nation Media Careers', 'https://www.nationmedia.com/careers', 'website', null, 'job');

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
create index jobs_type_idx on public.jobs(type);
create index jobs_deadline_idx on public.jobs(deadline);
create index jobs_discovered_idx on public.jobs(discovered_at desc);
create index jobs_company_idx on public.jobs(company);
create index tracked_sites_user_idx on public.tracked_sites(user_id);
create index notifications_user_idx on public.notifications(user_id, is_read);
