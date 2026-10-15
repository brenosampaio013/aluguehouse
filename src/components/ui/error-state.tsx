"use client";

import { siteConfig } from "@/lib/site-config";

/**
 * Conteúdo das páginas de erro inesperado: explica, oferece tentar de novo e
 * um canal direto. O código (digest) ajuda a achar o erro nos registros.
 */
export function ErrorState({ digest, retry }: { digest?: string; retry: () => void }) {
  const { whatsapp, whatsappDisplay } = siteConfig.contact;
  return (
    <div className="grid max-w-xl gap-5">
      <h1 className="font-serif text-h1 font-normal">Algo deu errado</h1>
      <p className="text-rocha">
        Não conseguimos carregar esta página agora. Tente de novo em instantes; se continuar, fale
        com a gente pelo WhatsApp {whatsappDisplay}.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-11 items-center justify-center rounded-control bg-petroleo px-5 font-semibold text-branco hover:bg-abismo"
        >
          Tentar de novo
        </button>
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-petroleo px-5 font-semibold text-petroleo hover:bg-nevoa"
        >
          Falar no WhatsApp
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </div>
      {digest ? <p className="text-small text-rocha">Código do erro: {digest}</p> : null}
    </div>
  );
}
