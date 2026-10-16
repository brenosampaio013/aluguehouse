import type { Metadata } from "next";
import Link from "next/link";

import { PropertyDeleteButton } from "@/components/admin/property-delete-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card } from "@/components/admin/ui/card";
import { DataTable, SortTh, Td, Th } from "@/components/admin/ui/data-table";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { ListToolbar } from "@/components/admin/ui/list-toolbar";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { ListPagination } from "@/components/admin/ui/pagination";
import { StatusTabs } from "@/components/admin/ui/status-tabs";
import { buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { DownloadIcon, EditIcon, ExternalIcon, HouseIcon, PlusIcon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parsePropertyFilters, type PropertyFilters } from "@/lib/admin/filters";
import { buildHref, first, PAGE_SIZE, pageRange } from "@/lib/admin/list-params";
import { formatPrice } from "@/lib/format";
import { propertyStatusLabels, propertyTypeLabels } from "@/lib/properties/labels";
import {
  countPropertiesByStatus,
  searchPropertiesForAdmin,
} from "@/server/queries/admin-properties";

export const metadata: Metadata = { title: "Imóveis" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function modes(p: { offers_seasonal: boolean; offers_monthly: boolean; offers_sale: boolean }) {
  const list = [
    p.offers_seasonal && "Temporada",
    p.offers_monthly && "Mensal",
    p.offers_sale && "Venda",
  ].filter(Boolean);
  return list.length > 0 ? list.join(", ") : "Nenhuma definida";
}

function mainPrice(p: {
  offers_seasonal: boolean;
  offers_monthly: boolean;
  nightly_price: number | null;
  monthly_price: number | null;
  sale_price: number | null;
}) {
  if (p.offers_seasonal && p.nightly_price) return `${formatPrice(p.nightly_price)}/noite`;
  if (p.offers_monthly && p.monthly_price) return `${formatPrice(p.monthly_price)}/mês`;
  if (p.sale_price) return formatPrice(p.sale_price);
  return "—";
}

/** Parâmetros de URL da lista, para montar links mantendo os filtros. */
function listParams(filters: PropertyFilters) {
  return {
    q: filters.q,
    situacao: filters.status,
    modalidade: filters.mode,
    ordem:
      filters.sort.key === "atualizado" && filters.sort.dir === "desc" ? null : filters.sort.key,
    dir: filters.sort.key === "atualizado" && filters.sort.dir === "desc" ? null : filters.sort.dir,
  };
}

export default async function ImoveisPage({ searchParams }: PageProps<"/admin/imoveis">) {
  const params = await searchParams;
  const filters = parsePropertyFilters(params);
  const { supabase } = await requireAdmin();
  const [{ rows, count }, counts] = await Promise.all([
    searchPropertiesForAdmin(supabase, filters, pageRange(filters.page)),
    countPropertiesByStatus(supabase),
  ]);
  const base = listParams(filters);
  const href = (extra: Record<string, string | number | null>) =>
    buildHref("/admin/imoveis", { ...base, ...extra });
  const total = counts.draft + counts.published + counts.archived;
  const filtered = Boolean(filters.q || filters.mode);

  return (
    <AdminPage>
      <PageHeader
        title="Imóveis"
        description="Cadastro, fotos, tarifas, taxas e calendário de cada anúncio."
        actions={
          <>
            <Link
              href={buildHref("/admin/exportar/imoveis", base)}
              prefetch={false}
              className={buttonClasses("secondary", "min-h-10 px-4")}
            >
              <DownloadIcon width={18} height={18} />
              Exportar CSV
            </Link>
            <Link href="/admin/imoveis/novo" className={buttonClasses("primary", "min-h-10 px-4")}>
              <PlusIcon width={18} height={18} />
              Novo imóvel
            </Link>
          </>
        }
      />

      {first(params.aviso) === "excluido" ? (
        <FormMessage tone="success">Imóvel excluído.</FormMessage>
      ) : null}

      <StatusTabs
        label="Situação dos imóveis"
        current={filters.status ?? "todos"}
        tabs={[
          { slug: "todos", label: "Todos", href: href({ situacao: null }), count: total },
          ...(["published", "draft", "archived"] as const).map((status) => ({
            slug: status,
            label: propertyStatusLabels[status],
            href: href({ situacao: status }),
            count: counts[status],
          })),
        ]}
      />

      <Card as="div">
        <ListToolbar
          action="/admin/imoveis"
          search={filters.q}
          searchLabel="Buscar por título, cidade ou bairro"
          hidden={{ situacao: filters.status, ordem: base.ordem, dir: base.dir }}
          selects={[
            {
              name: "modalidade",
              label: "Modalidade",
              value: filters.mode,
              allLabel: "Todas",
              options: [
                { value: "temporada", label: "Temporada" },
                { value: "mensal", label: "Mensal" },
                { value: "venda", label: "Venda" },
              ],
            },
          ]}
          active={filtered}
          clearHref={buildHref("/admin/imoveis", { situacao: filters.status })}
        />

        {rows.length === 0 ? (
          total === 0 ? (
            <EmptyState
              icon={<HouseIcon />}
              title="Nenhum imóvel cadastrado ainda"
              description="Comece cadastrando o primeiro anúncio. Ele fica em rascunho até você publicar."
              action={
                <Link href="/admin/imoveis/novo" className={buttonClasses("primary")}>
                  Novo imóvel
                </Link>
              }
            />
          ) : (
            <EmptyState
              title="Nenhum imóvel encontrado"
              description="Nenhum anúncio corresponde à busca e aos filtros escolhidos."
              action={
                <Link href="/admin/imoveis" className={buttonClasses("secondary")}>
                  Limpar filtros
                </Link>
              }
            />
          )
        ) : (
          <DataTable
            caption="Imóveis cadastrados"
            minWidth={880}
            head={
              <>
                <SortTh
                  label="Imóvel"
                  sortKey="titulo"
                  current={filters.sort}
                  hrefFor={(s) => href({ ordem: s.key, dir: s.dir })}
                />
                <SortTh
                  label="Local"
                  sortKey="cidade"
                  current={filters.sort}
                  hrefFor={(s) => href({ ordem: s.key, dir: s.dir })}
                />
                <Th>Modalidades</Th>
                <Th align="right">Preço</Th>
                <Th>Situação</Th>
                <SortTh
                  label="Atualizado"
                  sortKey="atualizado"
                  current={filters.sort}
                  hrefFor={(s) => href({ ordem: s.key, dir: s.dir })}
                />
                <Th>
                  <span className="sr-only">Ações</span>
                </Th>
              </>
            }
          >
            {rows.map((property) => (
              <tr key={property.id} className="hover:bg-marfim/50">
                <Td>
                  <Link
                    href={`/admin/imoveis/${property.id}`}
                    className="font-semibold text-petroleo hover:underline"
                  >
                    {property.title}
                  </Link>
                  <span className="block text-small text-rocha">
                    {propertyTypeLabels[property.property_type]} · {property.bedrooms}{" "}
                    {property.bedrooms === 1 ? "quarto" : "quartos"} · até {property.max_guests}{" "}
                    {property.max_guests === 1 ? "hóspede" : "hóspedes"}
                  </span>
                </Td>
                <Td>{[property.neighborhood, property.city].filter(Boolean).join(", ")}</Td>
                <Td>{modes(property)}</Td>
                <Td align="right" className="whitespace-nowrap tabular-nums">
                  {mainPrice(property)}
                </Td>
                <Td>
                  <StatusBadge status={property.status} />
                </Td>
                <Td className="text-small text-rocha tabular-nums">
                  {dateTime.format(new Date(property.updated_at))}
                </Td>
                <Td align="right">
                  <div className="flex items-start justify-end gap-1">
                    <Link
                      href={`/admin/imoveis/${property.id}`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-control px-2 text-small font-semibold text-petroleo hover:bg-nevoa"
                    >
                      <EditIcon width={16} height={16} />
                      Editar
                      <span className="sr-only"> {property.title}</span>
                    </Link>
                    {property.status === "published" ? (
                      <a
                        href={`/imoveis/${property.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-control px-2 text-small font-semibold text-petroleo hover:bg-nevoa"
                      >
                        <ExternalIcon width={16} height={16} />
                        Ver
                        <span className="sr-only">
                          {" "}
                          {property.title} no site (abre em nova aba)
                        </span>
                      </a>
                    ) : null}
                    <PropertyDeleteButton id={property.id} title={property.title} />
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
        <ListPagination
          page={filters.page}
          pageSize={PAGE_SIZE}
          count={count}
          hrefFor={(page) => href({ pagina: page })}
        />
      </Card>
    </AdminPage>
  );
}
