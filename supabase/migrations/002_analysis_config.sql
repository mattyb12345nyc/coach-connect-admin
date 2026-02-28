-- Post-call analysis configuration for Practice Floor

create table if not exists analysis_config (
  id uuid primary key default gen_random_uuid(),
  system_prompt text not null,
  model text not null default 'claude-sonnet-4-20250514',
  max_tokens integer not null default 1024,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scoring_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  icon text not null default 'MessageSquare',
  color text not null default 'bg-blue-500',
  max_score integer not null default 25,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_analysis_config_updated on analysis_config;
drop trigger if exists trg_scoring_categories_updated on scoring_categories;

create trigger trg_analysis_config_updated before update on analysis_config for each row execute function update_updated_at();
create trigger trg_scoring_categories_updated before update on scoring_categories for each row execute function update_updated_at();

alter table analysis_config enable row level security;
alter table scoring_categories enable row level security;

drop policy if exists "Service role full access" on analysis_config;
drop policy if exists "Service role full access" on scoring_categories;
drop policy if exists "Anon read analysis config" on analysis_config;
drop policy if exists "Anon read active categories" on scoring_categories;

create policy "Service role full access" on analysis_config for all using (true) with check (true);
create policy "Service role full access" on scoring_categories for all using (true) with check (true);
create policy "Anon read analysis config" on analysis_config for select using (true);
create policy "Anon read active categories" on scoring_categories for select using (is_active = true);

-- Seed default config
INSERT INTO analysis_config (system_prompt, model, max_tokens) VALUES (
  'You are a Coach retail training evaluator. Analyze this sales conversation and score the associate''s performance. Respond with valid JSON only:
{
  "overallScore": 85,
  "stars": 4,
  "scores": {
    "productKnowledge": 22,
    "culturalRelevance": 20,
    "emotionalConnection": 23,
    "objectionHandling": 20
  },
  "highlights": [
    {"type": "positive", "text": "Great connection with TikTok trends"},
    {"type": "positive", "text": "Excellent cost-per-wear reframe"},
    {"type": "improvement", "text": "Ask more about her personal style"}
  ],
  "summary": "Strong performance connecting with the Gen Z customer. Focus on personalization next time."
}
Each category is out of 25. Include 2-3 highlights.',
  'claude-sonnet-4-20250514',
  1024
);

INSERT INTO scoring_categories (key, label, icon, color, max_score, sort_order) VALUES
('productKnowledge', 'Product Knowledge', 'MessageSquare', 'bg-blue-500', 25, 0),
('culturalRelevance', 'Cultural Relevance', 'Star', 'bg-purple-500', 25, 1),
('emotionalConnection', 'Emotional Connection', 'Heart', 'bg-rose-500', 25, 2),
('objectionHandling', 'Objection Handling', 'Shield', 'bg-amber-500', 25, 3);
