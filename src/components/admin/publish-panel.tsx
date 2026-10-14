"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { PublishCheck } from "@/lib/properties/publish";
import type { FormState } from "@/server/actions/auth";
import { changeStatus } from "@/server/actions/properties";
import type { Database } from "@/types/database";

import { FormFeedback } from "./form-feedback";

type Status = Database["public"]["Enums"]["property_status"];

export function PublishPanel({
  propertyId,
  status,
  checks,
}: {
  propertyId: string;
  status: Status;
  checks: PublishCheck[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changeStatus, {
    status: "idle",
  });
  const ready = checks.every((check) => check.ok);

  return (
    <div className="grid gap-5">
      {status !== "published" ? (
        <ul className="grid gap-2" aria-label="Itens para publicar">
          {checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2">
              <span aria-hidden="true" className={check.ok ? "text-petroleo" : "text-erro"}>
                {check.ok ? "✓" : "•"}
              </span>
              <span>
                {check.label}
                <span className="sr-only">{check.ok ? ": concluído" : ": pendente"}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={formAction} className="flex flex-wrap gap-3">
        <input type="hidden" name="id" value={propertyId} />
        {status === "draft" ? (
          <>
            <Button
              type="submit"
              name="action"
              value="publish"
              disabled={pending}
              aria-describedby={ready ? undefined : "publish-hint"}
            >
              Publicar
            </Button>
            <Button
              type="submit"
              name="action"
              value="archive"
              variant="secondary"
              disabled={pending}
            >
              Arquivar
            </Button>
          </>
        ) : null}
        {status === "published" ? (
          <>
            <Button
              type="submit"
              name="action"
              value="unpublish"
              variant="secondary"
              disabled={pending}
            >
              Despublicar
            </Button>
            <Button
              type="submit"
              name="action"
              value="archive"
              variant="secondary"
              disabled={pending}
            >
              Arquivar
            </Button>
          </>
        ) : null}
        {status === "archived" ? (
          <Button
            type="submit"
            name="action"
            value="restore"
            variant="secondary"
            disabled={pending}
          >
            Restaurar como rascunho
          </Button>
        ) : null}
      </form>
      {status === "draft" && !ready ? (
        <p id="publish-hint" className="text-small text-rocha">
          Complete os itens pendentes para publicar.
        </p>
      ) : null}
      <FormFeedback state={state} />
    </div>
  );
}
