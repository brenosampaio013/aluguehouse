-- Etapa 4 — Solicitações de reserva, calendário, orçamento e aprovação.

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  rental_mode public.rental_mode not null,
  guest_name text not null check (char_length(guest_name) between 2 and 120),
  guest_email text not null check (guest_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(guest_email) <= 254),
  guest_phone text not null check (guest_phone ~ '^[0-9]{10,13}$'),
  stay daterange not null check (private.is_valid_stay(stay)),
  guests_count smallint not null check (guests_count between 1 and 50),
  message text check (char_length(message) <= 2000),
  quote_snapshot jsonb not null,
  quoted_total numeric(12, 2) not null check (quoted_total >= 0),
  status public.booking_status not null default 'pending',
  admin_notes text check (char_length(admin_notes) <= 5000),
  privacy_consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  constraint booking_requests_mode_nights check (
    case rental_mode
      when 'seasonal' then upper(stay) - lower(stay) between 1 and 29
      when 'monthly' then upper(stay) - lower(stay) between 30 and 90
    end
  )
);

create index booking_requests_property_status_idx on public.booking_requests (property_id, status);
create index booking_requests_stay_idx on public.booking_requests using gist (property_id, stay);
create index booking_requests_email_idx on public.booking_requests (lower(guest_email));

create trigger booking_requests_set_updated_at
  before update on public.booking_requests
  for each row execute function private.set_updated_at();

-- Calendário: reservas aprovadas e bloqueios manuais.
-- A restrição de exclusão torna impossível gravar dois períodos sobrepostos
-- para o mesmo imóvel, mesmo com aprovações simultâneas.
create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  stay daterange not null check (private.is_valid_stay(stay)),
  kind public.block_kind not null,
  booking_request_id uuid unique references public.booking_requests (id) on delete cascade,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint calendar_blocks_booking_link check ((kind = 'booking') = (booking_request_id is not null)),
  constraint calendar_blocks_no_overlap exclude using gist (property_id with =, stay with &&)
);

-- Orçamento de uma estadia.
-- Regras aprovadas (docs/planejamento.md, seção 6):
--   temporada (1–29 noites): soma noite a noite, tarifa sazonal ou base;
--   mensal (30–max_nights): monthly_price × noites ÷ 30;
--   taxas por valor fixo, por noite, por hóspede/noite ou percentual;
--   taxas reembolsáveis (caução) são informativas e ficam fora do total.
-- Roda com as permissões de quem chama: visitantes só orçam imóveis publicados.
-- Erros usam códigos estáveis na mensagem para o site traduzir.
create function public.quote_stay(
  p_property_id uuid,
  p_mode public.rental_mode,
  p_check_in date,
  p_check_out date,
  p_guests integer
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_prop public.properties;
  v_nights integer;
  v_min_nights integer;
  v_lines jsonb;
  v_subtotal numeric(12, 2);
  v_missing integer;
  v_fees jsonb := '[]'::jsonb;
  v_deposits jsonb := '[]'::jsonb;
  v_fees_total numeric(12, 2) := 0;
  v_fee record;
  v_amount numeric(12, 2);
begin
  select * into v_prop from public.properties where id = p_property_id;
  if not found then
    raise exception 'property_not_found' using errcode = 'P0002';
  end if;

  if (p_mode = 'seasonal' and not v_prop.offers_seasonal)
     or (p_mode = 'monthly' and not v_prop.offers_monthly) then
    raise exception 'mode_not_offered';
  end if;

  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'invalid_dates';
  end if;

  if p_guests is null or p_guests < 1 or p_guests > v_prop.max_guests then
    raise exception 'guests_exceeded' using detail = v_prop.max_guests::text;
  end if;

  v_nights := p_check_out - p_check_in;

  if v_nights > v_prop.max_nights then
    raise exception 'max_nights' using detail = v_prop.max_nights::text;
  end if;

  if p_mode = 'seasonal' then
    if v_nights > 29 then
      raise exception 'seasonal_max_29';
    end if;

    select greatest(v_prop.min_nights, coalesce(max(sr.min_nights), 0))
      into v_min_nights
      from public.seasonal_rates sr
     where sr.property_id = p_property_id
       and sr.period && daterange(p_check_in, p_check_out);

    if v_nights < v_min_nights then
      raise exception 'min_nights' using detail = v_min_nights::text;
    end if;

    with nights as (
      select d::date as night
        from generate_series(p_check_in, p_check_out - 1, interval '1 day') as d
    ),
    priced as (
      select n.night,
             coalesce(sr.nightly_price, v_prop.nightly_price) as price,
             coalesce(sr.label, 'Diária') as label
        from nights n
        left join public.seasonal_rates sr
          on sr.property_id = p_property_id and sr.period @> n.night
    ),
    grouped as (
      select label, price, count(*)::integer as nights, min(night) as first_night
        from priced
       group by label, price
    )
    select count(*) filter (where price is null),
           jsonb_agg(
             jsonb_build_object('label', label, 'nights', nights, 'unit_price', price,
                                'amount', price * nights)
             order by first_night
           ),
           sum(price * nights)
      into v_missing, v_lines, v_subtotal
      from grouped;

    if v_missing > 0 then
      raise exception 'price_unavailable';
    end if;
  else
    if v_nights < 30 then
      raise exception 'monthly_min_30';
    end if;
    if v_prop.monthly_price is null then
      raise exception 'price_unavailable';
    end if;

    v_subtotal := round(v_prop.monthly_price * v_nights / 30.0, 2);
    v_lines := jsonb_build_array(
      jsonb_build_object('label', 'Aluguel mensal', 'nights', v_nights,
                         'unit_price', v_prop.monthly_price, 'amount', v_subtotal)
    );
  end if;

  for v_fee in
    select f.label, f.calc, f.amount, f.is_refundable
      from public.property_fees f
     where f.property_id = p_property_id
       and f.applies_to in ('both', p_mode::text::public.fee_applies_to)
     order by f.position, f.created_at
  loop
    v_amount := round(case v_fee.calc
      when 'fixed' then v_fee.amount
      when 'per_night' then v_fee.amount * v_nights
      when 'per_guest_per_night' then v_fee.amount * p_guests * v_nights
      when 'percent' then v_subtotal * v_fee.amount / 100.0
    end, 2);

    if v_fee.is_refundable then
      v_deposits := v_deposits || jsonb_build_object('label', v_fee.label, 'amount', v_amount);
    else
      v_fees := v_fees || jsonb_build_object('label', v_fee.label, 'amount', v_amount);
      v_fees_total := v_fees_total + v_amount;
    end if;
  end loop;

  return jsonb_build_object(
    'currency', 'BRL',
    'mode', p_mode,
    'check_in', p_check_in,
    'check_out', p_check_out,
    'nights', v_nights,
    'guests', p_guests,
    'lines', v_lines,
    'subtotal', v_subtotal,
    'fees', v_fees,
    'total', v_subtotal + v_fees_total,
    'deposits', v_deposits
  );
end;
$$;

-- Datas ocupadas de um imóvel publicado, sem motivo nem dados de hóspedes.
create function public.get_unavailable_ranges(p_property_id uuid, p_from date, p_to date)
returns table (start_date date, end_date date)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > 400 then
    raise exception 'invalid_range';
  end if;

  return query
    select lower(b.stay), upper(b.stay)
      from public.calendar_blocks b
      join public.properties p on p.id = b.property_id
     where b.property_id = p_property_id
       and p.status = 'published'
       and b.stay && daterange(p_from, p_to)
     order by lower(b.stay);
end;
$$;

-- Registra uma solicitação de reserva. Chamada apenas pelo servidor
-- (Server Action com validação e anti-spam), nunca direto do navegador.
create function public.request_booking(
  p_property_id uuid,
  p_mode public.rental_mode,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_privacy_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote jsonb;
  v_id uuid;
begin
  -- Como esta função ignora RLS, a verificação de publicação é explícita.
  perform 1 from public.properties where id = p_property_id and status = 'published';
  if not found then
    raise exception 'property_not_found' using errcode = 'P0002';
  end if;

  if p_privacy_consent is not true then
    raise exception 'consent_required';
  end if;

  if p_check_in < private.today_sp() then
    raise exception 'past_check_in';
  end if;

  v_quote := public.quote_stay(p_property_id, p_mode, p_check_in, p_check_out, p_guests);

  -- Pendentes podem se sobrepor entre si; só datas já bloqueadas impedem o
  -- pedido. A garantia contra overbooking está na aprovação.
  if exists (
    select 1 from public.calendar_blocks b
     where b.property_id = p_property_id
       and b.stay && daterange(p_check_in, p_check_out)
  ) then
    raise exception 'unavailable';
  end if;

  insert into public.booking_requests (
    property_id, rental_mode, guest_name, guest_email, guest_phone, stay, guests_count,
    message, quote_snapshot, quoted_total, privacy_consent_at
  ) values (
    p_property_id, p_mode, btrim(p_name), lower(btrim(p_email)), p_phone,
    daterange(p_check_in, p_check_out), p_guests, nullif(btrim(p_message), ''),
    v_quote, (v_quote ->> 'total')::numeric, now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Aprovação manual pelo administrador. Bloqueia as datas na mesma transação;
-- se já estiverem ocupadas, nada é aprovado.
create function public.approve_booking_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.booking_requests;
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_req from public.booking_requests where id = p_id for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'invalid_status' using detail = v_req.status::text;
  end if;

  begin
    insert into public.calendar_blocks (property_id, stay, kind, booking_request_id, created_by)
    values (v_req.property_id, v_req.stay, 'booking', v_req.id, auth.uid());
  exception when exclusion_violation then
    raise exception 'unavailable';
  end;

  update public.booking_requests
     set status = 'approved', decided_at = now(), decided_by = auth.uid()
   where id = p_id;
end;
$$;

create function public.decline_booking_request(p_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.booking_requests
     set status = 'declined', decided_at = now(), decided_by = auth.uid(),
         admin_notes = coalesce(p_notes, admin_notes)
   where id = p_id and status = 'pending';

  if not found then
    raise exception 'invalid_status';
  end if;
end;
$$;

-- Cancela uma solicitação pendente ou aprovada e libera as datas.
create function public.cancel_booking_request(p_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.booking_requests
     set status = 'cancelled', decided_at = now(), decided_by = auth.uid(),
         admin_notes = coalesce(p_notes, admin_notes)
   where id = p_id and status in ('pending', 'approved');

  if not found then
    raise exception 'invalid_status';
  end if;

  delete from public.calendar_blocks where booking_request_id = p_id;
end;
$$;
