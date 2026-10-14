-- Testes pgTAP: envio e moderação de avaliações
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

create function pg_temp.visitante() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'admin-aval@teste.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'carla@teste.local');

select plan(9);

insert into public.properties (id, slug, title, property_type, city, offers_seasonal,
  nightly_price, max_guests, status, published_at)
values ('40000000-0000-0000-0000-000000000001', 'casa-aval', 'Casa Aval', 'casa', 'Bertioga',
  true, 1000, 6, 'published', now());

insert into public.booking_requests (id, property_id, rental_mode, guest_name, guest_email, guest_phone,
  stay, guests_count, quote_snapshot, quoted_total, privacy_consent_at, status)
values ('40000000-0000-0000-0000-0000000000c1', '40000000-0000-0000-0000-000000000001', 'seasonal',
  'Carla Dias', 'carla@teste.local', '13999999999',
  daterange(private.today_sp() - 10, private.today_sp() - 5), 2, '{}', 5000, now(), 'approved');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000b2', 'carla@teste.local');
select throws_ok($$ insert into public.reviews (property_id, booking_request_id, rating, status)
  values ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000c1', 5, 'approved') $$,
  '42501', null, 'hóspede não escolhe a situação da avaliação');
select lives_ok($$ insert into public.reviews (property_id, booking_request_id, rating, comment)
  values ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000c1', 5, 'Ótima casa') $$,
  'hóspede envia a avaliação');
select throws_ok($$ insert into public.reviews (property_id, booking_request_id, rating)
  values ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000c1', 4) $$,
  '23505', null, 'a mesma estadia não é avaliada duas vezes');
select throws_ok($$ update public.reviews set comment = 'Editado'
  where booking_request_id = '40000000-0000-0000-0000-0000000000c1' $$,
  '42501', null, 'hóspede não edita a avaliação enviada');
select is((select has_review from public.get_my_stays()
  where booking_request_id = '40000000-0000-0000-0000-0000000000c1'), true,
  'estadia aparece como já avaliada');
reset role;

-- Admin sem MFA não modera (RLS não encontra linhas)
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a2', 'admin-aval@teste.local', true, 'aal1');
update public.reviews set status = 'approved'
 where booking_request_id = '40000000-0000-0000-0000-0000000000c1';
reset role;
select is((select status::text from public.reviews where booking_request_id = '40000000-0000-0000-0000-0000000000c1'),
  'pending', 'admin sem MFA não publica');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a2', 'admin-aval@teste.local', true, 'aal2');
select lives_ok($$ update public.reviews
  set status = 'approved', admin_reply = 'Volte sempre!', moderated_at = now()
  where booking_request_id = '40000000-0000-0000-0000-0000000000c1' $$,
  'admin publica e responde');
select throws_ok($$ update public.reviews set rating = 1
  where booking_request_id = '40000000-0000-0000-0000-0000000000c1' $$,
  '42501', null, 'admin não altera a nota do hóspede');
reset role;

select pg_temp.visitante();
select is((select admin_reply from public.reviews where property_id = '40000000-0000-0000-0000-000000000001'),
  'Volte sempre!', 'visitante vê a avaliação publicada com a resposta');
reset role;

select * from finish();
rollback;
