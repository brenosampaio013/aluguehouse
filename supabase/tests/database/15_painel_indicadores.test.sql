-- Testes pgTAP: indicadores da visão geral do painel (public.admin_dashboard)
begin;
create extension if not exists pgtap with schema extensions;

create function pg_temp.entrar(p_sub uuid, p_email text, p_admin boolean default false, p_aal text default 'aal1')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', p_sub, 'role', 'authenticated', 'email', p_email, 'aal', p_aal,
    'app_metadata', case when p_admin then json_build_object('role', 'admin') else '{}'::json end
  )::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a5', 'admin-indicadores@teste.local'),
  ('00000000-0000-0000-0000-0000000000b5', 'hospede-indicadores@teste.local');

select plan(15);

insert into public.properties (id, slug, title, property_type, city, offers_seasonal,
  nightly_price, max_guests, status, published_at)
values
  ('50000000-0000-0000-0000-000000000001', 'casa-indicadores', 'Casa Indicadores', 'casa', 'Bertioga',
   true, 1000, 6, 'published', now()),
  ('50000000-0000-0000-0000-000000000002', 'casa-indicadores-2', 'Casa Indicadores 2', 'casa', 'Bertioga',
   true, 800, 4, 'published', now());

-- Período de referência: 2026-03-01 a 2026-03-10 (10 dias); anterior: 19 a 28/02.
insert into public.booking_requests (id, property_id, rental_mode, guest_name, guest_email, guest_phone,
  stay, guests_count, quote_snapshot, quoted_total, privacy_consent_at, status, created_at, decided_at)
values
  -- atual: 3 pedidos (2 aprovados), respostas em 2 h e 4 h
  ('50000000-0000-0000-0000-0000000000f1', '50000000-0000-0000-0000-000000000001', 'seasonal',
   'Ana', 'ana@teste.local', '13999999999', daterange('2026-03-05', '2026-03-08'), 2, '{}', 3000, now(),
   'approved', '2026-03-02 12:00-03', '2026-03-02 14:00-03'),
  ('50000000-0000-0000-0000-0000000000f2', '50000000-0000-0000-0000-000000000002', 'seasonal',
   'Bia', 'bia@teste.local', '13999999998', daterange('2026-04-01', '2026-04-03'), 2, '{}', 1600, now(),
   'approved', '2026-03-09 10:00-03', '2026-03-09 14:00-03'),
  ('50000000-0000-0000-0000-0000000000f3', '50000000-0000-0000-0000-000000000001', 'seasonal',
   'Caio', 'caio@teste.local', '13999999997', daterange('2026-05-01', '2026-05-03'), 2, '{}', 2000, now(),
   'pending', '2026-03-10 23:30-03', null),
  -- anterior: 1 pedido recusado
  ('50000000-0000-0000-0000-0000000000f4', '50000000-0000-0000-0000-000000000001', 'seasonal',
   'Davi', 'davi@teste.local', '13999999996', daterange('2026-06-01', '2026-06-03'), 2, '{}', 2000, now(),
   'declined', '2026-02-20 09:00-03', '2026-02-20 10:00-03'),
  -- fora dos dois períodos (11/03 em São Paulo)
  ('50000000-0000-0000-0000-0000000000f5', '50000000-0000-0000-0000-000000000001', 'seasonal',
   'Eva', 'eva@teste.local', '13999999995', daterange('2026-07-01', '2026-07-03'), 2, '{}', 2000, now(),
   'pending', '2026-03-11 00:30-03', null);

-- Reserva aprovada de 05 a 08/03 (3 noites dentro do período)
insert into public.calendar_blocks (property_id, stay, kind, booking_request_id)
values ('50000000-0000-0000-0000-000000000001', daterange('2026-03-05', '2026-03-08'), 'booking',
  '50000000-0000-0000-0000-0000000000f1');

insert into public.inquiries (kind, name, email, message, privacy_consent_at, created_at) values
  ('contact', 'Fulano', 'f@teste.local', 'Oi', now(), '2026-03-03 10:00-03'),
  ('contact', 'Ciclano', 'c@teste.local', 'Oi', now(), '2026-02-25 10:00-03');

-- Sem login e como hóspede: recusado
select pg_temp.entrar('00000000-0000-0000-0000-0000000000b5', 'hospede-indicadores@teste.local');
select throws_ok($$ select public.admin_dashboard('2026-03-01', '2026-03-10') $$,
  '42501', null, 'hóspede não lê os indicadores');
reset role;

-- Admin sem MFA: recusado
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a5', 'admin-indicadores@teste.local', true, 'aal1');
select throws_ok($$ select public.admin_dashboard('2026-03-01', '2026-03-10') $$,
  '42501', null, 'admin sem MFA não lê os indicadores');
reset role;

set local role anon;
select throws_ok($$ select public.admin_dashboard('2026-03-01', '2026-03-10') $$,
  '42501', null, 'visitante anônimo não executa a função');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a5', 'admin-indicadores@teste.local', true, 'aal2');
create temporary table d as select public.admin_dashboard('2026-03-01', '2026-03-10') as j;

select is((select j->'current'->>'requests' from d), '3', 'pedidos no período (fuso de São Paulo)');
select is((select j->'current'->>'approved' from d), '2', 'aprovados no período');
select is((select (j->'current'->>'approved_value')::numeric from d), 4600::numeric, 'valor aprovado');
select is((select (j->'current'->>'avg_response_hours')::numeric from d), 3.0, 'tempo médio de resposta');
select is((select j->'previous'->>'requests' from d), '1', 'pedidos no período anterior');
select is((select j->'current'->>'inquiries' from d), '1', 'contatos no período');
select is((select j->'current'->>'booked_nights' from d), '3', 'noites reservadas dentro do período');
select is((select j->>'rental_properties' from d), '2', 'imóveis de aluguel publicados');
select is((select jsonb_array_length(j->'series') from d), 10, 'série diária com um ponto por dia');
select is((select j->'by_status'->>'pending' from d), '1', 'pedidos por situação');

select is(
  (select public.admin_dashboard('2026-03-01', '2026-03-10', '50000000-0000-0000-0000-000000000002')
     ->'current'->>'requests'),
  '1', 'filtro por imóvel');

select throws_ok($$ select public.admin_dashboard('2026-03-10', '2026-03-01') $$,
  '22023', null, 'período invertido é recusado');
reset role;

select * from finish();
rollback;
