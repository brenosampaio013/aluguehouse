import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "muted";

const tones: Record<BadgeTone, { box: string; dot: string }> = {
  neutral: { box: "bg-marfim text-abismo border-areia", dot: "bg-rocha" },
  info: { box: "bg-nevoa text-abismo border-nevoa", dot: "bg-petroleo" },
  success: { box: "bg-petroleo text-branco border-petroleo", dot: "bg-branco" },
  warning: { box: "bg-areia text-abismo border-areia", dot: "bg-junco" },
  danger: { box: "bg-branco text-erro border-erro/50", dot: "bg-erro" },
  muted: { box: "bg-branco text-rocha border-rocha/40", dot: "bg-rocha/60" },
};

/** Etiqueta de situação. A cor nunca é o único sinal: o texto sempre aparece. */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-small font-semibold whitespace-nowrap",
        tones[tone].box,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", tones[tone].dot)} />
      {children}
    </span>
  );
}
