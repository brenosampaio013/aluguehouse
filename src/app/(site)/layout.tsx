import { unstable_rethrow } from "next/navigation";

import { FavoritesProvider } from "@/components/favorites/favorites-provider";
import { MobileTabBar } from "@/components/site/mobile-tab-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getFavoriteState } from "@/server/queries/favorites";

async function loadFavorites() {
  try {
    return await getFavoriteState();
  } catch (error) {
    // Sinais internos do Next (página dinâmica, redirect, 404) não são falhas.
    unstable_rethrow(error);
    // Sem os favoritos o site continua funcionando; os corações ficam vazios.
    console.error("Falha ao carregar favoritos", error);
    return { signedIn: false, ids: [] };
  }
}

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const favorites = await loadFavorites();
  return (
    <FavoritesProvider signedIn={favorites.signedIn} initialIds={favorites.ids}>
      <SiteHeader />
      {children}
      <SiteFooter />
      <MobileTabBar />
    </FavoritesProvider>
  );
}
