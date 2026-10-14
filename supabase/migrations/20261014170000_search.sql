-- Etapa 8 — Região da linha da costa e busca de aluguéis (temporada e mensal).

-- Regiões aprovadas na Etapa 2 (src/lib/regions.ts). Texto com verificação,
-- para facilitar incluir regiões no futuro.
alter table public.properties
  add column region text check (
    region in ('riviera-de-sao-lourenco', 'sao-sebastiao', 'ilhabela', 'caraguatatuba', 'ubatuba')
  );

create index properties_region_idx on public.properties (region) where status = 'published';

-- Total estimado de uma estadia, ou null se a estadia não for aceita
-- (mínimo de noites, capacidade, falta de preço…).
create function private.try_quote_total(
  p_property_id uuid,
  p_mode public.rental_mode,
  p_check_in date,
  p_check_out date,
  p_guests integer
)
returns numeric
language plpgsql
stable
set search_path = ''
as $$
begin
  return (public.quote_stay(p_property_id, p_mode, p_check_in, p_check_out, p_guests) ->> 'total')::numeric;
exception
  when others then
    return null;
end;
$$;

revoke execute on function private.try_quote_total(uuid, public.rental_mode, date, date, integer)
  from public, anon, authenticated;

-- Busca de aluguéis. Só considera imóveis publicados e devolve apenas
-- colunas públicas. Com datas, exclui imóveis ocupados ou que não aceitam a
-- estadia e devolve o total estimado.
create function public.search_rentals(
  p_mode public.rental_mode,
  p_region text default null,
  p_check_in date default null,
  p_check_out date default null,
  p_guests integer default null,
  p_bedrooms integer default null,
  p_price_max numeric default null,
  p_amenities text[] default null,
  p_sort text default 'recent',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  title text,
  city text,
  neighborhood text,
  region text,
  bedrooms smallint,
  suites smallint,
  max_guests smallint,
  base_price numeric,
  nights integer,
  quote_total numeric,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_nights integer;
  v_guests integer := coalesce(p_guests, 1);
begin
  if (p_check_in is null) <> (p_check_out is null) then
    raise exception 'invalid_dates';
  end if;

  if p_check_in is not null then
    if p_check_out <= p_check_in then
      raise exception 'invalid_dates';
    end if;
    if p_check_in < private.today_sp() then
      raise exception 'past_check_in';
    end if;
    v_nights := p_check_out - p_check_in;
    if p_mode = 'seasonal' and v_nights > 29 then
      raise exception 'seasonal_max_29';
    end if;
    if p_mode = 'monthly' and v_nights < 30 then
      raise exception 'monthly_min_30';
    end if;
    if v_nights > 90 then
      raise exception 'max_nights';
    end if;
  end if;

  if p_sort not in ('recent', 'price_asc', 'price_desc') then
    raise exception 'invalid_sort';
  end if;

  return query
  with candidates as (
    select
      p.id, p.slug, p.title, p.city, p.neighborhood, p.region,
      p.bedrooms, p.suites, p.max_guests, p.published_at,
      case p_mode when 'seasonal' then p.nightly_price else p.monthly_price end as base_price
    from public.properties p
    where p.status = 'published'
      and (case p_mode when 'seasonal' then p.offers_seasonal else p.offers_monthly end)
      and (p_region is null or p.region = p_region)
      and (p_guests is null or p.max_guests >= p_guests)
      and (p_bedrooms is null or p.bedrooms >= p_bedrooms)
      and (
        p_amenities is null
        or cardinality(p_amenities) = 0
        or (
          select count(distinct a.slug)
            from public.property_amenities pa
            join public.amenities a on a.id = pa.amenity_id
           where pa.property_id = p.id and a.slug = any (p_amenities)
        ) = cardinality(p_amenities)
      )
      and (
        p_check_in is null
        or not exists (
          select 1 from public.calendar_blocks b
           where b.property_id = p.id and b.stay && daterange(p_check_in, p_check_out)
        )
      )
  ),
  quoted as (
    select c.*,
           case when p_check_in is null then null
                else private.try_quote_total(c.id, p_mode, p_check_in, p_check_out, v_guests)
           end as quote_total
      from candidates c
  ),
  accepted as (
    select q.*
      from quoted q
     where (p_check_in is null or q.quote_total is not null)
       and (p_price_max is null or q.base_price <= p_price_max)
  )
  select a.id, a.slug, a.title, a.city, a.neighborhood, a.region,
         a.bedrooms, a.suites, a.max_guests, a.base_price,
         v_nights, a.quote_total,
         count(*) over ()
    from accepted a
   order by
     case when p_sort = 'price_asc' then coalesce(a.quote_total, a.base_price) end asc nulls last,
     case when p_sort = 'price_desc' then coalesce(a.quote_total, a.base_price) end desc nulls last,
     a.published_at desc,
     a.id
   limit least(greatest(p_limit, 1), 48)
  offset greatest(p_offset, 0);
end;
$$;

revoke execute on function public.search_rentals(public.rental_mode, text, date, date, integer, integer,
  numeric, text[], text, integer, integer) from public;
grant execute on function public.search_rentals(public.rental_mode, text, date, date, integer, integer,
  numeric, text[], text, integer, integer) to anon, authenticated, service_role;
