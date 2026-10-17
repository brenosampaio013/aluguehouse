import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/admin/ui/card";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { PropertyStatusBadge } from "@/components/owner/property-status-badge";
import { HouseIcon } from "@/components/ui/icons";
import { requireOwner } from "@/lib/auth/require-owner";
import { getPublicEnv } from "@/lib/env";
import { formatBRL } from "@/lib/format";
import { mediaSrcSet, publicMediaUrl, variantPath, variantWidths } from "@/lib/media";
import { plural } from "@/lib/owner/portal";
import { listOwnerProperties } from "@/server/queries/owner-portal";

export const metadata: Metadata = { title: "Meus imóveis" };

const priceSuffix = { night: "/noite", month: "/mês", sale: "" } as const;

export default async function MeusImoveisPage() {
  const { supabase } = await requireOwner();
  const properties = await listOwnerProperties(supabase);
  const { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } = getPublicEnv();

  return (
    <AdminPage>
      <PageHeader
        title="Meus imóveis"
        description="Os imóveis vinculados à sua conta. Para mudar algo no anúncio, abra o imóvel e envie um pedido de alteração."
      />
      {properties.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HouseIcon />}
            title="Nenhum imóvel vinculado à sua conta ainda"
            description="Assim que a Alugue Houses vincular seus imóveis, eles aparecem aqui."
          />
        </Card>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => {
            const smallest = property.cover ? variantWidths(property.cover.width)[0]! : 0;
            return (
              <li key={property.id}>
                <Card as="article" className="group h-full overflow-hidden">
                  <Link href={`/proprietario/imoveis/${property.id}`} className="grid h-full">
                    <div className="relative aspect-[4/3] bg-areia">
                      {property.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={publicMediaUrl(
                            supabaseUrl,
                            variantPath(property.cover.path, smallest),
                          )}
                          srcSet={mediaSrcSet(
                            supabaseUrl,
                            property.cover.path,
                            property.cover.width,
                          )}
                          sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                          alt={property.cover.alt}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-rocha">
                          <HouseIcon width={32} height={32} />
                          <span className="sr-only">Sem foto cadastrada</span>
                        </span>
                      )}
                      <span className="absolute top-3 left-3">
                        <PropertyStatusBadge status={property.status} />
                      </span>
                    </div>
                    <div className="grid content-start gap-1 p-5">
                      <h2 className="font-semibold group-hover:text-petroleo">{property.title}</h2>
                      <p className="text-small text-rocha">
                        {[property.neighborhood, property.city].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-small text-rocha">
                        {plural(property.bedrooms, "quarto", "quartos")} ·{" "}
                        {plural(property.maxGuests, "hóspede", "hóspedes")}
                      </p>
                      {property.price ? (
                        <p className="mt-2 font-semibold tabular-nums">
                          {formatBRL(property.price.amount)}
                          <span className="font-normal text-rocha">
                            {priceSuffix[property.price.kind]}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </AdminPage>
  );
}
