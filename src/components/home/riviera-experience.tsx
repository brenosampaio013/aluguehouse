import Link from "next/link";

import { ArrowRightIcon, BikeIcon, StoreIcon, WavesIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/container";
import { destinationHref, rentalCountLabel } from "@/lib/home/destinations";

/** Só o que vale para o bairro como um todo; nada de números ou promessas. */
const highlights = [
  {
    icon: WavesIcon,
    title: "Praia extensa",
    text: "Faixa de areia larga e mar aberto ao longo do bairro, para caminhar e nadar.",
  },
  {
    icon: StoreIcon,
    title: "Tudo no bairro",
    text: "Comércio, restaurantes e serviços no próprio bairro, sem precisar voltar à estrada durante a estadia.",
  },
  {
    icon: BikeIcon,
    title: "Ciclovias e áreas verdes",
    text: "Ruas arborizadas e ciclovias para circular a pé ou de bicicleta durante a estadia.",
  },
];

/**
 * A experiência na Riviera de São Lourenço (Etapa 6 do redesign): faixa
 * editorial escura, sem foto, com o link para os imóveis da região.
 */
export function RivieraExperience({ count }: { count: number }) {
  const countLabel = rentalCountLabel(count);
  return (
    <section
      aria-labelledby="titulo-riviera"
      className="sobre-escuro relative isolate overflow-hidden bg-abismo py-20 text-marfim sm:py-24"
    >
      <div aria-hidden="true" className="riviera-faixa absolute inset-0 -z-10" />
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
        <div className="revelar grid content-start gap-5">
          <p className="flex items-center gap-3 text-small font-semibold tracking-[0.18em] text-dourado uppercase">
            <span aria-hidden="true" className="h-px w-10 bg-dourado" />A experiência Riviera
          </p>
          <h2
            id="titulo-riviera"
            className="max-w-[16ch] font-serif text-[2.25rem] leading-[1.08] font-normal sm:text-h1"
          >
            O litoral no ritmo de quem está de férias.
          </h2>
          <p className="max-w-[46ch] text-[1.0625rem] text-areia">
            A Riviera de São Lourenço é um bairro planejado em Bertioga, entre a Serra do Mar e o
            oceano, com acesso pela Rio-Santos. Um lugar pensado para aproveitar a praia a pé ou de
            bicicleta.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href={destinationHref("riviera-de-sao-lourenco")}
              className="group/seta inline-flex min-h-12 items-center gap-2 rounded-full bg-marfim px-6 font-semibold text-petroleo transition-[background-color,transform] duration-200 hover:bg-areia active:scale-[0.98]"
            >
              Ver imóveis na Riviera
              <ArrowRightIcon
                width={16}
                height={16}
                className="transition-transform duration-300 group-hover/seta:translate-x-1"
              />
            </Link>
            {countLabel ? <p className="text-small text-areia">{countLabel}</p> : null}
          </div>
        </div>

        <ul className="grid content-start">
          {highlights.map(({ icon: HighlightIcon, title, text }) => (
            <li
              key={title}
              className="revelar grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 border-t border-dourado/35 py-6 first:border-t-0 first:pt-0 lg:first:border-t lg:first:pt-6"
            >
              <span
                aria-hidden="true"
                className="row-span-2 grid size-12 place-items-center rounded-full border border-dourado/60 text-dourado"
              >
                <HighlightIcon width={22} height={22} />
              </span>
              <h3 className="font-serif text-[1.5rem] leading-tight font-normal">{title}</h3>
              <p className="max-w-[48ch] text-areia">{text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
