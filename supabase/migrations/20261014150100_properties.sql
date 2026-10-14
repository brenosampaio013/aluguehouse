-- Etapa 4 — Imóveis, dados privados, mídia, comodidades, tarifas e taxas.

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  title text not null check (char_length(title) between 3 and 120),
  summary text check (char_length(summary) <= 300),
  description text check (char_length(description) <= 10000),
  property_type public.property_type not null,
  offers_seasonal boolean not null default false,
  offers_monthly boolean not null default false,
  offers_sale boolean not null default false,
  city text not null check (char_length(city) between 2 and 80),
  neighborhood text check (char_length(neighborhood) <= 80),
  -- Localização pública aproximada: preenchida a partir de property_private.
  approx_lat numeric(8, 5) check (approx_lat between -90 and 90),
  approx_lng numeric(8, 5) check (approx_lng between -180 and 180),
  bedrooms smallint not null default 0 check (bedrooms between 0 and 50),
  suites smallint not null default 0 check (suites between 0 and 50),
  bathrooms smallint not null default 0 check (bathrooms between 0 and 50),
  max_guests smallint not null default 1 check (max_guests between 1 and 50),
  parking_spots smallint not null default 0 check (parking_spots between 0 and 50),
  area_m2 numeric(8, 2) check (area_m2 > 0),
  distance_to_beach_m integer check (distance_to_beach_m >= 0),
  nightly_price numeric(12, 2) check (nightly_price > 0),
  monthly_price numeric(12, 2) check (monthly_price > 0),
  min_nights smallint not null default 1 check (min_nights between 1 and 29),
  -- Locação por temporada vai até 90 dias (Lei 8.245/91, art. 48).
  max_nights smallint not null default 90 check (max_nights between 1 and 90),
  sale_price numeric(14, 2) check (sale_price > 0),
  condo_fee numeric(12, 2) check (condo_fee >= 0),
  iptu_yearly numeric(12, 2) check (iptu_yearly >= 0),
  check_in_time time not null default '15:00',
  check_out_time time not null default '11:00',
  house_rules text check (char_length(house_rules) <= 5000),
  status public.property_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_nights_order check (min_nights <= max_nights),
  constraint properties_suites_le_bedrooms check (suites <= bedrooms),
  -- Rascunhos podem estar incompletos; publicados precisam ser coerentes.
  constraint properties_published_complete check (
    status <> 'published' or (
      (offers_seasonal or offers_monthly or offers_sale)
      and (not offers_seasonal or nightly_price is not null)
      and (not offers_monthly or monthly_price is not null)
      and (not offers_sale or sale_price is not null)
      and published_at is not null
    )
  )
);

create index properties_published_idx on public.properties (city, neighborhood)
  where status = 'published';

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function private.set_updated_at();

-- Dados que nunca são públicos.
create table public.property_private (
  property_id uuid primary key references public.properties (id) on delete cascade,
  full_address text check (char_length(full_address) <= 300),
  exact_lat numeric(9, 6) check (exact_lat between -90 and 90),
  exact_lng numeric(9, 6) check (exact_lng between -180 and 180),
  owner_notes text check (char_length(owner_notes) <= 5000),
  updated_at timestamptz not null default now(),
  constraint property_private_coords_pair check ((exact_lat is null) = (exact_lng is null))
);

create trigger property_private_set_updated_at
  before update on public.property_private
  for each row execute function private.set_updated_at();

-- Localização aproximada: encaixa a coordenada exata numa grade de ~550 m e
-- aplica um deslocamento fixo por imóvel (até ~170 m). O resultado é estável
-- (não muda a cada edição) e não revela a casa.
create function private.approximate_coordinate(p_value numeric, p_seed text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round(
    round(p_value / 0.005) * 0.005
      + ((('x' || substr(md5(p_seed), 1, 8))::bit(32)::bigint / 4294967295.0) - 0.5) * 0.003,
    5
  );
$$;

create function private.sync_approx_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.properties
     set approx_lat = case when new.exact_lat is null then null
                           else private.approximate_coordinate(new.exact_lat, new.property_id::text || ':lat') end,
         approx_lng = case when new.exact_lng is null then null
                           else private.approximate_coordinate(new.exact_lng, new.property_id::text || ':lng') end
   where id = new.property_id;
  return new;
end;
$$;

create trigger property_private_sync_approx
  after insert or update of exact_lat, exact_lng on public.property_private
  for each row execute function private.sync_approx_location();

-- Fotos, vídeos e tours
create table public.property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  kind public.media_kind not null,
  storage_path text check (char_length(storage_path) <= 500),
  external_url text check (external_url ~ '^https://' and char_length(external_url) <= 500),
  alt_text text not null check (char_length(alt_text) between 3 and 250),
  width integer check (width > 0),
  height integer check (height > 0),
  position integer not null default 0,
  is_cover boolean not null default false,
  -- Imagem de demonstração: o site deve exibir o selo "Foto ilustrativa".
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint property_media_one_source check (num_nonnulls(storage_path, external_url) = 1),
  constraint property_media_image_in_storage check (kind <> 'image' or storage_path is not null)
);

create index property_media_property_idx on public.property_media (property_id, position);
create unique index property_media_one_cover_idx on public.property_media (property_id) where is_cover;

-- Comodidades
create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (char_length(label) between 2 and 60)
);

create table public.property_amenities (
  property_id uuid not null references public.properties (id) on delete cascade,
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  primary key (property_id, amenity_id)
);

insert into public.amenities (slug, label) values
  ('piscina', 'Piscina'),
  ('churrasqueira', 'Churrasqueira'),
  ('ar-condicionado', 'Ar-condicionado'),
  ('wi-fi', 'Wi-Fi'),
  ('cozinha-equipada', 'Cozinha equipada'),
  ('maquina-de-lavar', 'Máquina de lavar'),
  ('estacionamento', 'Estacionamento'),
  ('varanda', 'Varanda'),
  ('vista-para-o-mar', 'Vista para o mar'),
  ('pe-na-areia', 'Pé na areia'),
  ('aceita-pets', 'Aceita pets'),
  ('roupa-de-cama', 'Roupa de cama e banho'),
  ('area-de-lazer', 'Área de lazer no condomínio'),
  ('elevador', 'Elevador'),
  ('portaria-24h', 'Portaria 24 horas');

-- Tarifas sazonais (Réveillon, Carnaval, férias…). Sem sobreposição.
create table public.seasonal_rates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  label text not null check (char_length(label) between 2 and 60),
  period daterange not null check (private.is_valid_stay(period)),
  nightly_price numeric(12, 2) not null check (nightly_price > 0),
  min_nights smallint check (min_nights between 1 and 29),
  created_at timestamptz not null default now(),
  constraint seasonal_rates_no_overlap exclude using gist (property_id with =, period with &&)
);

-- Taxas configuráveis. Reembolsáveis (caução) são informativas e não entram
-- no total.
create table public.property_fees (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  label text not null check (char_length(label) between 2 and 60),
  calc public.fee_calc not null,
  amount numeric(12, 2) not null check (amount >= 0),
  applies_to public.fee_applies_to not null default 'both',
  is_refundable boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint property_fees_percent_range check (calc <> 'percent' or amount <= 100)
);

create index property_fees_property_idx on public.property_fees (property_id, position);
