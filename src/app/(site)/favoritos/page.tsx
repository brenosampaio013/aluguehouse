import type { Metadata } from "next";
import Link from "next/link";

import { PropertyCard } from "@/components/property/property-card";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getSessionState } from "@/lib/auth/session";
import { getPublicEnv } from "@/lib/env";
import { listFavoriteProperties } from "@/server/queries/favorites";

export const metadata: Metadata = {
  title: "Favoritos",
  robots: { index: false },
};

const browse = [
  { href: "/temporada", label: "Temporada" },
  { href: "/mensal", label: "Mensal" },
  { href: "/venda", label: "Venda" },
];

export default async function FavoritosPage() {
  const session = await getSessionState();

  if (session.status === "anonymous") {
    return (
      <main id="conteudo" className="flex-1 py-16">
        <Container className="grid gap-6">
          <h1 className="font-serif text-h1 font-normal">Favoritos</h1>
          <p className="max-w-[60ch] text-rocha">
            Entre com seu e-mail para salvar imóveis e encontrá-los aqui depois, em qualquer
            aparelho. Não é preciso criar senha.
          </p>
          <div>
            <Link href="/entrar?next=/favoritos" className={buttonClasses("primary")}>
              Entrar para ver favoritos
            </Link>
          </div>
        </Container>
      </main>
    );
  }

  const properties = await listFavoriteProperties(session.userId);
  const { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } = getPublicEnv();

  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-8">
        <div className="grid gap-2">
          <h1 className="font-serif text-h1 font-normal">Favoritos</h1>
          <p className="text-rocha">
            {properties.length === 0
              ? "Você ainda não salvou nenhum imóvel."
              : `${properties.length} ${properties.length === 1 ? "imóvel salvo" : "imóveis salvos"}.`}
          </p>
        </div>

        {properties.length === 0 ? (
          <div className="grid gap-4">
            <p className="max-w-[60ch]">
              Toque no coração de um imóvel para guardá-lo aqui. Comece pelas listagens:
            </p>
            <ul className="flex flex-wrap gap-3">
              {browse.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={buttonClasses("secondary")}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property, index) => (
              <li key={property.id}>
                <PropertyCard property={property} supabaseUrl={supabaseUrl} priority={index < 2} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
