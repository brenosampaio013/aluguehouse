import { Badge } from "@/components/admin/ui/badge";
import { bookingStage, bookingStageLabels, bookingStageTones } from "@/lib/owner/portal";

/** Etapa da reserva para o proprietário (situação do banco + datas). */
export function BookingStageBadge({
  booking,
  today,
}: {
  booking: Parameters<typeof bookingStage>[0];
  today: string;
}) {
  const stage = bookingStage(booking, today);
  return <Badge tone={bookingStageTones[stage]}>{bookingStageLabels[stage]}</Badge>;
}
