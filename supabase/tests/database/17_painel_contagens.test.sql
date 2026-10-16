-- Testes pgTAP: contagens por situação do painel (public.admin_status_counts)
begin;
create extension if not exists pgtap with schema extensions;

create function pg_temp.entrar(p_admin boolean, p_aal text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', '00000000-0000-0000-0000-0000000000a7', 'role', 'authenticated',
    'email', 'contagens@teste.local', 'aal', p_aal,
    'app_metadata', case when p_admin then json_build_object('role', 'admin') else '{}'::json end
  )::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a7', 'contagens@teste.local');

select plan(10);

select pg_temp.entrar(false, 'aal1');
select throws_ok($$ select public.admin_status_counts() $$, '42501', null, 'hóspede não lê as contagens');
reset role;
select pg_temp.entrar(true, 'aal1');
select throws_ok($$ select public.admin_status_counts() $$, '42501', null, 'admin sem MFA não lê as contagens');
reset role;
set local role anon;
select throws_ok($$ select public.admin_status_counts() $$, '42501', null, 'anônimo não executa');
reset role;

-- Contagens esperadas, calculadas direto nas tabelas (como superusuário).
create temporary table esperado as select
  (select count(*) from public.properties where status = 'draft') as rascunhos,
  (select count(*) from public.booking_requests where status = 'pending') as pendentes,
  (select count(*) from public.inquiries where status = 'new') as novos,
  (select count(*) from public.reviews where status = 'pending') as avaliacoes;
grant select on esperado to authenticated;

insert into public.inquiries (kind, name, email, message, privacy_consent_at)
values ('contact', 'Contagem', 'c@teste.local', 'x', now());
update esperado set novos = novos + 1;

select pg_temp.entrar(true, 'aal2');
create temporary table c as select public.admin_status_counts() as j;
select is((select coalesce((j->'properties'->>'draft')::bigint, 0) from c), (select rascunhos from esperado),
  'imóveis em rascunho');
select is((select coalesce((j->'booking_requests'->>'pending')::bigint, 0) from c), (select pendentes from esperado),
  'solicitações pendentes');
select is((select coalesce((j->'inquiries'->>'new')::bigint, 0) from c), (select novos from esperado),
  'contatos novos (inclui o recém-criado)');
select is((select coalesce((j->'reviews'->>'pending')::bigint, 0) from c), (select avaliacoes from esperado),
  'avaliações pendentes (zero quando não há)');
reset role;

-- Falha só numa tabela (sem permissão de leitura em reviews): ela volta null
-- e as demais continuam contadas.
revoke select on public.reviews from authenticated;
select pg_temp.entrar(true, 'aal2');
create temporary table c2 as select public.admin_status_counts() as j;
select ok((select j ? 'reviews' and j->'reviews' = 'null'::jsonb from c2),
  'tabela que falhou volta null');
select is((select coalesce((j->'inquiries'->>'new')::bigint, 0) from c2), (select novos from esperado),
  'falha em reviews não zera os contatos');
select is((select coalesce((j->'booking_requests'->>'pending')::bigint, 0) from c2),
  (select pendentes from esperado), 'falha em reviews não zera as solicitações');
reset role;

select * from finish();
rollback;
