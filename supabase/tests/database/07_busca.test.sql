-- Testes pgTAP: busca
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

select plan(20);

insert into public.properties (id, slug, title, property_type, city, region, offers_seasonal, offers_monthly,
  nightly_price, monthly_price, min_nights, max_guests, bedrooms, status, published_at)
values
  ('70000000-0000-0000-0000-000000000001', 'busca-a', 'Busca A', 'casa', 'Bertioga', 'riviera-de-sao-lourenco',
   true, false, 800, null, 2, 6, 3, 'published', now() - interval '3 days'),
  ('70000000-0000-0000-0000-000000000002', 'busca-b', 'Busca B', 'casa', 'Ilhabela', 'ilhabela',
   true, true, 1500, 20000, 1, 10, 5, 'published', now() - interval '2 days'),
  ('70000000-0000-0000-0000-000000000003', 'busca-c', 'Busca C', 'apartamento', 'Ubatuba', 'ubatuba',
   false, true, null, 12000, 1, 4, 2, 'published', now() - interval '1 day'),
  ('70000000-0000-0000-0000-000000000004', 'busca-d', 'Busca D (rascunho)', 'casa', 'Bertioga', 'riviera-de-sao-lourenco',
   true, true, 500, 9000, 1, 8, 3, 'draft', null);

insert into public.property_amenities (property_id, amenity_id)
select '70000000-0000-0000-0000-000000000001', id from public.amenities where slug in ('piscina', 'wi-fi');
insert into public.property_amenities (property_id, amenity_id)
select '70000000-0000-0000-0000-000000000002', id from public.amenities where slug = 'wi-fi';

create temp table d as select private.today_sp() + 60 as base;
grant select on d to anon;

insert into public.calendar_blocks (property_id, stay, kind)
select '70000000-0000-0000-0000-000000000001', daterange(base, base + 5), 'owner' from d;


select pg_temp.visitante();

select results_eq(
  $$ select slug from public.search_rentals('seasonal') where slug like 'busca-%' order by slug $$,
  array['busca-a', 'busca-b'],
  'temporada: só publicados que oferecem temporada'
);
select results_eq(
  $$ select slug from public.search_rentals('monthly') where slug like 'busca-%' order by slug $$,
  array['busca-b', 'busca-c'],
  'mensal: só publicados que oferecem mensal'
);
select results_eq(
  $$ select slug from public.search_rentals('seasonal', p_region => 'ilhabela') where slug like 'busca-%' $$,
  array['busca-b'],
  'filtro de região'
);
select results_eq(
  $$ select slug from public.search_rentals('seasonal', p_guests => 8) where slug like 'busca-%' $$,
  array['busca-b'],
  'filtro de hóspedes respeita a capacidade'
);
select results_eq(
  $$ select slug from public.search_rentals('seasonal', p_bedrooms => 4) where slug like 'busca-%' $$,
  array['busca-b'],
  'filtro de quartos mínimos'
);
select results_eq(
  $$ select slug from public.search_rentals('seasonal', p_price_max => 1000) where slug like 'busca-%' $$,
  array['busca-a'],
  'filtro de preço máximo pela diária base'
);
select results_eq(
  $$ select slug from public.search_rentals('seasonal', p_amenities => array['piscina', 'wi-fi']) where slug like 'busca-%' $$,
  array['busca-a'],
  'comodidades: todas precisam estar presentes'
);
select results_eq(
  $$ select slug from public.search_rentals('seasonal', p_amenities => array['wi-fi']) where slug like 'busca-%' order by slug $$,
  array['busca-a', 'busca-b'],
  'comodidade comum aos dois'
);

-- Datas
select results_eq(
  $$ select slug from public.search_rentals('seasonal', p_check_in => (select base + 2 from d), p_check_out => (select base + 4 from d))
     where slug like 'busca-%' $$,
  array['busca-b'],
  'datas ocupadas escondem o imóvel'
);
select results_eq(
  $$ select slug from public.search_rentals('seasonal', p_check_in => (select base + 5 from d), p_check_out => (select base + 6 from d))
     where slug like 'busca-%' $$,
  array['busca-b'],
  'estadia abaixo do mínimo de noites esconde o imóvel'
);
select results_eq(
  $$ select slug, nights, quote_total from public.search_rentals('seasonal', p_check_in => (select base + 5 from d),
       p_check_out => (select base + 8 from d), p_guests => 2) where slug like 'busca-%' order by slug $$,
  $$ values ('busca-a', 3, 2400.00::numeric), ('busca-b', 3, 4500.00::numeric) $$,
  'com datas, devolve noites e total estimado'
);
select results_eq(
  $$ select slug from public.search_rentals('seasonal', p_check_in => (select base + 5 from d),
       p_check_out => (select base + 8 from d), p_sort => 'price_desc') where slug like 'busca-%' $$,
  array['busca-b', 'busca-a'],
  'ordenação por maior preço'
);
select results_eq(
  $$ select slug from public.search_rentals('seasonal', p_sort => 'price_asc') where slug like 'busca-%' $$,
  array['busca-a', 'busca-b'],
  'ordenação por menor preço'
);
select results_eq(
  $$ select slug from public.search_rentals('monthly', p_check_in => (select base from d), p_check_out => (select base + 45 from d))
     where slug like 'busca-%' order by slug $$,
  array['busca-b', 'busca-c'],
  'mensal de 45 noites'
);

select throws_like(
  $$ select * from public.search_rentals('seasonal', p_check_in => (select base from d), p_check_out => (select base + 30 from d)) $$,
  'seasonal_max_29', 'temporada com 30 noites é recusada');
select throws_like(
  $$ select * from public.search_rentals('monthly', p_check_in => (select base from d), p_check_out => (select base + 10 from d)) $$,
  'monthly_min_30', 'mensal com 10 noites é recusada');
select throws_like(
  $$ select * from public.search_rentals('seasonal', p_check_in => (select base from d)) $$,
  'invalid_dates', 'só a data de chegada é recusada');
select throws_like(
  $$ select * from public.search_rentals('seasonal', p_sort => 'qualquer') $$,
  'invalid_sort', 'ordenação desconhecida é recusada');

select ok(
  (select bool_and(total_count >= 2) from public.search_rentals('seasonal') where slug like 'busca-%'),
  'total de resultados acompanha cada linha (paginação)'
);
select is(
  (select count(*) from public.search_rentals('seasonal', p_limit => 1)),
  1::bigint,
  'limite de resultados por página'
);
reset role;

select * from finish();

rollback;
