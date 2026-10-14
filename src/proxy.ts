import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";
import { mapStyleUrl } from "@/lib/map";
import { buildCsp, createNonce } from "@/lib/seo/csp";

/**
 * Renova a sessão do Supabase a cada requisição, aplica a política de
 * segurança de conteúdo (CSP) com um nonce novo e faz uma verificação
 * otimista em /admin. A autorização definitiva fica no layout do painel e
 * nas políticas RLS do banco.
 */
export async function proxy(request: NextRequest) {
  let env;
  try {
    env = getPublicEnv();
  } catch {
    return NextResponse.next({ request });
  }

  const nonce = createNonce();
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    mapStyleUrl: mapStyleUrl(),
  });

  // O Next.js lê o nonce do cabeçalho CSP da requisição e o aplica aos
  // próprios scripts. Recriado a cada vez para levar os cookies renovados.
  const next = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("content-security-policy", csp);
    return NextResponse.next({ request: { headers } });
  };
  const withCsp = (result: NextResponse) => {
    result.headers.set("content-security-policy", csp);
    return result;
  };

  let response = next();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = next();
          for (const { name, value, options } of cookiesToSet)
            response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );

  // Não coloque código entre a criação do cliente e getClaims(): é aqui que a
  // sessão expirada é renovada.
  const { data } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;
  const isAdminArea =
    pathname === "/admin" ||
    (pathname.startsWith("/admin/") && !pathname.startsWith("/admin/entrar"));

  if (isAdminArea && !data?.claims?.sub) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/entrar";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return withCsp(redirect);
  }

  return withCsp(response);
}

export const config = {
  matcher: [
    // Tudo, exceto arquivos estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)",
  ],
};
