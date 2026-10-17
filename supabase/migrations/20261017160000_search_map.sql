-- Busca com mapa (estilo "lista + mapa"). Função nova; search_rentals
-- continua igual para quem já a usa.
--
-- Diferenças em relação a search_rentals:
--   * destino por região, cidade ou bairro (sem diferenciar acentos e caixa)
--     e por área do mapa (retângulo das coordenadas aproximadas);
--   * filtro por tipo de imóvel e preço mínimo;
--   * devolve as coordenadas APROXIMADAS (approx_lat/approx_lng, as mesmas
--     já públicas na página do imóvel), a capa, a nota média das avaliações
--     aprovadas e o preço por unidade do período (média das diárias com as
--     tarifas sazonais, sem taxas) além do total com taxas;
--   * até 300 resultados por chamada, para o mapa mostrar todos de uma vez.
--
-- Só considera imóveis publicados e devolve apenas colunas públicas. Nada é
-- alterado em dados existentes.

-- Chave de comparação: minúsculas, sem acentos e só letras/números separados
-- por espaço. "São Sebastião", "sao-sebastiao" e "SAO SEBASTIAO" viram
-- "sao sebastiao".
create function private.search_key(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    btrim(regexp_replace(
      lower(translate(
        coalesce(p_text, ''),
        'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
      )),
      '[^a-z0-9]+', ' ', 'g'
    )),
    ''
  );
$$;

revoke execute on function private.search_key(text) from public, anon, authenticated;

-- Sem índice com search_key: índice de expressão roda com as permissões de
-- quem grava o imóvel (admin, service_role), que não executam funções de
-- private. O volume de imóveis publicados é pequeno; a busca filtra antes por
-- status e região.

-- Cotação completa, ou null se a estadia não for aceita.
create function private.try_quote(
  p_property_id uuid,
  p_mode public.rental_mode,
  p_check_in date,
  p_check_out date,
  p_guests integer
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  return public.quote_stay(p_property_id, p_mode, p_check_in, p_check_out, p_guests);
exception
  when others then
    return null;
end;
$$;

revoke execute on function private.try_quote(uuid, public.rental_mode, date, date, integer)
  from public, anon, authenticated;

create function public.search_rentals_map(
  p_mode public.rental_mode,
  p_region text default null,
  p_city text default null,
  p_neighborhood text default null,
  p_place text default null,
  p_bbox numeric[] default null,
  p_check_in date default null,
  p_check_out date default null,
  p_guests integer default null,
  p_bedrooms integer default null,
  p_type public.property_type default null,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_amenities text[] default null,
  p_sort text default 'recent',
  p_limit integer default 300
)
returns table (
  id uuid,
  slug text,
  title text,
  city text,
  neighborhood text,
  region text,
  property_type public.property_type,
  bedrooms smallint,
  suites smallint,
  max_guests smallint,
  approx_lat numeric,
  approx_lng numeric,
  offers_sale boolean,
  base_price numeric,
  nights integer,
  unit_price numeric,
  quote_total numeric,
  rating_avg numeric,
  rating_count integer,
  cover_path text,
  cover_width integer,
  cover_alt text,
  cover_is_demo boolean,
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
  v_city text := private.search_key(p_city);
  v_neighborhood text := private.search_key(p_neighborhood);
  v_place text := private.search_key(p_place);
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

  if p_sort not in ('recent', 'price_asc', 'price_desc', 'rating') then
    raise exception 'invalid_sort';
  end if;

  -- Área do mapa: [oeste, sul, leste, norte], em graus.
  if p_bbox is not null and (
    cardinality(p_bbox) <> 4
    or p_bbox[1] is null or p_bbox[2] is null or p_bbox[3] is null or p_bbox[4] is null
    or p_bbox[1] not between -180 and 180 or p_bbox[3] not between -180 and 180
    or p_bbox[2] not between -90 and 90 or p_bbox[4] not between -90 and 90
    or p_bbox[1] >= p_bbox[3] or p_bbox[2] >= p_bbox[4]
  ) then
    raise exception 'invalid_area';
  end if;

  return query
  with candidates as (
    select
      p.id, p.slug, p.title, p.city, p.neighborhood, p.region, p.property_type,
      p.bedrooms, p.suites, p.max_guests, p.approx_lat, p.approx_lng, p.offers_sale,
      p.published_at,
      case p_mode when 'seasonal' then p.nightly_price else p.monthly_price end as base_price
    from public.properties p
    where p.status = 'published'
      and (case p_mode when 'seasonal' then p.offers_seasonal else p.offers_monthly end)
      and (p_region is null or p.region = p_region)
      and (v_city is null or private.search_key(p.city) = v_city)
      and (v_neighborhood is null or private.search_key(p.neighborhood) = v_neighborhood)
      and (
        v_place is null
        or position(v_place in coalesce(private.search_key(p.city), '')) > 0
        or position(v_place in coalesce(private.search_key(p.neighborhood), '')) > 0
      )
      and (
        p_bbox is null
        or (
          p.approx_lat is not null and p.approx_lng is not null
          and p.approx_lng between p_bbox[1] and p_bbox[3]
          and p.approx_lat between p_bbox[2] and p_bbox[4]
        )
      )
      and (p_type is null or p.property_type = p_type)
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
  -- Com datas, a cotação pode recusar a estadia (mínimo de noites, falta de
  -- preço…): esses imóveis saem do resultado, como em search_rentals.
  quoted as (
    select c.*,
           case when p_check_in is null then null
                else private.try_quote(c.id, p_mode, p_check_in, p_check_out, v_guests)
           end as quote
      from candidates c
  ),
  priced as (
    select q.*,
           (q.quote ->> 'total')::numeric as quote_total,
           case
             when q.quote is null then q.base_price
             -- Mensal: o valor do mês (a cotação é proporcional a ele).
             when p_mode = 'monthly' then q.base_price
             -- Temporada: média das diárias do período, já com as tarifas
             -- sazonais e sem as taxas.
             else round((q.quote ->> 'subtotal')::numeric / v_nights, 2)
           end as unit_price
      from quoted q
  ),
  accepted as (
    select pr.*
      from priced pr
     where (p_check_in is null or pr.quote_total is not null)
       and (p_price_min is null or pr.unit_price >= p_price_min)
       and (p_price_max is null or pr.unit_price <= p_price_max)
  ),
  rated as (
    select r.property_id,
           round(avg(r.rating)::numeric, 2) as rating_avg,
           count(*)::integer as rating_count
      from public.reviews r
     where r.status = 'approved'
       and r.property_id in (select a.id from accepted a)
     group by r.property_id
  )
  select a.id, a.slug, a.title, a.city, a.neighborhood, a.region, a.property_type,
         a.bedrooms, a.suites, a.max_guests,
         a.approx_lat::numeric, a.approx_lng::numeric, a.offers_sale,
         a.base_price, v_nights, a.unit_price, a.quote_total,
         rt.rating_avg, coalesce(rt.rating_count, 0),
         cv.storage_path, cv.width, cv.alt_text, cv.is_demo,
         count(*) over ()
    from accepted a
    left join rated rt on rt.property_id = a.id
    left join lateral (
      select m.storage_path, m.width, m.alt_text, m.is_demo
        from public.property_media m
       where m.property_id = a.id
         and m.kind = 'image'
         and m.storage_path is not null
         and m.width is not null
       order by m.is_cover desc, m.position, m.created_at
       limit 1
    ) cv on true
   order by
     case when p_sort = 'price_asc' then coalesce(a.quote_total, a.unit_price) end asc nulls last,
     case when p_sort = 'price_desc' then coalesce(a.quote_total, a.unit_price) end desc nulls last,
     case when p_sort = 'rating' then rt.rating_avg end desc nulls last,
     case when p_sort = 'rating' then rt.rating_count end desc nulls last,
     a.published_at desc,
     a.id
   limit least(greatest(coalesce(p_limit, 300), 1), 300);
end;
$$;

revoke execute on function public.search_rentals_map(public.rental_mode, text, text, text, text,
  numeric[], date, date, integer, integer, public.property_type, numeric, numeric, text[], text,
  integer) from public;
grant execute on function public.search_rentals_map(public.rental_mode, text, text, text, text,
  numeric[], date, date, integer, integer, public.property_type, numeric, numeric, text[], text,
  integer) to anon, authenticated, service_role;
