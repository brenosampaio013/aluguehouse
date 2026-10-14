-- Testes pgTAP: storage
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

select plan(4);

select is((select public from storage.buckets where id = 'property-media'), true,
  'bucket de fotos tem leitura pública');

select pg_temp.entrar('00000000-0000-0000-0000-00000000000b', 'ana@teste.local');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('property-media', 'casa/foto.webp') $$,
  '42501', null, 'hóspede não envia fotos');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-00000000000a', 'admin@teste.local', true, 'aal1');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('property-media', 'casa/foto.webp') $$,
  '42501', null, 'admin sem MFA não envia fotos');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-00000000000a', 'admin@teste.local', true, 'aal2');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('property-media', 'casa/foto.webp') $$,
  'admin com MFA envia fotos');
reset role;

select * from finish();

rollback;
