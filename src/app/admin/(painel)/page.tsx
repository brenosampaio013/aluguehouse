import { Container } from "@/components/ui/container";

export default function PainelPage() {
  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-4">
        <h1 className="font-serif text-h1 font-normal">Painel</h1>
        <p className="max-w-[60ch] text-rocha">
          Acesso confirmado. O cadastro de imóveis, fotos, tarifas e taxas entra na próxima etapa.
        </p>
      </Container>
    </main>
  );
}
