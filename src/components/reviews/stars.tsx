import { cn } from "@/lib/cn";

const STAR = "M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z";

export function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className ?? "size-5"}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d={STAR} />
    </svg>
  );
}

/**
 * Nota em estrelas, só para leitura. Com `decorative`, fica oculta para
 * leitores de tela (quando o texto ao lado já diz a nota).
 */
export function Stars({
  rating,
  className,
  decorative = false,
}: {
  rating: number;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : `Nota ${rating} de 5`}
      aria-hidden={decorative || undefined}
      className={cn("inline-flex gap-0.5 text-petroleo", className)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= rating} className="size-4" />
      ))}
    </span>
  );
}
