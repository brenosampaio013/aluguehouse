import { serializeJsonLd } from "@/lib/seo/json-ld";

/** Dados estruturados para buscadores (não executa: type="application/ld+json"). */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Conteúdo serializado com "<" escapado (serializeJsonLd).
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
