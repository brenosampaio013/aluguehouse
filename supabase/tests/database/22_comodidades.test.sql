-- Testes pgTAP: catálogo de comodidades e set_property_amenities.
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

-- Slugs de uma busca, em ordem.
create function pg_temp.slugs(p_property uuid)
returns text[] language sql as $$
  select coalesce(array_agg(a.slug order by a.slug), '{}')
    from public.property_amenities pa
    join public.amenities a on a.id = pa.amenity_id
   where pa.property_id = p_property
$$;

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000022a1', 'admin-comod@teste.local', '{"role": "admin"}'),
  ('00000000-0000-0000-0000-0000000022b1', 'dono-comod@teste.local', '{"role": "owner"}'),
  ('00000000-0000-0000-0000-0000000022c1', 'hospede-comod@teste.local', '{}');

insert into public.properties (id, slug, title, property_type, city, offers_seasonal,
  nightly_price, max_guests, status, published_at)
values
  ('22000000-0000-0000-0000-000000000001', 'comod-publicado', 'Comodidades Publicado', 'casa', 'Bertioga',
   true, 1000, 6, 'published', now());
insert into public.properties (id, slug, title, property_type, city, status)
values ('22000000-0000-0000-0000-000000000002', 'comod-rascunho', 'Comodidades Rascunho', 'casa', 'Bertioga', 'draft');
insert into public.property_owners (property_id, owner_id)
values ('22000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000022b1');

-- Imóvel antigo, com comodidade gravada antes desta migration.
insert into public.property_amenities (property_id, amenity_id)
select '22000000-0000-0000-0000-000000000002', id from public.amenities where slug = 'churrasqueira';

select plan(19);

-- Catálogo
select is((select count(*)::integer from public.amenities), 140, 'catálogo com 140 comodidades');
select results_eq(
  $$ select slug, label from public.amenities
      where slug in ('piscina', 'wi-fi', 'portaria-24h', 'roupa-de-cama', 'area-de-lazer') order by slug $$,
  $$ values ('area-de-lazer', 'Área de lazer no condomínio'), ('piscina', 'Piscina'),
            ('portaria-24h', 'Portaria 24 horas'), ('roupa-de-cama', 'Roupa de cama e banho'),
            ('wi-fi', 'Wi-Fi') $$,
  'comodidades antigas continuam com o mesmo slug e nome'
);
select is_empty(
  $$ select slug from public.amenities where slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' $$,
  'todos os slugs válidos'
);

-- Admin grava, sem repetir
select pg_temp.entrar('00000000-0000-0000-0000-0000000022a1', 'admin-comod@teste.local', 'admin');
select is(
  public.set_property_amenities('22000000-0000-0000-0000-000000000001', array['piscina', 'wi-fi', 'wi-fi', 'bide']),
  3,
  'admin grava 3 comodidades (repetida conta uma vez)'
);
select is(pg_temp.slugs('22000000-0000-0000-0000-000000000001'), array['bide', 'piscina', 'wi-fi'], 'gravadas');
select is(
  public.set_property_amenities('22000000-0000-0000-0000-000000000001', array['wi-fi', 'sauna']),
  2,
  'edição troca a lista'
);
select is(pg_temp.slugs('22000000-0000-0000-0000-000000000001'), array['sauna', 'wi-fi'],
  'remove as desmarcadas e acrescenta as novas');

select throws_ok(
  $$ select public.set_property_amenities('22000000-0000-0000-0000-000000000001', array['wi-fi', 'helicoptero']) $$,
  '22023', 'unknown_amenity', 'slug inexistente é recusado'
);
select is(pg_temp.slugs('22000000-0000-0000-0000-000000000001'), array['sauna', 'wi-fi'],
  'nada muda quando a lista tem slug inválido');
select throws_ok(
  $$ select public.set_property_amenities('22000000-0000-0000-0000-0000000000ff', array['wi-fi']) $$,
  'P0002', 'property_not_found', 'imóvel inexistente'
);
select is(pg_temp.slugs('22000000-0000-0000-0000-000000000002'), array['churrasqueira'],
  'imóvel antigo mantém o que tinha');
select is(
  public.set_property_amenities('22000000-0000-0000-0000-000000000002', array['churrasqueira', 'rede']),
  2,
  'imóvel antigo recebe novas comodidades'
);
select is(
  public.set_property_amenities('22000000-0000-0000-0000-000000000002', '{}'),
  0,
  'lista vazia limpa as comodidades'
);

-- Quem não é admin não grava
select pg_temp.entrar('00000000-0000-0000-0000-0000000022a1', 'admin-comod@teste.local', 'admin', 'aal1');
select throws_ok(
  $$ select public.set_property_amenities('22000000-0000-0000-0000-000000000001', array['piscina']) $$,
  '42501', 'forbidden', 'admin sem MFA não grava'
);
select pg_temp.entrar('00000000-0000-0000-0000-0000000022b1', 'dono-comod@teste.local', 'owner');
select throws_ok(
  $$ select public.set_property_amenities('22000000-0000-0000-0000-000000000001', array['piscina']) $$,
  '42501', 'forbidden', 'proprietário não grava'
);
select pg_temp.entrar('00000000-0000-0000-0000-0000000022c1', 'hospede-comod@teste.local');
select throws_ok(
  $$ select public.set_property_amenities('22000000-0000-0000-0000-000000000001', array['piscina']) $$,
  '42501', 'forbidden', 'hóspede não grava'
);
select pg_temp.anonimo();
select throws_ok(
  $$ select public.set_property_amenities('22000000-0000-0000-0000-000000000001', array['piscina']) $$,
  '42501', null, 'visitante não executa a função'
);

-- Leitura pública só de imóveis publicados
select is(
  (select count(*)::integer from public.property_amenities
    where property_id = '22000000-0000-0000-0000-000000000001'),
  2,
  'visitante lê as comodidades do publicado'
);
reset role;
insert into public.property_amenities (property_id, amenity_id)
select '22000000-0000-0000-0000-000000000002', id from public.amenities where slug = 'rede';
select pg_temp.anonimo();
select is_empty(
  $$ select 1 from public.property_amenities where property_id = '22000000-0000-0000-0000-000000000002' $$,
  'visitante não lê as do rascunho'
);

reset role;
select * from finish();
rollback;
