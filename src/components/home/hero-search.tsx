"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type Ref,
} from "react";

import { nightsLabel, RangeCalendar } from "@/components/search/range-calendar";
import { SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { addDaysISO } from "@/lib/format";
import { propertyTypeLabels } from "@/lib/properties/labels";
import {
  buildSearch,
  destinationName,
  guestsSummary,
  matchDestinations,
  modeStayLimits,
  pickDestination,
  SEARCH_WINDOW_DAYS,
  searchModes,
  stepGuests,
  type Guests,
  type SearchMode,
} from "@/lib/search/home-search";

const salePrices = [
  { value: "", label: "Qualquer valor" },
  { value: "1000000", label: "Até R$ 1 milhão" },
  { value: "2000000", label: "Até R$ 2 milhões" },
  { value: "3500000", label: "Até R$ 3,5 milhões" },
  { value: "5000000", label: "Até R$ 5 milhões" },
];

const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function formatShort(date: string) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return shortDate.format(new Date(Date.UTC(y, m - 1, d)));
}

type Panel = "onde" | "datas" | "quem" | null;

// Segmentos da barra: empilhados no celular, lado a lado a partir de 768 px.
const segment =
  "grid min-w-0 gap-0.5 rounded-[1.5rem] px-5 py-2.5 text-left transition-colors hover:bg-areia/60 focus-within:bg-nevoa md:rounded-full";
const segmentLabel = "text-small font-bold text-abismo";
const segmentValue = "truncate text-body text-abismo";
const placeholder = "text-rocha";
// Painéis: no celular ficam no fluxo, logo abaixo do campo (nunca cortados);
// no computador flutuam sob a barra.
const panelBase =
  "z-30 mt-2 rounded-[1.5rem] border border-abismo/10 bg-branco p-5 text-abismo shadow-flutuante md:absolute md:top-full md:mt-3";

/**
 * Busca da página inicial, inspirada no Airbnb: destino com sugestões,
 * calendário de período e hóspedes. Envia para /temporada, /mensal ou /venda
 * com os mesmos parâmetros que as listagens já entendem.
 */
export function HeroSearch({ today, maxGuests }: { today: string; maxGuests: number }) {
  const router = useRouter();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const whereRef = useRef<HTMLInputElement>(null);
  const checkInRef = useRef<HTMLButtonElement>(null);
  const checkOutRef = useRef<HTMLButtonElement>(null);
  const whoRef = useRef<HTMLButtonElement>(null);

  const [mode, setMode] = useState<SearchMode>("temporada");
  const [expanded, setExpanded] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string>();

  const [region, setRegion] = useState<string>();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [dateTarget, setDateTarget] = useState<"checkIn" | "checkOut">("checkIn");
  const [focusCalendar, setFocusCalendar] = useState(false);

  const [guests, setGuests] = useState<Guests>({ adults: 0, children: 0 });
  const [saleType, setSaleType] = useState("");
  const [salePrice, setSalePrice] = useState("");

  const lastDate = addDaysISO(today, SEARCH_WINDOW_DAYS);
  const renting = mode !== "venda";
  const limits = renting ? modeStayLimits[mode] : modeStayLimits.temporada;
  const suggestions = matchDestinations(region ? "" : query);
  const options = [{ slug: undefined, name: "Todos os destinos", caption: "" }, ...suggestions];

  // Fecha o painel aberto ao clicar fora da busca.
  useEffect(() => {
    if (!panel) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setPanel(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [panel]);

  // Campo que abriu o painel: recebe o foco de volta ao fechar com Esc.
  const openerRef = useRef<HTMLElement | null>(null);

  function closePanel(returnFocus: boolean) {
    setPanel(null);
    if (returnFocus) openerRef.current?.focus();
  }

  function onRootKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && panel) {
      event.preventDefault();
      closePanel(true);
    }
  }

  function openDates(target: "checkIn" | "checkOut", viaKeyboard: boolean) {
    openerRef.current = target === "checkOut" ? checkOutRef.current : checkInRef.current;
    setDateTarget(target === "checkOut" && !checkIn ? "checkIn" : target);
    setFocusCalendar(viaKeyboard);
    setPanel((current) => (current === "datas" && dateTarget === target ? null : "datas"));
  }

  function openWhere() {
    openerRef.current = whereRef.current;
    setPanel("onde");
  }

  function selectDestination(slug: string | undefined) {
    setRegion(slug);
    setQuery(destinationName(slug) ?? "");
    setActiveIndex(-1);
    setPanel(null);
    setError(undefined);
  }

  function onWhereKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openWhere();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + delta + options.length) % options.length);
    } else if (event.key === "Enter" && panel === "onde" && activeIndex >= 0) {
      event.preventDefault();
      selectDestination(options[activeIndex]!.slug);
    }
  }

  function onDatesChange(nextIn: string | null, nextOut: string | null) {
    setCheckIn(nextIn);
    setCheckOut(nextOut);
    setDateTarget(nextIn && !nextOut ? "checkOut" : dateTarget);
    setError(undefined);
  }

  function clearDates() {
    setCheckIn(null);
    setCheckOut(null);
    setDateTarget("checkIn");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let chosen = region;
    if (!chosen && query.trim()) {
      const match = pickDestination(query);
      if (!match) {
        setError("Escolha um destino da lista.");
        openWhere();
        whereRef.current?.focus();
        return;
      }
      chosen = match.slug;
    }
    const result = buildSearch(
      { mode, destination: chosen, checkIn, checkOut, guests, saleType, salePriceMax: salePrice },
      today,
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(undefined);
    setPanel(null);
    router.push(result.href);
  }

  const errorId = `${id}-erro`;
  const listId = `${id}-destinos`;
  const datesId = `${id}-datas`;
  const guestsId = `${id}-hospedes`;
  const summary = guestsSummary(guests);
  const capacityReached = guests.adults + guests.children >= maxGuests;

  return (
    <div ref={rootRef} onKeyDown={onRootKeyDown} className="grid w-full gap-4">
      {/* Celular: a busca abre ao tocar. */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${id}-form`}
        onClick={() => setExpanded((value) => !value)}
        className={cn(
          "flex min-h-14 items-center justify-between gap-4 rounded-full bg-branco py-2 pr-2 pl-5 text-left text-abismo shadow-flutuante md:hidden",
          expanded && "hidden",
        )}
      >
        <span className="grid">
          <span className="font-semibold">Onde e quando?</span>
          <span className="text-small text-rocha">Destino, datas e hóspedes</span>
        </span>
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-petroleo text-marfim">
          <SearchIcon />
        </span>
      </button>

      <div id={`${id}-form`} className={cn("grid gap-4", !expanded && "max-md:hidden")}>
        <fieldset className="flex">
          <legend className="sr-only">Modalidade</legend>
          <div className="inline-flex rounded-full bg-areia p-1">
            {searchModes.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "inline-flex min-h-10 cursor-pointer items-center rounded-full px-4 text-small font-semibold text-abismo has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petroleo",
                  mode === option.value && "bg-branco shadow-flutuante",
                )}
              >
                <input
                  type="radio"
                  name="modalidade"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => {
                    setMode(option.value);
                    setError(undefined);
                    if (option.value === "venda" && panel !== "onde") setPanel(null);
                  }}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <form
          role="search"
          aria-label={`Buscar imóveis para ${searchModes.find((m) => m.value === mode)!.label.toLowerCase()}`}
          onSubmit={onSubmit}
          noValidate
          className={cn(
            "relative grid gap-1 rounded-[1.75rem] border border-abismo/10 bg-branco p-2 text-abismo shadow-flutuante md:items-center md:rounded-full",
            renting
              ? "md:grid-cols-[1.35fr_1fr_1fr_1.1fr_auto]"
              : "md:grid-cols-[1.35fr_1fr_1.2fr_auto]",
          )}
        >
          {/* Onde? */}
          <div className="grid">
            <div className={segment}>
              <label htmlFor={`${id}-onde`} className={segmentLabel}>
                Onde?
              </label>
              <input
                ref={whereRef}
                id={`${id}-onde`}
                type="text"
                role="combobox"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={panel === "onde"}
                aria-controls={listId}
                aria-activedescendant={
                  panel === "onde" && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
                }
                aria-describedby={error ? errorId : undefined}
                placeholder="Buscar destino"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setRegion(undefined);
                  // Destaca a primeira sugestão (a posição 0 é "Todos os destinos").
                  setActiveIndex(
                    event.target.value.trim() && matchDestinations(event.target.value).length > 0
                      ? 1
                      : 0,
                  );
                  openWhere();
                }}
                onClick={openWhere}
                onKeyDown={onWhereKeyDown}
                className="min-h-7 w-full bg-transparent text-body text-abismo outline-none placeholder:text-rocha"
              />
            </div>
            <div hidden={panel !== "onde"} className={cn(panelBase, "md:left-0 md:w-[24rem]")}>
              <ul id={listId} role="listbox" aria-label="Destinos" className="grid gap-1">
                {options.map((option, index) => (
                  <li
                    key={option.slug ?? "todos"}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={option.slug === region && (option.slug !== undefined || !query)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectDestination(option.slug)}
                    className={cn(
                      "grid cursor-pointer rounded-control px-3 py-2",
                      index === activeIndex ? "bg-nevoa" : "hover:bg-areia/60",
                    )}
                  >
                    <span className="font-semibold">{option.name}</span>
                    {option.caption ? (
                      <span className="text-small text-rocha">{option.caption}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {suggestions.length === 0 ? (
                <p className="mt-2 px-3 text-small text-rocha">
                  Nenhum destino com esse nome. Atendemos a Riviera de São Lourenço e o Litoral
                  Norte de São Paulo.
                </p>
              ) : null}
            </div>
          </div>

          {renting ? (
            <>
              <DateTrigger
                ref={checkInRef}
                label="Check-in"
                value={checkIn ? formatShort(checkIn) : null}
                expanded={panel === "datas"}
                controls={datesId}
                active={panel === "datas" && dateTarget === "checkIn"}
                onOpen={(viaKeyboard) => openDates("checkIn", viaKeyboard)}
              />
              <DateTrigger
                ref={checkOutRef}
                label="Check-out"
                value={checkOut ? formatShort(checkOut) : null}
                expanded={panel === "datas"}
                controls={datesId}
                active={panel === "datas" && dateTarget === "checkOut"}
                onOpen={(viaKeyboard) => openDates("checkOut", viaKeyboard)}
              />
              {panel === "datas" ? (
                <div
                  id={datesId}
                  role="dialog"
                  aria-label="Escolher datas"
                  className={cn(
                    panelBase,
                    "md:left-1/2 md:w-[min(46rem,calc(100vw-2rem))] md:-translate-x-1/2",
                  )}
                >
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold" role="status" aria-live="polite">
                      {checkIn && checkOut
                        ? `${formatShort(checkIn)} – ${formatShort(checkOut)} · ${nightsLabel(checkIn, checkOut)}`
                        : checkIn
                          ? "Escolha a data de check-out"
                          : "Escolha a data de check-in"}
                    </p>
                    <p className="text-small text-rocha">
                      {mode === "mensal" ? "A partir de 30 noites." : "De 1 a 29 noites."}
                    </p>
                  </div>
                  <RangeCalendar
                    today={today}
                    lastDate={lastDate}
                    limits={limits}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    target={dateTarget}
                    onChange={onDatesChange}
                    autoFocus={focusCalendar}
                  />
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-areia pt-4">
                    <button
                      type="button"
                      onClick={clearDates}
                      disabled={!checkIn}
                      className="min-h-11 px-1 font-semibold text-petroleo underline underline-offset-3 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                    >
                      Limpar datas
                    </button>
                    <button
                      type="button"
                      onClick={() => closePanel(true)}
                      className="inline-flex min-h-11 items-center rounded-full bg-petroleo px-5 font-semibold text-marfim hover:bg-abismo"
                    >
                      Concluir
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Quem? */}
              <div className="grid">
                <button
                  ref={whoRef}
                  type="button"
                  aria-expanded={panel === "quem"}
                  aria-controls={guestsId}
                  aria-haspopup="dialog"
                  onClick={() => {
                    openerRef.current = whoRef.current;
                    setPanel((current) => (current === "quem" ? null : "quem"));
                  }}
                  className={cn(segment, "w-full", panel === "quem" && "bg-nevoa")}
                >
                  <span className={segmentLabel}>Quem?</span>
                  <span className={cn(segmentValue, !summary && placeholder)}>
                    {summary ?? "Adicionar hóspedes"}
                  </span>
                </button>
                <div
                  id={guestsId}
                  role="dialog"
                  aria-label="Hóspedes"
                  hidden={panel !== "quem"}
                  className={cn(panelBase, "md:right-0 md:w-[22rem]")}
                >
                  <GuestRow
                    label="Adultos"
                    hint="13 anos ou mais"
                    one="adulto"
                    many="adultos"
                    count={guests.adults}
                    onStep={(delta) => setGuests(stepGuests(guests, "adults", delta, maxGuests))}
                    canDecrease={stepGuests(guests, "adults", -1, maxGuests) !== guests}
                    canIncrease={stepGuests(guests, "adults", 1, maxGuests) !== guests}
                  />
                  <GuestRow
                    label="Crianças"
                    hint="Até 12 anos"
                    one="criança"
                    many="crianças"
                    count={guests.children}
                    onStep={(delta) => setGuests(stepGuests(guests, "children", delta, maxGuests))}
                    canDecrease={stepGuests(guests, "children", -1, maxGuests) !== guests}
                    canIncrease={stepGuests(guests, "children", 1, maxGuests) !== guests}
                  />
                  <p className="mt-3 text-small text-rocha">
                    {capacityReached
                      ? `Os imóveis anunciados recebem no máximo ${maxGuests} hóspedes.`
                      : "A busca mostra imóveis com capacidade para o total de hóspedes."}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={segment}>
                <label htmlFor={`${id}-tipo`} className={segmentLabel}>
                  Tipo
                </label>
                <select
                  id={`${id}-tipo`}
                  value={saleType}
                  onChange={(event) => setSaleType(event.target.value)}
                  className="min-h-7 w-full bg-transparent text-body text-abismo outline-none"
                >
                  <option value="">Todos</option>
                  {Object.entries(propertyTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={segment}>
                <label htmlFor={`${id}-preco`} className={segmentLabel}>
                  Preço máximo
                </label>
                <select
                  id={`${id}-preco`}
                  value={salePrice}
                  onChange={(event) => setSalePrice(event.target.value)}
                  className="min-h-7 w-full bg-transparent text-body text-abismo outline-none"
                >
                  {salePrices.map((price) => (
                    <option key={price.value} value={price.value}>
                      {price.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            className="m-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-petroleo px-6 font-semibold text-marfim transition-colors hover:bg-abismo"
          >
            <SearchIcon />
            Buscar
          </button>
        </form>

        {error ? (
          <p id={errorId} role="alert" className="rounded-control bg-branco px-4 py-3 text-erro">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DateTrigger({
  ref,
  label,
  value,
  expanded,
  controls,
  active,
  onOpen,
}: {
  ref: Ref<HTMLButtonElement>;
  label: string;
  value: string | null;
  expanded: boolean;
  controls: string;
  active: boolean;
  onOpen: (viaKeyboard: boolean) => void;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      aria-haspopup="dialog"
      // detail 0: acionado pelo teclado (Enter/Espaço) → foco vai para o calendário.
      onClick={(event) => onOpen(event.detail === 0)}
      className={cn(segment, active && "bg-nevoa")}
    >
      <span className={segmentLabel}>{label}</span>
      <span className={cn(segmentValue, !value && placeholder)}>{value ?? "Adicionar data"}</span>
    </button>
  );
}

function GuestRow({
  label,
  hint,
  one,
  many,
  count,
  onStep,
  canDecrease,
  canIncrease,
}: {
  label: string;
  hint: string;
  one: string;
  many: string;
  count: number;
  onStep: (delta: 1 | -1) => void;
  canDecrease: boolean;
  canIncrease: boolean;
}) {
  const stepper =
    "inline-flex size-10 items-center justify-center rounded-full border border-junco text-h3 leading-none text-abismo hover:border-abismo disabled:cursor-not-allowed disabled:opacity-35";
  return (
    <div className="flex items-center justify-between gap-4 border-b border-areia py-3 last-of-type:border-b-0">
      <div className="grid">
        <span className="font-semibold">{label}</span>
        <span className="text-small text-rocha">{hint}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onStep(-1)}
          disabled={!canDecrease}
          aria-label={`Remover ${one}`}
          className={stepper}
        >
          <span aria-hidden="true">−</span>
        </button>
        <output
          aria-live="polite"
          aria-label={`${count} ${count === 1 ? one : many}`}
          className="w-6 text-center font-semibold tabular-nums"
        >
          {count}
        </output>
        <button
          type="button"
          onClick={() => onStep(1)}
          disabled={!canIncrease}
          aria-label={`Adicionar ${one}`}
          className={stepper}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  );
}
