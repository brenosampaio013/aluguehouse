import "server-only";

import { parseServerEnv, type ServerEnv } from "./env";

export function getServerEnv(): ServerEnv {
  return parseServerEnv({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
