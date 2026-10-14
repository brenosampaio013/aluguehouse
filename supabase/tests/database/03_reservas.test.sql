-- Testes pgTAP: reservas
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

select plan(22);

insert into public.properties (id, slug, title, property_type, city, offers_seasonal, offers_monthly,
  nightly_price, monthly_price, max_guests, status, published_at)
values
  ('20000000-0000-0000-0000-000000000001', 'casa-a', 'Casa A', 'casa', 'Bertioga', true, true, 1000, 15000, 8, 'published', now()),
  ('20000000-0000-0000-0000-000000000002', 'casa-b', 'Casa B', 'casa', 'Bertioga', true, false, 800, null, 4, 'published', now()),
  ('20000000-0000-0000-0000-000000000003', 'casa-c', 'Casa C', 'casa', 'Bertioga', true, false, 800, null, 4, 'draft', null);

create temp table d as select private.today_sp() as hoje;
grant select on d to anon, authenticated, service_role;

-- Restrição de exclusão no calendário
insert into public.calendar_blocks (property_id, stay, kind, note)
select '20000000-0000-0000-0000-000000000001', daterange(hoje + 10, hoje + 15), 'owner', 'Uso do proprietário' from d;

select throws_ok(
  $$ insert into public.calendar_blocks (property_id, stay, kind)
     select '20000000-0000-0000-0000-000000000001', daterange(hoje + 12, hoje + 14), 'maintenance' from d $$,
  '23P01', null, 'bloqueio sobreposto é recusado pelo banco');
select lives_ok(
  $$ insert into public.calendar_blocks (property_id, stay, kind)
     select '20000000-0000-0000-0000-000000000001', daterange(hoje + 15, hoje + 18), 'maintenance' from d $$,
  'check-out e check-in no mesmo dia são permitidos');
select lives_ok(
  $$ insert into public.calendar_blocks (property_id, stay, kind)
     select '20000000-0000-0000-0000-000000000002', daterange(hoje + 10, hoje + 15), 'owner' from d $$,
  'mesmas datas em outro imóvel são permitidas');

-- Datas ocupadas públicas
select pg_temp.visitante();
select is(
  (select count(*) from public.get_unavailable_ranges('20000000-0000-0000-0000-000000000001',
     (select hoje from d), (select hoje + 60 from d))),
  2::bigint, 'visitante vê os períodos ocupados');
select is(
  (select count(*) from public.get_unavailable_ranges('20000000-0000-0000-0000-000000000003',
     (select hoje from d), (select hoje + 60 from d))),
  0::bigint, 'imóvel em rascunho não expõe calendário');
select throws_ok(
  $$ select public.request_booking('20000000-0000-0000-0000-000000000001', 'seasonal',
       (select hoje + 40 from d), (select hoje + 43 from d), 2, 'Ana Souza', 'ana@teste.local',
       '13999999999', null, true) $$,
  '42501', null, 'visitante não chama request_booking direto');
reset role;

-- Solicitações (pelo servidor)
select pg_temp.servidor();
create temp table pedidos (nome text, id uuid);
grant all on pedidos to service_role, authenticated;

insert into pedidos select 'p1', public.request_booking('20000000-0000-0000-0000-000000000001', 'seasonal',
  hoje + 40, hoje + 43, 2, 'Ana Souza', 'Ana@Teste.Local', '13999999999', 'Olá', true) from d;
insert into pedidos select 'p2', public.request_booking('20000000-0000-0000-0000-000000000001', 'seasonal',
  hoje + 41, hoje + 45, 2, 'Bia Lima', 'bia@teste.local', '13988888888', null, true) from d;

select is((select count(*) from pedidos where id is not null), 2::bigint,
  'pedidos pendentes podem se sobrepor');

select throws_ok(
  $$ select public.request_booking('20000000-0000-0000-0000-000000000001', 'seasonal',
       (select hoje + 12 from d), (select hoje + 14 from d), 2, 'Ana Souza', 'ana@teste.local',
       '13999999999', null, true) $$,
  'unavailable', 'pedido em datas bloqueadas é recusado');
select throws_ok(
  $$ select public.request_booking('20000000-0000-0000-0000-000000000001', 'seasonal',
       (select hoje - 1 from d), (select hoje + 2 from d), 2, 'Ana Souza', 'ana@teste.local',
       '13999999999', null, true) $$,
  'past_check_in', 'pedido com check-in no passado é recusado');
select throws_ok(
  $$ select public.request_booking('20000000-0000-0000-0000-000000000001', 'seasonal',
       (select hoje + 50 from d), (select hoje + 53 from d), 2, 'Ana Souza', 'ana@teste.local',
       '13999999999', null, false) $$,
  'consent_required', 'pedido sem consentimento de privacidade é recusado');
select throws_ok(
  $$ select public.request_booking('20000000-0000-0000-0000-000000000003', 'seasonal',
       (select hoje + 50 from d), (select hoje + 53 from d), 2, 'Ana Souza', 'ana@teste.local',
       '13999999999', null, true) $$,
  'property_not_found', 'pedido para imóvel em rascunho é recusado');
select throws_ok(
  $$ select public.request_booking('20000000-0000-0000-0000-000000000001', 'seasonal',
       (select hoje + 50 from d), (select hoje + 53 from d), 2, 'Ana Souza', 'email-invalido',
       '13999999999', null, true) $$,
  '23514', null, 'e-mail inválido é recusado pelo banco');
reset role;

select is((select guest_email from public.booking_requests r join pedidos p on p.id = r.id where p.nome = 'p1'),
  'ana@teste.local', 'e-mail é gravado em minúsculas');
select is((select quoted_total from public.booking_requests r join pedidos p on p.id = r.id where p.nome = 'p1'),
  3000.00::numeric, 'orçamento é gravado junto com o pedido');

-- Aprovação
select pg_temp.entrar('00000000-0000-0000-0000-00000000000b', 'ana@teste.local');
select throws_ok($$ select public.approve_booking_request((select id from pedidos where nome = 'p1')) $$,
  '42501', null, 'hóspede não aprova reservas');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-00000000000a', 'admin@teste.local', true, 'aal1');
select throws_ok($$ select public.approve_booking_request((select id from pedidos where nome = 'p1')) $$,
  '42501', null, 'admin sem MFA não aprova reservas');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-00000000000a', 'admin@teste.local', true, 'aal2');
select lives_ok($$ select public.approve_booking_request((select id from pedidos where nome = 'p1')) $$,
  'admin aprova o primeiro pedido');
select throws_ok($$ select public.approve_booking_request((select id from pedidos where nome = 'p2')) $$,
  'unavailable', 'segundo pedido sobreposto não pode ser aprovado');
select is((select status::text from public.booking_requests where id = (select id from pedidos where nome = 'p2')),
  'pending', 'pedido recusado pelo conflito continua pendente');
select throws_ok($$ select public.approve_booking_request((select id from pedidos where nome = 'p1')) $$,
  'invalid_status', 'pedido já aprovado não é aprovado de novo');

select lives_ok($$ select public.cancel_booking_request((select id from pedidos where nome = 'p1'), 'Desistência') $$,
  'admin cancela reserva aprovada');
select lives_ok($$ select public.approve_booking_request((select id from pedidos where nome = 'p2')) $$,
  'datas liberadas pelo cancelamento podem ser aprovadas');
reset role;

select * from finish();

rollback;
