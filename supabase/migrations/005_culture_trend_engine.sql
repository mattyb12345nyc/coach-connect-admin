-- Culture Trend Engine schema updates

do $$ begin
  create type culture_scope_type as enum ('global', 'store');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type trend_candidate_status as enum ('generated', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists culture_trend_candidates (
  id uuid primary key default gen_random_uuid(),
  type culture_item_type not null default 'trend',
  category text not null,
  title text not null,
  description text not null,
  engagement_text text,
  image_prompt text,
  image_url text,
  trend_query text,
  trend_source text not null default 'perplexity',
  selection_payload jsonb not null default '{}'::jsonb,
  scope_type culture_scope_type not null default 'global',
  store_id uuid references stores(id) on delete set null,
  status trend_candidate_status not null default 'generated',
  generated_by uuid references app_users(id) on delete set null,
  approved_by uuid references app_users(id) on delete set null,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table culture_feed_items
  add column if not exists scope_type culture_scope_type not null default 'global';

alter table culture_feed_items
  add column if not exists store_id uuid references stores(id) on delete set null;

alter table culture_feed_items
  add column if not exists source_candidate_id uuid references culture_trend_candidates(id) on delete set null;

create index if not exists idx_culture_trend_candidates_status_created
  on culture_trend_candidates (status, created_at desc);

create index if not exists idx_culture_trend_candidates_scope_store
  on culture_trend_candidates (scope_type, store_id);

create index if not exists idx_culture_feed_items_scope_store_published
  on culture_feed_items (scope_type, store_id, is_published);

drop trigger if exists trg_culture_trend_candidates_updated on culture_trend_candidates;
create trigger trg_culture_trend_candidates_updated
before update on culture_trend_candidates
for each row execute function update_updated_at();

alter table culture_trend_candidates enable row level security;
drop policy if exists "Service role full access" on culture_trend_candidates;
create policy "Service role full access" on culture_trend_candidates for all using (true) with check (true);
