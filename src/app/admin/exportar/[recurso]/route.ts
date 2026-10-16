import type { NextRequest } from "next/server";

import { csvFilename, toCsv, type CsvValue } from "@/lib/admin/csv";
import { sortRows, timeValue } from "@/lib/admin/sort";
import {
  parseBookingFilters,
  parseInquiryFilters,
  parsePropertyFilters,
} from "@/lib/admin/filters";
import { EXPORT_LIMIT, type RawParams } from "@/lib/admin/list-params";
import { getSessionState } from "@/lib/auth/session";
import { bookingStatusLabels, rentalModeLabels } from "@/lib/booking/labels";
import { todayInSaoPaulo } from "@/lib/format";
import { inquiryKindLabels, inquiryStatusLabels } from "@/lib/inquiries";
import { propertyStatusLabels, propertyTypeLabels } from "@/lib/properties/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchBookingRequests } from "@/server/queries/admin-bookings";
import { searchPropertiesForAdmin } from "@/server/queries/admin-properties";
import { searchInquiries } from "@/server/queries/inquiries";
import { ExportTooLargeError, fetchAllByCursor } from "@/server/queries/paged";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type Export = { base: string; headers: string[]; rows: CsvValue[][] };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
const when = (value: string | null) => (value ? dateTime.format(new Date(value)) : "");

const exporters: Record<string, (supabase: Client, params: RawParams) => Promise<Export>> = {
  async imoveis(supabase, params) {
    const filters = parsePropertyFilters(params);
    type Row = Awaited<ReturnType<typeof searchPropertiesForAdmin>>["rows"][number];
    // Lê por cursor (ordem de id) e reordena como a tela.
    const sortValue = {
      atualizado: (p: Row) => timeValue(p.updated_at),
      titulo: (p: Row) => p.title,
      cidade: (p: Row) => p.city,
      criado: (p: Row) => timeValue(p.created_at),
    }[filters.sort.key];
    const rows = sortRows(
      await fetchAllByCursor(
        (paging) => searchPropertiesForAdmin(supabase, filters, paging),
        EXPORT_LIMIT,
      ),
      sortValue,
      filters.sort.dir,
    );
    return {
      base: "imoveis",
      headers: [
        "Título",
        "Endereço no site",
        "Tipo",
        "Cidade",
        "Bairro",
        "Situação",
        "Temporada",
        "Mensal",
        "Venda",
        "Diária (R$)",
        "Mensal (R$)",
        "Venda (R$)",
        "Quartos",
        "Hóspedes",
        "Criado em",
        "Atualizado em",
      ],
      rows: rows.map((p) => [
        p.title,
        `/imoveis/${p.slug}`,
        propertyTypeLabels[p.property_type],
        p.city,
        p.neighborhood,
        propertyStatusLabels[p.status],
        p.offers_seasonal,
        p.offers_monthly,
        p.offers_sale,
        p.nightly_price,
        p.monthly_price,
        p.sale_price,
        p.bedrooms,
        p.max_guests,
        when(p.created_at),
        when(p.updated_at),
      ]),
    };
  },
  async solicitacoes(supabase, params) {
    const filters = parseBookingFilters(params);
    type Row = Awaited<ReturnType<typeof searchBookingRequests>>["rows"][number];
    const sortValue = {
      recebida: (r: Row) => timeValue(r.created_at),
      chegada: (r: Row) => r.checkIn,
      total: (r: Row) => r.quoted_total,
      hospede: (r: Row) => r.guest_name,
    }[filters.sort.key];
    const rows = sortRows(
      await fetchAllByCursor(
        (paging) => searchBookingRequests(supabase, filters, paging),
        EXPORT_LIMIT,
      ),
      sortValue,
      filters.sort.dir,
    );
    return {
      base: "solicitacoes",
      headers: [
        "Protocolo",
        "Hóspede",
        "E-mail",
        "Telefone",
        "Imóvel",
        "Modalidade",
        "Chegada",
        "Saída",
        "Hóspedes",
        "Total estimado (R$)",
        "Situação",
        "Recebida em",
        "Decidida em",
      ],
      rows: rows.map((r) => [
        r.id.slice(0, 8).toUpperCase(),
        r.guest_name,
        r.guest_email,
        r.guest_phone,
        r.properties?.title ?? "",
        rentalModeLabels[r.rental_mode],
        r.checkIn,
        r.checkOut,
        r.guests_count,
        r.quoted_total,
        bookingStatusLabels[r.status],
        when(r.created_at),
        when(r.decided_at),
      ]),
    };
  },
  async contatos(supabase, params) {
    const filters = parseInquiryFilters(params);
    const rows = sortRows(
      await fetchAllByCursor((paging) => searchInquiries(supabase, filters, paging), EXPORT_LIMIT),
      (i) => timeValue(i.created_at),
      filters.dir,
    );
    return {
      base: "contatos",
      headers: [
        "Tipo",
        "Nome",
        "E-mail",
        "Telefone",
        "Imóvel",
        "Mensagem",
        "Visita preferida",
        "Situação",
        "Recebido em",
      ],
      rows: rows.map((i) => [
        inquiryKindLabels[i.kind],
        i.name,
        i.email,
        i.phone,
        i.properties?.title ?? "",
        i.message,
        when(i.preferred_datetime),
        inquiryStatusLabels[i.status],
        when(i.created_at),
      ]),
    };
  },
};

/**
 * Exportação CSV das listas do painel, com os mesmos filtros da tela.
 * Exige admin com MFA aqui e, de novo, nas políticas RLS do banco.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/admin/exportar/[recurso]">) {
  const { recurso } = await ctx.params;
  // Só chaves próprias: "constructor", "toString" etc. do protótipo não valem.
  const exporter = Object.hasOwn(exporters, recurso) ? exporters[recurso] : undefined;
  if (!exporter) return new Response("Exportação não encontrada.", { status: 404 });

  const session = await getSessionState();
  if (session.status !== "admin") {
    return new Response("Entre no painel para exportar.", { status: 401 });
  }

  const params: RawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  try {
    const supabase = await createSupabaseServerClient();
    const { base, headers, rows } = await exporter(supabase, params);
    return new Response(toCsv(headers, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename(base, todayInSaoPaulo())}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    // Nunca entrega arquivo parcial: explica por que não exportou.
    const text = (message: string, status: number) =>
      new Response(message, {
        status,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    if (error instanceof ExportTooLargeError) {
      return text(
        `A exportação teria ${error.total.toLocaleString("pt-BR")} linhas, acima do limite de ${error.limit.toLocaleString("pt-BR")}. Filtre por período, situação ou imóvel e exporte em partes.`,
        413,
      );
    }
    console.error(`Falha ao exportar ${recurso}`, error);
    return text("Não foi possível gerar o arquivo agora. Tente de novo.", 500);
  }
}
