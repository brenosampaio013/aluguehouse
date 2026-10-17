-- Testes pgTAP: funções do admin para o portal do proprietário.
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
  ('00000000-0000-0000-0000-0000000019a1', 'admin-19@teste.local', '{"role": "admin"}'),
  ('00000000-0000-0000-0000-0000000019b1', 'Dono-19@Teste.local', '{"role": "owner"}'),
  ('00000000-0000-0000-0000-0000000019c1', 'hospede-19@teste.local', '{}');

select plan(8);

select pg_temp.entrar('00000000-0000-0000-0000-0000000019a1', 'admin');
select results_eq($$ select id::text, role from public.admin_find_user_by_email('  dono-19@teste.LOCAL ') $$,
  $$ values ('00000000-0000-0000-0000-0000000019b1', 'owner') $$,
  'admin encontra a conta pelo e-mail, sem diferenciar maiúsculas');
select results_eq($$ select role from public.admin_find_user_by_email('hospede-19@teste.local') $$,
  $$ values ('') $$, 'hóspede aparece sem papel');
select is_empty($$ select * from public.admin_find_user_by_email('ninguem@teste.local') $$,
  'e-mail desconhecido não devolve nada');
select results_eq($$ select email from public.admin_user_emails(array['00000000-0000-0000-0000-0000000019b1']::uuid[]) $$,
  $$ values ('Dono-19@Teste.local') $$, 'admin lê o e-mail de um proprietário');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-0000000019a1', 'admin', 'aal1');
select throws_ok($$ select * from public.admin_find_user_by_email('dono-19@teste.local') $$,
  '42501', null, 'admin sem MFA não procura contas');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-0000000019b1', 'owner');
select throws_ok($$ select * from public.admin_user_emails(array['00000000-0000-0000-0000-0000000019c1']::uuid[]) $$,
  '42501', null, 'proprietário não lê e-mails de outros usuários');
select throws_ok($$ select * from public.admin_find_user_by_email('hospede-19@teste.local') $$,
  '42501', null, 'proprietário não procura contas');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-0000000019c1');
select throws_ok($$ select * from public.admin_user_emails(array['00000000-0000-0000-0000-0000000019a1']::uuid[]) $$,
  '42501', null, 'hóspede não lê e-mails');
reset role;

select * from finish();
rollback;
