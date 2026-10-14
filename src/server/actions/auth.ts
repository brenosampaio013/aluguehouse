"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "@/lib/zod";

import { NEXT_PATH_COOKIE, safeNextPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Valores para preencher de novo o formulário após um erro (nunca senhas). */
  values?: { email?: string };
};

const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .max(254, "E-mail muito longo.")
  .pipe(z.email("Informe um e-mail válido, ex.: nome@exemplo.com."));

function isRateLimited(error: { status?: number; code?: string }) {
  return error.status === 429 || error.code === "over_email_send_rate_limit";
}

/** Hóspede: envia um link de acesso por e-mail (sem senha). */
export async function requestMagicLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: { email: parsed.error.issues[0]?.message ?? "E-mail inválido." },
      values: { email: String(formData.get("email") ?? "") },
    };
  }

  const next = safeNextPath(formData.get("next"));
  const cookieStore = await cookies();
  if (next) {
    cookieStore.set(NEXT_PATH_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60,
      path: "/",
    });
  } else {
    cookieStore.delete(NEXT_PATH_COOKIE);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: true },
  });

  if (error) {
    if (isRateLimited(error)) {
      return {
        status: "error",
        message: "Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo.",
        values: { email: parsed.data },
      };
    }
    return {
      status: "error",
      message: "Não foi possível enviar o link agora. Tente de novo em instantes.",
      values: { email: parsed.data },
    };
  }

  return {
    status: "success",
    message: `Enviamos um link de acesso para ${parsed.data}. Abra o e-mail neste aparelho para entrar.`,
  };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

const adminSignInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha.").max(200),
});

const GENERIC_SIGN_IN_ERROR = "E-mail ou senha incorretos.";

/** Admin: primeiro fator (e-mail e senha). O segundo fator vem em /admin/mfa. */
export async function adminSignIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = adminSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", fieldErrors, values };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (isRateLimited(error)) {
      return { status: "error", message: "Muitas tentativas. Aguarde alguns minutos.", values };
    }
    return { status: "error", message: GENERIC_SIGN_IN_ERROR, values };
  }

  // Quem não é admin não deve ficar logado por esta porta, nem descobrir que
  // a senha estava certa.
  if (data.user?.app_metadata?.role !== "admin") {
    await supabase.auth.signOut();
    return { status: "error", message: GENERIC_SIGN_IN_ERROR, values };
  }

  redirect("/admin/mfa");
}

export type EnrollState = FormState & {
  factorId?: string;
  qrCode?: string;
  secret?: string;
};

async function requireAdminFirstFactor() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.app_metadata?.role !== "admin") redirect("/admin/entrar");
  return supabase;
}

/** Admin: inicia o cadastro do aplicativo autenticador (TOTP). */
export async function startTotpEnrollment(): Promise<EnrollState> {
  const supabase = await requireAdminFirstFactor();

  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp.some((factor) => factor.status === "verified")) {
    return { status: "error", message: "Já existe um autenticador cadastrado." };
  }

  // Remove tentativas de cadastro não concluídas.
  for (const factor of factors?.all ?? []) {
    if (factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Alugue Houses",
  });

  if (error || !data) {
    return { status: "error", message: "Não foi possível iniciar o cadastro. Tente de novo." };
  }

  return {
    status: "success",
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

const codeSchema = z.object({
  factorId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Digite os 6 números mostrados no aplicativo."),
});

/** Admin: confirma o código de 6 dígitos e eleva a sessão para aal2. */
export async function verifyTotp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = codeSchema.safeParse({
    factorId: formData.get("factorId"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues.find((i) => i.path[0] === "code");
    return {
      status: "error",
      fieldErrors: { code: issue?.message ?? "Código inválido." },
    };
  }

  const supabase = await requireAdminFirstFactor();
  const { error } = await supabase.auth.mfa.challengeAndVerify(parsed.data);

  if (error) {
    return {
      status: "error",
      fieldErrors: { code: "Código incorreto ou expirado. Confira o aplicativo e tente de novo." },
    };
  }

  redirect("/admin");
}
