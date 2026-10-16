"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FormMessage } from "@/components/ui/form-message";
import { TextField } from "@/components/ui/text-field";
import { createWebpVariants, validateImageFile } from "@/lib/images/resize";
import { MEDIA_BUCKET, mediaSrcSet, publicMediaUrl, variantPath, variantWidths } from "@/lib/media";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  deleteMedia,
  moveMedia,
  registerImage,
  setCover,
  updateAltText,
} from "@/server/actions/media";
import { useConfirmSubmit } from "./ui/confirm-dialog";
import { useFormAction } from "./use-form-action";

export type MediaItem = {
  id: string;
  storage_path: string | null;
  width: number | null;
  alt_text: string;
  is_cover: boolean;
  is_demo: boolean;
};

type UploadStatus =
  | { kind: "idle" }
  | { kind: "working"; text: string }
  | { kind: "error"; text: string }
  | { kind: "done" };

function UploadForm({ propertyId }: { propertyId: string }) {
  const fileId = useId();
  const fileErrorId = `${fileId}-error`;
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<UploadStatus>({ kind: "idle" });
  const [fileError, setFileError] = useState<string>();
  const [altError, setAltError] = useState<string>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    const altText = String(data.get("altText") ?? "").trim();
    const isDemo = data.get("isDemo") === "on";

    setFileError(undefined);
    setAltError(undefined);
    if (!(file instanceof File) || file.size === 0) {
      setFileError("Escolha uma foto.");
      return;
    }
    const invalid = validateImageFile(file);
    if (invalid) {
      setFileError(invalid);
      return;
    }
    if (altText.length < 3) {
      setAltError(
        "Descreva a foto em pelo menos 3 caracteres, ex.: Sala de jantar com mesa redonda.",
      );
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const mediaId = crypto.randomUUID();
    const basePath = `${propertyId}/${mediaId}`;
    const uploaded: string[] = [];

    try {
      setStatus({ kind: "working", text: "Preparando a foto…" });
      const variants = await createWebpVariants(file);

      for (const [index, variant] of variants.entries()) {
        setStatus({ kind: "working", text: `Enviando ${index + 1} de ${variants.length}…` });
        const path = variantPath(basePath, variant.width);
        const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, variant.blob, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw error;
        uploaded.push(path);
      }

      const largest = variants[variants.length - 1]!;
      const result = await registerImage({
        propertyId,
        mediaId,
        width: largest.width,
        height: largest.height,
        altText,
        isDemo,
      });
      if (result.status === "error") {
        if (result.fieldErrors?.altText) setAltError(result.fieldErrors.altText);
        setStatus({ kind: "error", text: result.message ?? "Confira a descrição da foto." });
        return;
      }

      formRef.current?.reset();
      setStatus({ kind: "done" });
    } catch {
      if (uploaded.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(uploaded);
      setStatus({
        kind: "error",
        text: "Não foi possível enviar a foto. Verifique a conexão e tente de novo.",
      });
    }
  }

  const working = status.kind === "working";

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid max-w-xl gap-5 rounded-photo border border-areia p-5"
      noValidate
    >
      <h3 className="font-semibold">Adicionar foto</h3>
      <div className="grid gap-1.5">
        <label htmlFor={fileId} className="text-small font-semibold">
          Foto (JPG, PNG ou WebP)
        </label>
        <input
          id={fileId}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-invalid={fileError ? true : undefined}
          aria-describedby={fileError ? fileErrorId : undefined}
          className="text-body file:mr-3 file:min-h-11 file:rounded-control file:border file:border-petroleo file:bg-branco file:px-4 file:font-semibold file:text-petroleo"
        />
        {fileError ? (
          <p id={fileErrorId} className="text-small text-erro">
            {fileError}
          </p>
        ) : null}
      </div>
      <TextField
        label="Descrição da foto (texto alternativo)"
        name="altText"
        hint="Descreva o que aparece, ex.: Sala de jantar com mesa redonda e espelho."
        error={altError}
      />
      <CheckboxField
        label="Foto ilustrativa (demonstração)"
        name="isDemo"
        hint="Marque se a imagem não for do próprio imóvel. O site exibirá o aviso “Foto ilustrativa”."
      />
      {status.kind === "working" ? <FormMessage tone="success">{status.text}</FormMessage> : null}
      {status.kind === "error" ? <FormMessage tone="error">{status.text}</FormMessage> : null}
      {status.kind === "done" ? <FormMessage tone="success">Foto adicionada.</FormMessage> : null}
      <div>
        <Button type="submit" disabled={working}>
          {working ? "Enviando…" : "Enviar foto"}
        </Button>
      </div>
    </form>
  );
}

function AltTextForm({
  propertyId,
  item,
  position,
}: {
  propertyId: string;
  item: MediaItem;
  position: number;
}) {
  const { state, pending, formProps } = useFormAction(updateAltText);
  return (
    <form {...formProps} className="grid gap-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="mediaId" value={item.id} />
      <TextField
        label={`Descrição da foto ${position}`}
        name="altText"
        defaultValue={item.alt_text}
        error={state.fieldErrors?.altText}
      />
      {state.status === "success" ? (
        <p role="status" className="text-small text-rocha">
          {state.message}
        </p>
      ) : null}
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          Salvar descrição
        </Button>
      </div>
    </form>
  );
}

export function RefForm({
  action,
  propertyId,
  mediaId,
  children,
  confirmMessage,
  extra,
}: {
  action: (formData: FormData) => Promise<void>;
  propertyId: string;
  mediaId: string;
  children: React.ReactNode;
  confirmMessage?: string;
  extra?: Record<string, string>;
}) {
  const confirm = useConfirmSubmit(() => ({
    title: confirmMessage ?? "",
    confirmLabel: "Excluir",
    tone: "danger",
  }));
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (confirmMessage) confirm.intercept(event);
      }}
    >
      {confirmMessage ? confirm.dialog : null}
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="mediaId" value={mediaId} />
      {extra
        ? Object.entries(extra).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      {children}
    </form>
  );
}

export function MediaManager({
  propertyId,
  supabaseUrl,
  items,
}: {
  propertyId: string;
  supabaseUrl: string;
  items: MediaItem[];
}) {
  return (
    <div className="grid min-w-0 gap-8">
      <UploadForm propertyId={propertyId} />

      {items.length === 0 ? (
        <p className="text-rocha">Nenhuma foto ainda. A primeira foto enviada vira a capa.</p>
      ) : (
        <ol className="grid gap-6">
          {items.map((item, index) => {
            const position = index + 1;
            const thumb =
              item.storage_path && item.width
                ? publicMediaUrl(
                    supabaseUrl,
                    variantPath(item.storage_path, variantWidths(item.width)[0]!),
                  )
                : null;
            return (
              <li
                key={item.id}
                className="grid gap-4 rounded-photo border border-areia p-4 sm:grid-cols-[240px_1fr]"
              >
                <div className="grid content-start gap-2">
                  {thumb ? (
                    // Variantes WebP geradas no upload; não usamos otimização de imagem do servidor.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      srcSet={
                        item.storage_path && item.width
                          ? mediaSrcSet(supabaseUrl, item.storage_path, item.width)
                          : undefined
                      }
                      sizes="240px"
                      alt={item.alt_text}
                      className="aspect-[4/3] w-full rounded-photo object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <p className="flex flex-wrap gap-2 text-small">
                    <span className="font-semibold">Foto {position}</span>
                    {item.is_cover ? (
                      <span className="rounded-full bg-petroleo px-2 text-branco">Capa</span>
                    ) : null}
                    {item.is_demo ? (
                      <span className="rounded-full bg-areia px-2">Foto ilustrativa</span>
                    ) : null}
                  </p>
                </div>
                <div className="grid content-start gap-4">
                  <AltTextForm propertyId={propertyId} item={item} position={position} />
                  <div className="flex flex-wrap gap-2">
                    <RefForm
                      action={moveMedia}
                      propertyId={propertyId}
                      mediaId={item.id}
                      extra={{ direction: "up" }}
                    >
                      <Button type="submit" variant="secondary" disabled={index === 0}>
                        Mover para cima<span className="sr-only"> (foto {position})</span>
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
                        Mover para baixo<span className="sr-only"> (foto {position})</span>
                      </Button>
                    </RefForm>
                    {!item.is_cover ? (
                      <RefForm action={setCover} propertyId={propertyId} mediaId={item.id}>
                        <Button type="submit" variant="secondary">
                          Usar como capa<span className="sr-only"> (foto {position})</span>
                        </Button>
                      </RefForm>
                    ) : null}
                    <RefForm
                      action={deleteMedia}
                      propertyId={propertyId}
                      mediaId={item.id}
                      confirmMessage={`Excluir a foto ${position}? Esta ação não pode ser desfeita.`}
                    >
                      <Button type="submit" variant="text" className="text-erro hover:text-erro">
                        Excluir<span className="sr-only"> foto {position}</span>
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
