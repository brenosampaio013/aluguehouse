/** Esqueleto enquanto a página do painel carrega (o menu continua visível). */
export default function Loading() {
  return (
    <main id="conteudo" aria-busy="true" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <p role="status" className="sr-only">
        Carregando…
      </p>
      <div
        className="mx-auto grid w-full max-w-[88rem] animate-pulse grid-cols-[minmax(0,1fr)] gap-6"
        aria-hidden="true"
      >
        <div className="h-9 w-64 rounded-control bg-areia/70" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-28 rounded-photo border border-areia bg-branco" />
          ))}
        </div>
        <div className="h-80 rounded-photo border border-areia bg-branco" />
      </div>
    </main>
  );
}
