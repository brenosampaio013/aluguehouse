import Link from "next/link";

/** Link para a política, em nova aba para não perder o que foi digitado. */
export function PrivacyLink({ children = "Política de privacidade" }: { children?: string }) {
  return (
    <Link
      href="/privacidade"
      target="_blank"
      rel="noopener"
      className="text-petroleo underline underline-offset-3"
    >
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </Link>
  );
}

export function TermsLink() {
  return (
    <Link
      href="/termos"
      target="_blank"
      rel="noopener"
      className="text-petroleo underline underline-offset-3"
    >
      Termos de uso
      <span className="sr-only"> (abre em nova aba)</span>
    </Link>
  );
}
