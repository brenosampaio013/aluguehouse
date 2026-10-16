-- Painel: indicadores da visão geral calculados no banco, numa só chamada.
--
-- Não destrutiva: só cria uma função nova. Roda com os direitos de quem
-- chama (security invoker), então as políticas RLS continuam valendo; além
-- disso recusa quem não é admin com MFA (mesma regra das outras ações).
--
-- Período: p_from a p_to (inclusive), em dias do fuso de São Paulo. O
-- período anterior tem o mesmo tamanho e termina na véspera de p_from.
-- Agrupamento do gráfico: dia (até 31 dias), semana (até 120) ou mês.

create function public.admin_dashboard(p_from date, p_to date, p_property_id uuid default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_len integer;
  v_prev_from date;
  v_prev_to date;
  v_bucket text;
  v_capacity integer;
  v_result jsonb;
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 731 then
    raise exception 'invalid_period' using errcode = '22023';
  end if;

  v_len := p_to - p_from + 1;
  v_prev_to := p_from - 1;
  v_prev_from := p_from - v_len;
  v_bucket := case when v_len <= 31 then 'day' when v_len <= 120 then 'week' else 'month' end;

  -- Imóveis de aluguel publicados hoje: base da taxa de ocupação.
  select count(*)::integer into v_capacity
    from public.properties p
   where p.status = 'published'
     and (p.offers_seasonal or p.offers_monthly)
     and (p_property_id is null or p.id = p_property_id);

  with
  req as (
    select r.status, r.rental_mode, r.quoted_total, r.property_id, r.created_at, r.decided_at,
           (r.created_at at time zone 'America/Sao_Paulo')::date as day,
           (r.decided_at at time zone 'America/Sao_Paulo')::date as decided_day
      from public.booking_requests r
     where (p_property_id is null or r.property_id = p_property_id)
       and (
         (r.created_at at time zone 'America/Sao_Paulo')::date between v_prev_from and p_to
         or (r.decided_at at time zone 'America/Sao_Paulo')::date between v_prev_from and p_to
       )
  ),
  inq as (
    select (i.created_at at time zone 'America/Sao_Paulo')::date as day
      from public.inquiries i
     where (p_property_id is null or i.property_id = p_property_id)
       and (i.created_at at time zone 'America/Sao_Paulo')::date between v_prev_from and p_to
  ),
  rev as (
    select v.rating, (v.created_at at time zone 'America/Sao_Paulo')::date as day
      from public.reviews v
     where v.status <> 'rejected'
       and (p_property_id is null or v.property_id = p_property_id)
       and (v.created_at at time zone 'America/Sao_Paulo')::date between v_prev_from and p_to
  ),
  periods as (
    select 'current' as name, p_from as d_from, p_to as d_to
    union all
    select 'previous', v_prev_from, v_prev_to
  ),
  totals as (
    select pe.name,
      (select count(*) from req where req.day between pe.d_from and pe.d_to) as requests,
      (select count(*) from req where req.day between pe.d_from and pe.d_to
          and req.status = 'approved') as approved,
      (select coalesce(sum(req.quoted_total), 0) from req
        where req.day between pe.d_from and pe.d_to and req.status = 'approved') as approved_value,
      (select round(avg(extract(epoch from req.decided_at - req.created_at) / 3600)::numeric, 1)
         from req where req.decided_day between pe.d_from and pe.d_to
          and req.status in ('approved', 'declined')) as avg_response_hours,
      (select count(*) from inq where inq.day between pe.d_from and pe.d_to) as inquiries,
      (select count(*) from rev where rev.day between pe.d_from and pe.d_to) as reviews,
      (select round(avg(rev.rating)::numeric, 2) from rev
        where rev.day between pe.d_from and pe.d_to) as rating_avg,
      (select coalesce(sum(upper(b.stay * daterange(pe.d_from, pe.d_to + 1))
                         - lower(b.stay * daterange(pe.d_from, pe.d_to + 1))), 0)
         from public.calendar_blocks b
        where b.kind = 'booking'
          and (p_property_id is null or b.property_id = p_property_id)
          and b.stay && daterange(pe.d_from, pe.d_to + 1)) as booked_nights
    from periods pe
  ),
  buckets as (
    select gs::date as b_start,
           least(
             case v_bucket
               when 'day' then gs::date
               when 'week' then gs::date + 6
               else (date_trunc('month', gs) + interval '1 month - 1 day')::date
             end,
             p_to) as b_end
      from generate_series(
             case v_bucket when 'month' then date_trunc('month', p_from)::date else p_from end,
             p_to,
             case v_bucket when 'day' then interval '1 day'
                           when 'week' then interval '7 days'
                           else interval '1 month' end) as gs
  ),
  series as (
    select greatest(bk.b_start, p_from) as b_start, bk.b_end,
      (select count(*) from req where req.day between greatest(bk.b_start, p_from) and bk.b_end) as requests,
      (select count(*) from req where req.day between greatest(bk.b_start, p_from) and bk.b_end
          and req.status = 'approved') as approved,
      (select count(*) from inq where inq.day between greatest(bk.b_start, p_from) and bk.b_end) as inquiries
    from buckets bk
  ),
  by_status as (
    select req.status::text as status, count(*) as total
      from req where req.day between p_from and p_to
     group by req.status
  ),
  by_mode as (
    select req.rental_mode::text as mode, count(*) as total
      from req where req.day between p_from and p_to
     group by req.rental_mode
  ),
  top_properties as (
    select p.id, p.title, count(*) as requests,
           count(*) filter (where req.status = 'approved') as approved,
           coalesce(sum(req.quoted_total) filter (where req.status = 'approved'), 0) as approved_value
      from req join public.properties p on p.id = req.property_id
     where req.day between p_from and p_to
     group by p.id, p.title
     order by count(*) desc, p.title
     limit 5
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'from', p_from, 'to', p_to, 'days', v_len,
      'previous_from', v_prev_from, 'previous_to', v_prev_to, 'bucket', v_bucket),
    'rental_properties', v_capacity,
    'current', (select to_jsonb(t) - 'name' from totals t where t.name = 'current'),
    'previous', (select to_jsonb(t) - 'name' from totals t where t.name = 'previous'),
    'series', coalesce((select jsonb_agg(to_jsonb(s) order by s.b_start) from series s), '[]'),
    'by_status', coalesce((select jsonb_object_agg(bs.status, bs.total) from by_status bs), '{}'),
    'by_mode', coalesce((select jsonb_object_agg(bm.mode, bm.total) from by_mode bm), '{}'),
    'top_properties', coalesce((select jsonb_agg(to_jsonb(tp) order by tp.requests desc, tp.title) from top_properties tp), '[]')
  ) into v_result;

  return v_result;
end;
$$;

comment on function public.admin_dashboard(date, date, uuid) is
  'Indicadores da visão geral do painel (somente admin com MFA).';

revoke execute on function public.admin_dashboard(date, date, uuid) from public, anon;
grant execute on function public.admin_dashboard(date, date, uuid) to authenticated;
