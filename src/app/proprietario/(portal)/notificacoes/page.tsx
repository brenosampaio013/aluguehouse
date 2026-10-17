import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Badge } from "@/components/admin/ui/badge";
import { Card } from "@/components/admin/ui/card";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { ListPagination } from "@/components/admin/ui/pagination";
import { MarkAllRead } from "@/components/owner/mark-all-read";
import { BellIcon } from "@/components/ui/icons";
import { buildHref, outOfRangeHref, PAGE_SIZE, parsePage } from "@/lib/admin/list-params";
import { requireOwner } from "@/lib/auth/require-owner";
import { cn } from "@/lib/cn";
import { openNotification } from "@/server/actions/owner";
import { listOwnerNotifications } from "@/server/queries/owner-portal";

export const metadata: Metadata = { title: "Notificações" };

const PATH = "/proprietario/notificacoes";
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function NotificacoesPage({
  searchParams,
}: PageProps<"/proprietario/notificacoes">) {
  const params = await searchParams;
  const page = parsePage(params.pagina);
  const { supabase } = await requireOwner();
  const { rows, count } = await listOwnerNotifications(supabase, page);
  const validPage = outOfRangeHref(PATH, params, page, count);
  if (validPage) redirect(validPage);
  const unread = rows.some((n) => !n.read_at);

  return (
    <AdminPage>
      <PageHeader
        title="Notificações"
        description="Novos pedidos de reserva, confirmações, cancelamentos, respostas aos seus pedidos, documentos e avisos da Alugue Houses."
        actions={rows.length > 0 ? <MarkAllRead hasUnread={unread} /> : null}
      />
      <Card as="div">
        {rows.length === 0 ? (
          <EmptyState
            icon={<BellIcon />}
            title="Nenhuma notificação ainda"
            description="Você será avisado aqui quando algo mudar nos seus imóveis."
          />
        ) : (
          <ul className="divide-y divide-areia">
            {rows.map((n) => (
              <li key={n.id} className={cn(!n.read_at && "bg-nevoa/40")}>
                <form action={openNotification} className="contents">
                  <input type="hidden" name="id" value={n.id} />
                  <input type="hidden" name="link" value={n.link ?? PATH} />
                  <button
                    type="submit"
                    className="grid w-full gap-1 px-5 py-4 text-left hover:bg-marfim/60"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{n.title}</span>
                      {!n.read_at ? <Badge tone="info">Nova</Badge> : null}
                    </span>
                    {n.body ? <span className="text-rocha">{n.body}</span> : null}
                    <span className="text-small text-rocha tabular-nums">
                      {dateTime.format(new Date(n.created_at))}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <ListPagination
          page={page}
          pageSize={PAGE_SIZE}
          count={count}
          hrefFor={(n) => buildHref(PATH, { pagina: n })}
        />
      </Card>
    </AdminPage>
  );
}
