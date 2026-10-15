"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";

import {
  canCheckIn,
  canCheckOut,
  monthStart,
  monthsBetween,
  monthWeeks,
  nightsBetween,
  type StayLimits,
} from "@/lib/booking/calendar";
import { cn } from "@/lib/cn";
import { addDaysISO } from "@/lib/format";

/**
 * Calendário de período da busca: escolhe check-in e check-out, sem datas
 * ocupadas (a disponibilidade de cada imóvel aparece na listagem e na página
 * do imóvel). Dois meses a partir de 768 px, um no celular.
 */

const WEEKDAYS = [
  ["D", "domingo"],
  ["S", "segunda-feira"],
  ["T", "terça-feira"],
  ["Q", "quarta-feira"],
  ["Q", "quinta-feira"],
  ["S", "sexta-feira"],
  ["S", "sábado"],
] as const;

const dayLabel = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthLabel = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function utc(date: string) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

/** Mesmo dia no mês anterior ou seguinte (ajusta para o último dia do mês). */
function sameDayInMonth(date: string, delta: number) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const lastDay = new Date(Date.UTC(y, m - 1 + delta + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + delta, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

const WIDE_QUERY = "(min-width: 768px)";
function subscribeWide(callback: () => void) {
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

type Props = {
  today: string;
  /** Primeiro dia fora da janela (exclusivo). */
  lastDate: string;
  limits: StayLimits;
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  /** Qual data o próximo clique escolhe (o campo que abriu o calendário). */
  target: "checkIn" | "checkOut";
  /** Leva o foco para o calendário ao abrir. */
  autoFocus?: boolean;
};

export function RangeCalendar({
  today,
  lastDate,
  limits,
  checkIn,
  checkOut,
  onChange,
  target,
  autoFocus = false,
}: Props) {
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
  const visibleMonths = wide ? 2 : 1;
  const maxOffset = monthsBetween(today, addDaysISO(lastDate, -1));

  const [focusDate, setFocusDate] = useState(
    (target === "checkOut" ? (checkOut ?? checkIn) : checkIn) ?? today,
  );
  const [viewOffset, setViewOffset] = useState(() =>
    Math.min(Math.max(0, monthsBetween(today, checkIn ?? today)), maxOffset),
  );
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(autoFocus);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
  }, [focusDate, viewOffset]);

  const pickingCheckOut = checkIn !== null && (checkOut === null || target === "checkOut");
  const firstVisible = monthStart(today, viewOffset);
  const lastVisibleExclusive = monthStart(today, viewOffset + visibleMonths);

  function isValidCheckOut(date: string) {
    return checkIn !== null && pickingCheckOut && canCheckOut(checkIn, date, lastDate, limits, []);
  }

  // Escolhendo o check-out, as datas depois do check-in valem só como saída
  // (respeitando os limites da modalidade); as anteriores trocam o check-in.
  function isSelectable(date: string) {
    if (checkIn !== null && pickingCheckOut && date > checkIn) return isValidCheckOut(date);
    return canCheckIn(date, today, lastDate, []);
  }

  function choose(date: string) {
    if (!isSelectable(date)) return;
    if (isValidCheckOut(date)) onChange(checkIn, date);
    else onChange(date, null);
  }

  function goToMonth(offset: number) {
    setViewOffset(Math.min(Math.max(offset, 0), Math.max(0, maxOffset - visibleMonths + 1)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, () => string> = {
      ArrowLeft: () => addDaysISO(focusDate, -1),
      ArrowRight: () => addDaysISO(focusDate, 1),
      ArrowUp: () => addDaysISO(focusDate, -7),
      ArrowDown: () => addDaysISO(focusDate, 7),
      Home: () => addDaysISO(focusDate, -utc(focusDate).getUTCDay()),
      End: () => addDaysISO(focusDate, 6 - utc(focusDate).getUTCDay()),
      PageUp: () => sameDayInMonth(focusDate, -1),
      PageDown: () => sameDayInMonth(focusDate, 1),
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    const minDate = monthStart(today);
    const maxDate = addDaysISO(lastDate, -1);
    let next = step();
    if (next < minDate) next = minDate;
    if (next > maxDate) next = maxDate;
    const offset = monthsBetween(today, next);
    if (offset < viewOffset) setViewOffset(offset);
    else if (offset >= viewOffset + visibleMonths) setViewOffset(offset - visibleMonths + 1);
    moveFocus.current = true;
    setFocusDate(next);
    if (pickingCheckOut) setHoverDate(next);
  }

  const tabbableDate =
    focusDate >= firstVisible && focusDate < lastVisibleExclusive ? focusDate : firstVisible;
  // Prévia do período enquanto escolhe o check-out (mouse ou teclado).
  const preview = hoverDate && isValidCheckOut(hoverDate) ? hoverDate : null;
  const rangeEnd = preview ?? checkOut;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goToMonth(viewOffset - visibleMonths)}
          disabled={viewOffset === 0}
          aria-label="Mês anterior"
          className="inline-flex size-11 items-center justify-center rounded-full border border-junco text-h3 text-abismo hover:bg-areia disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          onClick={() => goToMonth(viewOffset + visibleMonths)}
          disabled={viewOffset + visibleMonths > maxOffset}
          aria-label="Próximo mês"
          className="inline-flex size-11 items-center justify-center rounded-full border border-junco text-h3 text-abismo hover:bg-areia disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div
        ref={gridRef}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHoverDate(null)}
        className="grid gap-8 md:grid-cols-2"
      >
        {Array.from({ length: visibleMonths }, (_, index) => {
          const first = monthStart(today, viewOffset + index);
          const label = monthLabel.format(utc(first));
          const captionId = `busca-mes-${first}`;
          return (
            <table key={first} aria-labelledby={captionId} className="w-full border-collapse">
              <caption id={captionId} className="pb-3 text-center font-semibold">
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </caption>
              <thead>
                <tr>
                  {WEEKDAYS.map(([short, long]) => (
                    <th
                      key={long}
                      scope="col"
                      abbr={long}
                      className="pb-1 text-center text-small font-semibold text-rocha"
                    >
                      {short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthWeeks(first).map((week, w) => (
                  <tr key={w}>
                    {week.map((date, d) => {
                      if (!date) return <td key={d} />;
                      const selectable = isSelectable(date);
                      const isStart = date === checkIn;
                      const isEnd = date === checkOut;
                      const inRange =
                        checkIn !== null && rangeEnd !== null && date > checkIn && date < rangeEnd;
                      const status = [
                        isStart ? "check-in" : null,
                        isEnd ? "check-out" : null,
                        !selectable && !isStart && !isEnd ? "indisponível" : null,
                      ]
                        .filter(Boolean)
                        .join(", ");
                      return (
                        <td key={d} className={cn("p-0.5", inRange && "bg-nevoa")}>
                          <button
                            type="button"
                            data-date={date}
                            tabIndex={date === tabbableDate ? 0 : -1}
                            aria-label={`${dayLabel.format(utc(date))}${status ? `, ${status}` : ""}`}
                            aria-pressed={isStart || isEnd}
                            aria-disabled={!selectable && !isStart}
                            aria-current={date === today ? "date" : undefined}
                            onMouseEnter={() => setHoverDate(date)}
                            onClick={() => {
                              setFocusDate(date);
                              choose(date);
                            }}
                            className={cn(
                              "grid size-10 w-full place-items-center rounded-full tabular-nums",
                              selectable && "hover:ring-1 hover:ring-abismo",
                              !selectable && !isStart && "cursor-not-allowed text-rocha/60",
                              date === today && "font-bold underline underline-offset-4",
                              (isStart || isEnd) && "bg-petroleo font-semibold text-marfim",
                              date === rangeEnd && !isEnd && "ring-1 ring-petroleo",
                            )}
                          >
                            {Number(date.slice(8))}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
    </div>
  );
}

export function nightsLabel(checkIn: string, checkOut: string) {
  const nights = nightsBetween(checkIn, checkOut);
  return `${nights} ${nights === 1 ? "noite" : "noites"}`;
}
