// Fotos e vídeos do Storage no backup: baixa, envia de volta e confere.
// Uso: node scripts/backup/storage.mjs <download|upload|verify> <pasta>
// Variáveis: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const BUCKETS = ["property-media", "property-videos"];
const [command, dir] = process.argv.slice(2);
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!["download", "upload", "verify"].includes(command) || !dir) {
  console.error("Uso: storage.mjs <download|upload|verify> <pasta>");
  process.exit(2);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

/** Lista todos os arquivos do bucket (pastas aninhadas). */
async function listAll(bucket, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) files.push(...(await listAll(bucket, full)));
      else files.push({ path: full, contentType: item.metadata?.mimetype });
    }
    if (data.length < 1000) break;
  }
  return files;
}

async function download(bucket, file) {
  const { data, error } = await supabase.storage.from(bucket).download(file);
  if (error) throw new Error(`${bucket}/${file}: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function walk(root) {
  const entries = await readdir(root, { withFileTypes: true, recursive: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)));
}

let total = 0;
for (const bucket of BUCKETS) {
  const bucketDir = path.join(dir, bucket);
  const indexFile = path.join(dir, `${bucket}.json`);

  if (command === "download") {
    const files = await listAll(bucket);
    const index = {};
    for (const file of files) {
      const buffer = await download(bucket, file.path);
      const target = path.join(bucketDir, file.path);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, buffer);
      index[file.path] = { sha256: sha256(buffer), contentType: file.contentType ?? null };
      total += 1;
    }
    await mkdir(dir, { recursive: true });
    await writeFile(indexFile, JSON.stringify(index, null, 2));
  }

  // Backups feitos antes de existir o bucket de vídeos não têm o índice dele.
  const index =
    command === "download" ? null : await readFile(indexFile, "utf8").then(JSON.parse, () => null);
  if (command !== "download" && !index) {
    console.log(`Storage: ${bucket} ausente neste backup (anterior a ele); ignorado.`);
    continue;
  }

  if (command === "upload") {
    for (const file of await walk(bucketDir)) {
      const key = file.split(path.sep).join("/");
      const { error } = await supabase.storage
        .from(bucket)
        .upload(key, await readFile(path.join(bucketDir, file)), {
          upsert: true,
          contentType: index[key]?.contentType ?? undefined,
        });
      if (error) throw new Error(`${bucket}/${key}: ${error.message}`);
      total += 1;
    }
  }

  if (command === "verify") {
    const remote = new Set((await listAll(bucket)).map((file) => file.path));
    for (const [key, info] of Object.entries(index)) {
      if (!remote.has(key)) throw new Error(`Faltando no Storage: ${bucket}/${key}`);
      if (sha256(await download(bucket, key)) !== info.sha256) {
        throw new Error(`Conteúdo diferente: ${bucket}/${key}`);
      }
      total += 1;
    }
  }
}

const verbs = { download: "baixados", upload: "enviados", verify: "conferidos" };
console.log(`Storage: ${total} arquivo(s) ${verbs[command]}.`);
