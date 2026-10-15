-- Vídeos dos imóveis. Só acrescenta: nenhuma coluna, linha ou foto existente
-- é alterada ou apagada.
--
-- Os vídeos ficam na mesma tabela das fotos (property_media, kind = 'video'),
-- com campos próprios opcionais. O arquivo de vídeo fica no Storage (bucket
-- property-videos); o banco guarda só o caminho.

alter table public.property_media
  -- Origem do vídeo. Links (youtube/vimeo) entram numa etapa seguinte.
  add column video_source text check (video_source in ('file', 'youtube', 'vimeo')),
  -- Código do vídeo no provedor (youtube/vimeo). Nunca a URL colada.
  add column video_ref text check (char_length(video_ref) <= 40),
  -- Título ou legenda opcional mostrado com o vídeo.
  add column caption text check (char_length(caption) between 1 and 120),
  -- Miniatura (WebP no bucket property-media).
  add column poster_path text check (char_length(poster_path) <= 500),
  add column duration_seconds integer check (duration_seconds between 1 and 21600);

-- Campos de vídeo só em vídeos, e completos conforme a origem. NOT VALID:
-- vale para tudo o que for gravado daqui em diante sem reprovar linhas antigas.
alter table public.property_media
  add constraint property_media_video_fields check (
    case
      when kind <> 'video' then
        video_source is null and video_ref is null and caption is null
        and poster_path is null and duration_seconds is null
      when video_source = 'file' then
        storage_path is not null and poster_path is not null and video_ref is null
      when video_source = 'youtube' then
        video_ref ~ '^[A-Za-z0-9_-]{11}$' and external_url is not null
      when video_source = 'vimeo' then
        video_ref ~ '^[0-9]{6,12}(:[0-9a-f]{6,20})?$' and external_url is not null
      else false
    end
  ) not valid;

-- Teto de segurança de vídeos por imóvel. O limite usado no painel é
-- configurável (VIDEO_MAX_PER_PROPERTY) e nunca passa deste.
create function private.check_video_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'video' and (
    select count(*) from public.property_media
     where property_id = new.property_id and kind = 'video'
  ) >= 20 then
    raise exception 'video_limit';
  end if;
  return new;
end;
$$;

create trigger property_media_video_limit
  before insert on public.property_media
  for each row execute function private.check_video_limit();

-- Storage: arquivos de vídeo. Leitura pública pela URL (como as fotos);
-- escrita só do admin com MFA, no caminho "<imóvel>/<mídia>/video.mp4|webm".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-videos',
  'property-videos',
  true,
  52428800, -- 50 MB (limite do plano gratuito do Supabase por arquivo)
  array['video/mp4', 'video/webm']
)
on conflict (id) do nothing;

create policy "vídeos: admin lista" on storage.objects
  for select to authenticated
  using (bucket_id = 'property-videos' and (select private.is_admin()));
create policy "vídeos: admin envia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'property-videos'
    and (select private.is_admin())
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/video\.(mp4|webm)$'
  );
create policy "vídeos: admin remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-videos' and (select private.is_admin()));
