-- Testes pgTAP: mensagens de contato (gravação só pelo servidor; leitura só do admin)
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

create function pg_temp.servidor() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a3', 'admin-contato@teste.local'),
  ('00000000-0000-0000-0000-0000000000b3', 'dani@teste.local');

select plan(8);

select pg_temp.visitante();
select throws_ok($$ insert into public.inquiries (kind, name, email, message, privacy_consent_at)
  values ('contact', 'Robô', 'robo@teste.local', 'spam', now()) $$,
  '42501', null, 'visitante não grava direto no banco');
select throws_ok($$ select count(*) from public.inquiries $$, '42501', null,
  'visitante não lê mensagens');
reset role;

select pg_temp.servidor();
select lives_ok($$ insert into public.inquiries (id, kind, name, email, message, privacy_consent_at)
  values ('50000000-0000-0000-0000-000000000001', 'contact', 'Dani Lima', 'dani@teste.local', 'Olá', now()) $$,
  'servidor grava a mensagem validada');
select throws_ok($$ insert into public.inquiries (kind, name, email, phone, message, privacy_consent_at)
  values ('contact', 'Dani', 'dani@teste.local', '123', 'Olá', now()) $$,
  '23514', null, 'telefone inválido é recusado pelo banco');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-0000000000b3', 'dani@teste.local');
select is((select count(*)::integer from public.inquiries), 0,
  'usuário comum não lê mensagens (nem as próprias)');
select throws_ok($$ insert into public.inquiries (kind, name, email, message, privacy_consent_at)
  values ('contact', 'Dani', 'dani@teste.local', 'Olá', now()) $$,
  '42501', null, 'usuário comum não grava direto no banco');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3', 'admin-contato@teste.local', true, 'aal2');
select lives_ok($$ update public.inquiries set status = 'in_progress'
  where id = '50000000-0000-0000-0000-000000000001' $$, 'admin muda a situação');
select is((select status::text from public.inquiries where id = '50000000-0000-0000-0000-000000000001'),
  'in_progress', 'admin lê a mensagem atualizada');
reset role;

select * from finish();
rollback;
