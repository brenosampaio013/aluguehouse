-- Testes pgTAP: precos
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

select plan(16);

insert into public.properties (id, slug, title, property_type, city, offers_seasonal, offers_monthly,
  nightly_price, monthly_price, min_nights, max_nights, max_guests, status, published_at)
values
  ('30000000-0000-0000-0000-000000000001', 'casa-precos', 'Casa preços', 'casa', 'Bertioga', true, true,
   1000, 15000, 2, 90, 6, 'published', now()),
  ('30000000-0000-0000-0000-000000000002', 'casa-so-temporada', 'Casa só temporada', 'casa', 'Bertioga', true, false,
   500, null, 1, 90, 4, 'published', now()),
  ('30000000-0000-0000-0000-000000000003', 'casa-rascunho-precos', 'Casa rascunho', 'casa', 'Bertioga', true, false,
   500, null, 1, 90, 4, 'draft', null);

create temp table d as select private.today_sp() + 100 as base;
grant select on d to anon, authenticated;

insert into public.seasonal_rates (property_id, label, period, nightly_price, min_nights)
select '30000000-0000-0000-0000-000000000001', 'Réveillon', daterange(base + 30, base + 35), 3000, 5 from d;

insert into public.property_fees (property_id, label, calc, amount, applies_to, is_refundable, position) values
  ('30000000-0000-0000-0000-000000000001', 'Limpeza', 'fixed', 300, 'both', false, 1),
  ('30000000-0000-0000-0000-000000000001', 'Taxa por hóspede', 'per_guest_per_night', 10, 'seasonal', false, 2),
  ('30000000-0000-0000-0000-000000000001', 'Administração', 'percent', 5, 'monthly', false, 3),
  ('30000000-0000-0000-0000-000000000001', 'Caução', 'fixed', 2000, 'both', true, 4);

select throws_ok(
  $$ insert into public.seasonal_rates (property_id, label, period, nightly_price)
     select '30000000-0000-0000-0000-000000000001', 'Carnaval', daterange(base + 33, base + 40), 2500 from d $$,
  '23P01', null, 'tarifas sazonais não se sobrepõem');

select pg_temp.visitante();
create temp table q as
select 'normal'::text as caso, public.quote_stay('30000000-0000-0000-0000-000000000001', 'seasonal', base + 1, base + 4, 2) as r from d
union all
select 'sazonal', public.quote_stay('30000000-0000-0000-0000-000000000001', 'seasonal', base + 33, base + 38, 2) from d
union all
select 'mensal', public.quote_stay('30000000-0000-0000-0000-000000000001', 'monthly', base + 1, base + 46, 3) from d;

-- Temporada, 3 noites, 2 hóspedes: 3 × 1000 + limpeza 300 + 10 × 2 × 3
select is((select (r ->> 'subtotal')::numeric from q where caso = 'normal'), 3000::numeric, 'temporada: diárias somadas');
select is((select (r ->> 'total')::numeric from q where caso = 'normal'), 3360::numeric, 'temporada: total com taxas');
select is((select r -> 'deposits' -> 0 ->> 'amount' from q where caso = 'normal'), '2000.00',
  'caução aparece como informativa');

-- Estadia que atravessa a tarifa sazonal: 2 × 3000 + 3 × 1000
select is((select (r ->> 'subtotal')::numeric from q where caso = 'sazonal'), 9000::numeric,
  'temporada: noites sazonais usam a tarifa sazonal');
select is((select jsonb_array_length(r -> 'lines') from q where caso = 'sazonal'), 2,
  'orçamento detalha as faixas de preço');

-- Mensal, 45 noites: 15000 × 45 / 30 = 22500 + limpeza 300 + 5% administração
select is((select (r ->> 'subtotal')::numeric from q where caso = 'mensal'), 22500::numeric, 'mensal: proporcional a 30 noites');
select is((select (r ->> 'total')::numeric from q where caso = 'mensal'), 23925::numeric,
  'mensal: taxa percentual aplicada e taxa por hóspede ignorada');

select throws_like(
  $$ select public.quote_stay('30000000-0000-0000-0000-000000000001', 'seasonal', (select base + 33 from d), (select base + 36 from d), 2) $$,
  'min_nights', 'mínimo de noites da tarifa sazonal é respeitado');
select throws_like(
  $$ select public.quote_stay('30000000-0000-0000-0000-000000000001', 'seasonal', (select base + 1 from d), (select base + 2 from d), 2) $$,
  'min_nights', 'mínimo de noites do imóvel é respeitado');
select throws_like(
  $$ select public.quote_stay('30000000-0000-0000-0000-000000000001', 'seasonal', (select base from d), (select base + 30 from d), 2) $$,
  'seasonal_max_29', 'temporada vai até 29 noites');
select throws_like(
  $$ select public.quote_stay('30000000-0000-0000-0000-000000000001', 'monthly', (select base from d), (select base + 29 from d), 2) $$,
  'monthly_min_30', 'mensal exige 30 noites ou mais');
select throws_like(
  $$ select public.quote_stay('30000000-0000-0000-0000-000000000001', 'monthly', (select base from d), (select base + 91 from d), 2) $$,
  'max_nights', 'estadias acima de 90 noites são recusadas');
select throws_like(
  $$ select public.quote_stay('30000000-0000-0000-0000-000000000001', 'seasonal', (select base from d), (select base + 3 from d), 7) $$,
  'guests_exceeded', 'capacidade máxima é respeitada');
select throws_like(
  $$ select public.quote_stay('30000000-0000-0000-0000-000000000002', 'monthly', (select base from d), (select base + 40 from d), 2) $$,
  'mode_not_offered', 'modalidade não oferecida é recusada');
select throws_like(
  $$ select public.quote_stay('30000000-0000-0000-0000-000000000003', 'seasonal', (select base from d), (select base + 3 from d), 2) $$,
  'property_not_found', 'visitante não orça imóvel em rascunho');
reset role;

select * from finish();

rollback;
