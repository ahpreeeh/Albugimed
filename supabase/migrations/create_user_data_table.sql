-- =====================================================================
-- Migration AlbugiMed : table user_data
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- =====================================================================

-- Table clé/valeur par utilisateur (stocke toutes les données localStorage)
create table if not exists public.user_data (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  data_key   text        not null,
  data_value jsonb,
  updated_at timestamptz not null default now(),

  primary key (user_id, data_key)
);

-- Row Level Security : chaque utilisateur ne voit que ses propres données
alter table public.user_data enable row level security;

create policy "Lecture : propriétaire uniquement"
  on public.user_data
  for select
  using (auth.uid() = user_id);

create policy "Insertion : propriétaire uniquement"
  on public.user_data
  for insert
  with check (auth.uid() = user_id);

create policy "Mise à jour : propriétaire uniquement"
  on public.user_data
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Suppression : propriétaire uniquement"
  on public.user_data
  for delete
  using (auth.uid() = user_id);

-- Index sur user_id pour les requêtes "récupérer toutes les données d'un user"
create index if not exists user_data_user_id_idx on public.user_data(user_id);

-- Trigger : met à jour updated_at automatiquement à chaque modification
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_data_updated_at
  before update on public.user_data
  for each row execute function public.set_updated_at();
