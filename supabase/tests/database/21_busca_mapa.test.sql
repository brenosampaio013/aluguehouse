-- Testes pgTAP: busca com mapa (search_rentals_map)
begin;
create extension if not exists pgtap with schema extensions;

create function pg_temp.visitante() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

select plan(25);

insert into public.properties (id, slug, title, property_type, city, neighborhood, region, offers_seasonal,
  offers_monthly, offers_sale, sale_price, nightly_price, monthly_price, min_nights, max_guests, bedrooms,
  status, published_at)
values
  ('71000000-0000-0000-0000-000000000001', 'mapa-a', 'Mapa A', 'casa', 'Bertioga', 'Riviera de São Lourenço',
   'riviera-de-sao-lourenco', true, false, false, null, 800, null, 2, 6, 3, 'published', now() - interval '3 days'),
  ('71000000-0000-0000-0000-000000000002', 'mapa-b', 'Mapa B', 'apartamento', 'São Sebastião', 'Juquehy',
   'sao-sebastiao', true, true, true, 900000, 1200, 15000, 1, 8, 4, 'published', now() - interval '2 days'),
  ('71000000-0000-0000-0000-000000000003', 'mapa-c', 'Mapa C (sem coordenadas)', 'casa', 'São Sebastião',
   'Barra do Una', 'sao-sebastiao', true, false, false, null, 500, null, 1, 4, 2, 'published',
   now() - interval '1 day'),
  ('71000000-0000-0000-0000-000000000004', 'mapa-d', 'Mapa D (rascunho)', 'casa', 'São Sebastião', 'Juquehy',
   'sao-sebastiao', true, false, false, null, 300, null, 1, 4, 2, 'draft', null);

-- Coordenadas exatas (privadas); o gatilho calcula as aproximadas públicas.
insert into public.property_private (property_id, exact_lat, exact_lng) values
  ('71000000-0000-0000-0000-000000000001', -23.808100, -46.031200),
  ('71000000-0000-0000-0000-000000000002', -23.771500, -45.731900),
  ('71000000-0000-0000-0000-000000000004', -23.772000, -45.732500);

insert into public.property_media (property_id, kind, storage_path, alt_text, width, height, position, is_cover)
values
  ('71000000-0000-0000-0000-000000000002', 'image', 'b/quarto.webp', 'Quarto', 1600, 1067, 0, false),
  ('71000000-0000-0000-0000-000000000002', 'image', 'b/fachada.webp', 'Fachada', 1600, 1067, 1, true);

insert into public.property_amenities (property_id, amenity_id)
select '71000000-0000-0000-0000-000000000002', id from public.amenities where slug in ('piscina', 'wi-fi');

create temp table d as select private.today_sp() + 60 as base;
grant select on d to anon;

-- Feriado no meio da estadia de B: 2 noites a 2.000 e 2 a 1.200.
insert into public.seasonal_rates (property_id, label, period, nightly_price)
select '71000000-0000-0000-0000-000000000002', 'Feriado', daterange(base + 2, base + 4), 2000 from d;
insert into public.property_fees (property_id, label, calc, amount, applies_to, is_refundable, position) values
  ('71000000-0000-0000-0000-000000000002', 'Limpeza', 'fixed', 300, 'both', false, 1),
  ('71000000-0000-0000-0000-000000000002', 'Caução', 'fixed', 1000, 'both', true, 2);

-- A está ocupado no início do período.
insert into public.calendar_blocks (property_id, stay, kind)
select '71000000-0000-0000-0000-000000000001', daterange(base, base + 3), 'owner' from d;

-- Avaliações: aprovadas contam, pendentes não.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'hospede@teste.local');
insert into public.booking_requests (id, property_id, rental_mode, guest_name, guest_email, guest_phone, stay,
  guests_count, quote_snapshot, quoted_total, status, privacy_consent_at)
select v.id::uuid, '71000000-0000-0000-0000-000000000002', 'seasonal', 'Hóspede', 'hospede@teste.local',
       '13999999999', daterange(private.today_sp() - v.ini, private.today_sp() - v.ini + 2), 2, '{}', 3000,
       'approved', now()
  from (values ('51000000-0000-0000-0000-000000000001', 30), ('51000000-0000-0000-0000-000000000002', 20),
               ('51000000-0000-0000-0000-000000000003', 10)) as v(id, ini);
insert into public.reviews (property_id, booking_request_id, author_id, rating, status) values
  ('71000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a1', 5, 'approved'),
  ('71000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-0000000000a1', 4, 'approved'),
  ('71000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-0000000000a1', 1, 'pending');

select pg_temp.visitante();

select results_eq(
  $$ select slug from public.search_rentals_map('seasonal') where slug like 'mapa-%' order by slug $$,
  array['mapa-a', 'mapa-b', 'mapa-c'],
  'só imóveis publicados'
);
select results_eq(
  $$ select slug from public.search_rentals_map('seasonal', p_city => 'sao sebastiao') where slug like 'mapa-%'
     order by slug $$,
  array['mapa-b', 'mapa-c'],
  'cidade sem acento encontra "São Sebastião"'
);
select results_eq(
  $$ select slug from public.search_rentals_map('seasonal', p_neighborhood => 'JUQUEHY') where slug like 'mapa-%' $$,
  array['mapa-b'],
  'bairro sem diferenciar maiúsculas'
);
select results_eq(
  $$ select slug from public.search_rentals_map('seasonal', p_neighborhood => 'riviera-de-sao-lourenco')
     where slug like 'mapa-%' $$,
  array['mapa-a'],
  'bairro escrito como slug'
);
select results_eq(
  $$ select slug from public.search_rentals_map('seasonal', p_place => 'barra do') where slug like 'mapa-%' $$,
  array['mapa-c'],
  'texto livre procura em cidade e bairro'
);
select is_empty(
  $$ select 1 from public.search_rentals_map('seasonal', p_city => 'Paraty') where slug like 'mapa-%' $$,
  'cidade sem imóveis não devolve nada'
);
select results_eq(
  $$ select slug from public.search_rentals_map('seasonal', p_region => 'sao-sebastiao', p_type => 'apartamento')
     where slug like 'mapa-%' $$,
  array['mapa-b'],
  'filtro de tipo de imóvel'
);
select results_eq(
  $$ select slug from public.search_rentals_map('seasonal', p_bbox => array[-45.9, -23.9, -45.6, -23.6])
     where slug like 'mapa-%' $$,
  array['mapa-b'],
  'área do mapa: só imóveis com coordenadas dentro dela (C, sem coordenadas, fica de fora)'
);
select results_eq(
  $$ select slug from public.search_rentals_map('seasonal', p_amenities => array['piscina', 'wi-fi'])
     where slug like 'mapa-%' $$,
  array['mapa-b'],
  'comodidades exigem todas'
);

-- Coordenadas: aproximadas (públicas), nunca as exatas; sem coordenadas → null.
select ok(
  (select approx_lat is not null and approx_lng is not null
          and (approx_lat, approx_lng) is distinct from (-23.771500::numeric, -45.731900::numeric)
     from public.search_rentals_map('seasonal') where slug = 'mapa-b'),
  'devolve a coordenada aproximada, não a exata'
);
select is(
  (select approx_lat from public.search_rentals_map('seasonal') where slug = 'mapa-b'),
  (select approx_lat from public.properties where slug = 'mapa-b'),
  'é a mesma coordenada aproximada já pública'
);
select ok(
  (select approx_lat is null and approx_lng is null from public.search_rentals_map('seasonal') where slug = 'mapa-c'),
  'imóvel sem coordenadas continua na lista, sem posição'
);

-- Preço, avaliação e capa.
select is(
  (select unit_price from public.search_rentals_map('seasonal') where slug = 'mapa-b'),
  1200.00::numeric,
  'sem datas: diária base'
);
select results_eq(
  $$ select unit_price, quote_total, nights
       from public.search_rentals_map('seasonal', p_check_in => (select base from d),
                                      p_check_out => (select base + 4 from d), p_guests => 2)
      where slug = 'mapa-b' $$,
  $$ values (1600.00::numeric, 6700.00::numeric, 4) $$,
  'com datas: média das diárias do período (sazonal incluída) e total com taxas, sem caução'
);
select is(
  (select unit_price from public.search_rentals_map('monthly') where slug = 'mapa-b'),
  15000.00::numeric,
  'mensal: valor do mês'
);
select is_empty(
  $$ select 1 from public.search_rentals_map('seasonal', p_check_in => (select base from d),
                                             p_check_out => (select base + 4 from d))
      where slug = 'mapa-a' $$,
  'datas ocupadas tiram o imóvel'
);
select results_eq(
  $$ select slug from public.search_rentals_map('seasonal', p_check_in => (select base from d),
                                                p_check_out => (select base + 4 from d), p_price_max => 1000)
      where slug like 'mapa-%' $$,
  array['mapa-c'],
  'preço máximo compara com a média das diárias do período'
);
select results_eq(
  $$ select slug from public.search_rentals_map('seasonal', p_price_min => 700) where slug like 'mapa-%'
     order by slug $$,
  array['mapa-a', 'mapa-b'],
  'preço mínimo'
);
select results_eq(
  $$ select rating_avg, rating_count from public.search_rentals_map('seasonal') where slug = 'mapa-b' $$,
  $$ values (4.50::numeric, 2) $$,
  'nota média só das avaliações aprovadas'
);
select results_eq(
  $$ select rating_avg, rating_count from public.search_rentals_map('seasonal') where slug = 'mapa-a' $$,
  $$ values (null::numeric, 0) $$,
  'sem avaliações: nota vazia'
);
select results_eq(
  $$ select cover_path, cover_width from public.search_rentals_map('seasonal') where slug = 'mapa-b' $$,
  $$ values ('b/fachada.webp'::text, 1600) $$,
  'capa marcada vem primeiro'
);
select results_eq(
  $$ select slug from public.search_rentals_map('seasonal', p_sort => 'rating') where slug like 'mapa-%' limit 1 $$,
  array['mapa-b'],
  'ordenar por avaliação'
);

select throws_ok(
  $$ select * from public.search_rentals_map('seasonal', p_bbox => array[-45.6, -23.9, -45.9, -23.6]) $$,
  'P0001', 'invalid_area', 'área invertida é recusada'
);
select throws_ok(
  $$ select * from public.search_rentals_map('seasonal', p_sort => 'nome') $$,
  'P0001', 'invalid_sort', 'ordenação desconhecida é recusada'
);

-- A migration não pode atrapalhar quem grava imóveis (painel usa a sessão do
-- admin; testes e scripts, service_role).
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select lives_ok(
  $$ insert into public.properties (slug, title, property_type, city, neighborhood, offers_seasonal,
       nightly_price, status, published_at)
     values ('mapa-gravacao', 'Gravação', 'casa', 'São Sebastião', 'Juquehy', true, 700, 'published', now()) $$,
  'service_role grava imóvel publicado com cidade e bairro'
);

reset role;
select * from finish();
rollback;
