-- Etapa 9 — Busca de imóveis à venda.
-- Roda com as permissões de quem chama (RLS): visitantes só enxergam
-- imóveis publicados. Não precisa ler o calendário.

create function public.search_sales(
  p_region text default null,
  p_type public.property_type default null,
  p_price_max numeric default null,
  p_bedrooms integer default null,
  p_area_min numeric default null,
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
  property_type public.property_type,
  bedrooms smallint,
  suites smallint,
  area_m2 numeric,
  sale_price numeric,
  total_count bigint
)
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_sort not in ('recent', 'price_asc', 'price_desc') then
    raise exception 'invalid_sort';
  end if;

  return query
  select p.id, p.slug, p.title, p.city, p.neighborhood, p.region, p.property_type,
         p.bedrooms, p.suites, p.area_m2, p.sale_price,
         count(*) over ()
    from public.properties p
   where p.status = 'published'
     and p.offers_sale
     and p.sale_price is not null
     and (p_region is null or p.region = p_region)
     and (p_type is null or p.property_type = p_type)
     and (p_price_max is null or p.sale_price <= p_price_max)
     and (p_bedrooms is null or p.bedrooms >= p_bedrooms)
     and (p_area_min is null or p.area_m2 >= p_area_min)
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
   order by
     case when p_sort = 'price_asc' then p.sale_price end asc nulls last,
     case when p_sort = 'price_desc' then p.sale_price end desc nulls last,
     p.published_at desc,
     p.id
   limit least(greatest(p_limit, 1), 48)
  offset greatest(p_offset, 0);
end;
$$;

revoke execute on function public.search_sales(text, public.property_type, numeric, integer, numeric,
  text[], text, integer, integer) from public;
grant execute on function public.search_sales(text, public.property_type, numeric, integer, numeric,
  text[], text, integer, integer) to anon, authenticated, service_role;
