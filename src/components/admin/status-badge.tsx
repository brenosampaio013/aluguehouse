import { propertyStatusLabels } from "@/lib/properties/labels";
import type { Database } from "@/types/database";

import { Badge, type BadgeTone } from "./ui/badge";

type Status = Database["public"]["Enums"]["property_status"];

const tones: Record<Status, BadgeTone> = {
  draft: "warning",
  published: "success",
  archived: "muted",
};

export function StatusBadge({ status }: { status: Status }) {
  return <Badge tone={tones[status]}>{propertyStatusLabels[status]}</Badge>;
}
