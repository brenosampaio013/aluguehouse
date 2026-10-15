// Compara o manifesto do backup com o do banco restaurado.
// Uso: node scripts/backup/verify.mjs <manifesto-do-backup.json> <manifesto-restaurado.json>
import { readFile } from "node:fs/promises";

const [expectedFile, actualFile] = process.argv.slice(2);
const expected = JSON.parse(await readFile(expectedFile, "utf8"));
const actual = JSON.parse(await readFile(actualFile, "utf8"));

const problems = [];
for (const [table, info] of Object.entries(expected)) {
  const got = actual[table];
  if (!got) problems.push(`${table}: tabela ausente`);
  else if (got.rows !== info.rows)
    problems.push(`${table}: ${got.rows} linhas (esperado ${info.rows})`);
  else if (got.md5 !== info.md5) problems.push(`${table}: conteúdo diferente`);
}

if (problems.length > 0) {
  console.error(`Restauração NÃO confere:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
const rows = Object.values(expected).reduce((sum, info) => sum + info.rows, 0);
console.log(`Banco: ${Object.keys(expected).length} tabelas e ${rows} linhas conferidas.`);
