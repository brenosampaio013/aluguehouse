function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Defina ${name} (veja .env.example e docs/autenticacao.md) para rodar os testes de login.`,
    );
  }
  return value;
}

export const testEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get serviceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get mailpitUrl() {
    return process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
  },
};
