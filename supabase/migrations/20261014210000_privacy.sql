-- Etapa 18 — Prazos de guarda de dados pessoais (LGPD), cumpridos
-- automaticamente todos os dias (docs/privacidade.md):
--   mensagens de contato: 2 anos após o envio;
--   solicitações de reserva: 5 anos após o fim da estadia (com os bloqueios
--   do calendário e a avaliação ligados a elas).
-- Registros antispam já se apagam em 1 dia (Etapa 11).

create extension if not exists pg_cron with schema pg_catalog;

create function private.purge_expired_personal_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inquiries integer;
  v_bookings integer;
begin
  delete from public.inquiries
   where created_at < now() - interval '2 years';
  get diagnostics v_inquiries = row_count;

  delete from public.booking_requests
   where upper(stay) < (private.today_sp() - interval '5 years')::date;
  get diagnostics v_bookings = row_count;

  return jsonb_build_object('inquiries', v_inquiries, 'booking_requests', v_bookings);
end;
$$;

revoke execute on function private.purge_expired_personal_data() from public, anon, authenticated;

-- Todo dia às 03:17 (horário de Brasília = 06:17 UTC).
select cron.schedule(
  'limpeza-lgpd-diaria',
  '17 6 * * *',
  $$select private.purge_expired_personal_data()$$
);
