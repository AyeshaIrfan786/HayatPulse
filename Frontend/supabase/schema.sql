-- HayatPulse backend schema
-- Run this migration in the Supabase SQL editor for the project configured in .env.local.
-- The frontend never falls back to demo records when a table is unavailable.

create extension if not exists pgcrypto;

create table if not exists public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  available_icus integer not null default 0 check (available_icus >= 0),
  available_beds integer not null default 0 check (available_beds >= 0),
  ventilators integer not null default 0 check (ventilators >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  cnic text not null unique,
  full_name text not null,
  blood_group text,
  allergies text,
  emergency_contact text,
  medical_history text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blood_donors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  blood_group text not null,
  phone text,
  city text,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blood_requests (
  id uuid primary key default gen_random_uuid(),
  blood_group text not null,
  units integer not null default 1 check (units > 0),
  urgency text not null default 'routine',
  hospital text,
  phone text,
  status text not null default 'pending',
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flood_pins (
  id uuid primary key default gen_random_uuid(),
  reporter_name text,
  phone text,
  people_count integer not null check (people_count > 0),
  severity text not null default 'medium',
  notes text,
  latitude double precision not null,
  longitude double precision not null,
  status text not null default 'pending',
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.flood_pins add column if not exists created_by uuid references auth.users(id) default auth.uid();

create table if not exists public.bhu_vans (
  id uuid primary key default gen_random_uuid(),
  van_name text not null,
  driver_name text,
  phone text,
  home_district text,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bhu_visits (
  id uuid primary key default gen_random_uuid(),
  van_id uuid references public.bhu_vans(id) on delete set null,
  village text not null,
  scheduled_at timestamptz not null,
  services text,
  status text not null default 'scheduled',
  duration_hours numeric,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  event_type text,
  detail text,
  status text not null default 'recorded',
  actor_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.symptom_reports (
  id uuid primary key default gen_random_uuid(),
  district text,
  symptom text not null,
  reported_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid()
);

create table if not exists public.immunization_patients (
  id uuid primary key default gen_random_uuid(),
  child_name text not null,
  guardian_name text,
  phone text,
  date_of_birth date,
  district text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.vaccine_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.immunization_patients(id) on delete cascade,
  vaccine_name text not null,
  administered_at date,
  next_due_at date,
  status text not null default 'scheduled',
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.hospitals enable row level security;
alter table public.patients enable row level security;
alter table public.blood_donors enable row level security;
alter table public.blood_requests enable row level security;
alter table public.flood_pins enable row level security;
alter table public.bhu_vans enable row level security;
alter table public.bhu_visits enable row level security;
alter table public.activity_logs enable row level security;
alter table public.symptom_reports enable row level security;
alter table public.immunization_patients enable row level security;
alter table public.vaccine_events enable row level security;

-- These policies intentionally require a Supabase-authenticated operator.
-- Narrower role-based policies can replace them once operator roles are added.
drop policy if exists "authenticated operators can read hospitals" on public.hospitals;
create policy "authenticated operators can read hospitals" on public.hospitals for select to authenticated using (true);
drop policy if exists "authenticated operators can manage patients" on public.patients;
create policy "authenticated operators can manage patients" on public.patients for all to authenticated using (true) with check (true);
drop policy if exists "authenticated operators can read donors" on public.blood_donors;
create policy "authenticated operators can read donors" on public.blood_donors for select to authenticated using (true);
drop policy if exists "authenticated operators can register donors" on public.blood_donors;
create policy "authenticated operators can register donors" on public.blood_donors for insert to authenticated with check (true);
drop policy if exists "authenticated operators can read blood requests" on public.blood_requests;
create policy "authenticated operators can read blood requests" on public.blood_requests for select to authenticated using (true);
drop policy if exists "authenticated operators can create blood requests" on public.blood_requests;
create policy "authenticated operators can create blood requests" on public.blood_requests for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "authenticated operators can manage flood pins" on public.flood_pins;
create policy "authenticated operators can manage flood pins" on public.flood_pins for all to authenticated using (true) with check (true);
drop policy if exists "authenticated operators can read bhu vans" on public.bhu_vans;
create policy "authenticated operators can read bhu vans" on public.bhu_vans for select to authenticated using (true);
drop policy if exists "authenticated operators can manage bhu visits" on public.bhu_visits;
create policy "authenticated operators can manage bhu visits" on public.bhu_visits for all to authenticated using (true) with check (created_by = auth.uid());
drop policy if exists "authenticated operators can read activity" on public.activity_logs;
create policy "authenticated operators can read activity" on public.activity_logs for select to authenticated using (true);
drop policy if exists "authenticated operators can write activity" on public.activity_logs;
create policy "authenticated operators can write activity" on public.activity_logs for insert to authenticated with check (actor_id = auth.uid());
drop policy if exists "authenticated operators can read symptom reports" on public.symptom_reports;
create policy "authenticated operators can read symptom reports" on public.symptom_reports for select to authenticated using (true);
drop policy if exists "authenticated operators can create symptom reports" on public.symptom_reports;
create policy "authenticated operators can create symptom reports" on public.symptom_reports for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "authenticated operators can manage immunization patients" on public.immunization_patients;
create policy "authenticated operators can manage immunization patients" on public.immunization_patients for all to authenticated using (true) with check (created_by = auth.uid());
drop policy if exists "authenticated operators can manage vaccine events" on public.vaccine_events;
create policy "authenticated operators can manage vaccine events" on public.vaccine_events for all to authenticated using (true) with check (created_by = auth.uid());
