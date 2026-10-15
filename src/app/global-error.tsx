"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/error-state";

import "./globals.css";

/** Erro no próprio layout raiz: substitui o documento inteiro. */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh items-center bg-branco px-4 py-16 text-abismo sm:px-8">
        <title>Algo deu errado | Alugue Houses</title>
        <main id="conteudo">
          <ErrorState digest={error.digest} retry={retry} />
        </main>
      </body>
    </html>
  );
}
