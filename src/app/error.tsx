"use client";

import { useEffect } from "react";

import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";

/** Erro inesperado em qualquer página (o layout continua visível). */
export default function Error({
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
    <main id="conteudo" className="flex flex-1 items-center py-16">
      <Container>
        <ErrorState digest={error.digest} retry={retry} />
      </Container>
    </main>
  );
}
