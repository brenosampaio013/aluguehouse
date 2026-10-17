import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Portal do proprietário", template: "%s | Portal do proprietário" },
  robots: { index: false, follow: false },
};

export default function ProprietarioRootLayout({ children }: LayoutProps<"/proprietario">) {
  return children;
}
