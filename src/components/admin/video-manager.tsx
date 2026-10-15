"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { TextField } from "@/components/ui/text-field";
import { getPublicEnv } from "@/lib/env";
import { MEDIA_BUCKET, publicMediaUrl } from "@/lib/media";
import {
  VIDEO_CAPTION_MAX,
  formatDuration,
  formatMegabytes,
  publicVideoUrl,
  validateVideoFile,
} from "@/lib/videos";
import { readVideoFile, uploadToSignedUrl, type VideoInfo } from "@/lib/videos-browser";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { moveMedia } from "@/server/actions/media";
import {
  deleteVideo,
  discardVideoUpload,
  prepareVideoUpload,
  registerVideo,
  updateVideoCaption,
} from "@/server/actions/videos";

import { RefForm } from "./media-manager";
import { useFormAction } from "./use-form-action";

export type VideoItem = {
  id: string;
  storage_path: string | null;
  poster_path: string | null;
  caption: string | null;
  alt_text: string;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
};

type Selected = { file: File; previewUrl: string; info: VideoInfo };

type Status =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "uploading"; progress: number }
  | { kind: "saving" }
  | { kind: "error"; text: string }
  | { kind: "done" };

/** Proporção do vídeo (sem distorcer); 16:9 enquanto não se sabe. */
function aspect(width: number | null, height: number | null) {
  return width && height ? `${width} / ${height}` : "16 / 9";
}

function UploadForm({ propertyId, maxBytes }: { propertyId: string; maxBytes: number }) {
  const fileId = useId();
  const fileHintId = `${fileId}-hint`;
  const fileErrorId = `${fileId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [fileError, setFileError] = useState<string>();
  const [captionError, setCaptionError] = useState<string>();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Libera as prévias locais ao trocar de arquivo ou sair da página.
  useEffect(() => {
    return () => {
      if (selected) URL.revokeObjectURL(selected.previewUrl);
    };
  }, [selected]);
  useEffect(() => {
    return () => {
      if (posterUrl) URL.revokeObjectURL(posterUrl);
    };
  }, [posterUrl]);

  function clear() {
    setSelected(null);
    setPosterUrl(null);
    setCaption("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file: File | undefined) {
    setFileError(undefined);
    setSelected(null);
    setPosterUrl(null);
    if (!file) return;
    const invalid = validateVideoFile(file, maxBytes);
    if (invalid) {
      setFileError(invalid);
      return;
    }
    setStatus({ kind: "reading" });
    try {
      const info = await readVideoFile(file);
      setSelected({ file, previewUrl: URL.createObjectURL(file), info });
      setPosterUrl(URL.createObjectURL(info.poster));
      setStatus({ kind: "idle" });
    } catch {
      setStatus({ kind: "idle" });
      setFileError(
        "Não conseguimos abrir este vídeo. Use MP4 (H.264) ou WebM; vídeos .MOV do iPhone em HEVC precisam ser convertidos.",
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCaptionError(undefined);
    if (!selected) {
      setFileError("Escolha um vídeo.");
      return;
    }
    if (caption.trim().length > VIDEO_CAPTION_MAX) {
      setCaptionError(`Use até ${VIDEO_CAPTION_MAX} caracteres.`);
      return;
    }

    const { file, info } = selected;
    setStatus({ kind: "uploading", progress: 0 });
    let started: { mediaId: string; extension: "mp4" | "webm" } | null = null;
    try {
      const prepared = await prepareVideoUpload({
        propertyId,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      });
      if (prepared.status === "error") {
        setStatus({ kind: "error", text: prepared.message });
        return;
      }

      started = { mediaId: prepared.mediaId, extension: prepared.extension };
      const supabase = createSupabaseBrowserClient();
      const poster = await supabase.storage
        .from(MEDIA_BUCKET)
        .uploadToSignedUrl(prepared.poster.path, prepared.poster.token, info.poster, {
          contentType: "image/webp",
          cacheControl: "31536000",
        });
      if (poster.error) throw poster.error;

      await uploadToSignedUrl(
        prepared.videoUploadUrl,
        file,
        getPublicEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
        (progress) => setStatus({ kind: "uploading", progress }),
      );

      setStatus({ kind: "saving" });
      const result = await registerVideo({
        propertyId,
        mediaId: prepared.mediaId,
        extension: prepared.extension,
        caption,
        durationSeconds: info.duration,
        width: info.width,
        height: info.height,
      });
      if (result.status === "error") {
        if (result.fieldErrors?.caption) setCaptionError(result.fieldErrors.caption);
        setStatus({ kind: "error", text: result.message ?? "Confira o título do vídeo." });
        return;
      }
      clear();
      setStatus({ kind: "done" });
    } catch {
      // Envio interrompido: apaga a miniatura ou o vídeo parcial que ficaram.
      if (started) await discardVideoUpload({ propertyId, ...started }).catch(() => {});
      setStatus({
        kind: "error",
        text: "Não foi possível enviar o vídeo. Verifique a conexão e tente de novo.",
      });
    }
  }

  const busy = status.kind === "reading" || status.kind === "uploading" || status.kind === "saving";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={`${fileId}-titulo`}
      className="grid max-w-3xl gap-5 rounded-photo border border-areia bg-branco p-5"
    >
      <h3 id={`${fileId}-titulo`} className="font-semibold">
        Adicionar vídeo
      </h3>
      <div className="grid gap-1.5">
        <label htmlFor={fileId} className="text-small font-semibold">
          Arquivo de vídeo
        </label>
        <input
          ref={inputRef}
          id={fileId}
          name="file"
          type="file"
          accept="video/mp4,video/webm"
          disabled={busy}
          onChange={(event) => handleFile(event.currentTarget.files?.[0])}
          aria-invalid={fileError ? true : undefined}
          aria-describedby={[fileHintId, fileError ? fileErrorId : null].filter(Boolean).join(" ")}
          className="text-body file:mr-3 file:min-h-11 file:rounded-control file:border file:border-petroleo file:bg-branco file:px-4 file:font-semibold file:text-petroleo"
        />
        <p id={fileHintId} className="text-small text-rocha">
          MP4 (H.264) ou WebM, até {formatMegabytes(maxBytes)}. Prefira vídeos horizontais e curtos,
          que mostrem a arquitetura, a piscina, o paisagismo e os ambientes.
        </p>
        {fileError ? (
          <p id={fileErrorId} className="text-small text-erro">
            {fileError}
          </p>
        ) : null}
      </div>

      {status.kind === "reading" ? (
        <p role="status" className="text-small text-rocha">
          Abrindo o vídeo…
        </p>
      ) : null}

      {selected ? (
        <div className="grid gap-4 border-t border-areia pt-5 sm:grid-cols-[minmax(0,1fr)_180px]">
          <figure className="grid gap-2">
            <video
              src={selected.previewUrl}
              controls
              muted
              playsInline
              preload="metadata"
              aria-label="Prévia do vídeo antes de salvar"
              style={{ aspectRatio: aspect(selected.info.width, selected.info.height) }}
              className="max-h-[360px] w-full rounded-photo bg-abismo object-contain"
            />
            <figcaption className="text-small text-rocha">
              Prévia (ainda não salvo) · {formatMegabytes(selected.file.size)}
              {selected.info.duration ? ` · ${formatDuration(selected.info.duration)}` : ""} ·{" "}
              {selected.info.width}×{selected.info.height}
            </figcaption>
          </figure>
          {posterUrl ? (
            <figure className="grid content-start gap-2">
              {/* Miniatura local gerada no navegador (blob:). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterUrl}
                alt="Miniatura que aparecerá na galeria"
                className="aspect-video w-full rounded-control object-cover"
              />
              <figcaption className="text-small text-rocha">Miniatura</figcaption>
            </figure>
          ) : null}
        </div>
      ) : null}

      <TextField
        label="Título ou legenda (opcional)"
        name="caption"
        value={caption}
        maxLength={VIDEO_CAPTION_MAX}
        onChange={(event) => setCaption(event.currentTarget.value)}
        hint="Ex.: Área da piscina ao entardecer. Aparece junto do vídeo."
        error={captionError}
        disabled={busy}
      />

      {status.kind === "uploading" ? (
        <div className="grid gap-1.5">
          <p role="status" className="text-small font-semibold">
            Enviando o vídeo… {Math.round(status.progress * 100)}%
          </p>
          <progress
            value={status.progress}
            max={1}
            aria-label="Progresso do envio"
            className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-petroleo [&::-webkit-progress-bar]:bg-areia [&::-webkit-progress-value]:bg-petroleo"
          />
        </div>
      ) : null}
      {status.kind === "saving" ? (
        <FormMessage tone="success">Conferindo e salvando o vídeo…</FormMessage>
      ) : null}
      {status.kind === "error" ? <FormMessage tone="error">{status.text}</FormMessage> : null}
      {status.kind === "done" ? <FormMessage tone="success">Vídeo adicionado.</FormMessage> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy || !selected}>
          {status.kind === "uploading" || status.kind === "saving" ? "Enviando…" : "Salvar vídeo"}
        </Button>
        {selected && !busy ? (
          <Button type="button" variant="secondary" onClick={clear}>
            Descartar
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function CaptionForm({
  propertyId,
  item,
  position,
}: {
  propertyId: string;
  item: VideoItem;
  position: number;
}) {
  const { state, pending, formProps } = useFormAction(updateVideoCaption);
  return (
    <form {...formProps} className="grid gap-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="mediaId" value={item.id} />
      <TextField
        label={`Título ou legenda do vídeo ${position} (opcional)`}
        name="caption"
        defaultValue={item.caption ?? ""}
        maxLength={VIDEO_CAPTION_MAX}
        error={state.fieldErrors?.caption}
      />
      {state.status === "success" ? (
        <p role="status" className="text-small text-rocha">
          {state.message}
        </p>
      ) : null}
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          Salvar título<span className="sr-only"> (vídeo {position})</span>
        </Button>
      </div>
    </form>
  );
}

export function VideoManager({
  propertyId,
  supabaseUrl,
  items,
  maxBytes,
  maxPerProperty,
}: {
  propertyId: string;
  supabaseUrl: string;
  items: VideoItem[];
  maxBytes: number;
  maxPerProperty: number;
}) {
  const full = items.length >= maxPerProperty;

  return (
    <div className="grid min-w-0 gap-8">
      <p className="text-small text-rocha">
        {items.length} de {maxPerProperty} vídeos. Os vídeos aparecem na galeria da página do
        imóvel, depois das fotos, e só tocam quando o visitante clica.
      </p>

      {full ? (
        <p className="max-w-3xl rounded-control bg-nevoa px-4 py-3">
          Este imóvel atingiu o limite de {maxPerProperty} vídeos. Remova um para enviar outro.
        </p>
      ) : (
        <UploadForm propertyId={propertyId} maxBytes={maxBytes} />
      )}

      {items.length === 0 ? (
        <p className="text-rocha">Nenhum vídeo ainda.</p>
      ) : (
        <ol aria-label="Vídeos do imóvel" className="grid gap-6">
          {items.map((item, index) => {
            const position = index + 1;
            return (
              <li
                key={item.id}
                className="grid gap-4 rounded-photo border border-areia p-4 sm:grid-cols-[minmax(0,320px)_1fr]"
              >
                <div className="grid content-start gap-2">
                  {item.storage_path ? (
                    <video
                      src={publicVideoUrl(supabaseUrl, item.storage_path)}
                      poster={
                        item.poster_path ? publicMediaUrl(supabaseUrl, item.poster_path) : undefined
                      }
                      controls
                      playsInline
                      // Nada é baixado até clicar em reproduzir.
                      preload="none"
                      aria-label={item.alt_text}
                      style={{ aspectRatio: aspect(item.width, item.height) }}
                      className="max-h-[320px] w-full rounded-photo bg-abismo object-contain"
                    />
                  ) : null}
                  <p className="flex flex-wrap gap-2 text-small">
                    <span className="font-semibold">Vídeo {position}</span>
                    {item.duration_seconds ? (
                      <span className="text-rocha">{formatDuration(item.duration_seconds)}</span>
                    ) : null}
                  </p>
                </div>
                <div className="grid content-start gap-4">
                  <CaptionForm propertyId={propertyId} item={item} position={position} />
                  <div className="flex flex-wrap gap-2">
                    <RefForm
                      action={moveMedia}
                      propertyId={propertyId}
                      mediaId={item.id}
                      extra={{ direction: "up" }}
                    >
                      <Button type="submit" variant="secondary" disabled={index === 0}>
                        Mover para cima<span className="sr-only"> (vídeo {position})</span>
                      </Button>
                    </RefForm>
                    <RefForm
                      action={moveMedia}
                      propertyId={propertyId}
                      mediaId={item.id}
                      extra={{ direction: "down" }}
                    >
                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={index === items.length - 1}
                      >
                        Mover para baixo<span className="sr-only"> (vídeo {position})</span>
                      </Button>
                    </RefForm>
                    <RefForm
                      action={deleteVideo}
                      propertyId={propertyId}
                      mediaId={item.id}
                      confirmMessage={`Remover o vídeo ${position}? O arquivo será apagado.`}
                    >
                      <Button type="submit" variant="secondary" className="text-erro">
                        Remover<span className="sr-only"> (vídeo {position})</span>
                      </Button>
                    </RefForm>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
