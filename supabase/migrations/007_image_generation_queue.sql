-- Background image generation queue columns for culture_trend_candidates

alter table culture_trend_candidates
  add column if not exists image_status text not null default 'none';

alter table culture_trend_candidates
  add column if not exists image_error text;

alter table culture_trend_candidates
  add column if not exists image_requested_at timestamptz;

create index if not exists idx_culture_trend_candidates_image_pending
  on culture_trend_candidates (image_status, image_requested_at)
  where image_status in ('pending', 'processing');
