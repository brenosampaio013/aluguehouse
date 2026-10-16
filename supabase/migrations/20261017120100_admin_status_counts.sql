-- Painel: contagens por situação de imóveis, solicitações, contatos e
-- avaliações numa só chamada (menu lateral e abas das listas).
--
-- Não destrutiva: só cria uma função. security invoker (RLS vale) e recusa
-- quem não é admin com MFA, como as demais funções do painel.

create function public.admin_status_counts()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'properties', coalesce((select jsonb_object_agg(s.status, s.total) from (
        select p.status::text as status, count(*) as total
          from public.properties p group by p.status) s), '{}'),
    'booking_requests', coalesce((select jsonb_object_agg(s.status, s.total) from (
        select r.status::text as status, count(*) as total
          from public.booking_requests r group by r.status) s), '{}'),
    'inquiries', coalesce((select jsonb_object_agg(s.status, s.total) from (
        select i.status::text as status, count(*) as total
          from public.inquiries i group by i.status) s), '{}'),
    'reviews', coalesce((select jsonb_object_agg(s.status, s.total) from (
        select v.status::text as status, count(*) as total
          from public.reviews v group by v.status) s), '{}')
  );
end;
$$;

comment on function public.admin_status_counts() is
  'Contagens por situação para o menu e as abas do painel (somente admin com MFA).';

revoke execute on function public.admin_status_counts() from public, anon;
grant execute on function public.admin_status_counts() to authenticated;
