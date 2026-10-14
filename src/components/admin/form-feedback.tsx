import { FormMessage } from "@/components/ui/form-message";
import type { FormState } from "@/server/actions/auth";

/** Mensagem de sucesso ou erro geral de um formulário do painel. */
export function FormFeedback({ state }: { state: FormState }) {
  if (!state.message || state.status === "idle") return null;
  return (
    <FormMessage tone={state.status === "success" ? "success" : "error"}>
      {state.message}
    </FormMessage>
  );
}
