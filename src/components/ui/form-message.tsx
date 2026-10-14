import { cn } from "@/lib/cn";

/**
 * Mensagem de resultado de formulário. Erros usam role="alert" (anunciados
 * na hora); sucesso usa role="status" (anunciado sem interromper).
 */
export function FormMessage({
  tone,
  children,
  className,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-control px-4 py-3 text-body",
        tone === "error" ? "border-2 border-erro bg-branco text-erro" : "bg-nevoa text-abismo",
        className,
      )}
    >
      {children}
    </p>
  );
}
