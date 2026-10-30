-- Run once in the Supabase SQL editor. Only the backend service role may reserve calls.
create table if not exists public.system_ocr_calls (
  id bigint generated always as identity primary key,
  called_at timestamptz not null default now()
);
create index if not exists system_ocr_calls_called_at_idx on public.system_ocr_calls (called_at);
alter table public.system_ocr_calls enable row level security;
revoke all on public.system_ocr_calls from anon, authenticated;

create or replace function public.reserve_system_ocr_call(p_limit integer)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
  v_oldest timestamptz;
begin
  if p_limit < 1 or p_limit > 60 then
    raise exception 'Invalid OCR rate limit';
  end if;
  perform pg_advisory_xact_lock(682544073);
  delete from public.system_ocr_calls where called_at < clock_timestamp() - interval '60 seconds';
  select count(*), min(called_at) into v_count, v_oldest from public.system_ocr_calls;
  if v_count >= p_limit then
    return query select false, greatest(1, ceil(extract(epoch from v_oldest + interval '60 seconds' - clock_timestamp()))::integer);
    return;
  end if;
  insert into public.system_ocr_calls default values;
  return query select true, 0;
end;
$$;
revoke all on function public.reserve_system_ocr_call(integer) from public, anon, authenticated;
grant execute on function public.reserve_system_ocr_call(integer) to service_role;
