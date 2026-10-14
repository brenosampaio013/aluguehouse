-- Testes pgTAP: venda
begin;
create extension if not exists pgtap with schema extensions;

-- Auxiliares de sessão (existem só durante este teste).
create function pg_temp.entrar(p_sub uuid, p_email text, p_admin boolean default false, p_aal text default 'aal1')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', p_sub, 'role', 'authenticated', 'email', p_email, 'aal', p_aal,
    'app_metadata', case when p_admin then json_build_object('role', 'admin') else '{}'::json end
  )::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.visitante() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

create function pg_temp.servidor() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end $$;

-- Usuários de teste
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@teste.local'),
  ('00000000-0000-0000-0000-00000000000b', 'ana@teste.local'),
  ('00000000-0000-0000-0000-00000000000c', 'bia@teste.local');

select plan(11);

insert into public.properties (id, slug, title, property_type, city, region, offers_sale, offers_seasonal,
  sale_price, nightly_price, bedrooms, area_m2, status, published_at)
values
  ('80000000-0000-0000-0000-000000000001', 'venda-a', 'Venda A', 'casa', 'Bertioga', 'riviera-de-sao-lourenco',
   true, false, 1800000, null, 4, 320, 'published', now() - interval '3 days'),
  ('80000000-0000-0000-0000-000000000002', 'venda-b', 'Venda B', 'apartamento', 'Ilhabela', 'ilhabela',
   true, false, 950000, null, 2, 110, 'published', now() - interval '2 days'),
  ('80000000-0000-0000-0000-000000000003', 'venda-c', 'Só temporada', 'casa', 'Bertioga', 'riviera-de-sao-lourenco',
   false, true, null, 900, 3, 200, 'published', now() - interval '1 day'),
  ('80000000-0000-0000-0000-000000000004', 'venda-d', 'Venda rascunho', 'casa', 'Bertioga', 'riviera-de-sao-lourenco',
   true, false, 500000, null, 3, 150, 'draft', null);

insert into public.property_amenities (property_id, amenity_id)
select '80000000-0000-0000-0000-000000000001', id from public.amenities where slug = 'piscina';

select pg_temp.visitante();

select results_eq(
  $$ select slug from public.search_sales() where slug like 'venda-%' order by slug $$,
  array['venda-a', 'venda-b'],
  'só publicados que oferecem venda'
);
select results_eq(
  $$ select slug from public.search_sales(p_region => 'ilhabela') where slug like 'venda-%' $$,
  array['venda-b'], 'filtro de região');
select results_eq(
  $$ select slug from public.search_sales(p_type => 'casa') where slug like 'venda-%' $$,
  array['venda-a'], 'filtro de tipo');
select results_eq(
  $$ select slug from public.search_sales(p_price_max => 1000000) where slug like 'venda-%' $$,
  array['venda-b'], 'filtro de preço máximo');
select results_eq(
  $$ select slug from public.search_sales(p_bedrooms => 3) where slug like 'venda-%' $$,
  array['venda-a'], 'filtro de quartos');
select results_eq(
  $$ select slug from public.search_sales(p_area_min => 200) where slug like 'venda-%' $$,
  array['venda-a'], 'filtro de área mínima');
select results_eq(
  $$ select slug from public.search_sales(p_amenities => array['piscina']) where slug like 'venda-%' $$,
  array['venda-a'], 'filtro de comodidades');
select results_eq(
  $$ select slug from public.search_sales(p_sort => 'price_asc') where slug like 'venda-%' $$,
  array['venda-b', 'venda-a'], 'menor preço primeiro');
select results_eq(
  $$ select slug from public.search_sales(p_sort => 'price_desc') where slug like 'venda-%' $$,
  array['venda-a', 'venda-b'], 'maior preço primeiro');
select throws_like($$ select * from public.search_sales(p_sort => 'x') $$, 'invalid_sort', 'ordenação desconhecida');
reset role;

select ok(has_function_privilege('anon',
  'public.search_sales(text, public.property_type, numeric, integer, numeric, text[], text, integer, integer)', 'execute'),
  'visitante pode buscar imóveis à venda');

select * from finish();

rollback;
