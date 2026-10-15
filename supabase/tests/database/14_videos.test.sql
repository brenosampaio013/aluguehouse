-- Testes pgTAP: vídeos dos imóveis
begin;
create extension if not exists pgtap with schema extensions;

create function pg_temp.entrar(p_sub uuid, p_email text, p_admin boolean default false, p_aal text default 'aal1')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', p_sub, 'role', 'authenticated', 'email', p_email, 'aal', p_aal,
    'app_metadata', case when p_admin then json_build_object('role', 'admin') else '{}'::json end
  )::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.visitante() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@teste.local'),
  ('00000000-0000-0000-0000-00000000000b', 'ana@teste.local');

insert into public.properties (id, slug, title, property_type, city, offers_seasonal, nightly_price, status, published_at)
values
  ('20000000-0000-0000-0000-000000000001', 'casa-video', 'Casa com vídeo', 'casa', 'Bertioga', true, 1000, 'published', now()),
  ('20000000-0000-0000-0000-000000000002', 'casa-video-rascunho', 'Rascunho', 'casa', 'Bertioga', true, 1000, 'draft', null);

select plan(13);

-- Estrutura e bucket
select is((select public from storage.buckets where id = 'property-videos'), true,
  'bucket de vídeos tem leitura pública pela URL');
select is((select file_size_limit from storage.buckets where id = 'property-videos'), 52428800::bigint,
  'bucket de vídeos limita 50 MB por arquivo');
select is((select allowed_mime_types from storage.buckets where id = 'property-videos'),
  array['video/mp4', 'video/webm'], 'bucket de vídeos aceita só MP4 e WebM');

-- Regras dos campos
select lives_ok($$
  insert into public.property_media (property_id, kind, storage_path, alt_text, video_source, poster_path, caption, duration_seconds)
  values ('20000000-0000-0000-0000-000000000001', 'video', 'p/m/video.mp4', 'Vídeo do imóvel', 'file', 'p/m/poster.webp', 'Área da piscina', 42)
$$, 'vídeo enviado com arquivo e miniatura é aceito');

select throws_ok($$
  insert into public.property_media (property_id, kind, storage_path, alt_text, video_source)
  values ('20000000-0000-0000-0000-000000000001', 'video', 'p/m/video.mp4', 'Vídeo do imóvel', 'file')
$$, '23514', null, 'vídeo enviado sem miniatura é recusado');

select throws_ok($$
  insert into public.property_media (property_id, kind, storage_path, alt_text, caption)
  values ('20000000-0000-0000-0000-000000000001', 'image', 'p/f', 'Foto da sala', 'legenda')
$$, '23514', null, 'foto não recebe campos de vídeo');

select throws_ok($$
  insert into public.property_media (property_id, kind, external_url, alt_text, video_source, video_ref)
  values ('20000000-0000-0000-0000-000000000001', 'video', 'https://exemplo.com/x', 'Vídeo', 'youtube', '<script>')
$$, '23514', null, 'código de vídeo fora do formato é recusado');

select throws_ok($$
  insert into public.property_media (property_id, kind, storage_path, alt_text, video_source, poster_path)
  values ('20000000-0000-0000-0000-000000000001', 'video', 'p/m/video.mp4', 'Vídeo', 'outro', 'p/m/poster.webp')
$$, '23514', null, 'origem desconhecida é recusada');

-- Teto de 20 vídeos por imóvel
insert into public.property_media (property_id, kind, storage_path, alt_text, video_source, poster_path)
select '20000000-0000-0000-0000-000000000002', 'video', 'p/' || n || '/video.mp4', 'Vídeo', 'file', 'p/' || n || '/poster.webp'
  from generate_series(1, 20) n;
select throws_ok($$
  insert into public.property_media (property_id, kind, storage_path, alt_text, video_source, poster_path)
  values ('20000000-0000-0000-0000-000000000002', 'video', 'p/x/video.mp4', 'Vídeo', 'file', 'p/x/poster.webp')
$$, 'P0001', 'video_limit', 'o 21º vídeo do imóvel é recusado');

-- Permissões
select pg_temp.visitante();
select is((select count(*)::int from public.property_media where property_id = '20000000-0000-0000-0000-000000000002'), 0,
  'visitante não vê vídeos de rascunho');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-00000000000b', 'ana@teste.local');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('property-videos', '20000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/video.mp4') $$,
  '42501', null, 'hóspede não envia vídeos');
reset role;

select pg_temp.entrar('00000000-0000-0000-0000-00000000000a', 'admin@teste.local', true, 'aal2');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('property-videos', '20000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/video.mp4') $$,
  'admin com MFA envia vídeo no caminho esperado');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('property-videos', '../outro/arquivo.html') $$,
  '42501', null, 'admin não envia fora do caminho de vídeo');
reset role;

select * from finish();

rollback;
