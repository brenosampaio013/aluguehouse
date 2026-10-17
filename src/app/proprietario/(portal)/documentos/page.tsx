import type { Metadata } from "next";

import { Card } from "@/components/admin/ui/card";
import { DataTable, Td, Th } from "@/components/admin/ui/data-table";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { ListToolbar } from "@/components/admin/ui/list-toolbar";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { FileIcon } from "@/components/ui/icons";
import { parseUuid } from "@/lib/admin/filters";
import { requireOwner } from "@/lib/auth/require-owner";
import { ownerDocCategoryLabels } from "@/lib/owner/documents";
import { listOwnerDocuments, listOwnerProperties } from "@/server/queries/owner-portal";

export const metadata: Metadata = { title: "Documentos" };

const PATH = "/proprietario/documentos";
const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function size(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function DocumentosPage({
  searchParams,
}: PageProps<"/proprietario/documentos">) {
  const params = await searchParams;
  const { supabase } = await requireOwner();
  const properties = await listOwnerProperties(supabase);
  const requested = parseUuid(params.imovel);
  const propertyId = properties.some((p) => p.id === requested) ? requested : null;
  const documents = await listOwnerDocuments(supabase, propertyId);

  return (
    <AdminPage>
      <PageHeader
        title="Documentos"
        description="Arquivos que a Alugue Houses compartilha com você. Ficam em armazenamento privado e abrem por um link que vale só alguns segundos."
      />
      <Card as="div">
        {properties.length > 1 ? (
          <ListToolbar
            action={PATH}
            selects={[
              {
                name: "imovel",
                label: "Imóvel",
                value: propertyId,
                allLabel: "Todos",
                options: properties.map((p) => ({ value: p.id, label: p.title })),
              },
            ]}
            active={Boolean(propertyId)}
            clearHref={PATH}
          />
        ) : null}
        {documents.length === 0 ? (
          <EmptyState
            icon={<FileIcon />}
            title="Nenhum documento disponível ainda"
            description="Contratos, relatórios e vistorias aparecem aqui quando a Alugue Houses enviar. Você recebe uma notificação a cada documento novo."
          />
        ) : (
          <DataTable
            caption="Documentos disponíveis"
            minWidth={640}
            head={
              <>
                <Th>Documento</Th>
                <Th>Imóvel</Th>
                <Th>Tipo</Th>
                <Th>Enviado em</Th>
                <Th align="right">Arquivo</Th>
              </>
            }
          >
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-marfim/50">
                <Td>
                  <a
                    href={`${PATH}/${doc.id}/abrir`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-petroleo hover:underline"
                  >
                    {doc.title}
                    <span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </Td>
                <Td>{doc.propertyTitle}</Td>
                <Td>{ownerDocCategoryLabels[doc.category]}</Td>
                <Td className="tabular-nums">{date.format(new Date(doc.created_at))}</Td>
                <Td align="right" className="text-small text-rocha">
                  {doc.mime_type === "application/pdf" ? "PDF" : "Imagem"} · {size(doc.size_bytes)}
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </AdminPage>
  );
}
