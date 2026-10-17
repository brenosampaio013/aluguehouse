import { NextResponse, type NextRequest } from "next/server";

import { parseUuid } from "@/lib/admin/filters";
import { getSessionState } from "@/lib/auth/session";
import { OWNER_DOCS_BUCKET, SIGNED_URL_SECONDS } from "@/lib/owner/documents";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerDocumentPath } from "@/server/queries/owner-portal";

/**
 * Abre um documento privado: confere a sessão (proprietário com MFA), lê o
 * registro com a sessão dele (o banco só devolve documentos de imóveis
 * vinculados) e redireciona para um link assinado que vale 60 segundos.
 * Nenhuma URL pública ou permanente é exposta.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/proprietario/documentos/[id]/abrir">,
) {
  const { id: rawId } = await ctx.params;
  const session = await getSessionState();
  if (session.status !== "owner") {
    return NextResponse.redirect(new URL("/proprietario", request.nextUrl.origin));
  }
  const notFound = () =>
    new Response("Documento não encontrado.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  const id = parseUuid(rawId);
  if (!id) return notFound();

  const supabase = await createSupabaseServerClient();
  const path = await getOwnerDocumentPath(supabase, id);
  if (!path) return notFound();

  const { data, error } = await supabase.storage
    .from(OWNER_DOCS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data) {
    return new Response("Não foi possível abrir o documento agora. Tente de novo.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
