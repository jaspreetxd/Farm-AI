-- Run this once in the Supabase SQL Editor for the project.
create table if not exists public.diagnosis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('text', 'photo')),
  query_text text not null check (char_length(query_text) <= 2000),
  thumbnail text,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists diagnosis_history_user_created_idx
  on public.diagnosis_history (user_id, created_at desc);

alter table public.diagnosis_history enable row level security;

revoke all on table public.diagnosis_history from anon;
grant select, insert, update, delete on table public.diagnosis_history to authenticated;

drop policy if exists "Users can read their diagnosis history" on public.diagnosis_history;
create policy "Users can read their diagnosis history"
  on public.diagnosis_history for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their diagnosis history" on public.diagnosis_history;
create policy "Users can create their diagnosis history"
  on public.diagnosis_history for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their diagnosis history" on public.diagnosis_history;
create policy "Users can update their diagnosis history"
  on public.diagnosis_history for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their diagnosis history" on public.diagnosis_history;
create policy "Users can delete their diagnosis history"
  on public.diagnosis_history for delete to authenticated
  using ((select auth.uid()) = user_id);
