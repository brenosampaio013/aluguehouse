-- Testes pgTAP: documentos privados e notificações do portal do proprietário.
begin;
create extension if not exists pgtap with schema extensions;

create function pg_temp.entrar(p_sub uuid, p_role text default null, p_aal text default 'aal2')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', p_sub, 'role', 'authenticated', 'aal', p_aal,
    'app_metadata', case when p_role is null then '{}'::json else json_build_object('role', p_role) end
  )::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000020a1', 'admin-20@teste.local', '{"role": "admin"}'),
  ('00000000-0000-0000-0000-0000000020b1', 'dono-a-20@teste.local', '{"role": "owner"}'),
  ('00000000-0000-0000-0000-0000000020b2', 'dono-b-20@teste.local', '{"role": "owner"}'),
  ('00000000-0000-0000-0000-0000000020c1', 'hospede-20@teste.local', '{}');

insert into public.properties (id, slug, title, property_type, city, offers_seasonal,
  nightly_price, max_guests, status, published_at)
values
  ('20000000-0000-0000-0000-000000000001', 'casa-20-a', 'Casa Vinte A', 'casa', 'Bertioga', true, 1000, 6, 'published', now()),
  ('20000000-0000-0000-0000-000000000002', 'casa-20-b', 'Casa Vinte B', 'casa', 'Bertioga', true, 1000, 6, 'published', now());
insert into public.property_owners (property_id, owner_id) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000020b1'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000020b2');

select plan(26);

------------------------------------------------------------------------------
-- Notificações geradas pelo banco
------------------------------------------------------------------------------
insert into public.booking_requests (id, property_id, rental_mode, guest_name, guest_email, guest_phone,
  stay, guests_count, quote_snapshot, quoted_total, privacy_consent_at)
values ('20000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-000000000001', 'seasonal',
  'Maria Clara Souza', 'maria20@teste.local', '13999990020',
  daterange(private.today_sp() + 10, private.today_sp() + 13), 3, '{}', 3000, now());

select is((select count(*)::integer from public.owner_notifications
  where owner_id = '00000000-0000-0000-0000-0000000020b1' and kind = 'booking_new'), 1,
  'novo pedido avisa o proprietário do imóvel');
select is((select count(*)::integer from public.owner_notifications
  where owner_id = '00000000-0000-0000-0000-0000000020b2'), 0,
  'proprietário de outro imóvel não é avisado');
select ok((select body from public.owner_notifications where kind = 'booking_new') like '%Maria%'
  and (select body from public.owner_notifications where kind = 'booking_new') not like '%Souza%'
  and (select body from public.owner_notifications where kind = 'booking_new') not like '%maria20@%',
  'aviso só com o primeiro nome (sem sobrenome nem e-mail)');

select pg_temp.entrar('00000000-0000-0000-0000-0000000020a1', 'admin');
select public.approve_booking_request('20000000-0000-0000-0000-0000000000f1');
reset role;
select is((select count(*)::integer from public.owner_notifications where kind = 'booking_approved'), 1,
  'aprovação avisa o proprietário');
select pg_temp.entrar('00000000-0000-0000-0000-0000000020a1', 'admin');
select public.cancel_booking_request('20000000-0000-0000-0000-0000000000f1', 'Hóspede desistiu');
reset role;
select is((select count(*)::integer from public.owner_notifications where kind = 'booking_cancelled'), 1,
  'cancelamento avisa o proprietário');
select ok((select body from public.owner_notifications where kind = 'booking_cancelled') not like '%desistiu%',
  'anotação do admin não vai para o aviso');

-- Pedido do proprietário respondido
select pg_temp.entrar('00000000-0000-0000-0000-0000000020b1', 'owner');
select public.request_property_change('20000000-0000-0000-0000-000000000001', 'Trocar a foto da sala');
reset role;
select pg_temp.entrar('00000000-0000-0000-0000-0000000020a1', 'admin');
select public.reject_owner_request((select id from public.owner_requests where property_id = '20000000-0000-0000-0000-000000000001'), 'Envie a foto nova');
reset role;
select is((select body from public.owner_notifications where kind = 'request_rejected'),
  'Casa Vinte A · Alteração do anúncio · Envie a foto nova', 'resposta ao pedido avisa quem pediu');

-- Aviso do admin
select pg_temp.entrar('00000000-0000-0000-0000-0000000020a1', 'admin');
select is(public.admin_notify_owners(null, 'Manutenção da piscina', 'Na segunda-feira.'), 2,
  'aviso geral vai para todos os proprietários');
select is(public.admin_notify_owners('20000000-0000-0000-0000-000000000002', 'Só para B', null), 1,
  'aviso de um imóvel vai só para os proprietários dele');
select throws_ok($$ select public.admin_notify_owners(null, 'x', null) $$, 'invalid_title',
  'aviso precisa de título');
reset role;

------------------------------------------------------------------------------
-- Leitura das notificações
------------------------------------------------------------------------------
select pg_temp.entrar('00000000-0000-0000-0000-0000000020b1', 'owner');
select is((select count(*)::integer from public.owner_notifications), 5, 'A lê só as próprias notificações');
select is((select count(*)::integer from public.owner_notifications where title = 'Só para B'), 0,
  'A não lê aviso de B');
select is_empty($$ update public.owner_notifications set read_at = now() returning id $$,
  'A não altera notificações direto na tabela');
select throws_ok($$ insert into public.owner_notifications (owner_id, kind, title)
  values ('00000000-0000-0000-0000-0000000020b2', 'notice', 'falso') $$, '42501', null,
  'A não cria notificações');
select is(public.mark_owner_notifications_read(
  array[(select id from public.owner_notifications where kind = 'booking_new')]), 1,
  'A marca uma como lida');
select is(public.mark_owner_notifications_read(), 4, 'A marca as demais como lidas');
reset role;
select is((select count(*)::integer from public.owner_notifications
  where owner_id = '00000000-0000-0000-0000-0000000020b2' and read_at is not null), 0,
  'marcar como lida não mexe nas de B');

select pg_temp.entrar('00000000-0000-0000-0000-0000000020b1', 'owner', 'aal1');
select throws_ok($$ select public.mark_owner_notifications_read() $$, '42501', null,
  'proprietário sem MFA não usa a função');
select is((select count(*)::integer from public.owner_notifications), 0, 'nem lê notificações');
reset role;

------------------------------------------------------------------------------
-- Documentos privados
------------------------------------------------------------------------------
insert into public.owner_documents (id, property_id, title, category, storage_path, mime_type, size_bytes)
values
  ('20000000-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-000000000001', 'Contrato de administração', 'contract',
   '20000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-0000000000d1/contrato.pdf', 'application/pdf', 1000),
  ('20000000-0000-0000-0000-0000000000d2', '20000000-0000-0000-0000-000000000002', 'Relatório de outubro', 'report',
   '20000000-0000-0000-0000-000000000002/20000000-0000-0000-0000-0000000000d2/relatorio.pdf', 'application/pdf', 1000);
insert into storage.objects (bucket_id, name) values
  ('owner-documents', '20000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-0000000000d1/contrato.pdf'),
  ('owner-documents', '20000000-0000-0000-0000-000000000002/20000000-0000-0000-0000-0000000000d2/relatorio.pdf'),
  ('owner-documents', '20000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-0000000000d9/solto.pdf');

select throws_ok($$ insert into public.owner_documents (property_id, title, storage_path, mime_type, size_bytes)
  values ('20000000-0000-0000-0000-000000000001', 'Fora da pasta', '20000000-0000-0000-0000-000000000002/x/y.pdf', 'application/pdf', 10) $$,
  '23514', null, 'documento precisa ficar na pasta do próprio imóvel');
select is((select public from storage.buckets where id = 'owner-documents'), false, 'bucket de documentos é privado');
select is((select count(*)::integer from public.owner_notifications where kind = 'document'), 2,
  'documento novo avisa os proprietários do imóvel');

select pg_temp.entrar('00000000-0000-0000-0000-0000000020b1', 'owner');
select results_eq($$ select title from public.owner_documents $$,
  $$ values ('Contrato de administração') $$, 'A lê só os documentos do seu imóvel');
select results_eq($$ select name from storage.objects where bucket_id = 'owner-documents' $$,
  $$ values ('20000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-0000000000d1/contrato.pdf') $$,
  'A só alcança no Storage os arquivos registrados do seu imóvel');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('owner-documents', '20000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-0000000000d5/meu.pdf') $$,
  '42501', null, 'proprietário não envia arquivos');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-0000000020c1');
select is((select count(*)::integer from storage.objects where bucket_id = 'owner-documents'), 0,
  'hóspede não alcança documentos');
reset role;

select * from finish();
rollback;
