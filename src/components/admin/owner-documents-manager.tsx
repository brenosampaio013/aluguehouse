"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import {
  OWNER_DOCS_BUCKET,
  ownerDocCategoryLabels,
  safeFileName,
  validateOwnerDocFile,
  type OwnerDocCategory,
} from "@/lib/owner/documents";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { deleteOwnerDocument, registerOwnerDocument } from "@/server/actions/owner-documents";

import { RemoveRowButton } from "./remove-row-button";

type Doc = {
  id: string;
  title: string;
  category: OwnerDocCategory;
  createdAt: string;
  sizeBytes: number;
};

const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function size(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Documentos privados do imóvel para os proprietários (contratos,
 * relatórios, vistorias). O arquivo vai do navegador direto ao bucket
 * privado; o servidor confere e registra. Ninguém abre por URL pública.
 */
export function OwnerDocumentsManager({
  propertyId,
  documents,
}: {
  propertyId: string;
  documents: Doc[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "working" }
    | { kind: "error"; text: string }
    | { kind: "done"; text: string }
  >({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "other") as OwnerDocCategory;
    const nextErrors: Record<string, string> = {};
    if (!(file instanceof File) || file.size === 0) nextErrors.file = "Escolha o arquivo.";
    else {
      const invalid = validateOwnerDocFile(file);
      if (invalid) nextErrors.file = invalid;
    }
    if (title.length < 3) nextErrors.title = "Dê um título com pelo menos 3 caracteres.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !(file instanceof File)) return;

    setStatus({ kind: "working" });
    const supabase = createSupabaseBrowserClient();
    const documentId = crypto.randomUUID();
    const fileName = safeFileName(file.name);
    const path = `${propertyId}/${documentId}/${fileName}`;
    const { error } = await supabase.storage
      .from(OWNER_DOCS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setStatus({
        kind: "error",
        text: "Não foi possível enviar o arquivo. Verifique a conexão e tente de novo.",
      });
      return;
    }
    const result = await registerOwnerDocument({
      propertyId,
      documentId,
      fileName,
      title,
      category,
    });
    if (result.status === "error") {
      setErrors(result.fieldErrors ?? {});
      setStatus({ kind: "error", text: result.message ?? "Confira os campos." });
      return;
    }
    formRef.current?.reset();
    setStatus({ kind: "done", text: result.message ?? "Documento enviado." });
  }

  return (
    <div className="grid gap-6">
      {documents.length === 0 ? (
        <p className="text-rocha">
          Nenhum documento disponível para os proprietários deste imóvel.
        </p>
      ) : (
        <ul className="divide-y divide-areia rounded-control border border-areia">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block font-semibold break-words">{doc.title}</span>
                <span className="block text-small text-rocha">
                  {ownerDocCategoryLabels[doc.category]} · {size(doc.sizeBytes)} ·{" "}
                  {date.format(new Date(doc.createdAt))}
                </span>
              </span>
              <RemoveRowButton
                action={deleteOwnerDocument}
                fields={{ id: doc.id, propertyId }}
                label={doc.title}
                confirmTitle={`Excluir “${doc.title}”? Os proprietários deixam de ver o arquivo.`}
                verb="Excluir"
                pendingVerb="Excluindo…"
              />
            </li>
          ))}
        </ul>
      )}
      <form ref={formRef} onSubmit={onSubmit} noValidate className="grid max-w-xl gap-4">
        <TextField
          label="Título"
          name="title"
          maxLength={120}
          hint="Ex.: Contrato de administração 2026."
          error={errors.title}
        />
        <SelectField
          label="Tipo"
          name="category"
          defaultValue="contract"
          options={Object.entries(ownerDocCategoryLabels).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <TextField
          label="Arquivo (PDF ou imagem, até 10 MB)"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          error={errors.file}
        />
        {status.kind === "error" ? <FormMessage tone="error">{status.text}</FormMessage> : null}
        {status.kind === "done" ? <FormMessage tone="success">{status.text}</FormMessage> : null}
        <div>
          <Button type="submit" disabled={status.kind === "working"}>
            {status.kind === "working" ? "Enviando…" : "Enviar documento"}
          </Button>
        </div>
      </form>
    </div>
  );
}
