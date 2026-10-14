import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Cache incremental em R2 será ativado quando houver páginas com ISR
// (exige criar o bucket na conta Cloudflare). Até lá, configuração padrão.
export default defineCloudflareConfig({});
