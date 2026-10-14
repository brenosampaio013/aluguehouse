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
