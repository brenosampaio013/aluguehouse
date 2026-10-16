import { HouseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { ListingStatus } from "@/lib/properties/listing";

const badges: Record<ListingStatus, { label: string; className: string }> = {
  sale: { label: "CASA À VENDA", className: "bg-petroleo/95" },
  rent: { label: "PARA ALUGAR", className: "bg-abismo/95" },
  sold: { label: "VENDIDO", className: "bg-rocha/95" },
};

/** Selo no canto superior esquerdo da foto (o pai precisa ser `relative`). */
export function ListingBadge({
  status,
  className,
}: {
  status: ListingStatus | null | undefined;
  className?: string;
}) {
  if (!status) return null;
  const badge = badges[status];
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.6875rem] leading-none font-semibold tracking-[0.08em] text-branco shadow-[0_2px_8px_rgb(20_43_58/0.25)] sm:px-2.5 sm:py-1.5 sm:text-small sm:leading-none",
        badge.className,
        className,
      )}
    >
      <HouseIcon width={13} height={13} className="shrink-0" />
      {badge.label}
    </span>
  );
}
