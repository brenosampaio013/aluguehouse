-- Testes pgTAP: rls imoveis
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

insert into public.properties (id, slug, title, property_type, city, offers_seasonal, nightly_price, status, published_at)
values
  ('10000000-0000-0000-0000-000000000001', 'casa-publicada', 'Casa publicada', 'casa', 'Bertioga', true, 1000, 'published', now()),
  ('10000000-0000-0000-0000-000000000002', 'casa-rascunho', 'Casa rascunho', 'casa', 'Bertioga', true, 1000, 'draft', null);

insert into public.property_private (property_id, full_address, exact_lat, exact_lng)
values ('10000000-0000-0000-0000-000000000001', 'Rua Exemplo, 1', -23.801234, -46.012345);

insert into public.property_media (property_id, kind, storage_path, alt_text)
values
  ('10000000-0000-0000-0000-000000000001', 'image', 'a/sala.webp', 'Sala de jantar'),
  ('10000000-0000-0000-0000-000000000002', 'image', 'b/sala.webp', 'Sala de estar');

-- Localização aproximada
select isnt((select approx_lat from public.properties where slug = 'casa-publicada'), null,
  'localização aproximada é preenchida a partir da exata');
select ok(
  (select abs(approx_lat - (-23.801234)) between 0.00001 and 0.005
      and abs(approx_lng - (-46.012345)) between 0.00001 and 0.005
     from public.properties where slug = 'casa-publicada'),
  'localização aproximada difere da exata e fica a menos de ~550 m'
);

-- Visitante
select pg_temp.visitante();
select is((select count(*) from public.properties where slug in ('casa-publicada', 'casa-rascunho', 'nova-casa')), 1::bigint, 'visitante vê só imóveis publicados');
select is((select count(*) from public.property_media where property_id in ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')), 1::bigint, 'visitante vê só mídia de publicados');
select throws_ok($$ select * from public.property_private $$, '42501', null, 'visitante não lê dados privados');
select throws_ok(
  $$ insert into public.properties (slug, title, property_type, city) values ('x-y', 'Teste', 'casa', 'Bertioga') $$,
  '42501', null, 'visitante não cria imóveis');
reset role;

-- Hóspede comum
select pg_temp.entrar('00000000-0000-0000-0000-00000000000b', 'ana@teste.local');
select is((select count(*) from public.properties where slug in ('casa-publicada', 'casa-rascunho', 'nova-casa')), 1::bigint, 'hóspede vê só imóveis publicados');
select throws_ok(
  $$ insert into public.properties (slug, title, property_type, city) values ('x-y', 'Teste', 'casa', 'Bertioga') $$,
  '42501', null, 'hóspede não cria imóveis');
select is((select count(*) from public.property_private where property_id = '10000000-0000-0000-0000-000000000001'), 0::bigint, 'hóspede não lê dados privados');
update public.properties set title = 'Invadido' where slug = 'casa-publicada';
reset role;
select is((select title from public.properties where slug = 'casa-publicada'), 'Casa publicada',
  'hóspede não altera imóveis');

-- Admin sem MFA (aal1)
select pg_temp.entrar('00000000-0000-0000-0000-00000000000a', 'admin@teste.local', true, 'aal1');
select is((select count(*) from public.properties where slug in ('casa-publicada', 'casa-rascunho', 'nova-casa')), 1::bigint, 'admin sem MFA é tratado como usuário comum');
select throws_ok(
  $$ insert into public.properties (slug, title, property_type, city) values ('x-y', 'Teste', 'casa', 'Bertioga') $$,
  '42501', null, 'admin sem MFA não cria imóveis');
reset role;

-- Admin com MFA (aal2)
select pg_temp.entrar('00000000-0000-0000-0000-00000000000a', 'admin@teste.local', true, 'aal2');
select is((select count(*) from public.properties where slug in ('casa-publicada', 'casa-rascunho', 'nova-casa')), 2::bigint, 'admin com MFA vê todos os imóveis');
select is((select full_address from public.property_private where property_id = '10000000-0000-0000-0000-000000000001'), 'Rua Exemplo, 1', 'admin com MFA lê dados privados');
select lives_ok(
  $$ insert into public.properties (slug, title, property_type, city) values ('nova-casa', 'Nova casa', 'casa', 'Bertioga') $$,
  'admin com MFA cria imóveis');
reset role;

-- Regra de publicação
select throws_ok(
  $$ update public.properties set status = 'published', published_at = now(), offers_sale = true
      where slug = 'nova-casa' $$,
  '23514', null, 'imóvel não pode ser publicado sem preço da modalidade oferecida');

select * from finish();

rollback;
