import "server-only";

import { parseServerEnv, type ServerEnv } from "./server-env-schema";

export function getServerEnv(): ServerEnv {
  return parseServerEnv({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    ADMIN_NOTIFY_EMAIL: process.env.ADMIN_NOTIFY_EMAIL || undefined,
    MAILPIT_URL: process.env.MAILPIT_URL || undefined,
    VIDEO_MAX_UPLOAD_MB: process.env.VIDEO_MAX_UPLOAD_MB || undefined,
    VIDEO_MAX_PER_PROPERTY: process.env.VIDEO_MAX_PER_PROPERTY || undefined,
  });
}
