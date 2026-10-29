-- Run once in the Supabase SQL Editor. No visitor account system is required.
create table if not exists public.quiet_state (
  key text primary key,
  version bigint not null default 1,
  body jsonb not null default '{}'::jsonb
);
alter table public.quiet_state enable row level security;
revoke all on public.quiet_state from anon, authenticated;
grant select,insert,update on public.quiet_state to service_role;

-- Compare-and-swap avoids losing concurrent counter/contribution updates.
create or replace function public.quiet_compare_swap(p_key text,p_expected bigint,p_body jsonb)
returns boolean language plpgsql security invoker set search_path = public as $$
declare changed integer;
begin
  if p_expected = 0 then
    insert into public.quiet_state(key,version,body) values(p_key,1,p_body)
    on conflict(key) do nothing;
  else
    update public.quiet_state set version=version+1,body=p_body
    where key=p_key and version=p_expected;
  end if;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.quiet_compare_swap(text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.quiet_compare_swap(text,bigint,jsonb) to service_role;
