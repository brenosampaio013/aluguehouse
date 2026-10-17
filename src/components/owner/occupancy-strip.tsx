import { addDaysISO, formatDateISO } from "@/lib/format";
import { occupancy, plural, type CalendarBlock, type DayState } from "@/lib/owner/portal";
import { cn } from "@/lib/cn";

export const dayStateStyles: Record<DayState, { cell: string; label: string }> = {
  free: { cell: "bg-marfim border-areia", label: "Livre" },
  booking: { cell: "bg-petroleo border-petroleo", label: "Reservado" },
  owner: { cell: "bg-dourado border-dourado", label: "Uso do proprietário" },
  maintenance: { cell: "bg-rocha border-rocha", label: "Manutenção" },
};

/**
 * Faixa de ocupação dos próximos dias de um imóvel: um traço por noite e o
 * resumo em texto (o desenho é só apoio visual).
 */
export function OccupancyStrip({
  blocks,
  from,
  days,
}: {
  blocks: Pick<CalendarBlock, "start_date" | "end_date" | "kind">[];
  from: string;
  days: number;
}) {
  const summary = occupancy(blocks, from, days);
  const cells = Array.from({ length: days }, (_, i) => {
    const date = addDaysISO(from, i);
    const block = blocks.find((b) => b.start_date <= date && date < b.end_date);
    return { date, state: (block?.kind ?? "free") as DayState };
  });
  return (
    <div className="grid gap-2">
      <div aria-hidden="true" className="flex gap-px">
        {cells.map((cell) => (
          <span
            key={cell.date}
            title={`${formatDateISO(cell.date)}: ${dayStateStyles[cell.state].label}`}
            className={cn(
              "h-6 min-w-0 flex-1 rounded-[2px] border",
              dayStateStyles[cell.state].cell,
            )}
          />
        ))}
      </div>
      <p className="text-small text-rocha">
        Próximas {plural(days, "noite", "noites")}: {summary.booking} reservadas, {summary.owner} de
        uso próprio, {summary.maintenance} em manutenção e {summary.free} livres.
      </p>
    </div>
  );
}

/** Legenda das cores do calendário. */
export function DayStateLegend({ withPending = false }: { withPending?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-small text-rocha">
      {(Object.keys(dayStateStyles) as DayState[]).map((state) => (
        <li key={state} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn("size-3.5 rounded-[3px] border", dayStateStyles[state].cell)}
          />
          {dayStateStyles[state].label}
        </li>
      ))}
      {withPending ? (
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3.5 rounded-[3px] border border-dashed border-junco bg-areia"
          />
          Pedido aguardando aprovação
        </li>
      ) : null}
    </ul>
  );
}
