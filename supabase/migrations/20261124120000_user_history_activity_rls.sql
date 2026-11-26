drop policy if exists user_history_insert_own on public.user_history;
create policy user_history_insert_own
on public.user_history
for insert
to authenticated
with check (
  lower(user_email) = lower((select auth.jwt() ->> 'email'))
  and action_type in (
    'login_success',
    'document_analysis_completed',
    'demo_deployment_completed'
  )
);
