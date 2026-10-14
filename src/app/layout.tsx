import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";

import { SkipLink } from "@/components/ui/skip-link";
import { siteConfig } from "@/lib/site-config";

import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: "#13606e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${newsreader.variable} ${hanken.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
