import { bookingStatusLabels, type BookingStatus } from "@/lib/booking/labels";
import { cn } from "@/lib/cn";

const styles: Record<BookingStatus, string> = {
  pending: "bg-areia text-abismo",
  approved: "bg-petroleo text-branco",
  declined: "border border-rocha bg-branco text-rocha",
  cancelled: "border border-rocha bg-branco text-rocha",
  expired: "border border-rocha bg-branco text-rocha",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-small font-semibold whitespace-nowrap",
        styles[status],
      )}
    >
      {bookingStatusLabels[status]}
    </span>
  );
}
