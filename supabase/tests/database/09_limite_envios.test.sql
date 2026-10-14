-- Testes pgTAP: limite de envios de formulários públicos
begin;
create extension if not exists pgtap with schema extensions;

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

select plan(8);

select pg_temp.servidor();
select ok(public.hit_rate_limit('teste:pgtap:a', 60, 2), '1ª tentativa dentro do limite');
select ok(public.hit_rate_limit('teste:pgtap:a', 60, 2), '2ª tentativa dentro do limite');
select ok(not public.hit_rate_limit('teste:pgtap:a', 60, 2), '3ª tentativa é recusada');
select ok(public.hit_rate_limit('teste:pgtap:b', 60, 2), 'outro remetente tem a própria cota');
select throws_ok($$ select public.hit_rate_limit('x', 0, 1) $$, 'P0001', 'invalid_rate_limit',
  'janela inválida é recusada');
reset role;

select is(
  (select count(*)::integer from private.rate_limit_hits where bucket = 'teste:pgtap:a'),
  2, 'tentativas recusadas não são registradas');

select pg_temp.visitante();
select throws_ok($$ select public.hit_rate_limit('teste:pgtap:c', 60, 2) $$, '42501', null,
  'visitante não chama a função direto');
select throws_ok($$ select count(*) from private.rate_limit_hits $$, '42501', null,
  'visitante não lê a tabela');
reset role;

select * from finish();
rollback;
