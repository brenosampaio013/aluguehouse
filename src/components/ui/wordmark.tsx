import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/cn";

/** Logotipo provisório tipográfico (Etapa 2). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-serif font-medium tracking-[-0.01em] whitespace-nowrap", className)}>
      {siteConfig.name}
    </span>
  );
}

/**
 * Símbolo da marca: três ondas (mar, espuma e areia), em vetor. Decorativo;
 * o nome da marca vem sempre ao lado, em texto.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      fill="none"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M14 15.5c7-6.5 15.5-8.5 24-7 6 1 11 4 15.5 7.5" stroke="#9cbcc0" strokeWidth="2.6" />
      <path
        d="M3 25c9.5-8.5 21-11.5 33-9.5 8 1.3 14.5 4.6 25 5.8"
        stroke="var(--color-petroleo)"
        strokeWidth="4.2"
      />
      <path
        d="M11 32.5c8.5-4 17.5-5 25.5-3.2 6 1.3 10.5 3 17.5 2.7"
        stroke="var(--color-dourado)"
        strokeWidth="2.8"
      />
    </svg>
  );
}
