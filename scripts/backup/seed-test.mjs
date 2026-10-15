// Dados de exemplo para o teste de backup e restauração (CI e local).
// Cria hóspede, imóvel com foto real, reserva, avaliação e mensagem.
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};
const day = (offset) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

const run = randomUUID().slice(0, 8);
const email = `backup-${run}@teste.local`;
const user = must(await supabase.auth.admin.createUser({ email, email_confirm: true })).user;

const property = must(
  await supabase
    .from("properties")
    .insert({
      slug: `casa-backup-${run}`,
      title: `Casa do backup ${run}`,
      property_type: "casa",
      city: "Bertioga",
      offers_seasonal: true,
      nightly_price: 950,
      max_guests: 6,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single(),
);

const mediaId = randomUUID();
must(
  await supabase.storage
    .from("property-media")
    .upload(
      `${property.id}/${mediaId}/640.webp`,
      await readFile("media/recebidas/imovel-01/sala-jantar.jpg"),
      { contentType: "image/jpeg" },
    ),
);
must(
  await supabase.from("property_media").insert({
    id: mediaId,
    property_id: property.id,
    kind: "image",
    storage_path: `${property.id}/${mediaId}`,
    width: 640,
    height: 480,
    alt_text: "Sala de jantar",
    is_cover: true,
  }),
);

// Um vídeo enviado (arquivo no bucket de vídeos e miniatura no de fotos).
const videoId = randomUUID();
const videoPath = `${property.id}/${videoId}/video.webm`;
const posterPath = `${property.id}/${videoId}/poster.webp`;
must(
  await supabase.storage
    .from("property-videos")
    .upload(videoPath, await readFile("tests/e2e/fixtures/video-vertical.webm"), {
      contentType: "video/webm",
    }),
);
must(
  await supabase.storage
    .from("property-media")
    .upload(posterPath, await readFile("media/recebidas/imovel-01/sala-jantar.jpg"), {
      contentType: "image/jpeg",
    }),
);
must(
  await supabase.from("property_media").insert({
    id: videoId,
    property_id: property.id,
    kind: "video",
    video_source: "file",
    storage_path: videoPath,
    poster_path: posterPath,
    caption: "Área da piscina",
    alt_text: "Vídeo: Área da piscina",
    width: 360,
    height: 640,
    duration_seconds: 2,
    position: 0,
  }),
);

const booking = must(
  await supabase
    .from("booking_requests")
    .insert({
      property_id: property.id,
      rental_mode: "seasonal",
      guest_name: "Hóspede Backup",
      guest_email: email,
      guest_phone: "13999999999",
      stay: `[${day(-10)},${day(-6)})`,
      guests_count: 2,
      quote_snapshot: { total: 3800 },
      quoted_total: 3800,
      privacy_consent_at: new Date().toISOString(),
      status: "approved",
    })
    .select("id, stay")
    .single(),
);
must(
  await supabase.from("calendar_blocks").insert({
    property_id: property.id,
    stay: booking.stay,
    kind: "booking",
    booking_request_id: booking.id,
  }),
);
must(
  await supabase.from("reviews").insert({
    property_id: property.id,
    booking_request_id: booking.id,
    author_id: user.id,
    rating: 5,
    comment: "Ótima estadia.",
    status: "approved",
  }),
);
must(await supabase.from("favorites").insert({ user_id: user.id, property_id: property.id }));
must(
  await supabase.from("inquiries").insert({
    kind: "contact",
    name: "Contato Backup",
    email,
    message: "Mensagem de teste do backup.",
    privacy_consent_at: new Date().toISOString(),
  }),
);
console.log(`Dados de exemplo criados (${run}).`);
