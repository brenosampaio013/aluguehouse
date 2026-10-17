-- Portal do proprietário — Fase B: vínculo proprietário–imóvel, acesso de
-- leitura isolado por imóvel e solicitações sujeitas à aprovação do admin.
--
-- Não destrutiva: só cria tipos, tabelas, funções e políticas novas. Nenhuma
-- política existente é alterada ou removida; o admin continua com o mesmo
-- acesso. Decisões (docs/portal-proprietario.md):
--   - proprietário = app_metadata.role "owner" + sessão com MFA (aal2);
--   - só vê imóveis vinculados a ele em property_owners (vínculo criado pelo
--     admin; nada é concedido automaticamente);
--   - reservas e calendário só por funções que conferem o vínculo e devolvem
--     o mínimo: primeiro nome do hóspede, quantidade de hóspedes, datas,
--     situação e o orçamento estimado; nunca e-mail, telefone ou anotações;
--   - bloqueio de datas e alterações do anúncio são pedidos que o admin
--     aprova; o anúncio e o calendário não mudam sem essa aprovação.

------------------------------------------------------------------------------
-- Quem é proprietário
------------------------------------------------------------------------------
-- Mesmo modelo de private.is_admin(): papel em app_metadata (o usuário não
-- consegue alterar) e sessão com MFA concluído.
create function private.is_owner()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'owner'
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create table public.property_owners (
  property_id uuid not null references public.properties (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  primary key (property_id, owner_id)
);

create index property_owners_owner_idx on public.property_owners (owner_id);

comment on table public.property_owners is
  'Imóveis que cada proprietário pode acompanhar no portal. Só o admin cria ou remove vínculos.';

-- Só usuários com papel de proprietário podem ser vinculados: evita dar
-- acesso a um hóspede ou a um admin por engano.
create function private.check_property_owner_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from auth.users u
     where u.id = new.owner_id
       and u.raw_app_meta_data ->> 'role' = 'owner'
  ) then
    raise exception 'not_an_owner' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger property_owners_check_role
  before insert or update of owner_id on public.property_owners
  for each row execute function private.check_property_owner_role();

-- O proprietário logado (com MFA) está vinculado a este imóvel?
-- security definer: consulta o vínculo sem depender das políticas da tabela.
create function private.owns_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_owner()
     and exists (
       select 1 from public.property_owners o
        where o.property_id = p_property_id
          and o.owner_id = auth.uid()
     );
$$;

------------------------------------------------------------------------------
-- Leitura do proprietário: só os próprios imóveis (inclusive rascunhos e
-- arquivados), com fotos, comodidades, tarifas e taxas. Políticas novas,
-- somadas às existentes (o público continua vendo só os publicados).
------------------------------------------------------------------------------
alter table public.property_owners enable row level security;
revoke all on public.property_owners from anon;

create policy "proprietários: admin gerencia" on public.property_owners
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "proprietários: dono lê os próprios vínculos" on public.property_owners
  for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_owner()));

create policy "imóveis: proprietário lê os seus" on public.properties
  for select to authenticated using (private.owns_property(id));
create policy "mídia: proprietário lê dos seus imóveis" on public.property_media
  for select to authenticated using (private.owns_property(property_id));
create policy "comodidades do imóvel: proprietário lê dos seus" on public.property_amenities
  for select to authenticated using (private.owns_property(property_id));
create policy "tarifas: proprietário lê dos seus imóveis" on public.seasonal_rates
  for select to authenticated using (private.owns_property(property_id));
create policy "taxas: proprietário lê dos seus imóveis" on public.property_fees
  for select to authenticated using (private.owns_property(property_id));

-- property_private (endereço exato e anotações internas), booking_requests e
-- calendar_blocks continuam sem política para o proprietário: o acesso é só
-- pelas funções abaixo.

------------------------------------------------------------------------------
-- Reservas dos imóveis do proprietário
------------------------------------------------------------------------------
-- Inclui pendentes ("aguardando aprovação") e o histórico. O valor é o
-- orçamento feito no pedido (estimativa), não um pagamento.
create function public.owner_bookings(p_property_id uuid default null)
returns table (
  id uuid,
  property_id uuid,
  property_title text,
  rental_mode public.rental_mode,
  check_in date,
  check_out date,
  guests_count smallint,
  guest_first_name text,
  status public.booking_status,
  quote jsonb,
  quoted_total numeric,
  created_at timestamptz,
  decided_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select b.id,
           b.property_id,
           p.title,
           b.rental_mode,
           lower(b.stay),
           upper(b.stay),
           b.guests_count,
           split_part(btrim(b.guest_name), ' ', 1),
           b.status,
           b.quote_snapshot,
           b.quoted_total,
           b.created_at,
           b.decided_at
      from public.booking_requests b
      join public.properties p on p.id = b.property_id
      join public.property_owners o on o.property_id = b.property_id and o.owner_id = auth.uid()
     where p_property_id is null or b.property_id = p_property_id;
end;
$$;

-- Calendário dos imóveis do proprietário: períodos ocupados e o motivo
-- (reserva, uso do proprietário, manutenção), sem anotações internas.
create function public.owner_calendar(p_from date, p_to date, p_property_id uuid default null)
returns table (
  property_id uuid,
  start_date date,
  end_date date,
  kind public.block_kind,
  booking_request_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > 400 then
    raise exception 'invalid_range';
  end if;

  return query
    select b.property_id, lower(b.stay), upper(b.stay), b.kind, b.booking_request_id
      from public.calendar_blocks b
      join public.property_owners o on o.property_id = b.property_id and o.owner_id = auth.uid()
     where (p_property_id is null or b.property_id = p_property_id)
       and b.stay && daterange(p_from, p_to)
     order by lower(b.stay);
end;
$$;

------------------------------------------------------------------------------
-- Solicitações do proprietário (bloqueio de datas e alteração do anúncio)
------------------------------------------------------------------------------
create type public.owner_request_kind as enum ('block', 'change');
create type public.owner_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table public.owner_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  kind public.owner_request_kind not null,
  stay daterange check (stay is null or private.is_valid_stay(stay)),
  message text check (char_length(message) between 1 and 2000),
  status public.owner_request_status not null default 'pending',
  admin_reply text check (char_length(admin_reply) <= 2000),
  calendar_block_id uuid references public.calendar_blocks (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  -- Bloqueio: período obrigatório. Alteração: descrição obrigatória, sem período.
  constraint owner_requests_kind_fields check (
    case kind
      when 'block' then stay is not null
      when 'change' then stay is null and message is not null
    end
  )
);

create index owner_requests_property_idx on public.owner_requests (property_id, status, created_at desc);
create index owner_requests_status_idx on public.owner_requests (status, created_at);

create trigger owner_requests_set_updated_at
  before update on public.owner_requests
  for each row execute function private.set_updated_at();

alter table public.owner_requests enable row level security;
revoke all on public.owner_requests from anon;

create policy "solicitações do proprietário: admin gerencia" on public.owner_requests
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
-- Coproprietários do mesmo imóvel veem os pedidos uns dos outros.
create policy "solicitações do proprietário: dono lê as do seu imóvel" on public.owner_requests
  for select to authenticated using (private.owns_property(property_id));
-- Gravação do proprietário só pelas funções abaixo (validam datas e limites).

-- Limite de pedidos pendentes por imóvel: evita uma fila sem fim.
create function private.owner_request_guard(p_property_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.owns_property(p_property_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if (select count(*) from public.owner_requests
       where property_id = p_property_id and status = 'pending') >= 20 then
    raise exception 'too_many_pending';
  end if;
end;
$$;

create function public.request_owner_block(
  p_property_id uuid,
  p_check_in date,
  p_check_out date,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.owner_request_guard(p_property_id);

  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'invalid_dates';
  end if;
  if p_check_in < private.today_sp() then
    raise exception 'past_check_in';
  end if;
  if p_check_out - p_check_in > 365 then
    raise exception 'block_too_long';
  end if;
  -- Aviso antecipado; a garantia contra sobreposição está na aprovação
  -- (restrição de exclusão de calendar_blocks).
  if exists (
    select 1 from public.calendar_blocks b
     where b.property_id = p_property_id
       and b.stay && daterange(p_check_in, p_check_out)
  ) then
    raise exception 'unavailable';
  end if;

  insert into public.owner_requests (property_id, requested_by, kind, stay, message)
  values (p_property_id, auth.uid(), 'block', daterange(p_check_in, p_check_out),
          nullif(btrim(p_message), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.request_property_change(p_property_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.owner_request_guard(p_property_id);

  if nullif(btrim(p_message), '') is null then
    raise exception 'message_required';
  end if;

  insert into public.owner_requests (property_id, requested_by, kind, message)
  values (p_property_id, auth.uid(), 'change', btrim(p_message))
  returning id into v_id;
  return v_id;
end;
$$;

-- O proprietário desiste de um pedido ainda pendente.
create function public.cancel_owner_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.owner_requests r
     set status = 'cancelled', decided_at = now(), decided_by = auth.uid()
   where r.id = p_id
     and r.status = 'pending'
     and private.owns_property(r.property_id);

  if not found then
    raise exception 'invalid_status';
  end if;
end;
$$;

-- Admin aprova. Bloqueio: grava o período como "uso do proprietário" na mesma
-- transação; se as datas já estiverem ocupadas, nada é aprovado.
-- Alteração: o admin edita o anúncio pelo painel e marca como atendida.
create function public.approve_owner_request(p_id uuid, p_reply text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.owner_requests;
  v_block uuid;
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_req from public.owner_requests where id = p_id for update;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'invalid_status' using detail = v_req.status::text;
  end if;

  if v_req.kind = 'block' then
    if lower(v_req.stay) < private.today_sp() then
      raise exception 'past_check_in';
    end if;
    begin
      insert into public.calendar_blocks (property_id, stay, kind, note, created_by)
      values (v_req.property_id, v_req.stay, 'owner', left(v_req.message, 500), auth.uid())
      returning id into v_block;
    exception when exclusion_violation then
      raise exception 'unavailable';
    end;
  end if;

  update public.owner_requests
     set status = 'approved', decided_at = now(), decided_by = auth.uid(),
         admin_reply = nullif(btrim(p_reply), ''), calendar_block_id = v_block
   where id = p_id;
end;
$$;

create function public.reject_owner_request(p_id uuid, p_reply text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.owner_requests
     set status = 'rejected', decided_at = now(), decided_by = auth.uid(),
         admin_reply = nullif(btrim(p_reply), '')
   where id = p_id and status = 'pending';

  if not found then
    raise exception 'invalid_status';
  end if;
end;
$$;

------------------------------------------------------------------------------
-- Execução de funções (por padrão o PostgreSQL concede EXECUTE a PUBLIC)
------------------------------------------------------------------------------
revoke execute on function private.check_property_owner_role() from public, anon, authenticated;
revoke execute on function private.owner_request_guard(uuid) from public, anon, authenticated;

revoke execute on function private.is_owner() from public;
grant execute on function private.is_owner() to authenticated, service_role;
revoke execute on function private.owns_property(uuid) from public;
grant execute on function private.owns_property(uuid) to authenticated, service_role;

revoke execute on function public.owner_bookings(uuid) from public, anon;
grant execute on function public.owner_bookings(uuid) to authenticated;
revoke execute on function public.owner_calendar(date, date, uuid) from public, anon;
grant execute on function public.owner_calendar(date, date, uuid) to authenticated;
revoke execute on function public.request_owner_block(uuid, date, date, text) from public, anon;
grant execute on function public.request_owner_block(uuid, date, date, text) to authenticated;
revoke execute on function public.request_property_change(uuid, text) from public, anon;
grant execute on function public.request_property_change(uuid, text) to authenticated;
revoke execute on function public.cancel_owner_request(uuid) from public, anon;
grant execute on function public.cancel_owner_request(uuid) to authenticated;
revoke execute on function public.approve_owner_request(uuid, text) from public, anon;
grant execute on function public.approve_owner_request(uuid, text) to authenticated;
revoke execute on function public.reject_owner_request(uuid, text) from public, anon;
grant execute on function public.reject_owner_request(uuid, text) to authenticated;
