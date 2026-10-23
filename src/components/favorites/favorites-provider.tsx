"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { setFavorite } from "@/server/actions/favorites";

type Toast = { tone: "success" | "error"; text: string; link?: boolean };

type FavoritesContext = {
  signedIn: boolean;
  /** Quantos imóveis a pessoa salvou (0 para visitantes). */
  count: number;
  isSaved: (propertyId: string) => boolean;
  toggle: (propertyId: string, title: string) => void;
};

const Context = createContext<FavoritesContext | null>(null);

export function useFavorites() {
  const value = useContext(Context);
  if (!value) throw new Error("useFavorites fora do FavoritesProvider");
  return value;
}

/**
 * Estado dos favoritos de quem está conectado, compartilhado pelos botões de
 * coração da página. Atualiza na hora e desfaz se o servidor recusar.
 */
export function FavoritesProvider({
  signedIn,
  initialIds,
  children,
}: {
  signedIn: boolean;
  initialIds: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(() => new Set(initialIds));
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Novos dados do servidor (outra página, login, atualização) substituem os locais.
  const [lastInitial, setLastInitial] = useState(initialIds);
  if (lastInitial !== initialIds) {
    setLastInitial(initialIds);
    setSaved(new Set(initialIds));
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = useCallback((next: Toast) => {
    setToast(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const toggle = useCallback(
    (propertyId: string, title: string) => {
      if (!signedIn) {
        const here = `${window.location.pathname}${window.location.search}`;
        router.push(`/entrar?next=${encodeURIComponent(here)}`);
        return;
      }
      const save = !saved.has(propertyId);
      const apply = (value: boolean) =>
        setSaved((current) => {
          const next = new Set(current);
          if (value) next.add(propertyId);
          else next.delete(propertyId);
          return next;
        });

      apply(save);
      void setFavorite(propertyId, save).then((result) => {
        if (result.ok) {
          show(
            save
              ? { tone: "success", text: `${title} foi salvo nos favoritos.`, link: true }
              : { tone: "success", text: `${title} saiu dos favoritos.` },
          );
          return;
        }
        apply(!save);
        if (result.reason === "signed_out") {
          router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        show({ tone: "error", text: "Não foi possível atualizar os favoritos. Tente de novo." });
      });
    },
    [router, saved, show, signedIn],
  );

  const isSaved = useCallback((propertyId: string) => saved.has(propertyId), [saved]);

  return (
    <Context value={{ signedIn, count: saved.size, isSaved, toggle }}>
      {children}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-8"
      >
        {toast ? (
          <p
            className={
              toast.tone === "error"
                ? "pointer-events-auto flex flex-wrap items-center gap-x-3 rounded-control border-2 border-erro bg-branco px-4 py-3 text-erro shadow-lg"
                : "pointer-events-auto flex flex-wrap items-center gap-x-3 rounded-control bg-petroleo px-4 py-3 text-branco shadow-lg ring-2 ring-branco"
            }
          >
            {toast.text}
            {toast.link && pathname !== "/favoritos" ? (
              <Link href="/favoritos" className="font-semibold underline underline-offset-3">
                Ver favoritos
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </Context>
  );
}
