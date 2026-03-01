-- Invitation system for Coach Connect Admin

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role user_role not null default 'associate',
  store_id uuid references stores(id),
  invited_by uuid references app_users(id),
  token text unique not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_invitations_email on invitations(email);
create index if not exists idx_invitations_token on invitations(token);
create index if not exists idx_invitations_status on invitations(status);

drop trigger if exists trg_invitations_updated on invitations;
create trigger trg_invitations_updated before update on invitations for each row execute function update_updated_at();

alter table invitations enable row level security;

drop policy if exists "Service role full access" on invitations;
drop policy if exists "Anon read invitations by token" on invitations;

create policy "Service role full access" on invitations for all using (true) with check (true);
create policy "Anon read invitations by token" on invitations for select using (true);
