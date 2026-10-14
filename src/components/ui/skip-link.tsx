/** Primeiro elemento focável da página: leva direto ao conteúdo principal. */
export function SkipLink({ targetId = "conteudo" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only rounded-control bg-petroleo px-4 py-3 font-semibold text-branco focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Pular para o conteúdo
    </a>
  );
}
