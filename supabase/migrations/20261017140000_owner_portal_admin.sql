-- Portal do proprietário — Fase C: apoio ao painel do admin para vincular
-- proprietários e mostrar quem fez cada pedido.
--
-- Não destrutiva: só cria duas funções de leitura. O e-mail fica em
-- auth.users, que a API não expõe; estas funções devolvem o mínimo (id,
-- e-mail, papel) e só para admin com MFA.

-- E-mails de usuários conhecidos (vínculos e pedidos de um imóvel).
create function public.admin_user_emails(p_ids uuid[])
returns table (id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) > 500 then
    raise exception 'too_many_ids';
  end if;

  return query
    select u.id, u.email::text
      from auth.users u
     where u.id = any (p_ids);
end;
$$;

-- Procura uma conta pelo e-mail para vincular como proprietário. Devolve o
-- papel atual para o servidor decidir (hóspede vira proprietário só com
-- confirmação; admin nunca).
create function public.admin_find_user_by_email(p_email text)
returns table (id uuid, role text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select u.id, coalesce(u.raw_app_meta_data ->> 'role', '')
      from auth.users u
     where lower(u.email) = lower(btrim(p_email))
     limit 1;
end;
$$;

revoke execute on function public.admin_user_emails(uuid[]) from public, anon;
grant execute on function public.admin_user_emails(uuid[]) to authenticated;
revoke execute on function public.admin_find_user_by_email(text) from public, anon;
grant execute on function public.admin_find_user_by_email(text) to authenticated;
