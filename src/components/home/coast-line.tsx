import Link from "next/link";

import { regions } from "@/lib/regions";

/**
 * Elemento de assinatura (Etapa 2): regiões em ordem geográfica pela
 * Rio-Santos. A linha se desenha uma vez; com movimento reduzido, aparece
 * pronta. No celular, rola na horizontal.
 */
export function CoastLine() {
  return (
    <nav aria-labelledby="costa-titulo" className="grid gap-6">
      <h2 id="costa-titulo" className="font-serif text-h2 font-normal">
        Da Riviera a Ubatuba
      </h2>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <ol className="coast-line relative flex min-w-[680px] justify-between">
          {regions.map((region, index) => (
            <li
              key={region.slug}
              className={index === regions.length - 1 ? "text-right" : undefined}
            >
              <Link
                href={`/temporada?regiao=${region.slug}`}
                className={
                  "group grid min-h-11 gap-3 rounded-control " +
                  (index === regions.length - 1 ? "justify-items-end" : "justify-items-start")
                }
              >
                <span
                  aria-hidden="true"
                  className="relative z-10 size-[22px] rounded-full border-2 border-petroleo bg-branco transition-colors group-hover:bg-petroleo"
                />
                <span className="font-serif text-h3 leading-tight text-abismo group-hover:underline group-hover:underline-offset-4">
                  {region.name}
                </span>
                <span className="text-small text-rocha">{region.caption}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
