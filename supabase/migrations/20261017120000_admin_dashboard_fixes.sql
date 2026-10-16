-- Correções da visão geral do painel (public.admin_dashboard).
--
-- Não destrutiva: substitui o corpo da função (mesma assinatura, mesmas
-- permissões) e cria índices. Nenhum dado é alterado.
--
-- 1. Ocupação: numerador e denominador agora usam o MESMO conjunto de
--    imóveis — os publicados que oferecem aluguel (temporada ou mensal).
--    Antes, noites de imóveis arquivados, rascunhos ou só de venda entravam
--    no numerador e a taxa podia passar de 100%. O total de noites
--    reservadas de todos os imóveis continua em `booked_nights`; a ocupação
--    usa o novo `occupied_nights`.
-- 2. Datas: os filtros comparam created_at/decided_at com limites
--    timestamptz calculados no fuso de São Paulo (meia-noite local), em vez
--    de converter cada linha para data. Assim os índices abaixo podem ser
--    usados e os limites do período continuam exatos.
-- 3. Série do gráfico: as contagens são agregadas por dia uma única vez e
--    somadas por intervalo, sem subconsultas por ponto.

create index if not exists booking_requests_created_at_idx
  on public.booking_requests (created_at);
create index if not exists booking_requests_decided_at_idx
  on public.booking_requests (decided_at) where decided_at is not null;
create index if not exists inquiries_created_at_idx
  on public.inquiries (created_at);
create index if not exists reviews_created_at_idx
  on public.reviews (created_at);

create or replace function public.admin_dashboard(p_from date, p_to date, p_property_id uuid default null)
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
  v_start timestamptz;
  v_end timestamptz;
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
  -- Meia-noite em São Paulo do 1º dia do período anterior e do dia seguinte
  -- ao fim do período atual: [v_start, v_end).
  v_start := v_prev_from::timestamp at time zone 'America/Sao_Paulo';
  v_end := (p_to + 1)::timestamp at time zone 'America/Sao_Paulo';

  -- Imóveis elegíveis para a ocupação: publicados e com aluguel (hoje).
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
         (r.created_at >= v_start and r.created_at < v_end)
         or (r.decided_at >= v_start and r.decided_at < v_end)
       )
  ),
  inq as (
    select (i.created_at at time zone 'America/Sao_Paulo')::date as day
      from public.inquiries i
     where (p_property_id is null or i.property_id = p_property_id)
       and i.created_at >= v_start and i.created_at < v_end
  ),
  rev as (
    select v.rating, (v.created_at at time zone 'America/Sao_Paulo')::date as day
      from public.reviews v
     where v.status <> 'rejected'
       and (p_property_id is null or v.property_id = p_property_id)
       and v.created_at >= v_start and v.created_at < v_end
  ),
  blocks as (
    select b.stay,
           (p.status = 'published' and (p.offers_seasonal or p.offers_monthly)) as eligible
      from public.calendar_blocks b
      join public.properties p on p.id = b.property_id
     where b.kind = 'booking'
       and (p_property_id is null or b.property_id = p_property_id)
       and b.stay && daterange(v_prev_from, p_to + 1)
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
      (select coalesce(sum(upper(bl.stay * daterange(pe.d_from, pe.d_to + 1))
                         - lower(bl.stay * daterange(pe.d_from, pe.d_to + 1))), 0)
         from blocks bl
        where bl.stay && daterange(pe.d_from, pe.d_to + 1)) as booked_nights,
      (select coalesce(sum(upper(bl.stay * daterange(pe.d_from, pe.d_to + 1))
                         - lower(bl.stay * daterange(pe.d_from, pe.d_to + 1))), 0)
         from blocks bl
        where bl.eligible and bl.stay && daterange(pe.d_from, pe.d_to + 1)) as occupied_nights
    from periods pe
  ),
  daily as (
    select d.day, sum(d.requests) as requests, sum(d.approved) as approved,
           sum(d.inquiries) as inquiries
      from (
        select req.day, count(*) as requests,
               count(*) filter (where req.status = 'approved') as approved, 0 as inquiries
          from req where req.day between p_from and p_to group by req.day
        union all
        select inq.day, 0, 0, count(*) from inq where inq.day between p_from and p_to group by inq.day
      ) d
     group by d.day
  ),
  buckets as (
    select greatest(gs::date, p_from) as b_start,
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
    select bk.b_start, bk.b_end,
           coalesce(sum(dy.requests), 0) as requests,
           coalesce(sum(dy.approved), 0) as approved,
           coalesce(sum(dy.inquiries), 0) as inquiries
      from buckets bk
      left join daily dy on dy.day between bk.b_start and bk.b_end
     group by bk.b_start, bk.b_end
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
    'top_properties', coalesce(
      (select jsonb_agg(to_jsonb(tp) order by tp.requests desc, tp.title) from top_properties tp),
      '[]')
  ) into v_result;

  return v_result;
end;
$$;

comment on function public.admin_dashboard(date, date, uuid) is
  'Indicadores da visão geral do painel (somente admin com MFA).';

-- create or replace mantém as permissões; reafirmadas por clareza.
revoke execute on function public.admin_dashboard(date, date, uuid) from public, anon;
grant execute on function public.admin_dashboard(date, date, uuid) to authenticated;
