-- Single-row app settings table (id is always TRUE so only one row exists).
-- Used for global toggles like maintenance / "work in progress" mode.
create table if not exists public.app_settings (
  id boolean primary key default true,
  maintenance_mode boolean not null default false,
  maintenance_message text,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);

-- Seed the single row if it doesn't exist yet.
insert into public.app_settings (id, maintenance_mode)
values (true, false)
on conflict (id) do nothing;
