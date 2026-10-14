-- Etapa 4 — Segurança: RLS, permissões por coluna, execução de funções e
-- bucket de fotos. Regra geral: nada é acessível sem uma política explícita.

-- RLS em todas as tabelas públicas
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_private enable row level security;
alter table public.property_media enable row level security;
alter table public.amenities enable row level security;
alter table public.property_amenities enable row level security;
alter table public.seasonal_rates enable row level security;
alter table public.property_fees enable row level security;
alter table public.booking_requests enable row level security;
alter table public.calendar_blocks enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.inquiries enable row level security;

-- Camada extra além do RLS: visitantes anônimos não têm sequer permissão de
-- tabela onde não há nada público.
revoke all on public.profiles, public.property_private, public.booking_requests,
  public.calendar_blocks, public.favorites, public.inquiries from anon;
revoke insert, update, delete on public.properties, public.property_media, public.amenities,
  public.property_amenities, public.seasonal_rates, public.property_fees, public.reviews from anon;

------------------------------------------------------------------------------
-- Perfis
------------------------------------------------------------------------------
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create policy "perfil: dono lê" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "perfil: dono edita" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "perfil: admin lê" on public.profiles
  for select to authenticated using ((select private.is_admin()));

------------------------------------------------------------------------------
-- Imóveis e dados relacionados
------------------------------------------------------------------------------
create policy "imóveis: público lê publicados" on public.properties
  for select to anon, authenticated using (status = 'published');
create policy "imóveis: admin gerencia" on public.properties
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "dados privados: admin gerencia" on public.property_private
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "mídia: público lê de publicados" on public.property_media
  for select to anon, authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.status = 'published'));
create policy "mídia: admin gerencia" on public.property_media
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "comodidades: público lê" on public.amenities
  for select to anon, authenticated using (true);
create policy "comodidades: admin gerencia" on public.amenities
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "comodidades do imóvel: público lê de publicados" on public.property_amenities
  for select to anon, authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.status = 'published'));
create policy "comodidades do imóvel: admin gerencia" on public.property_amenities
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "tarifas: público lê de publicados" on public.seasonal_rates
  for select to anon, authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.status = 'published'));
create policy "tarifas: admin gerencia" on public.seasonal_rates
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "taxas: público lê de publicados" on public.property_fees
  for select to anon, authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.status = 'published'));
create policy "taxas: admin gerencia" on public.property_fees
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

------------------------------------------------------------------------------
-- Reservas e calendário: somente admin. Visitantes usam funções dedicadas.
------------------------------------------------------------------------------
create policy "solicitações: admin gerencia" on public.booking_requests
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "calendário: admin gerencia" on public.calendar_blocks
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

------------------------------------------------------------------------------
-- Favoritos
------------------------------------------------------------------------------
revoke update on public.favorites from authenticated;

create policy "favoritos: dono lê" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "favoritos: dono adiciona imóvel publicado" on public.favorites
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.properties p where p.id = property_id and p.status = 'published')
  );
create policy "favoritos: dono remove" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));
create policy "favoritos: admin lê" on public.favorites
  for select to authenticated using ((select private.is_admin()));

------------------------------------------------------------------------------
-- Avaliações
------------------------------------------------------------------------------
-- Visitantes não veem author_id nem o vínculo com a reserva.
revoke select on public.reviews from anon;
grant select (id, property_id, author_display_name, rating, comment, admin_reply, created_at)
  on public.reviews to anon;

-- Hóspede só escolhe nota e comentário; status nasce "pending".
-- O admin modera status, resposta e data de moderação.
revoke insert, update on public.reviews from authenticated;
grant insert (property_id, booking_request_id, rating, comment) on public.reviews to authenticated;
grant update (status, admin_reply, moderated_at) on public.reviews to authenticated;

create policy "avaliações: público lê aprovadas" on public.reviews
  for select to anon, authenticated
  using (
    status = 'approved'
    and exists (select 1 from public.properties p where p.id = property_id and p.status = 'published')
  );
create policy "avaliações: autor lê as próprias" on public.reviews
  for select to authenticated using (author_id = (select auth.uid()));
create policy "avaliações: hóspede elegível cria" on public.reviews
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and private.can_review(booking_request_id, property_id)
  );
create policy "avaliações: admin modera" on public.reviews
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "avaliações: admin remove" on public.reviews
  for delete to authenticated using ((select private.is_admin()));
create policy "avaliações: admin lê" on public.reviews
  for select to authenticated using ((select private.is_admin()));

------------------------------------------------------------------------------
-- Contatos: somente admin lê; gravação apenas pelo servidor (service_role).
------------------------------------------------------------------------------
create policy "contatos: admin gerencia" on public.inquiries
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

------------------------------------------------------------------------------
-- Execução de funções. Por padrão o PostgreSQL concede EXECUTE a PUBLIC.
------------------------------------------------------------------------------
revoke execute on function private.handle_new_user() from public, anon, authenticated;
revoke execute on function private.sync_approx_location() from public, anon, authenticated;
revoke execute on function private.set_review_author_name() from public, anon, authenticated;
revoke execute on function private.set_updated_at() from public, anon, authenticated;

revoke execute on function public.quote_stay(uuid, public.rental_mode, date, date, integer) from public;
grant execute on function public.quote_stay(uuid, public.rental_mode, date, date, integer)
  to anon, authenticated, service_role;

revoke execute on function public.get_unavailable_ranges(uuid, date, date) from public;
grant execute on function public.get_unavailable_ranges(uuid, date, date)
  to anon, authenticated, service_role;

revoke execute on function public.request_booking(uuid, public.rental_mode, date, date, integer,
  text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.request_booking(uuid, public.rental_mode, date, date, integer,
  text, text, text, text, boolean) to service_role;

revoke execute on function public.approve_booking_request(uuid) from public, anon;
revoke execute on function public.decline_booking_request(uuid, text) from public, anon;
revoke execute on function public.cancel_booking_request(uuid, text) from public, anon;
grant execute on function public.approve_booking_request(uuid) to authenticated;
grant execute on function public.decline_booking_request(uuid, text) to authenticated;
grant execute on function public.cancel_booking_request(uuid, text) to authenticated;

revoke execute on function public.get_my_stays() from public, anon;
grant execute on function public.get_my_stays() to authenticated;

------------------------------------------------------------------------------
-- Storage: fotos dos imóveis. Leitura pública pela URL; escrita só do admin.
------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-media',
  'property-media',
  true,
  10485760, -- 10 MB
  array['image/webp', 'image/avif', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy "fotos: admin lista" on storage.objects
  for select to authenticated
  using (bucket_id = 'property-media' and (select private.is_admin()));
create policy "fotos: admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-media' and (select private.is_admin()));
create policy "fotos: admin substitui" on storage.objects
  for update to authenticated
  using (bucket_id = 'property-media' and (select private.is_admin()))
  with check (bucket_id = 'property-media' and (select private.is_admin()));
create policy "fotos: admin remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-media' and (select private.is_admin()));
