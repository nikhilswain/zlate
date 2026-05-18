-- Accounts: opaque identities, no usernames or auth.
create table accounts (
  account_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Pairing codes: short-lived, single-use credentials for joining a second device.
create table pairing_codes (
  code        text primary key,
  account_id  uuid not null references accounts(account_id) on delete cascade,
  expires_at  timestamptz not null,
  used_at     timestamptz
);
create index pairing_codes_expires_idx on pairing_codes (expires_at);

-- Synced user data — multi-tenant via account_id.
create table projects (
  account_id  uuid not null references accounts(account_id) on delete cascade,
  id          text not null,
  name        text not null,
  icon        text,
  base_color  text not null,
  description text,
  start_date  timestamptz not null,
  end_date    timestamptz not null,
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted_at  timestamptz,
  primary key (account_id, id)
);
create index projects_account_updated_idx on projects (account_id, updated_at);

create table day_notes (
  account_id  uuid not null references accounts(account_id) on delete cascade,
  id          text not null,
  project_id  text not null,
  date_key    text not null,
  text        text not null,
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted_at  timestamptz,
  primary key (account_id, id)
);
create index day_notes_account_updated_idx on day_notes (account_id, updated_at);

create table settings (
  account_id        uuid primary key references accounts(account_id) on delete cascade,
  theme             text not null,
  render_mode       text not null,
  view              text not null,
  week_starts_on    int2 not null,
  sidebar_collapsed bool not null,
  updated_at        timestamptz not null
);
