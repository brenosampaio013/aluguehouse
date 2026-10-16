-- Painel: contagens por situação isoladas por tabela.
--
-- Não destrutiva: substitui o corpo de public.admin_status_counts (mesma
-- assinatura e permissões). Antes, um erro ao contar uma tabela derrubava a
-- função inteira e zerava todos os contadores do menu. Agora cada contagem
-- roda num bloco próprio: se uma falhar, só ela volta como null (e o erro
-- fica no log do Postgres); as outras continuam valendo.
--
-- A verificação de admin continua fora dos blocos: quem não é admin com MFA
-- recebe 42501, nunca um resultado vazio.

create or replace function public.admin_status_counts()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_part jsonb;
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  begin
    select coalesce(jsonb_object_agg(s.status, s.total), '{}') into v_part
      from (select p.status::text as status, count(*) as total
              from public.properties p group by p.status) s;
  exception when others then
    raise warning 'admin_status_counts: properties: %', sqlerrm;
    v_part := null;
  end;
  v_result := v_result || jsonb_build_object('properties', v_part);

  begin
    select coalesce(jsonb_object_agg(s.status, s.total), '{}') into v_part
      from (select r.status::text as status, count(*) as total
              from public.booking_requests r group by r.status) s;
  exception when others then
    raise warning 'admin_status_counts: booking_requests: %', sqlerrm;
    v_part := null;
  end;
  v_result := v_result || jsonb_build_object('booking_requests', v_part);

  begin
    select coalesce(jsonb_object_agg(s.status, s.total), '{}') into v_part
      from (select i.status::text as status, count(*) as total
              from public.inquiries i group by i.status) s;
  exception when others then
    raise warning 'admin_status_counts: inquiries: %', sqlerrm;
    v_part := null;
  end;
  v_result := v_result || jsonb_build_object('inquiries', v_part);

  begin
    select coalesce(jsonb_object_agg(s.status, s.total), '{}') into v_part
      from (select v.status::text as status, count(*) as total
              from public.reviews v group by v.status) s;
  exception when others then
    raise warning 'admin_status_counts: reviews: %', sqlerrm;
    v_part := null;
  end;
  v_result := v_result || jsonb_build_object('reviews', v_part);

  return v_result;
end;
$$;

comment on function public.admin_status_counts() is
  'Contagens por situação para o menu e as abas do painel (somente admin com MFA); null por tabela que falhar.';

revoke execute on function public.admin_status_counts() from public, anon;
grant execute on function public.admin_status_counts() to authenticated;
