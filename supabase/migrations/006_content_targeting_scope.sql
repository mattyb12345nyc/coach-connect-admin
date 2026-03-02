-- Shared content targeting scope across admin-posted content

alter table culture_feed_items
  add column if not exists store_region text;

alter table culture_trend_candidates
  add column if not exists store_region text;

alter table today_focus_cards
  add column if not exists scope_type culture_scope_type not null default 'global';
alter table today_focus_cards
  add column if not exists store_id uuid references stores(id) on delete set null;
alter table today_focus_cards
  add column if not exists store_region text;

alter table cultural_moments
  add column if not exists scope_type culture_scope_type not null default 'global';
alter table cultural_moments
  add column if not exists store_id uuid references stores(id) on delete set null;
alter table cultural_moments
  add column if not exists store_region text;

alter table whats_new_items
  add column if not exists scope_type culture_scope_type not null default 'global';
alter table whats_new_items
  add column if not exists store_id uuid references stores(id) on delete set null;
alter table whats_new_items
  add column if not exists store_region text;

alter table community_posts
  add column if not exists scope_type culture_scope_type not null default 'global';
alter table community_posts
  add column if not exists store_id uuid references stores(id) on delete set null;
alter table community_posts
  add column if not exists store_region text;

alter table practice_personas
  add column if not exists scope_type culture_scope_type not null default 'global';
alter table practice_personas
  add column if not exists store_id uuid references stores(id) on delete set null;
alter table practice_personas
  add column if not exists store_region text;

create index if not exists idx_today_focus_cards_scope on today_focus_cards(scope_type, store_region, store_id, is_active);
create index if not exists idx_cultural_moments_scope on cultural_moments(scope_type, store_region, store_id, is_active);
create index if not exists idx_whats_new_scope on whats_new_items(scope_type, store_region, store_id, is_active);
create index if not exists idx_culture_feed_scope on culture_feed_items(scope_type, store_region, store_id, is_published);
create index if not exists idx_culture_trend_candidates_scope on culture_trend_candidates(scope_type, store_region, store_id, status);
create index if not exists idx_community_scope on community_posts(scope_type, store_region, store_id, status);
create index if not exists idx_personas_scope on practice_personas(scope_type, store_region, store_id, is_active);
