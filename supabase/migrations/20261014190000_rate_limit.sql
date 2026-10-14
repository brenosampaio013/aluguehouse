-- Etapa 11 — Limite de envios de formulários públicos (anti-spam).
-- O site roda no Cloudflare Workers, sem memória compartilhada entre
-- requisições; por isso a contagem fica no banco. As chaves chegam já
-- convertidas em hash pelo servidor (nunca o IP ou o e-mail em texto).

create table private.rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null check (char_length(bucket) between 1 and 200),
  hit_at timestamptz not null default now()
);

create index rate_limit_hits_bucket_idx on private.rate_limit_hits (bucket, hit_at);

-- Registra uma tentativa e devolve true se ainda estiver dentro do limite.
-- Tentativas recusadas não são registradas, para não prolongar o bloqueio.
create function public.hit_rate_limit(p_bucket text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_bucket is null or p_window_seconds not between 1 and 86400 or p_max < 1 then
    raise exception 'invalid_rate_limit';
  end if;

  -- Serializa tentativas simultâneas do mesmo remetente.
  perform pg_advisory_xact_lock(hashtextextended(p_bucket, 0));

  -- Limpeza oportunista: nada precisa ser guardado por mais de um dia.
  delete from private.rate_limit_hits where hit_at < now() - interval '1 day';

  select count(*) into v_count
    from private.rate_limit_hits
   where bucket = p_bucket
     and hit_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    return false;
  end if;

  insert into private.rate_limit_hits (bucket) values (p_bucket);
  return true;
end;
$$;

revoke all on table private.rate_limit_hits from public, anon, authenticated;
revoke execute on function public.hit_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
