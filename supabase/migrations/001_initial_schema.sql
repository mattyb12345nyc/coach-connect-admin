-- Coach Connect Admin - Initial Schema
-- Run this in the Supabase SQL editor or via CLI

-- =============================================
-- Today Dashboard Content
-- =============================================

create table if not exists today_focus_cards (
  id uuid primary key default gen_random_uuid(),
  badge text not null default 'TODAY''S FOCUS',
  title text not null,
  description text not null,
  cta_text text not null default 'Start Practice',
  cta_action text not null default 'practice',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cultural_moments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default 'Gift',
  color_gradient text not null default 'from-coach-mahogany to-[#4a2e1f]',
  days_away integer,
  action_text text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists whats_new_items (
  id uuid primary key default gen_random_uuid(),
  tag text not null,
  title text not null,
  description text not null,
  icon text not null default 'Tag',
  icon_bg text not null default 'bg-coach-champagne',
  icon_color text not null default 'text-coach-mahogany',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================
-- Culture Feed
-- =============================================

do $$ begin
  create type culture_item_type as enum ('trend', 'styling', 'news');
exception when duplicate_object then null;
end $$;

create table if not exists culture_feed_items (
  id uuid primary key default gen_random_uuid(),
  type culture_item_type not null default 'trend',
  category text not null,
  title text not null,
  description text not null,
  image_url text,
  engagement_text text,
  is_published boolean not null default false,
  published_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================
-- Community
-- =============================================

do $$ begin
  create type post_type as enum ('insight', 'success', 'question');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type post_status as enum ('active', 'hidden', 'removed');
exception when duplicate_object then null;
end $$;

create table if not exists community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid,
  author_name text not null,
  author_avatar text,
  author_role text not null default 'Associate',
  author_store text,
  content text not null,
  post_type post_type not null default 'insight',
  is_pinned boolean not null default false,
  is_flagged boolean not null default false,
  status post_status not null default 'active',
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  saves_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================
-- Practice Floor Personas
-- =============================================

create table if not exists practice_personas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age integer not null default 25,
  type text not null,
  scenario text not null,
  difficulty text not null default 'Beginner',
  image_url text,
  agent_id text,
  tip text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================
-- Users
-- =============================================

do $$ begin
  create type user_role as enum ('associate', 'manager', 'admin');
exception when duplicate_object then null;
end $$;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique,
  email text unique not null,
  name text not null,
  title text not null default 'Sales Associate',
  store text,
  store_number text,
  city text,
  avatar_url text,
  score integer not null default 0,
  rank text not null default 'Bronze',
  streak integer not null default 0,
  sessions_count integer not null default 0,
  role user_role not null default 'associate',
  is_active boolean not null default true,
  member_since timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================
-- Achievements
-- =============================================

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  icon text not null default 'Trophy',
  color text not null default 'text-coach-gold',
  criteria text,
  created_at timestamptz not null default now()
);

create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique(user_id, achievement_id)
);

-- =============================================
-- Chat Quick Actions
-- =============================================

create table if not exists chat_quick_actions (
  id uuid primary key default gen_random_uuid(),
  prompt_text text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================
-- Updated-at triggers
-- =============================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_today_focus_cards_updated on today_focus_cards;
drop trigger if exists trg_cultural_moments_updated on cultural_moments;
drop trigger if exists trg_whats_new_items_updated on whats_new_items;
drop trigger if exists trg_culture_feed_items_updated on culture_feed_items;
drop trigger if exists trg_community_posts_updated on community_posts;
drop trigger if exists trg_practice_personas_updated on practice_personas;
drop trigger if exists trg_app_users_updated on app_users;
drop trigger if exists trg_chat_quick_actions_updated on chat_quick_actions;

create trigger trg_today_focus_cards_updated before update on today_focus_cards for each row execute function update_updated_at();
create trigger trg_cultural_moments_updated before update on cultural_moments for each row execute function update_updated_at();
create trigger trg_whats_new_items_updated before update on whats_new_items for each row execute function update_updated_at();
create trigger trg_culture_feed_items_updated before update on culture_feed_items for each row execute function update_updated_at();
create trigger trg_community_posts_updated before update on community_posts for each row execute function update_updated_at();
create trigger trg_practice_personas_updated before update on practice_personas for each row execute function update_updated_at();
create trigger trg_app_users_updated before update on app_users for each row execute function update_updated_at();
create trigger trg_chat_quick_actions_updated before update on chat_quick_actions for each row execute function update_updated_at();

-- =============================================
-- Row Level Security (permissive for admin)
-- =============================================

alter table today_focus_cards enable row level security;
alter table cultural_moments enable row level security;
alter table whats_new_items enable row level security;
alter table culture_feed_items enable row level security;
alter table community_posts enable row level security;
alter table practice_personas enable row level security;
alter table app_users enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table chat_quick_actions enable row level security;

-- Allow service role (admin dashboard) full access
drop policy if exists "Service role full access" on today_focus_cards;
drop policy if exists "Service role full access" on cultural_moments;
drop policy if exists "Service role full access" on whats_new_items;
drop policy if exists "Service role full access" on culture_feed_items;
drop policy if exists "Service role full access" on community_posts;
drop policy if exists "Service role full access" on practice_personas;
drop policy if exists "Service role full access" on app_users;
drop policy if exists "Service role full access" on achievements;
drop policy if exists "Service role full access" on user_achievements;
drop policy if exists "Service role full access" on chat_quick_actions;

create policy "Service role full access" on today_focus_cards for all using (true) with check (true);
create policy "Service role full access" on cultural_moments for all using (true) with check (true);
create policy "Service role full access" on whats_new_items for all using (true) with check (true);
create policy "Service role full access" on culture_feed_items for all using (true) with check (true);
create policy "Service role full access" on community_posts for all using (true) with check (true);
create policy "Service role full access" on practice_personas for all using (true) with check (true);
create policy "Service role full access" on app_users for all using (true) with check (true);
create policy "Service role full access" on achievements for all using (true) with check (true);
create policy "Service role full access" on user_achievements for all using (true) with check (true);
create policy "Service role full access" on chat_quick_actions for all using (true) with check (true);

-- Allow anon (main app) to read published content
drop policy if exists "Anon read active focus cards" on today_focus_cards;
drop policy if exists "Anon read active moments" on cultural_moments;
drop policy if exists "Anon read active whats new" on whats_new_items;
drop policy if exists "Anon read published culture" on culture_feed_items;
drop policy if exists "Anon read active posts" on community_posts;
drop policy if exists "Anon read active personas" on practice_personas;
drop policy if exists "Anon read active users" on app_users;
drop policy if exists "Anon read achievements" on achievements;
drop policy if exists "Anon read user achievements" on user_achievements;
drop policy if exists "Anon read active quick actions" on chat_quick_actions;

create policy "Anon read active focus cards" on today_focus_cards for select using (is_active = true);
create policy "Anon read active moments" on cultural_moments for select using (is_active = true);
create policy "Anon read active whats new" on whats_new_items for select using (is_active = true);
create policy "Anon read published culture" on culture_feed_items for select using (is_published = true);
create policy "Anon read active posts" on community_posts for select using (status = 'active');
create policy "Anon read active personas" on practice_personas for select using (is_active = true);
create policy "Anon read active users" on app_users for select using (is_active = true);
create policy "Anon read achievements" on achievements for select using (true);
create policy "Anon read user achievements" on user_achievements for select using (true);
create policy "Anon read active quick actions" on chat_quick_actions for select using (is_active = true);
