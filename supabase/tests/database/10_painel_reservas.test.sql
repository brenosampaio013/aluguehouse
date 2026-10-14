-- Testes pgTAP: painel de reservas (aprovação com data passada e bloqueios manuais)
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
  ('00000000-0000-0000-0000-0000000000a1', 'admin-painel@teste.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'hospede-painel@teste.local');

select plan(8);

insert into public.properties (id, slug, title, property_type, city, offers_seasonal,
  nightly_price, max_guests, status, published_at)
values ('30000000-0000-0000-0000-000000000001', 'casa-painel', 'Casa Painel', 'casa', 'Bertioga',
  true, 1000, 6, 'published', now());

-- Pedido antigo (gravado direto, como se a data tivesse passado depois do pedido)
insert into public.booking_requests (id, property_id, rental_mode, guest_name, guest_email, guest_phone,
  stay, guests_count, quote_snapshot, quoted_total, privacy_consent_at)
values ('30000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-000000000001', 'seasonal',
  'Ana Antiga', 'ana@teste.local', '13999999999',
  daterange(private.today_sp() - 3, private.today_sp() + 1), 2, '{}', 4000, now());

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1', 'admin-painel@teste.local', true, 'aal2');
select throws_ok($$ select public.approve_booking_request('30000000-0000-0000-0000-0000000000f1') $$,
  'past_check_in', 'pedido com chegada no passado não é aprovado');
select lives_ok($$ select public.decline_booking_request('30000000-0000-0000-0000-0000000000f1', 'Datas passaram') $$,
  'pedido com chegada no passado pode ser recusado');
select is((select admin_notes from public.booking_requests where id = '30000000-0000-0000-0000-0000000000f1'),
  'Datas passaram', 'motivo da recusa fica nas anotações');

-- Bloqueios manuais pelo admin
select lives_ok($$ insert into public.calendar_blocks (property_id, stay, kind, note)
  values ('30000000-0000-0000-0000-000000000001', daterange(private.today_sp() + 30, private.today_sp() + 35), 'owner', 'Família') $$,
  'admin cria bloqueio do proprietário');
select throws_ok($$ insert into public.calendar_blocks (property_id, stay, kind)
  values ('30000000-0000-0000-0000-000000000001', daterange(private.today_sp() + 33, private.today_sp() + 36), 'maintenance') $$,
  '23P01', null, 'bloqueio sobreposto é recusado');
select throws_ok($$ insert into public.calendar_blocks (property_id, stay, kind)
  values ('30000000-0000-0000-0000-000000000001', daterange(private.today_sp() + 40, private.today_sp() + 42), 'booking') $$,
  '23514', null, 'bloqueio de reserva sem pedido é recusado');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-0000000000b1', 'hospede-painel@teste.local');
select is((select count(*)::integer from public.calendar_blocks where property_id = '30000000-0000-0000-0000-000000000001'),
  0, 'hóspede não lê o calendário interno');
select is((select count(*)::integer from public.booking_requests where property_id = '30000000-0000-0000-0000-000000000001'),
  0, 'hóspede não lê solicitações');
reset role;

select * from finish();
rollback;
