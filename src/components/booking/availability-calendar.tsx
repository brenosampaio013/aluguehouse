"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type KeyboardEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import {
  canCheckIn,
  canCheckOut,
  isNightBlocked,
  monthStart,
  monthsBetween,
  monthWeeks,
  nightsBetween,
  type BlockedRange,
  type StayLimits,
} from "@/lib/booking/calendar";
import { cn } from "@/lib/cn";
import { addDaysISO, formatDateISO } from "@/lib/format";

type Props = {
  /** Hoje no fuso de São Paulo (AAAA-MM-DD), calculado no servidor. */
  today: string;
  /** Primeiro dia fora da janela de reserva (exclusivo). */
  lastDate: string;
  blocked: BlockedRange[];
  limits: StayLimits;
  maxGuests: number;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
};

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

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function subscribeNothing() {
  return () => {};
}

// Dois meses lado a lado a partir de 768 px; um mês no celular.
const WIDE_QUERY = "(min-width: 768px)";
function subscribeWide(callback: () => void) {
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function AvailabilityCalendar({
  today,
  lastDate,
  blocked,
  limits,
  maxGuests,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
  const visibleMonths = wide ? 2 : 1;
  // false no HTML do servidor, true depois da hidratação (usado pelos testes).
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  const [checkIn, setCheckIn] = useState<string | null>(initialCheckIn ?? null);
  const [checkOut, setCheckOut] = useState<string | null>(initialCheckOut ?? null);
  const [guests, setGuests] = useState(Math.min(Math.max(initialGuests, 1), maxGuests));
  const [focusDate, setFocusDate] = useState(initialCheckIn ?? today);
  const [viewOffset, setViewOffset] = useState(() =>
    Math.max(0, monthsBetween(today, initialCheckIn ?? today)),
  );
  const [announcement, setAnnouncement] = useState("");

  const gridRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  const maxOffset = monthsBetween(today, addDaysISO(lastDate, -1));
  const firstVisible = monthStart(today, viewOffset);
  const lastVisibleExclusive = monthStart(today, viewOffset + visibleMonths);
  const pickingCheckOut = checkIn !== null && checkOut === null;

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
  }, [focusDate, viewOffset]);

  function commit(nextCheckIn: string | null, nextCheckOut: string | null, nextGuests: number) {
    const params = new URLSearchParams();
    if (nextCheckIn && nextCheckOut) {
      params.set("chegada", nextCheckIn);
      params.set("saida", nextCheckOut);
      params.set("hospedes", String(nextGuests));
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function isSelectable(date: string) {
    if (pickingCheckOut && canCheckOut(checkIn, date, lastDate, limits, blocked)) return true;
    return canCheckIn(date, today, lastDate, blocked);
  }

  function choose(date: string) {
    if (pickingCheckOut && date === checkIn) {
      setCheckIn(null);
      setAnnouncement("Chegada removida. Escolha a data de chegada.");
      return;
    }
    if (pickingCheckOut && canCheckOut(checkIn, date, lastDate, limits, blocked)) {
      setCheckOut(date);
      const nights = nightsBetween(checkIn, date);
      setAnnouncement(
        `Saída em ${formatDateISO(date)}, ${plural(nights, "noite", "noites")}. Calculando o valor.`,
      );
      commit(checkIn, date, guests);
      return;
    }
    if (canCheckIn(date, today, lastDate, blocked)) {
      setCheckIn(date);
      setCheckOut(null);
      setAnnouncement(`Chegada em ${formatDateISO(date)}. Agora escolha a data de saída.`);
    }
  }

  function clear() {
    setCheckIn(null);
    setCheckOut(null);
    setAnnouncement("Datas removidas.");
    commit(null, null, guests);
  }

  function changeGuests(value: number) {
    setGuests(value);
    if (checkIn && checkOut) commit(checkIn, checkOut, value);
  }

  function goToMonth(offset: number) {
    const next = Math.min(Math.max(offset, 0), Math.max(0, maxOffset - visibleMonths + 1));
    setViewOffset(next);
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
  }

  // Só um dia do calendário entra na ordem do Tab; as setas percorrem os demais.
  const tabbableDate =
    focusDate >= firstVisible && focusDate < lastVisibleExclusive ? focusDate : firstVisible;

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : null;
  const guestOptions = Array.from({ length: maxGuests }, (_, i) => ({
    value: String(i + 1),
    label: plural(i + 1, "hóspede", "hóspedes"),
  }));

  return (
    <div className="grid gap-5" data-calendar-ready={hydrated}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-rocha">
          {limits.minNights > 1 ? `Mínimo de ${limits.minNights} noites. ` : ""}
          {pickingCheckOut
            ? "Escolha a data de saída."
            : checkIn && checkOut
              ? "Para mudar, escolha uma nova chegada."
              : "Escolha a data de chegada."}
        </p>
        <SelectField
          label="Hóspedes"
          options={guestOptions}
          value={String(guests)}
          onChange={(event) => changeGuests(Number(event.target.value))}
          className="w-44"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          className="px-3"
          onClick={() => goToMonth(viewOffset - visibleMonths)}
          disabled={viewOffset === 0}
          aria-label="Mês anterior"
        >
          <span aria-hidden="true">‹</span>
        </Button>
        <Button
          variant="secondary"
          className="px-3"
          onClick={() => goToMonth(viewOffset + visibleMonths)}
          disabled={viewOffset + visibleMonths > maxOffset}
          aria-label="Próximo mês"
        >
          <span aria-hidden="true">›</span>
        </Button>
      </div>

      <div ref={gridRef} onKeyDown={onKeyDown} className="grid gap-8 md:grid-cols-2">
        {Array.from({ length: visibleMonths }, (_, index) => {
          const first = monthStart(today, viewOffset + index);
          const label = monthLabel.format(utc(first));
          const title = label.charAt(0).toUpperCase() + label.slice(1);
          const captionId = `mes-${first}`;
          return (
            <table key={first} aria-labelledby={captionId} className="w-full border-collapse">
              <caption id={captionId} className="pb-3 text-left font-semibold">
                {title}
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
                      const occupied = date >= today && isNightBlocked(date, blocked);
                      const isStart = date === checkIn;
                      const isEnd = date === checkOut;
                      const inRange = checkIn && checkOut && date > checkIn && date < checkOut;
                      const status = [
                        isStart ? "chegada" : null,
                        isEnd ? "saída" : null,
                        !selectable && !isStart && !isEnd
                          ? occupied
                            ? "ocupado"
                            : "indisponível"
                          : null,
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
                            onClick={() => {
                              setFocusDate(date);
                              choose(date);
                            }}
                            className={cn(
                              "grid size-11 w-full place-items-center rounded-control tabular-nums",
                              selectable && "hover:bg-nevoa",
                              !selectable && !isStart && "cursor-not-allowed text-rocha/70",
                              occupied && !isStart && "line-through",
                              date === today && "font-semibold underline underline-offset-4",
                              (isStart || isEnd) && "bg-petroleo font-semibold text-branco",
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

      <p className="text-small text-rocha">
        Datas riscadas estão ocupadas. Use as setas do teclado para percorrer os dias.
      </p>

      <p role="status" aria-live="polite" className="sr-only">
        {isPending ? "Atualizando o valor…" : announcement}
      </p>

      {checkIn ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-photo border border-areia p-4">
          <p className="tabular-nums">
            <span className="font-semibold">Chegada</span> {formatDateISO(checkIn)}
            {checkOut ? (
              <>
                {" · "}
                <span className="font-semibold">Saída</span> {formatDateISO(checkOut)}
                {nights ? ` · ${plural(nights, "noite", "noites")}` : null}
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-3">
            {checkOut ? (
              <a
                href="#valores"
                className={cn(
                  "inline-flex min-h-11 items-center text-petroleo underline underline-offset-3 hover:text-abismo",
                  isPending && "opacity-60",
                )}
              >
                Ver valor e solicitar reserva
              </a>
            ) : null}
            <Button variant="text" onClick={clear}>
              Limpar datas
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Mesmo dia no mês anterior ou seguinte (ajusta para o último dia do mês). */
function sameDayInMonth(date: string, delta: number) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const lastDay = new Date(Date.UTC(y, m - 1 + delta + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + delta, Math.min(d, lastDay))).toISOString().slice(0, 10);
}
