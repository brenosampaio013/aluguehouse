-- Testes pgTAP: estrutura
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

select is(
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity),
  0::bigint,
  'todas as tabelas públicas têm RLS ativo'
);

select has_index('public', 'calendar_blocks', 'calendar_blocks_no_overlap', 'calendário tem restrição de exclusão');
select has_index('public', 'seasonal_rates', 'seasonal_rates_no_overlap', 'tarifas sazonais têm restrição de exclusão');

-- Permissões de tabela para visitantes
select ok(not has_table_privilege('anon', 'public.booking_requests', 'select'), 'visitante não lê solicitações');
select ok(not has_table_privilege('anon', 'public.property_private', 'select'), 'visitante não lê dados privados');
select ok(not has_table_privilege('anon', 'public.calendar_blocks', 'select'), 'visitante não lê calendário direto');
select ok(not has_table_privilege('anon', 'public.inquiries', 'select'), 'visitante não lê contatos');
select ok(not has_table_privilege('anon', 'public.properties', 'insert'), 'visitante não cria imóveis');
select ok(not has_column_privilege('anon', 'public.reviews', 'author_id', 'select'), 'visitante não vê autor da avaliação');
select ok(not has_column_privilege('authenticated', 'public.reviews', 'status', 'insert'), 'hóspede não define status da avaliação');

-- Execução de funções
select ok(not has_function_privilege('anon',
  'public.request_booking(uuid, public.rental_mode, date, date, integer, text, text, text, text, boolean)', 'execute'),
  'visitante não chama request_booking direto');
select ok(not has_function_privilege('authenticated',
  'public.request_booking(uuid, public.rental_mode, date, date, integer, text, text, text, text, boolean)', 'execute'),
  'usuário logado não chama request_booking direto');
select ok(has_function_privilege('service_role',
  'public.request_booking(uuid, public.rental_mode, date, date, integer, text, text, text, text, boolean)', 'execute'),
  'servidor chama request_booking');
select ok(not has_function_privilege('anon', 'public.approve_booking_request(uuid)', 'execute'),
  'visitante não aprova reservas');
select ok(has_function_privilege('anon', 'public.get_unavailable_ranges(uuid, date, date)', 'execute'),
  'visitante consulta datas ocupadas');
select ok(not has_function_privilege('anon', 'public.get_my_stays()', 'execute'),
  'visitante não consulta estadias');

select * from finish();

rollback;
