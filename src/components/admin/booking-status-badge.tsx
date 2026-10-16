import { bookingStatusLabels, type BookingStatus } from "@/lib/booking/labels";

import { Badge, type BadgeTone } from "./ui/badge";

const tones: Record<BookingStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  declined: "muted",
  cancelled: "muted",
  expired: "muted",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={tones[status]}>{bookingStatusLabels[status]}</Badge>;
}
