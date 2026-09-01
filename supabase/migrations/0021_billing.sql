-- 0021_billing.sql
-- Infraestructura de cobros, tiers y facturación electrónica (FEL).
--
-- Principio: LexGT NO guarda datos de tarjeta. El cobro lo hace un proveedor
-- externo (Visanet / VanaPay / Paggo) en su propio checkout y avisa por
-- webhook; aquí solo queda el registro del pago, el tier que otorgó y la
-- factura que se emitió. La app nunca ve un PAN.
--
-- Cuatro tablas:
--   plans        catálogo de planes (tier + duración + precio) — editable
--   payments     un cobro, con su estado y el tier que otorga
--   invoices     la factura electrónica (FEL) de ese cobro
--   tier_events  bitácora de todo cambio de tier: pago, admin, vencimiento
--
-- La fuente de verdad del ACCESO sigue siendo `user_profiles.tier` +
-- `tier_expires_at` (NULL = sin vencimiento = vitalicio). Estas tablas la
-- alimentan; no la reemplazan.

-- ============================================================
-- PLANES
-- `tier` es texto libre a propósito: agregar un tier nuevo es insertar una
-- fila aquí, no una migración.
-- ============================================================
create table if not exists public.plans (
  key          text primary key,
  name         text not null,
  description  text,
  tier         text not null,
  -- NULL = vitalicio (no vence)
  months       integer check (months is null or months > 0),
  price_cents  integer not null check (price_cents >= 0),
  currency     text not null default 'GTQ',
  is_active    boolean not null default true,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.plans enable row level security;

drop policy if exists "public read active plans" on public.plans;
create policy "public read active plans"
  on public.plans for select
  using (is_active);

drop policy if exists "admin all plans" on public.plans;
create policy "admin all plans"
  on public.plans for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.plans (key, name, description, tier, months, price_cents, position)
values
  ('pro_1m',       'Pro mensual',    'Acceso Pro por 1 mes',   'pro', 1,    7500,  1),
  ('pro_6m',       'Pro semestral',  'Acceso Pro por 6 meses', 'pro', 6,   39000,  2),
  ('pro_12m',      'Pro anual',      'Acceso Pro por 12 meses','pro', 12,  69000,  3),
  ('pro_lifetime', 'Pro vitalicio',  'Acceso Pro sin vencimiento', 'pro', null, 0, 9)
on conflict (key) do nothing;

-- El vitalicio no se vende en línea: solo lo otorga un admin desde
-- lex-extractor. Se deja inactivo para que no aparezca en el checkout.
update public.plans set is_active = false where key = 'pro_lifetime';

-- ============================================================
-- PAGOS
-- `(provider, provider_payment_id)` único: los webhooks se reintentan y no
-- deben duplicar el cobro ni el tier.
-- ============================================================
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  plan_key            text references public.plans(key) on delete set null,
  provider            text not null,
  provider_payment_id text,
  amount_cents        integer not null check (amount_cents >= 0),
  currency            text not null default 'GTQ',
  status              text not null default 'pending'
                      check (status in ('pending','paid','failed','refunded','canceled')),
  tier_granted        text,
  months_granted      integer,
  paid_at             timestamptz,
  raw                 jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status, paid_at desc);

alter table public.payments enable row level security;

-- El usuario ve sus propios pagos (la ventana de "Mi cuenta").
drop policy if exists "owner select payments" on public.payments;
create policy "owner select payments"
  on public.payments for select
  using (auth.uid() = user_id);

drop policy if exists "admin all payments" on public.payments;
create policy "admin all payments"
  on public.payments for all
  using (public.is_admin())
  with check (public.is_admin());

-- Nadie escribe pagos con la anon key: los inserta el webhook con la
-- service-role key (que salta RLS) o un admin desde el panel.

-- ============================================================
-- FACTURAS (FEL — Infile u otro certificador)
-- ============================================================
create table if not exists public.invoices (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid not null references public.payments(id) on delete cascade,
  provider      text not null default 'infile',
  status        text not null default 'pending'
                check (status in ('pending','issued','failed','voided')),
  -- Datos que devuelve el certificador
  serie         text,
  numero        text,
  uuid_fel      text,
  authorized_at timestamptz,
  pdf_url       text,
  -- Datos del receptor (los da el usuario al pagar)
  nit           text,
  nombre        text,
  error         text,
  raw           jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists invoices_payment_idx on public.invoices (payment_id);

alter table public.invoices enable row level security;

drop policy if exists "owner select invoices" on public.invoices;
create policy "owner select invoices"
  on public.invoices for select
  using (exists (
    select 1 from public.payments p
    where p.id = invoices.payment_id and p.user_id = auth.uid()
  ));

drop policy if exists "admin all invoices" on public.invoices;
create policy "admin all invoices"
  on public.invoices for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- BITÁCORA DE TIERS
-- Todo cambio queda registrado: quién, cuándo, de qué a qué y por qué.
-- Es lo que hace auditable el "le puse Pro vitalicio a fulano".
-- ============================================================
create table if not exists public.tier_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  from_tier       text,
  to_tier         text not null,
  from_expires_at timestamptz,
  to_expires_at   timestamptz,
  source          text not null,            -- payment | admin | signup | expiry
  actor_id        uuid,                     -- admin que lo hizo, si aplica
  payment_id      uuid references public.payments(id) on delete set null,
  note            text,
  created_at      timestamptz not null default now()
);

create index if not exists tier_events_user_idx on public.tier_events (user_id, created_at desc);

alter table public.tier_events enable row level security;

drop policy if exists "owner select tier_events" on public.tier_events;
create policy "owner select tier_events"
  on public.tier_events for select
  using (auth.uid() = user_id);

drop policy if exists "admin all tier_events" on public.tier_events;
create policy "admin all tier_events"
  on public.tier_events for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- QUIÉN PUEDE TOCAR EL TIER
--
-- `0011` puso un trigger que solo deja cambiar las columnas de tier a un
-- admin de la app (JWT con app_metadata.role = 'admin'). Eso deja fuera dos
-- caminos legítimos que ahora existen:
--
--   1. el webhook de pagos, que entra con la service-role key;
--   2. el panel de lex-extractor, que se conecta directo a Postgres como
--      `postgres` (sin JWT: `is_admin()` no puede ser cierto ahí).
--
-- `tier_write_allowed()` es SECURITY INVOKER a propósito: necesita ver el rol
-- efectivo de la conexión. PostgREST ejecuta como `anon` o `authenticated`,
-- así que una petición con la anon key nunca cae en la rama del rol.
-- ============================================================
create or replace function public.tier_write_allowed()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.is_admin()
      or current_user in ('postgres', 'supabase_admin', 'service_role')
      or session_user in ('postgres', 'supabase_admin');
$$;

create or replace function public.prevent_tier_self_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.tier is distinct from old.tier
      or new.tier_expires_at is distinct from old.tier_expires_at
      or new.tier_source is distinct from old.tier_source)
     and not public.tier_write_allowed() then
    raise exception 'Not authorized to change tier fields';
  end if;
  return new;
end;
$$;

-- ============================================================
-- APLICAR UN TIER
--
-- Un solo camino para cambiar el acceso de un usuario, lo llame el webhook,
-- el panel de admin de la app o lex-extractor. Extiende desde el vencimiento
-- vigente si todavía no ha pasado (renovar no regala días ni los quita).
--   p_months NULL  → vitalicio (tier_expires_at = NULL)
--   p_months 0     → deja el vencimiento como está (solo cambia el tier)
-- ============================================================
create or replace function public.apply_tier(
  p_user_id    uuid,
  p_tier       text,
  p_months     integer default null,
  p_source     text default 'admin',
  p_payment_id uuid default null,
  p_note       text default null,
  p_lifetime   boolean default false
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile  public.user_profiles;
  v_from_tier text;
  v_from_exp  timestamptz;
  v_new_exp   timestamptz;
  v_base      timestamptz;
begin
  if not (public.is_admin()
          or coalesce(auth.role(), '') = 'service_role'
          or session_user in ('postgres', 'supabase_admin')) then
    raise exception 'Not authorized to change tier';
  end if;

  insert into public.user_profiles (user_id, tier, tier_source)
  values (p_user_id, 'free', 'manual')
  on conflict (user_id) do nothing;

  select tier, tier_expires_at into v_from_tier, v_from_exp
  from public.user_profiles where user_id = p_user_id;

  if p_lifetime then
    v_new_exp := null;
  elsif p_months is null then
    v_new_exp := v_from_exp;
  elsif p_months = 0 then
    v_new_exp := v_from_exp;
  else
    -- Renovar suma sobre lo que queda; un tier vencido arranca desde hoy.
    v_base := case
                when v_from_exp is not null and v_from_exp > now() and v_from_tier = p_tier
                then v_from_exp
                else now()
              end;
    v_new_exp := v_base + make_interval(months => p_months);
  end if;

  update public.user_profiles
     set tier = p_tier,
         tier_expires_at = v_new_exp,
         tier_source = p_source
   where user_id = p_user_id
  returning * into v_profile;

  insert into public.tier_events (
    user_id, from_tier, to_tier, from_expires_at, to_expires_at,
    source, actor_id, payment_id, note
  )
  values (
    p_user_id, v_from_tier, p_tier, v_from_exp, v_new_exp,
    p_source, auth.uid(), p_payment_id, p_note
  );

  return v_profile;
end;
$$;

revoke all on function public.apply_tier(uuid, text, integer, text, uuid, text, boolean) from public;
grant execute on function public.apply_tier(uuid, text, integer, text, uuid, text, boolean)
  to authenticated, service_role;

-- ============================================================
-- REGISTRAR UN PAGO Y OTORGAR EL TIER (webhook)
--
-- Idempotente por `(provider, provider_payment_id)`: si el proveedor
-- reintenta el webhook, el pago se actualiza pero el tier se otorga una sola
-- vez (solo la transición a 'paid' llama a apply_tier).
-- ============================================================
create or replace function public.record_payment(
  p_user_id             uuid,
  p_provider            text,
  p_provider_payment_id text,
  p_plan_key            text,
  p_amount_cents        integer,
  p_currency            text,
  p_status              text,
  p_raw                 jsonb default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
  v_plan    public.plans;
  v_was_paid boolean;
begin
  if not (public.is_admin()
          or coalesce(auth.role(), '') = 'service_role'
          or session_user in ('postgres', 'supabase_admin')) then
    raise exception 'Not authorized to record payments';
  end if;

  select * into v_plan from public.plans where key = p_plan_key;

  select (status = 'paid') into v_was_paid
  from public.payments
  where provider = p_provider and provider_payment_id = p_provider_payment_id;

  insert into public.payments (
    user_id, plan_key, provider, provider_payment_id, amount_cents, currency,
    status, tier_granted, months_granted, paid_at, raw
  )
  values (
    p_user_id, p_plan_key, p_provider, p_provider_payment_id, p_amount_cents,
    coalesce(p_currency, 'GTQ'), p_status, v_plan.tier, v_plan.months,
    case when p_status = 'paid' then now() else null end, p_raw
  )
  on conflict (provider, provider_payment_id) do update
    set status   = excluded.status,
        raw      = coalesce(excluded.raw, payments.raw),
        paid_at  = case when excluded.status = 'paid'
                        then coalesce(payments.paid_at, now())
                        else payments.paid_at end,
        updated_at = now()
  returning * into v_payment;

  if p_status = 'paid' and coalesce(v_was_paid, false) = false and v_plan.key is not null then
    perform public.apply_tier(
      p_user_id,
      v_plan.tier,
      v_plan.months,
      'payment',
      v_payment.id,
      format('Pago %s vía %s', v_plan.name, p_provider),
      v_plan.months is null
    );
  end if;

  return v_payment;
end;
$$;

revoke all on function public.record_payment(uuid, text, text, text, integer, text, text, jsonb) from public;
grant execute on function public.record_payment(uuid, text, text, text, integer, text, text, jsonb)
  to service_role;

-- ============================================================
-- LISTADO DE USUARIOS PARA EL PANEL
--
-- `auth.users` no es accesible desde la anon key; esta función la expone
-- solo a un admin, y solo las columnas que el panel necesita.
-- ============================================================
create or replace function public.admin_list_users(
  p_search text default null,
  p_limit  integer default 100,
  p_offset integer default 0
)
returns table (
  user_id        uuid,
  email          text,
  created_at     timestamptz,
  last_sign_in_at timestamptz,
  provider       text,
  tier           text,
  tier_expires_at timestamptz,
  tier_source    text,
  is_admin       boolean,
  payments_count bigint,
  total_paid_cents bigint,
  last_payment_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    coalesce(u.raw_app_meta_data->>'provider', 'email') as provider,
    coalesce(p.tier, 'free'),
    p.tier_expires_at,
    coalesce(p.tier_source, 'manual'),
    coalesce(u.raw_app_meta_data->>'role', '') = 'admin',
    coalesce(pay.count, 0),
    coalesce(pay.total, 0),
    pay.last_at
  from auth.users u
  left join public.user_profiles p on p.user_id = u.id
  left join lateral (
    select count(*) as count,
           sum(amount_cents) as total,
           max(paid_at) as last_at
    from public.payments
    where user_id = u.id and status = 'paid'
  ) pay on true
  where public.is_admin()
    and (p_search is null or p_search = '' or u.email ilike '%' || p_search || '%')
  order by u.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.admin_list_users(text, integer, integer) from public;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;

-- ============================================================
-- GRANTS de tabla (paridad con `0018`)
-- ============================================================
grant select on public.plans to anon, authenticated;
grant select on public.payments, public.invoices, public.tier_events to authenticated;
grant all on public.plans, public.payments, public.invoices, public.tier_events to service_role;
