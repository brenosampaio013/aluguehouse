import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import { connection } from "next/server";

import { SkipLink } from "@/components/ui/skip-link";
import { getPublicEnv } from "@/lib/env";
import { indexingEnabled } from "@/lib/seo/indexing";
import { siteConfig } from "@/lib/site-config";

import "./globals.css";

// Só os pesos usados (400 nos títulos, 500 no logotipo): arquivos estáticos
// bem menores que a fonte variável com eixo óptico (melhor LCP no celular).
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const indexing = indexingEnabled();
  return {
    metadataBase: new URL(getPublicEnv().NEXT_PUBLIC_SITE_URL),
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    openGraph: {
      siteName: siteConfig.name,
      locale: "pt_BR",
      type: "website",
    },
    twitter: { card: "summary_large_image" },
    // Sem SITE_INDEXING=on, nenhuma página entra no Google (docs/seo.md).
    robots: indexing ? undefined : { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#13606e",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Renderização a cada requisição: o nonce da CSP (proxy.ts) muda sempre.
  await connection();
  return (
    <html lang="pt-BR" className={`${newsreader.variable} ${hanken.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
