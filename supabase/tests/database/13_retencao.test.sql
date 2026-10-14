-- Testes pgTAP: prazos de guarda (LGPD)
begin;
create extension if not exists pgtap with schema extensions;

create function pg_temp.visitante() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

select plan(8);

insert into public.properties (id, slug, title, property_type, city, offers_seasonal,
  nightly_price, max_guests, status, published_at)
values ('60000000-0000-0000-0000-000000000001', 'casa-retencao', 'Casa Retenção', 'casa', 'Bertioga',
  true, 1000, 6, 'published', now());

-- Solicitações: uma antiga (estadia terminou há 5 anos e 1 dia) e uma recente.
insert into public.booking_requests (id, property_id, rental_mode, guest_name, guest_email, guest_phone,
  stay, guests_count, quote_snapshot, quoted_total, privacy_consent_at, status)
values
  ('60000000-0000-0000-0000-0000000000a1', '60000000-0000-0000-0000-000000000001', 'seasonal',
   'Antiga', 'antiga@teste.local', '13999999999',
   daterange((private.today_sp() - interval '5 years 10 days')::date,
             (private.today_sp() - interval '5 years 1 day')::date),
   2, '{}', 1000, now(), 'approved'),
  ('60000000-0000-0000-0000-0000000000a2', '60000000-0000-0000-0000-000000000001', 'seasonal',
   'Recente', 'recente@teste.local', '13999999999',
   daterange((private.today_sp() - interval '4 years')::date,
             (private.today_sp() - interval '4 years' + interval '3 days')::date),
   2, '{}', 1000, now(), 'approved');

insert into public.calendar_blocks (property_id, stay, kind, booking_request_id)
select property_id, stay, 'booking', id from public.booking_requests
 where id = '60000000-0000-0000-0000-0000000000a1';

insert into public.inquiries (id, kind, name, email, message, privacy_consent_at, created_at) values
  ('60000000-0000-0000-0000-0000000000b1', 'contact', 'Velha', 'velha@teste.local', 'Oi',
   now() - interval '2 years 1 day', now() - interval '2 years 1 day'),
  ('60000000-0000-0000-0000-0000000000b2', 'contact', 'Nova', 'nova@teste.local', 'Oi',
   now() - interval '1 year', now() - interval '1 year');

select is(private.purge_expired_personal_data(),
  '{"inquiries": 1, "booking_requests": 1}'::jsonb, 'apaga só o que passou do prazo');
select is((select count(*)::integer from public.booking_requests
  where id = '60000000-0000-0000-0000-0000000000a1'), 0, 'reserva com mais de 5 anos é apagada');
select is((select count(*)::integer from public.calendar_blocks
  where booking_request_id = '60000000-0000-0000-0000-0000000000a1'), 0, 'bloqueio dela também');
select is((select count(*)::integer from public.booking_requests
  where id = '60000000-0000-0000-0000-0000000000a2'), 1, 'reserva com 4 anos continua');
select is((select count(*)::integer from public.inquiries
  where id = '60000000-0000-0000-0000-0000000000b1'), 0, 'mensagem com mais de 2 anos é apagada');
select is((select count(*)::integer from public.inquiries
  where id = '60000000-0000-0000-0000-0000000000b2'), 1, 'mensagem com 1 ano continua');

select is((select schedule from cron.job where jobname = 'limpeza-lgpd-diaria'), '17 6 * * *',
  'limpeza agendada todos os dias');

select pg_temp.visitante();
select throws_ok($$ select private.purge_expired_personal_data() $$, '42501', null,
  'visitante não executa a limpeza');
reset role;

select * from finish();
rollback;
