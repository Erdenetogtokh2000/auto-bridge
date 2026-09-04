create table if not exists public.user_login_logs (
  id text primary key,
  email text not null,
  role text,
  result text not null default 'SUCCESS',
  ip_address text,
  user_agent text,
  source text not null default 'WEB',
  logged_in_at text not null default (current_timestamp::text)
);

create index if not exists user_login_logs_email_idx on public.user_login_logs (email);
create index if not exists user_login_logs_logged_in_at_idx on public.user_login_logs (logged_in_at desc);

alter table public.user_login_logs enable row level security;

revoke all on table public.user_login_logs from anon, authenticated;
