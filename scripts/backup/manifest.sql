-- Manifesto do backup: quantidade de linhas e assinatura (md5) de cada tabela
-- com dados do negócio. Comparado depois da restauração (verify.mjs).
create function pg_temp.backup_manifest() returns jsonb
language plpgsql as $$
declare
  t record;
  v_count bigint;
  v_md5 text;
  result jsonb := '{}'::jsonb;
begin
  for t in
    select n.nspname as schema, c.relname as name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where c.relkind = 'r'
       and (
         (n.nspname in ('public', 'private') and c.relname <> 'rate_limit_hits')
         or (n.nspname = 'auth' and c.relname in ('users', 'identities', 'mfa_factors'))
       )
     order by 1, 2
  loop
    execute format(
      'select count(*), coalesce(md5(string_agg(r::text, %L order by r::text)), %L) from %I.%I r',
      E'\n', '', t.schema, t.name
    ) into v_count, v_md5;
    result := result || jsonb_build_object(t.schema || '.' || t.name,
      jsonb_build_object('rows', v_count, 'md5', v_md5));
  end loop;
  return result;
end;
$$;

select pg_temp.backup_manifest();
