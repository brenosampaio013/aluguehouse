-- Portal do proprietário — Fase E: documentos privados e notificações.
--
-- Não destrutiva: só cria tipos, tabelas, um bucket privado, funções,
-- gatilhos e políticas novas. Nada existente é alterado.
--   - Documentos: bucket privado "owner-documents" (sem URL pública). O
--     arquivo fica em "<imóvel>/<documento>/<nome>"; o proprietário só lê os
--     dos imóveis vinculados a ele (e só por link assinado e temporário).
--   - Notificações: geradas no banco quando muda algo do imóvel (pedido de
--     reserva, aprovação, recusa, cancelamento, resposta a pedido, documento
--     novo) e avisos do admin. Só com o primeiro nome do hóspede.

------------------------------------------------------------------------------
-- Documentos
------------------------------------------------------------------------------
create type public.owner_document_category as enum
  ('contract', 'report', 'inspection', 'receipt', 'other');

create table public.owner_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  category public.owner_document_category not null default 'other',
  storage_path text not null unique check (char_length(storage_path) <= 500),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  -- O arquivo fica na pasta do próprio imóvel e do próprio documento.
  constraint owner_documents_path check (
    storage_path like property_id::text || '/' || id::text || '/%'
  )
);

create index owner_documents_property_idx on public.owner_documents (property_id, created_at desc);

alter table public.owner_documents enable row level security;
revoke all on public.owner_documents from anon;

create policy "documentos: admin gerencia" on public.owner_documents
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "documentos: proprietário lê os dos seus imóveis" on public.owner_documents
  for select to authenticated using (private.owns_property(property_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'owner-documents',
  'owner-documents',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Primeira pasta do caminho como imóvel (null se não for um UUID).
create function private.storage_property_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_name, '/', 1)::uuid
  end;
$$;

grant execute on function private.storage_property_id(text) to authenticated;

create policy "documentos privados: admin lista" on storage.objects
  for select to authenticated
  using (bucket_id = 'owner-documents' and (select private.is_admin()));
create policy "documentos privados: admin envia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'owner-documents'
    and (select private.is_admin())
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'
  );
create policy "documentos privados: admin remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'owner-documents' and (select private.is_admin()));
-- Ler (e gerar link assinado) só arquivos registrados de imóveis vinculados.
create policy "documentos privados: proprietário lê os seus" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'owner-documents'
    and private.owns_property(private.storage_property_id(name))
    and exists (select 1 from public.owner_documents d where d.storage_path = name)
  );

------------------------------------------------------------------------------
-- Notificações
------------------------------------------------------------------------------
create type public.owner_notification_kind as enum (
  'booking_new',
  'booking_approved',
  'booking_declined',
  'booking_cancelled',
  'request_approved',
  'request_rejected',
  'document',
  'notice'
);

create table public.owner_notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  -- Some junto com a reserva no prazo de guarda (LGPD, purge diário).
  booking_request_id uuid references public.booking_requests (id) on delete cascade,
  kind public.owner_notification_kind not null,
  title text not null check (char_length(title) between 1 and 160),
  body text check (char_length(body) <= 2000),
  link text check (link ~ '^/proprietario(/[A-Za-z0-9/?=&_-]*)?$'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index owner_notifications_owner_idx on public.owner_notifications (owner_id, created_at desc);
create index owner_notifications_unread_idx on public.owner_notifications (owner_id) where read_at is null;

alter table public.owner_notifications enable row level security;
revoke all on public.owner_notifications from anon;

create policy "notificações: admin gerencia" on public.owner_notifications
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "notificações: proprietário lê as suas" on public.owner_notifications
  for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_owner()));
-- Marcar como lida só pela função abaixo.

-- Cria uma notificação para cada proprietário vinculado ao imóvel.
create function private.notify_property_owners(
  p_property_id uuid,
  p_kind public.owner_notification_kind,
  p_title text,
  p_body text,
  p_link text,
  p_booking_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.owner_notifications (owner_id, property_id, booking_request_id, kind, title, body, link)
  select o.owner_id, p_property_id, p_booking_id, p_kind, p_title, p_body, p_link
    from public.property_owners o
   where o.property_id = p_property_id;
$$;

create function private.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind public.owner_notification_kind;
  v_title text;
  v_property text;
  v_body text;
begin
  if tg_op = 'INSERT' then
    v_kind := 'booking_new';
    v_title := 'Novo pedido de reserva';
  elsif new.status is distinct from old.status then
    case new.status
      when 'approved' then v_kind := 'booking_approved'; v_title := 'Reserva confirmada';
      when 'declined' then v_kind := 'booking_declined'; v_title := 'Pedido de reserva recusado';
      when 'cancelled' then v_kind := 'booking_cancelled'; v_title := 'Reserva cancelada';
      else return new;
    end case;
  else
    return new;
  end if;

  select title into v_property from public.properties where id = new.property_id;
  v_body := format(
    '%s · %s a %s · %s %s · %s',
    v_property,
    to_char(lower(new.stay), 'DD/MM/YYYY'),
    to_char(upper(new.stay), 'DD/MM/YYYY'),
    new.guests_count,
    case when new.guests_count = 1 then 'hóspede' else 'hóspedes' end,
    split_part(btrim(new.guest_name), ' ', 1)
  );
  perform private.notify_property_owners(
    new.property_id, v_kind, v_title, v_body, '/proprietario/reservas/' || new.id, new.id
  );
  return new;
end;
$$;

create trigger booking_requests_notify_owners
  after insert or update of status on public.booking_requests
  for each row execute function private.notify_booking_change();

-- Resposta a um pedido do proprietário: avisa quem pediu.
create function private.notify_owner_request_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property text;
  v_what text;
begin
  if new.status is not distinct from old.status or new.status not in ('approved', 'rejected') then
    return new;
  end if;
  select title into v_property from public.properties where id = new.property_id;
  v_what := case new.kind
    when 'block' then format('Bloqueio de %s a %s',
      to_char(lower(new.stay), 'DD/MM/YYYY'), to_char(upper(new.stay), 'DD/MM/YYYY'))
    else 'Alteração do anúncio'
  end;
  insert into public.owner_notifications (owner_id, property_id, kind, title, body, link)
  values (
    new.requested_by,
    new.property_id,
    case new.status when 'approved' then 'request_approved' else 'request_rejected' end::public.owner_notification_kind,
    case new.status when 'approved' then 'Pedido aprovado' else 'Pedido recusado' end,
    concat_ws(' · ', v_property, v_what, nullif(new.admin_reply, '')),
    '/proprietario/imoveis/' || new.property_id
  );
  return new;
end;
$$;

create trigger owner_requests_notify_decision
  after update of status on public.owner_requests
  for each row execute function private.notify_owner_request_decision();

create function private.notify_new_document()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property text;
begin
  select title into v_property from public.properties where id = new.property_id;
  perform private.notify_property_owners(
    new.property_id, 'document', 'Novo documento disponível',
    format('%s · %s', v_property, new.title), '/proprietario/documentos'
  );
  return new;
end;
$$;

create trigger owner_documents_notify_owners
  after insert on public.owner_documents
  for each row execute function private.notify_new_document();

-- Aviso do admin: para os proprietários de um imóvel ou para todos.
create function public.admin_notify_owners(p_property_id uuid, p_title text, p_body text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 3 and 160 then
    raise exception 'invalid_title';
  end if;

  insert into public.owner_notifications (owner_id, property_id, kind, title, body, link)
  select distinct o.owner_id, p_property_id, 'notice'::public.owner_notification_kind,
         btrim(p_title), nullif(btrim(p_body), ''), '/proprietario/notificacoes'
    from public.property_owners o
   where p_property_id is null or o.property_id = p_property_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- O proprietário marca como lidas as próprias notificações (todas ou algumas).
create function public.mark_owner_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not private.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.owner_notifications
     set read_at = now()
   where owner_id = auth.uid()
     and read_at is null
     and (p_ids is null or id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

------------------------------------------------------------------------------
-- Execução de funções
------------------------------------------------------------------------------
revoke execute on function private.notify_property_owners(uuid, public.owner_notification_kind, text, text, text, uuid)
  from public, anon, authenticated;
revoke execute on function private.notify_booking_change() from public, anon, authenticated;
revoke execute on function private.notify_owner_request_decision() from public, anon, authenticated;
revoke execute on function private.notify_new_document() from public, anon, authenticated;

revoke execute on function public.admin_notify_owners(uuid, text, text) from public, anon;
grant execute on function public.admin_notify_owners(uuid, text, text) to authenticated;
revoke execute on function public.mark_owner_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_owner_notifications_read(uuid[]) to authenticated;
