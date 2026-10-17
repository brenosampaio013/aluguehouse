import { dayStateStyles } from "@/components/owner/occupancy-strip";
import { monthWeeks } from "@/lib/booking/calendar";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { dayInfo, type CalendarBlock, type SeasonalRate } from "@/lib/owner/portal";

const shortLabels = { booking: "Reservado", owner: "Uso próprio", maintenance: "Manutenção" };

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const weekdaysLong = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/**
 * Mês do calendário de um imóvel: cada dia mostra a situação da noite
 * (livre, reservada, uso do proprietário, manutenção ou pedido pendente),
 * a tarifa daquela noite e a estadia mínima quando a temporada exige mais
 * que a regra do imóvel.
 */
export function MonthCalendar({
  firstDay,
  monthLabel,
  today,
  blocks,
  pendingStays,
  rates,
  basePrice,
  baseMinNights,
}: {
  firstDay: string;
  monthLabel: string;
  today: string;
  blocks: Pick<CalendarBlock, "start_date" | "end_date" | "kind">[];
  pendingStays: { check_in: string; check_out: string }[];
  rates: SeasonalRate[];
  basePrice: number | null;
  baseMinNights: number;
}) {
  const weeks = monthWeeks(firstDay);
  return (
    // Rola na horizontal em telas estreitas: focável para quem usa o teclado.
    <div
      role="region"
      aria-label={`Calendário de ${monthLabel}`}
      tabIndex={0}
      className="relative overflow-x-auto rounded-control"
    >
      <table className="w-full min-w-[36rem] table-fixed border-separate border-spacing-1">
        <caption className="sr-only">Calendário de {monthLabel}</caption>
        <thead>
          <tr>
            {weekdays.map((day, i) => (
              <th key={day} scope="col" className="pb-1 text-small font-semibold text-rocha">
                <abbr title={weekdaysLong[i]} className="no-underline">
                  {day}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.find(Boolean) ?? "vazio"}>
              {week.map((date, i) => {
                if (!date) return <td key={`vazio-${i}`} aria-hidden="true" />;
                const info = dayInfo(date, {
                  blocks,
                  pendingStays,
                  rates,
                  basePrice,
                  baseMinNights,
                });
                const style = dayStateStyles[info.state];
                const dark = info.state === "booking" || info.state === "maintenance";
                return (
                  <td
                    key={date}
                    data-dia={date}
                    data-situacao={info.state}
                    className={cn(
                      "h-20 rounded-control border p-1.5 align-top",
                      style.cell,
                      info.pending && "border-dashed border-junco bg-areia",
                      dark ? "text-branco" : "text-abismo",
                    )}
                  >
                    <div className="flex h-full flex-col justify-between gap-1">
                      <span
                        className={cn(
                          "text-small font-semibold tabular-nums",
                          date === today &&
                            "rounded-full underline decoration-2 underline-offset-4",
                        )}
                      >
                        {Number(date.slice(8))}
                        {date === today ? <span className="sr-only"> (hoje)</span> : null}
                      </span>
                      <span className="grid text-[0.75rem] leading-tight">
                        {info.state === "free" ? (
                          <span className="sr-only">
                            {style.label}
                            {info.pending ? ", com pedido aguardando aprovação" : ""}.{" "}
                          </span>
                        ) : (
                          <span className="font-semibold">{shortLabels[info.state]}</span>
                        )}
                        {info.state === "free" && info.price !== null ? (
                          <span className="tabular-nums">
                            {formatPrice(info.price)}
                            <span className="sr-only"> por noite</span>
                            {info.rateLabel ? (
                              <span className="sr-only"> ({info.rateLabel})</span>
                            ) : null}
                          </span>
                        ) : null}
                        {info.state === "free" && info.minNights > baseMinNights ? (
                          <span>
                            mín. {info.minNights}
                            <span className="sr-only"> noites</span>
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
