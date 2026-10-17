-- Testes pgTAP: portal do proprietário (isolamento por imóvel, MFA,
-- reservas sem dados privados, solicitações aprovadas pelo admin).
begin;
create extension if not exists pgtap with schema extensions;

create function pg_temp.entrar(p_sub uuid, p_email text, p_role text default null, p_aal text default 'aal2')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', p_sub, 'role', 'authenticated', 'email', p_email, 'aal', p_aal,
    'app_metadata', case when p_role is null then '{}'::json else json_build_object('role', p_role) end
  )::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.anonimo()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end $$;

-- Usuários: admin, dois proprietários com imóveis, um sem imóveis e um hóspede.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000018a1', 'admin-prop@teste.local', '{"role": "admin"}'),
  ('00000000-0000-0000-0000-0000000018b1', 'dono-a@teste.local', '{"role": "owner"}'),
  ('00000000-0000-0000-0000-0000000018b2', 'dono-b@teste.local', '{"role": "owner"}'),
  ('00000000-0000-0000-0000-0000000018b3', 'dono-sem@teste.local', '{"role": "owner"}'),
  ('00000000-0000-0000-0000-0000000018c1', 'hospede-prop@teste.local', '{}');

-- Imóveis: dois do proprietário A (um rascunho), um do B e um sem dono.
insert into public.properties (id, slug, title, property_type, city, offers_seasonal,
  nightly_price, max_guests, status, published_at)
values
  ('18000000-0000-0000-0000-000000000001', 'casa-dono-a', 'Casa do Dono A', 'casa', 'Bertioga', true, 1000, 6, 'published', now()),
  ('18000000-0000-0000-0000-000000000003', 'casa-dono-b', 'Casa do Dono B', 'casa', 'Bertioga', true, 900, 4, 'published', now()),
  ('18000000-0000-0000-0000-000000000004', 'casa-sem-dono', 'Casa Sem Dono', 'casa', 'Bertioga', true, 800, 4, 'published', now());
insert into public.properties (id, slug, title, property_type, city, status)
values ('18000000-0000-0000-0000-000000000002', 'rascunho-dono-a', 'Rascunho do Dono A', 'apartamento', 'Ubatuba', 'draft');

insert into public.property_private (property_id, full_address, owner_notes)
values ('18000000-0000-0000-0000-000000000001', 'Rua Secreta, 1', 'Anotação interna do admin');
insert into public.seasonal_rates (property_id, label, period, nightly_price)
values ('18000000-0000-0000-0000-000000000002', 'Réveillon', daterange('2026-12-28', '2027-01-03'), 3000);
insert into public.property_fees (property_id, label, calc, amount)
values ('18000000-0000-0000-0000-000000000002', 'Limpeza', 'fixed', 300);

insert into public.property_owners (property_id, owner_id) values
  ('18000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000018b1'),
  ('18000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000018b1'),
  ('18000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000018b2');

-- Reservas: pendente, aprovada (com bloqueio) e cancelada no imóvel de A; uma no de B.
insert into public.booking_requests (id, property_id, rental_mode, guest_name, guest_email, guest_phone,
  stay, guests_count, quote_snapshot, quoted_total, privacy_consent_at, status, admin_notes)
values
  ('18000000-0000-0000-0000-0000000000f1', '18000000-0000-0000-0000-000000000001', 'seasonal',
   'Maria Clara Souza', 'maria@teste.local', '13999990001',
   daterange(private.today_sp() + 10, private.today_sp() + 14), 3, '{"total": 4000}', 4000, now(), 'pending', null),
  ('18000000-0000-0000-0000-0000000000f2', '18000000-0000-0000-0000-000000000001', 'seasonal',
   'João Pedro', 'joao@teste.local', '13999990002',
   daterange(private.today_sp() + 20, private.today_sp() + 25), 2, '{"total": 5000}', 5000, now(), 'approved', 'Cliente VIP'),
  ('18000000-0000-0000-0000-0000000000f3', '18000000-0000-0000-0000-000000000001', 'seasonal',
   'Carla Dias', 'carla@teste.local', '13999990003',
   daterange(private.today_sp() + 40, private.today_sp() + 42), 1, '{"total": 2000}', 2000, now(), 'cancelled', null),
  ('18000000-0000-0000-0000-0000000000f4', '18000000-0000-0000-0000-000000000003', 'seasonal',
   'Bruno Lima', 'bruno@teste.local', '13999990004',
   daterange(private.today_sp() + 5, private.today_sp() + 8), 2, '{"total": 2700}', 2700, now(), 'approved', null);

insert into public.calendar_blocks (property_id, stay, kind, booking_request_id) values
  ('18000000-0000-0000-0000-000000000001', daterange(private.today_sp() + 20, private.today_sp() + 25), 'booking', '18000000-0000-0000-0000-0000000000f2'),
  ('18000000-0000-0000-0000-000000000003', daterange(private.today_sp() + 5, private.today_sp() + 8), 'booking', '18000000-0000-0000-0000-0000000000f4');
insert into public.calendar_blocks (property_id, stay, kind, note) values
  ('18000000-0000-0000-0000-000000000001', daterange(private.today_sp() + 60, private.today_sp() + 62), 'maintenance', 'Nota interna');

select plan(55);

------------------------------------------------------------------------------
-- Vínculo: só com usuários de papel "owner"
------------------------------------------------------------------------------
select throws_ok($$ insert into public.property_owners (property_id, owner_id)
  values ('18000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000018c1') $$,
  'not_an_owner', 'hóspede não pode ser vinculado como proprietário');
select throws_ok($$ insert into public.property_owners (property_id, owner_id)
  values ('18000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000018a1') $$,
  'not_an_owner', 'admin não pode ser vinculado como proprietário');

------------------------------------------------------------------------------
-- Proprietário A (com MFA): vê só o que é dele
------------------------------------------------------------------------------
select pg_temp.entrar('00000000-0000-0000-0000-0000000018b1', 'dono-a@teste.local', 'owner');

select results_eq($$ select property_id::text from public.property_owners order by 1 $$,
  $$ values ('18000000-0000-0000-0000-000000000001'), ('18000000-0000-0000-0000-000000000002') $$,
  'A lê só os próprios vínculos');
select is((select title from public.properties where id = '18000000-0000-0000-0000-000000000002'),
  'Rascunho do Dono A', 'A lê o próprio rascunho');
select is((select count(*)::integer from public.seasonal_rates where property_id = '18000000-0000-0000-0000-000000000002'),
  1, 'A lê as tarifas do próprio rascunho');
select is((select count(*)::integer from public.property_fees where property_id = '18000000-0000-0000-0000-000000000002'),
  1, 'A lê as taxas do próprio rascunho');
select is((select count(*)::integer from public.property_private), 0,
  'A não lê endereço exato nem anotações internas');
select is((select count(*)::integer from public.booking_requests), 0,
  'A não lê a tabela de reservas diretamente');
select is((select count(*)::integer from public.calendar_blocks), 0,
  'A não lê a tabela do calendário diretamente');

select results_eq($$ select id::text from public.owner_bookings() order by check_in $$,
  $$ values ('18000000-0000-0000-0000-0000000000f1'), ('18000000-0000-0000-0000-0000000000f2'),
            ('18000000-0000-0000-0000-0000000000f3') $$,
  'A vê as reservas dos seus imóveis: pendente, aprovada e cancelada');
select is((select guest_first_name from public.owner_bookings() where id = '18000000-0000-0000-0000-0000000000f1'),
  'Maria', 'do hóspede, só o primeiro nome');
select is((select status::text from public.owner_bookings() where id = '18000000-0000-0000-0000-0000000000f1'),
  'pending', 'pedido pendente aparece como pendente');
select is((select quoted_total from public.owner_bookings() where id = '18000000-0000-0000-0000-0000000000f2'),
  5000.00::numeric, 'orçamento estimado disponível');
select is((select count(*)::integer from public.owner_bookings('18000000-0000-0000-0000-000000000003')),
  0, 'A não vê reservas do imóvel de B, mesmo pedindo pelo ID');
select ok(
  not (select proargnames from pg_proc where proname = 'owner_bookings')
      && array['guest_email', 'guest_phone', 'guest_name', 'admin_notes', 'message'],
  'reservas do proprietário não expõem e-mail, telefone, nome completo nem anotações');

select results_eq($$ select kind::text from public.owner_calendar(private.today_sp(), private.today_sp() + 90) order by start_date $$,
  $$ values ('booking'), ('maintenance') $$,
  'calendário de A: reserva aprovada e manutenção do seu imóvel');
select is((select count(*)::integer from public.owner_calendar(private.today_sp(), private.today_sp() + 90,
  '18000000-0000-0000-0000-000000000003')), 0, 'A não vê o calendário de B pelo ID');
select throws_ok($$ select * from public.owner_calendar(private.today_sp(), private.today_sp() + 500) $$,
  'invalid_range', 'período longo demais é recusado');

-- Escrita direta é negada
select is_empty($$ update public.properties set title = 'Hackeado' where id = '18000000-0000-0000-0000-000000000001' returning id $$,
  'A não altera o anúncio diretamente');
select throws_ok($$ insert into public.property_owners (property_id, owner_id)
  values ('18000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000018b1') $$,
  '42501', null, 'A não se vincula sozinho a outro imóvel');
select is_empty($$ delete from public.property_owners returning property_id $$,
  'A não remove vínculos');
select throws_ok($$ insert into public.calendar_blocks (property_id, stay, kind)
  values ('18000000-0000-0000-0000-000000000001', daterange(private.today_sp() + 100, private.today_sp() + 102), 'owner') $$,
  '42501', null, 'A não grava bloqueio direto no calendário');
select throws_ok($$ insert into public.owner_requests (property_id, requested_by, kind, message)
  values ('18000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000018b1', 'change', 'direto') $$,
  '42501', null, 'A não grava pedidos direto na tabela');

-- Solicitações
select lives_ok($$ select public.request_owner_block('18000000-0000-0000-0000-000000000001',
  private.today_sp() + 30, private.today_sp() + 33, 'Férias da família') $$,
  'A pede bloqueio de datas livres do seu imóvel');
select lives_ok($$ select public.request_owner_block('18000000-0000-0000-0000-000000000001',
  private.today_sp() + 31, private.today_sp() + 35) $$,
  'pedidos pendentes podem se sobrepor (a aprovação decide)');
select throws_ok($$ select public.request_owner_block('18000000-0000-0000-0000-000000000001',
  private.today_sp() + 21, private.today_sp() + 23) $$,
  'unavailable', 'bloqueio sobre reserva aprovada é recusado');
select throws_ok($$ select public.request_owner_block('18000000-0000-0000-0000-000000000001',
  private.today_sp() - 2, private.today_sp() + 1) $$,
  'past_check_in', 'bloqueio no passado é recusado');
select throws_ok($$ select public.request_owner_block('18000000-0000-0000-0000-000000000003',
  private.today_sp() + 30, private.today_sp() + 33) $$,
  '42501', null, 'A não pede bloqueio no imóvel de B');
select lives_ok($$ select public.request_property_change('18000000-0000-0000-0000-000000000002',
  'Atualizar a descrição da varanda') $$, 'A pede alteração do anúncio');
select throws_ok($$ select public.request_property_change('18000000-0000-0000-0000-000000000002', '   ') $$,
  'message_required', 'pedido de alteração precisa de descrição');
select is((select count(*)::integer from public.owner_requests), 3, 'A vê os próprios pedidos');
select is_empty($$ update public.owner_requests set status = 'approved' returning id $$,
  'A não aprova o próprio pedido pela tabela');
select throws_ok($$ select public.approve_owner_request((select id from public.owner_requests limit 1)) $$,
  '42501', null, 'A não aprova pedidos pela função do admin');
reset role;

------------------------------------------------------------------------------
-- Proprietário B: não vê nada de A
------------------------------------------------------------------------------
select pg_temp.entrar('00000000-0000-0000-0000-0000000018b2', 'dono-b@teste.local', 'owner');
select is((select count(*)::integer from public.properties where id = '18000000-0000-0000-0000-000000000002'),
  0, 'B não vê o rascunho de A');
select results_eq($$ select id::text from public.owner_bookings() $$,
  $$ values ('18000000-0000-0000-0000-0000000000f4') $$, 'B vê só as reservas do seu imóvel');
select is((select count(*)::integer from public.owner_requests), 0, 'B não vê os pedidos de A');
reset role;

-- B tenta cancelar um pedido real de A (ID obtido como admin)
create temp table pedidos_a as select id, kind from public.owner_requests;
grant select on pedidos_a to authenticated;
select pg_temp.entrar('00000000-0000-0000-0000-0000000018b2', 'dono-b@teste.local', 'owner');
select throws_ok($$ select public.cancel_owner_request((select id from pedidos_a where kind = 'change')) $$,
  'invalid_status', 'B não cancela o pedido de A mesmo sabendo o ID');
reset role;

------------------------------------------------------------------------------
-- Sem MFA, sem vínculo, hóspede e visitante
------------------------------------------------------------------------------
select pg_temp.entrar('00000000-0000-0000-0000-0000000018b1', 'dono-a@teste.local', 'owner', 'aal1');
select throws_ok($$ select * from public.owner_bookings() $$, '42501', null,
  'proprietário sem MFA não lê reservas');
select is((select count(*)::integer from public.properties where id = '18000000-0000-0000-0000-000000000002'),
  0, 'proprietário sem MFA não lê o rascunho');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-0000000018b3', 'dono-sem@teste.local', 'owner');
select is((select count(*)::integer from public.owner_bookings()), 0, 'proprietário sem imóveis: nenhuma reserva');
select is((select count(*)::integer from public.property_owners), 0, 'proprietário sem imóveis: nenhum vínculo');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-0000000018c1', 'hospede-prop@teste.local');
select throws_ok($$ select * from public.owner_bookings() $$, '42501', null, 'hóspede não usa o portal');
select throws_ok($$ select public.request_property_change('18000000-0000-0000-0000-000000000001', 'oi') $$,
  '42501', null, 'hóspede não faz pedidos');
reset role;

select pg_temp.anonimo();
select throws_ok($$ select * from public.owner_bookings() $$, '42501', null, 'visitante não executa a função');
select throws_ok($$ select count(*) from public.property_owners $$, '42501', null, 'visitante não lê vínculos');
reset role;

------------------------------------------------------------------------------
-- Admin: permissões preservadas e decisão dos pedidos
------------------------------------------------------------------------------
select pg_temp.entrar('00000000-0000-0000-0000-0000000018a1', 'admin-prop@teste.local', 'admin');
select is((select count(*)::integer from public.booking_requests where id::text like '18000000-%'),
  4, 'admin continua lendo todas as reservas');
select is((select count(*)::integer from public.property_owners), 3, 'admin lê todos os vínculos');

select lives_ok($$ select public.approve_owner_request(
  (select id from public.owner_requests where kind = 'block' and lower(stay) = private.today_sp() + 30), 'Ok') $$,
  'admin aprova o bloqueio');
select is((select b.kind::text from public.calendar_blocks b
  join public.owner_requests r on r.calendar_block_id = b.id where r.status = 'approved'),
  'owner', 'aprovação grava "uso do proprietário" no calendário');
select throws_ok($$ select public.approve_owner_request(
  (select id from public.owner_requests where kind = 'block' and lower(stay) = private.today_sp() + 31)) $$,
  'unavailable', 'segundo bloqueio sobreposto não é aprovado');
select is((select status::text from public.owner_requests where kind = 'block' and lower(stay) = private.today_sp() + 31),
  'pending', 'pedido recusado pelo calendário continua pendente');
select lives_ok($$ select public.reject_owner_request(
  (select id from public.owner_requests where kind = 'change'), 'Mande fotos novas') $$,
  'admin recusa o pedido de alteração com resposta');

-- Desvincular tira o acesso na hora
delete from public.property_owners where property_id = '18000000-0000-0000-0000-000000000002';
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-0000000018b1', 'dono-a@teste.local', 'owner');
select is((select count(*)::integer from public.properties where id = '18000000-0000-0000-0000-000000000002'),
  0, 'desvinculado, A deixa de ver o rascunho');
select lives_ok($$ select public.cancel_owner_request(
  (select id from public.owner_requests where kind = 'block' and status = 'pending')) $$,
  'A cancela o próprio pedido pendente');
reset role;

-- Limite de pedidos pendentes
insert into public.owner_requests (property_id, requested_by, kind, message)
select '18000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000018b1', 'change', 'pedido ' || n
  from generate_series(1, 20) n;
select pg_temp.entrar('00000000-0000-0000-0000-0000000018b1', 'dono-a@teste.local', 'owner');
select throws_ok($$ select public.request_property_change('18000000-0000-0000-0000-000000000001', 'mais um') $$,
  'too_many_pending', 'no máximo 20 pedidos pendentes por imóvel');
reset role;

select * from finish();
rollback;
