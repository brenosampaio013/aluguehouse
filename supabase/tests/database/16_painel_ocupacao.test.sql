-- Testes pgTAP: ocupação e limites de data da visão geral (admin_dashboard)
begin;
create extension if not exists pgtap with schema extensions;

create function pg_temp.entrar_admin()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', '00000000-0000-0000-0000-0000000000a6', 'role', 'authenticated',
    'email', 'admin-ocupacao@teste.local', 'aal', 'aal2',
    'app_metadata', json_build_object('role', 'admin'))::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a6', 'admin-ocupacao@teste.local');

select plan(12);

-- Isola os números deste teste dos dados de outros arquivos.
delete from public.calendar_blocks;
delete from public.reviews;
delete from public.booking_requests;
delete from public.inquiries;
update public.properties set status = 'archived'
 where status = 'published';

-- Um imóvel de aluguel publicado (elegível) e três que não contam na ocupação.
insert into public.properties (id, slug, title, property_type, city, offers_seasonal, offers_sale,
  nightly_price, sale_price, max_guests, status, published_at)
values
  ('60000000-0000-0000-0000-000000000001', 'oc-aluguel', 'Aluguel publicado', 'casa', 'Bertioga',
   true, false, 1000, null, 6, 'published', now()),
  ('60000000-0000-0000-0000-000000000002', 'oc-arquivado', 'Arquivado', 'casa', 'Bertioga',
   true, false, 1000, null, 6, 'archived', now()),
  ('60000000-0000-0000-0000-000000000003', 'oc-rascunho', 'Rascunho', 'casa', 'Bertioga',
   true, false, 1000, null, 6, 'draft', null),
  ('60000000-0000-0000-0000-000000000004', 'oc-venda', 'Só venda', 'casa', 'Bertioga',
   false, true, null, 900000, 6, 'published', now());

-- Uma reserva aprovada (3 noites no período) em cada imóvel.
insert into public.booking_requests (id, property_id, rental_mode, guest_name, guest_email, guest_phone,
  stay, guests_count, quote_snapshot, quoted_total, privacy_consent_at, status, created_at, decided_at)
select ('60000000-0000-0000-0000-0000000000f' || n)::uuid,
       ('60000000-0000-0000-0000-00000000000' || n)::uuid, 'seasonal',
       'Hóspede ' || n, 'h' || n || '@teste.local', '13999999999',
       daterange('2026-03-02', '2026-03-05'), 2, '{}', 3000, now(), 'approved',
       '2026-02-01 10:00-03', '2026-02-01 11:00-03'
  from generate_series(1, 4) n;
insert into public.calendar_blocks (property_id, stay, kind, booking_request_id)
select ('60000000-0000-0000-0000-00000000000' || n)::uuid, daterange('2026-03-02', '2026-03-05'),
       'booking', ('60000000-0000-0000-0000-0000000000f' || n)::uuid
  from generate_series(1, 4) n;

-- Bordas da meia-noite em São Paulo (período: 01/03 a 10/03).
insert into public.inquiries (kind, name, email, message, privacy_consent_at, created_at) values
  ('contact', 'Antes', 'a@teste.local', 'x', now(), '2026-02-28 23:59:59-03'),  -- anterior
  ('contact', 'Início', 'b@teste.local', 'x', now(), '2026-03-01 00:00:00-03'), -- atual
  ('contact', 'Fim', 'c@teste.local', 'x', now(), '2026-03-10 23:59:59-03'),    -- atual
  ('contact', 'Depois', 'd@teste.local', 'x', now(), '2026-03-11 00:00:00-03'), -- fora
  ('contact', 'UTC', 'e@teste.local', 'x', now(), '2026-03-11 02:30:00+00');   -- 23:30 de 10/03 em SP

select pg_temp.entrar_admin();
create temporary table d as select public.admin_dashboard('2026-03-01', '2026-03-10') as j;
create temporary table f as
  select public.admin_dashboard('2026-03-01', '2026-03-10', '60000000-0000-0000-0000-000000000002') as j;

select is((select j->>'rental_properties' from d), '1', 'só o imóvel de aluguel publicado é elegível');
select is((select j->'current'->>'occupied_nights' from d), '3',
  'ocupação ignora arquivados, rascunhos e imóveis só de venda');
select is((select j->'current'->>'booked_nights' from d), '12',
  'noites reservadas continuam somando todos os imóveis');
select ok((select (j->'current'->>'occupied_nights')::int
             <= (j->>'rental_properties')::int * (j->'period'->>'days')::int from d),
  'ocupação nunca passa de 100%');
select is((select j->'current'->>'occupied_nights' from f), '0',
  'filtro em imóvel arquivado: nada ocupado');
select is((select j->>'rental_properties' from f), '0', 'filtro em imóvel arquivado: capacidade zero');

select is((select j->'current'->>'inquiries' from d), '3',
  'contatos de 00:00 do 1º dia até 23:59:59 do último (fuso de São Paulo)');
select is((select j->'previous'->>'inquiries' from d), '1', '23:59:59 da véspera vai para o anterior');
select is((select (s->>'inquiries')::int from d, jsonb_array_elements(j->'series') s
            where s->>'b_start' = '2026-03-01'), 1, 'série: meia-noite cai no dia certo');
select is((select (s->>'inquiries')::int from d, jsonb_array_elements(j->'series') s
            where s->>'b_start' = '2026-03-10'), 2, 'série: 02:30 UTC de 11/03 conta em 10/03');
select is((select sum((s->>'inquiries')::int)::int from d, jsonb_array_elements(j->'series') s),
  3, 'série soma o mesmo total do indicador');

-- 120 dias → agrupado por semana, sem perder nada.
select is(
  (select sum((s->>'inquiries')::int)::int
     from jsonb_array_elements(public.admin_dashboard('2026-01-01', '2026-04-30')->'series') s),
  5, 'série semanal soma todos os contatos do período');
reset role;

select * from finish();
rollback;
