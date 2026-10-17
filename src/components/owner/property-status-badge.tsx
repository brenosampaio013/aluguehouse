import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import { propertyStatusLabels } from "@/lib/properties/labels";

const tones: Record<keyof typeof propertyStatusLabels, BadgeTone> = {
  published: "success",
  draft: "warning",
  archived: "muted",
};

/** Situação do anúncio no site (publicado, rascunho ou arquivado). */
export function PropertyStatusBadge({ status }: { status: keyof typeof propertyStatusLabels }) {
  return <Badge tone={tones[status]}>{propertyStatusLabels[status]}</Badge>;
}
