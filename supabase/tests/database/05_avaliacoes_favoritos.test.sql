-- Testes pgTAP: avaliacoes favoritos
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

select plan(17);

insert into public.properties (id, slug, title, property_type, city, offers_seasonal, nightly_price, status, published_at)
values
  ('40000000-0000-0000-0000-000000000001', 'casa-avaliada', 'Casa avaliada', 'casa', 'Bertioga', true, 1000, 'published', now()),
  ('40000000-0000-0000-0000-000000000002', 'casa-oculta', 'Casa oculta', 'casa', 'Bertioga', true, 1000, 'draft', null);

-- Estadias da Ana: uma concluída, uma futura. Uma da Bia, concluída.
insert into public.booking_requests (id, property_id, rental_mode, guest_name, guest_email, guest_phone, stay,
  guests_count, quote_snapshot, quoted_total, status, privacy_consent_at)
select v.id::uuid, '40000000-0000-0000-0000-000000000001', 'seasonal', v.nome, v.email, '13999999999',
       daterange(private.today_sp() + v.ini, private.today_sp() + v.fim), 2, '{}', 3000, 'approved', now()
  from (values
    ('50000000-0000-0000-0000-000000000001', 'Ana Souza', 'ana@teste.local', -10, -7),
    ('50000000-0000-0000-0000-000000000002', 'Ana Souza', 'ana@teste.local', 20, 23),
    ('50000000-0000-0000-0000-000000000003', 'Bia Lima', 'bia@teste.local', -30, -27)
  ) as v(id, nome, email, ini, fim);

select pg_temp.entrar('00000000-0000-0000-0000-00000000000b', 'ana@teste.local');

select is((select count(*) from public.get_my_stays()), 2::bigint, 'hóspede vê as próprias estadias');
select is((select count(*) from public.get_my_stays() where can_review), 1::bigint,
  'só a estadia concluída pode ser avaliada');
select is((select count(*) from public.booking_requests), 0::bigint,
  'hóspede não lê a tabela de solicitações (notas internas)');

select lives_ok(
  $$ insert into public.reviews (property_id, booking_request_id, rating, comment)
     values ('40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 5, 'Casa ótima') $$,
  'hóspede avalia estadia concluída');
select throws_ok(
  $$ insert into public.reviews (property_id, booking_request_id, rating, comment)
     values ('40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 5, 'Ainda não fui') $$,
  '42501', null, 'estadia futura não pode ser avaliada');
select throws_ok(
  $$ insert into public.reviews (property_id, booking_request_id, rating, comment)
     values ('40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 1, 'Não é minha') $$,
  '42501', null, 'estadia de outra pessoa não pode ser avaliada');
select throws_ok(
  $$ insert into public.reviews (property_id, booking_request_id, rating, status)
     values ('40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 5, 'approved') $$,
  '42501', null, 'hóspede não aprova a própria avaliação');
select is((select status::text from public.reviews), 'pending', 'avaliação nasce pendente');
select is((select author_display_name from public.reviews), 'Ana', 'só o primeiro nome é exibido');
reset role;

select pg_temp.visitante();
select is((select count(*) from public.reviews), 0::bigint, 'visitante não vê avaliação pendente');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-00000000000a', 'admin@teste.local', true, 'aal2');
update public.reviews set status = 'approved', moderated_at = now();
reset role;

select pg_temp.visitante();
select is((select count(*) from public.reviews), 1::bigint, 'visitante vê avaliação aprovada');
select throws_ok($$ select author_id from public.reviews $$, '42501', null, 'visitante não vê o autor');
reset role;

-- Favoritos
select pg_temp.entrar('00000000-0000-0000-0000-00000000000b', 'ana@teste.local');
select lives_ok($$ insert into public.favorites (property_id) values ('40000000-0000-0000-0000-000000000001') $$,
  'hóspede salva imóvel publicado');
select throws_ok($$ insert into public.favorites (property_id) values ('40000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'hóspede não salva imóvel em rascunho');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-00000000000c', 'bia@teste.local');
select is((select count(*) from public.favorites), 0::bigint, 'favoritos de outra pessoa são invisíveis');

-- Perfis
update public.profiles set full_name = 'Bia Lima' where id = '00000000-0000-0000-0000-00000000000c';
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000c'), 'Bia Lima',
  'usuário edita o próprio perfil');
select is((select count(*) from public.profiles), 1::bigint, 'usuário não vê perfis de outras pessoas');
reset role;

select * from finish();

rollback;
