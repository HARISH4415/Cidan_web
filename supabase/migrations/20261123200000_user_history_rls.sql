alter table public.user_history enable row level security;

grant insert, select on table public.user_history to authenticated;

drop policy if exists user_history_insert_own on public.user_history;
create policy user_history_insert_own
on public.user_history
for insert
to authenticated
with check (
  lower(user_email) = lower((select auth.jwt() ->> 'email'))
  and action_type = 'login_success'
);

drop policy if exists user_history_select_own on public.user_history;
create policy user_history_select_own
on public.user_history
for select
to authenticated
using (
  lower(user_email) = lower((select auth.jwt() ->> 'email'))
);
