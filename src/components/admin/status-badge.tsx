import { cn } from "@/lib/cn";
import { propertyStatusLabels } from "@/lib/properties/labels";
import type { Database } from "@/types/database";

type Status = Database["public"]["Enums"]["property_status"];

const styles: Record<Status, string> = {
  draft: "bg-areia text-abismo",
  published: "bg-petroleo text-branco",
  archived: "border border-rocha bg-branco text-rocha",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn("inline-flex rounded-full px-3 py-1 text-small font-semibold", styles[status])}
    >
      {propertyStatusLabels[status]}
    </span>
  );
}
