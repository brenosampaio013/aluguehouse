-- Etapa 12 — Aprovação não aceita pedidos cuja chegada já passou.
-- Mesma função da Etapa 4, com a verificação de data antes de bloquear.

create or replace function public.approve_booking_request(p_id uuid)
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
  if lower(v_req.stay) < private.today_sp() then
    raise exception 'past_check_in';
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
