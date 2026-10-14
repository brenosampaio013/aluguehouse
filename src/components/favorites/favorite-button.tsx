"use client";

import { HeartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

import { useFavorites } from "./favorites-provider";

/**
 * Coração para salvar um imóvel. Sem login, leva para "Entrar" e volta para
 * a mesma página depois do link por e-mail.
 */
export function FavoriteButton({
  propertyId,
  title,
  variant = "card",
  className,
}: {
  propertyId: string;
  title: string;
  /** "card": círculo sobre a foto; "page": botão com texto. */
  variant?: "card" | "page";
  className?: string;
}) {
  const { signedIn, isSaved, toggle } = useFavorites();
  const saved = isSaved(propertyId);
  const label = signedIn
    ? `Salvar ${title} nos favoritos`
    : `Salvar ${title} nos favoritos (é preciso entrar)`;

  return (
    <button
      type="button"
      aria-pressed={signedIn ? saved : undefined}
      aria-label={variant === "card" ? label : undefined}
      onClick={() => toggle(propertyId, title)}
      className={cn(
        variant === "card"
          ? "grid size-11 place-items-center rounded-full bg-branco/95 text-abismo shadow-sm hover:bg-branco"
          : "inline-flex min-h-11 items-center gap-2 rounded-control px-3 font-semibold text-petroleo hover:bg-areia",
        className,
      )}
    >
      <HeartIcon
        width={variant === "card" ? 22 : 20}
        height={variant === "card" ? 22 : 20}
        fill={saved ? "currentColor" : "none"}
        className={saved ? "text-petroleo" : undefined}
      />
      {variant === "page" ? (
        <>
          <span aria-hidden="true">{saved ? "Salvo" : "Salvar"}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : null}
    </button>
  );
}
