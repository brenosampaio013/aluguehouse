"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useSyncExternalStore, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { propertyTypeLabels } from "@/lib/properties/labels";
import { regions } from "@/lib/regions";

type Mode = "temporada" | "mensal" | "venda";

const modes: { value: Mode; label: string }[] = [
  { value: "temporada", label: "Temporada" },
  { value: "mensal", label: "Mensal" },
  { value: "venda", label: "Venda" },
];

const salePrices = [
  { value: "", label: "Qualquer valor" },
  { value: "1000000", label: "Até R$ 1 milhão" },
  { value: "2000000", label: "Até R$ 2 milhões" },
  { value: "3500000", label: "Até R$ 3,5 milhões" },
  { value: "5000000", label: "Até R$ 5 milhões" },
];

const noopSubscribe = () => () => {};

/** Data de hoje no fuso do visitante ("AAAA-MM-DD"); só existe no navegador. */
function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function nightsBetween(start: string, end: string) {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000,
  );
}

const fieldBox = "grid gap-1 rounded-control px-4 py-2 focus-within:bg-nevoa";
const fieldLabel = "text-small font-semibold text-abismo";
const fieldInput = "min-h-9 w-full bg-transparent text-body text-abismo outline-none";

/**
 * Busca da página inicial. Envia para /temporada, /mensal ou /venda com os
 * filtros na URL (páginas criadas nas próximas etapas).
 */
export function HeroSearch() {
  const router = useRouter();
  const id = useId();
  const [mode, setMode] = useState<Mode>("temporada");
  const today = useSyncExternalStore(noopSubscribe, localToday, () => undefined);
  const [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const region = String(data.get("regiao") ?? "");
    if (region) params.set("regiao", region);

    if (mode === "venda") {
      const type = String(data.get("tipo") ?? "");
      const max = String(data.get("preco_max") ?? "");
      if (type) params.set("tipo", type);
      if (max) params.set("preco_max", max);
    } else {
      const checkIn = String(data.get("chegada") ?? "");
      const checkOut = String(data.get("saida") ?? "");
      const guests = String(data.get("hospedes") ?? "");
      if (checkIn && checkOut) {
        const nights = nightsBetween(checkIn, checkOut);
        if (nights <= 0) {
          setError("A saída precisa ser depois da chegada.");
          return;
        }
        if (mode === "temporada" && nights > 29) {
          setError("Temporada vai até 29 noites. Para 30 noites ou mais, escolha Mensal.");
          return;
        }
        if (mode === "mensal" && nights < 30) {
          setError("Aluguel mensal começa em 30 noites. Para estadias menores, escolha Temporada.");
          return;
        }
      } else if (checkIn || checkOut) {
        setError("Informe a chegada e a saída, ou deixe as duas em branco.");
        return;
      }
      if (checkIn) params.set("chegada", checkIn);
      if (checkOut) params.set("saida", checkOut);
      if (guests) params.set("hospedes", guests);
    }

    setError(undefined);
    const query = params.toString();
    router.push(`/${mode}${query ? `?${query}` : ""}`);
  }

  const errorId = `${id}-erro`;

  return (
    <div className="grid w-full gap-4">
      {/* Celular: a busca abre ao tocar. */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${id}-form`}
        onClick={() => setExpanded((value) => !value)}
        className={cn(
          "flex min-h-14 items-center justify-between gap-4 rounded-full bg-branco py-2 pr-2 pl-5 text-left text-abismo shadow-flutuante sm:hidden",
          expanded && "hidden",
        )}
      >
        <span className="grid">
          <span className="font-semibold">Onde e quando?</span>
          <span className="text-small text-rocha">Região, datas e hóspedes</span>
        </span>
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-petroleo text-branco">
          <SearchIcon />
        </span>
      </button>

      <div id={`${id}-form`} className={cn("grid gap-4", !expanded && "max-sm:hidden")}>
        <fieldset className="flex">
          <legend className="sr-only">Modalidade</legend>
          <div className="inline-flex rounded-full bg-areia p-1">
            {modes.map((option) => (
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
          aria-label={`Buscar imóveis para ${modes.find((m) => m.value === mode)!.label.toLowerCase()}`}
          onSubmit={onSubmit}
          noValidate
          className="grid gap-1 rounded-[1.75rem] border border-abismo/10 bg-branco p-2 text-abismo shadow-flutuante sm:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] sm:items-center sm:rounded-full"
        >
          <div className={fieldBox}>
            <label htmlFor={`${id}-regiao`} className={fieldLabel}>
              Onde
            </label>
            <select id={`${id}-regiao`} name="regiao" className={fieldInput} defaultValue="">
              <option value="">Qualquer região</option>
              {regions.map((region) => (
                <option key={region.slug} value={region.slug}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          {mode === "venda" ? (
            <>
              <div className={fieldBox}>
                <label htmlFor={`${id}-tipo`} className={fieldLabel}>
                  Tipo
                </label>
                <select id={`${id}-tipo`} name="tipo" className={fieldInput} defaultValue="">
                  <option value="">Todos</option>
                  {Object.entries(propertyTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={cn(fieldBox, "sm:col-span-2")}>
                <label htmlFor={`${id}-preco`} className={fieldLabel}>
                  Preço máximo
                </label>
                <select id={`${id}-preco`} name="preco_max" className={fieldInput} defaultValue="">
                  {salePrices.map((price) => (
                    <option key={price.value} value={price.value}>
                      {price.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className={fieldBox}>
                <label htmlFor={`${id}-chegada`} className={fieldLabel}>
                  Chegada
                </label>
                <input
                  id={`${id}-chegada`}
                  name="chegada"
                  type="date"
                  min={today}
                  aria-describedby={error ? errorId : undefined}
                  className={fieldInput}
                />
              </div>
              <div className={fieldBox}>
                <label htmlFor={`${id}-saida`} className={fieldLabel}>
                  Saída
                </label>
                <input
                  id={`${id}-saida`}
                  name="saida"
                  type="date"
                  min={today}
                  aria-describedby={error ? errorId : undefined}
                  className={fieldInput}
                />
              </div>
              <div className={fieldBox}>
                <label htmlFor={`${id}-hospedes`} className={fieldLabel}>
                  Hóspedes
                </label>
                <input
                  id={`${id}-hospedes`}
                  name="hospedes"
                  type="number"
                  min={1}
                  max={50}
                  inputMode="numeric"
                  placeholder="Quantos?"
                  className={fieldInput}
                />
              </div>
            </>
          )}

          <Button type="submit" className="m-1 min-h-12 rounded-full px-6">
            <SearchIcon />
            Buscar
          </Button>
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
