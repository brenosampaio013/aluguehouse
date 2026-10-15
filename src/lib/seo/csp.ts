/** Origem ("https://host:porta") de uma URL, ou null se for inválida. */
function origin(url: string | undefined) {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export type CspOptions = {
  nonce: string;
  isDev: boolean;
  siteUrl: string;
  supabaseUrl: string;
  mapStyleUrl: string;
};

/**
 * Política de segurança de conteúdo (CSP). Scripts só com o nonce da
 * requisição (e os que eles carregarem, via 'strict-dynamic'); conexões e
 * imagens só do próprio site, do Supabase, do mapa e do Turnstile.
 */
export function buildCsp({ nonce, isDev, siteUrl, supabaseUrl, mapStyleUrl }: CspOptions) {
  const supabase = origin(supabaseUrl);
  const map = origin(mapStyleUrl);
  const turnstile = "https://challenges.cloudflare.com";
  const extra = (...values: (string | null | false)[]) =>
    values.filter((value): value is string => Boolean(value));

  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        // Navegadores sem 'strict-dynamic' usam a lista de origens.
        turnstile,
        ...extra(isDev && "'unsafe-eval'"),
      ],
    ],
    // Estilos inline: atributos style do React e do MapLibre.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", ...extra(supabase, map)]],
    // Vídeos enviados (Storage do Supabase) e a prévia local no painel (blob:).
    ["media-src", ["'self'", "blob:", ...extra(supabase)]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'", ...extra(supabase, map, turnstile, isDev && "ws:")]],
    ["worker-src", ["'self'", "blob:"]],
    ["frame-src", [turnstile]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
  ];
  if (siteUrl.startsWith("https://")) directives.push(["upgrade-insecure-requests", []]);

  return directives.map(([name, values]) => [name, ...values].join(" ")).join("; ");
}

/** Nonce aleatório em base64 (Web Crypto: funciona no Node e no Workers). */
export function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
