-- Migração aditiva para habilitar notificações push. Execute no SQL Editor do Supabase.
create table if not exists push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
create index if not exists push_subscriptions_user_idx on push_subscriptions(user_id);
alter table push_subscriptions enable row level security;
drop policy if exists push_subscription_owner on push_subscriptions;
create policy push_subscription_owner on push_subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on push_subscriptions to authenticated;
create table if not exists push_deliveries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  delivery_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, delivery_key)
);
alter table push_deliveries enable row level security;
revoke all on push_deliveries from anon, authenticated;
