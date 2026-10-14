-- Etapa 4 — Favoritos, avaliações moderadas e mensagens de contato.

create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  booking_request_id uuid not null unique references public.booking_requests (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Apenas o primeiro nome do hóspede é exibido publicamente.
  author_display_name text not null default '',
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  status public.review_status not null default 'pending',
  admin_reply text check (char_length(admin_reply) <= 2000),
  created_at timestamptz not null default now(),
  moderated_at timestamptz
);

create index reviews_property_status_idx on public.reviews (property_id, status);

-- Pode avaliar quem tem estadia aprovada e já concluída, identificado pelo
-- e-mail verificado no login (o mesmo usado na solicitação).
create function private.can_review(p_booking_id uuid, p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.booking_requests b
     where b.id = p_booking_id
       and b.property_id = p_property_id
       and b.status = 'approved'
       and upper(b.stay) <= private.today_sp()
       and nullif(auth.jwt() ->> 'email', '') is not null
       and b.guest_email = lower(auth.jwt() ->> 'email')
  );
$$;

grant execute on function private.can_review(uuid, uuid) to authenticated;

create function private.set_review_author_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select split_part(btrim(b.guest_name), ' ', 1)
    into new.author_display_name
    from public.booking_requests b
   where b.id = new.booking_request_id;
  return new;
end;
$$;

create trigger reviews_set_author_name
  before insert on public.reviews
  for each row execute function private.set_review_author_name();

-- Estadias do hóspede logado (sem notas internas do administrador).
create function public.get_my_stays()
returns table (
  booking_request_id uuid,
  property_id uuid,
  property_title text,
  property_slug text,
  check_in date,
  check_out date,
  status public.booking_status,
  can_review boolean,
  has_review boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id,
         p.id,
         p.title,
         p.slug,
         lower(b.stay),
         upper(b.stay),
         b.status,
         b.status = 'approved' and upper(b.stay) <= private.today_sp() and r.id is null,
         r.id is not null
    from public.booking_requests b
    join public.properties p on p.id = b.property_id
    left join public.reviews r on r.booking_request_id = b.id
   where nullif(auth.jwt() ->> 'email', '') is not null
     and b.guest_email = lower(auth.jwt() ->> 'email')
   order by lower(b.stay) desc;
$$;

-- Mensagens de contato, pedidos de visita e interesse em compra.
-- Gravadas apenas pelo servidor (Server Action com validação e anti-spam).
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  kind public.inquiry_kind not null,
  property_id uuid references public.properties (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (phone ~ '^[0-9]{10,13}$'),
  message text not null check (char_length(message) between 1 and 4000),
  preferred_datetime timestamptz,
  status public.inquiry_status not null default 'new',
  privacy_consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index inquiries_status_idx on public.inquiries (status, created_at desc);
