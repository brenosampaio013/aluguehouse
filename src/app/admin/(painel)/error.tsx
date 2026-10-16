"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { AlertIcon } from "@/components/ui/icons";

/** Erro inesperado numa página do painel: o menu continua utilizável. */
export default function PainelError({
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
    <main id="conteudo" className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="grid max-w-md justify-items-center gap-4 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-erro/10 text-erro">
          <AlertIcon />
        </span>
        <h1 className="text-h3 font-semibold">Não foi possível carregar esta página</h1>
        <p className="text-rocha">
          Pode ser uma falha momentânea de conexão com o banco de dados. Nada foi alterado. Tente de
          novo; se continuar, use outra seção do menu e volte em alguns minutos.
        </p>
        <Button onClick={() => retry()}>Tentar de novo</Button>
        {error.digest ? (
          <p className="text-small text-rocha">Código do erro: {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}
