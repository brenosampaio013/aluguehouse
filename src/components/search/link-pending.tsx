"use client";

import { useLinkStatus } from "next/link";

import { cn } from "@/lib/cn";

/**
 * Indicador dentro de um <Link> enquanto a nova busca carrega (tamanho fixo,
 * só a opacidade muda: sem pular o layout).
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-3 rounded-full border-2 border-current border-t-transparent transition-opacity motion-safe:animate-spin",
        pending ? "opacity-100" : "opacity-0",
      )}
    />
  );
}
