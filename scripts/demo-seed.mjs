// Dados de DEMONSTRAÇÃO para ver o site no computador (só banco local).
// Cria o imóvel 01 com as 5 fotos reais (autorizadas pelo proprietário) e um
// administrador local. Uso: pnpm demo:seed
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url) || !key) {
  console.error("Este script só roda contra o Supabase LOCAL (veja .env.local).");
  process.exit(1);
}

const api = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const SLUG = "imovel-01-demonstracao";
const ADMIN = { email: "admin@alugue.local", password: "SenhaLocal2026" };
const FOTOS = [
  ["sala-jantar", "Sala de jantar integrada à cozinha"],
  ["cozinha", "Cozinha equipada"],
  ["quarto-casal", "Quarto de casal"],
  ["quarto-beliche", "Quarto com beliche"],
  ["banheiro", "Banheiro social"],
];

// Recomeça do zero: apaga o imóvel de demonstração anterior.
const old = must(await api.from("properties").select("id").eq("slug", SLUG));
for (const { id } of old) {
  await api.from("booking_requests").delete().eq("property_id", id);
  await api.from("properties").delete().eq("id", id);
}

const amenities = must(await api.from("amenities").select("id, slug"));
const property = must(
  await api
    .from("properties")
    .insert({
      slug: SLUG,
      title: "Imóvel 01 (demonstração)",
      summary: "Dados de demonstração para conhecer o site. Fotos reais, valores fictícios.",
      description:
        "Este anúncio é só para demonstração: as fotos são reais e autorizadas pelo proprietário, mas preços, regras e localização são fictícios.",
      property_type: "apartamento",
      city: "Bertioga",
      neighborhood: "Riviera de São Lourenço",
      region: "riviera-de-sao-lourenco",
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      max_guests: 6,
      parking_spots: 1,
      area_m2: 85,
      distance_to_beach_m: 400,
      offers_seasonal: true,
      offers_monthly: true,
      nightly_price: 650,
      monthly_price: 9000,
      min_nights: 2,
      house_rules: "Não é permitido fumar. Silêncio após as 22h.",
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single(),
);
must(
  await api.from("property_private").insert({
    property_id: property.id,
    full_address: "Endereço de demonstração",
    exact_lat: -23.8032,
    exact_lng: -46.0219,
  }),
);
must(
  await api
    .from("property_amenities")
    .insert(
      amenities
        .filter((a) => ["wi-fi", "ar-condicionado", "piscina", "churrasqueira"].includes(a.slug))
        .map((a) => ({ property_id: property.id, amenity_id: a.id })),
    ),
);
must(
  await api.from("property_fees").insert({
    property_id: property.id,
    label: "Limpeza",
    calc: "fixed",
    amount: 250,
    applies_to: "seasonal",
  }),
);

for (const [index, [file, alt]] of FOTOS.entries()) {
  const mediaId = randomUUID();
  const buffer = await readFile(`media/recebidas/imovel-01/${file}.jpg`);
  // Local: a foto original serve as duas larguras (o painel gera WebP de verdade).
  for (const width of [640, 1280]) {
    must(
      await api.storage
        .from("property-media")
        .upload(`${property.id}/${mediaId}/${width}.webp`, buffer, { contentType: "image/jpeg" }),
    );
  }
  must(
    await api.from("property_media").insert({
      id: mediaId,
      property_id: property.id,
      kind: "image",
      storage_path: `${property.id}/${mediaId}`,
      width: 1280,
      height: 960,
      alt_text: alt,
      position: index,
      is_cover: index === 0,
    }),
  );
}

// Administrador local (o segundo fator é cadastrado no primeiro acesso).
const { data: users } = await api.auth.admin.listUsers({ perPage: 1000 });
const existing = users.users.find((u) => u.email === ADMIN.email);
if (existing) await api.auth.admin.deleteUser(existing.id);
must(
  await api.auth.admin.createUser({
    email: ADMIN.email,
    password: ADMIN.password,
    email_confirm: true,
    app_metadata: { role: "admin" },
  }),
);

console.log(`
✓ Demonstração pronta.
  Imóvel:  http://localhost:3000/imoveis/${SLUG}
  Painel:  http://localhost:3000/admin
           e-mail ${ADMIN.email} · senha ${ADMIN.password}
           (no primeiro acesso, leia o QR code com um app autenticador)
  E-mails (link de login dos hóspedes): http://127.0.0.1:54324
`);
