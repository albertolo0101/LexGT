# Cobros, tiers y facturación

Cómo se cobra, cómo se otorga el acceso y quién puede tocarlo. Estado al
2026-09-01: **la migración `0021` ya está aplicada en producción y la plomería
está probada; falta enchufar un proveedor de cobro real y el certificador
FEL.**

---

## La regla que ordena todo

**LexGT no ve, no procesa y no guarda datos de tarjeta.** El usuario paga en el
checkout alojado del proveedor (su dominio, su certificación PCI-DSS) y el
proveedor avisa por webhook. Lo único que entra a nuestra base es: qué plan,
cuánto, en qué estado y a quién le toca el tier.

Consecuencia práctica: no hay "guardar tarjeta" ni cobro recurrente automático
hasta que el proveedor lo ofrezca con tokenización de su lado. Hoy el modelo es
**prepago por período** — el usuario compra 1, 6 o 12 meses y la fecha de
vencimiento se extiende.

---

## Las piezas

| Pieza | Dónde | Qué hace |
|---|---|---|
| Catálogo de planes | tabla `plans` | tier + duración + precio. Agregar un tier es insertar una fila, no una migración |
| Cobros | tabla `payments` | un pago, su estado y el tier que otorgó. Único por `(provider, provider_payment_id)` |
| Facturas | tabla `invoices` | el resultado FEL de ese pago (serie, número, UUID, PDF) |
| Bitácora | tabla `tier_events` | todo cambio de tier: por pago, por admin, por vencimiento |
| Acceso | `user_profiles.tier` + `tier_expires_at` | **la fuente de verdad**. `NULL` = sin vencimiento = vitalicio |
| Adaptadores de cobro | `lib/billing/providers/*.ts` | visanet · vanapay · paggo, hoy vacíos |
| Certificador FEL | `lib/billing/fel.ts` | infile, hoy vacío |
| Webhook | `app/api/webhooks/[provider]/route.ts` | el único lugar con la service-role key |
| Cuenta del usuario | `/cuenta` | plan, pagos, facturas, historial, cerrar sesión |
| Panel del operador | lex-extractor → "Usuarios y pagos" | ver usuarios, cambiar tier y vencimiento, pagos manuales, estadísticas |

---

## El flujo de un pago

```
usuario → /cuenta → "Contratar"
   └─ startCheckout (Server Action)  ── crea la orden en el proveedor
        └─ redirige al checkout ALOJADO del proveedor
             └─ el usuario paga ahí (LexGT no ve la tarjeta)
                  └─ proveedor → POST /api/webhooks/<proveedor>
                       ├─ parseWebhook: verifica la FIRMA (si no cuadra, 400)
                       ├─ compara el monto con el precio del plan
                       └─ record_payment(...)  ── inserta el pago
                            └─ apply_tier(...) ── extiende el vencimiento
                                 └─ tier_events ── queda en bitácora
```

Tres decisiones que valen la pena recordar:

1. **El tier lo otorga el webhook, nunca el regreso del usuario a la app.** Si
   alguien vuelve a `/cuenta` sin haber pagado, no pasa nada. En Paggo esto es
   crítico: un pago por transferencia se confirma horas después.
2. **El monto se compara contra el plan.** Si no cuadra, el pago se registra
   como `failed` y no se otorga nada — cobrar Q1 y llevarse un año, no.
3. **Todo es idempotente.** Los proveedores reintentan; `(provider,
   provider_payment_id)` es único y el tier solo se otorga en la transición a
   `paid`.

---

## Quién puede cambiar un tier

`user_profiles` tiene un trigger (`prevent_tier_self_update`) que rechaza
cualquier cambio a `tier`, `tier_expires_at` o `tier_source` salvo que el que
escribe sea:

- un **admin de la app** (JWT con `app_metadata.role = 'admin'`), o
- el **service role** (el webhook), o
- una **conexión directa a Postgres** como `postgres` — que es como entra
  lex-extractor.

Un usuario con la anon key no puede, aunque arme el `PATCH` a mano: PostgREST
ejecuta como `anon`/`authenticated` y el trigger lo bloquea. Esa es la
frontera real; la UI es solo comodidad.

Todos los caminos legítimos pasan por la función `apply_tier(...)`, que además
escribe la bitácora. **No hagas `UPDATE user_profiles` a mano**: el cambio se
pierde del historial.

---

## Agregar un proveedor de cobro

1. Escribir `lib/billing/providers/<nombre>.ts` implementando `PaymentProvider`:
   - `isConfigured()` — ¿están las variables de entorno?
   - `createCheckout()` — crea la orden y devuelve la URL alojada.
   - `parseWebhook()` — **verifica la firma** y normaliza el evento.
2. Registrarlo en `PROVIDERS` (`lib/billing/provider.ts`).
3. Poner `PAYMENT_PROVIDER=<nombre>` y sus credenciales en Vercel.
4. Darle al proveedor la URL del webhook:
   `https://<dominio>/api/webhooks/<nombre>`.

Lo que hay que pedirle al proveedor al contratar: credenciales de sandbox y de
producción, el endpoint de creación de orden con su contrato de campos, y **el
esquema de firma del webhook**. Sin lo tercero no se puede integrar de forma
segura.

### Los tres candidatos

| Proveedor | Qué hay que confirmar |
|---|---|
| **Visanet / VisaLink** | Es el adquirente tradicional en Guatemala; se contrata por banco. Suele exigir comercio afiliado y tiene el proceso más largo, pero es el que más tarjetas acepta |
| **VanaPay** | Pasarela local; confirmar comisión por transacción y si el checkout alojado permite personalizar el dominio |
| **Paggo** | Enlace de pago + transferencia; el más rápido de habilitar. Confirmar la latencia de confirmación de transferencias y si emiten webhook por cada cambio de estado |

---

## Facturación electrónica (FEL)

En FEL la factura la certifica un tercero autorizado por la SAT (Infile,
Guatefacturas, Digifact). `lib/billing/fel.ts` define el contrato y deja el
adaptador de Infile vacío. Reglas ya fijadas:

- Se factura **después** de que el pago quedó en `paid`, nunca antes.
- Sin NIT del usuario, la factura va a **CF** (`normalizeNit` lo resuelve).
- Un fallo al certificar **no** revierte el pago ni quita el tier: la factura
  queda en `failed` y se reintenta desde el panel.

---

## Google como identidad

Desde `0021` la app ofrece "Continuar con Google" (`components/GoogleButton.tsx`)
y cierra el flujo en `app/auth/callback/route.ts`. Con eso LexGT no almacena
contraseñas: Supabase Auth guarda el correo y el id, y nosotros solo llevamos
tier y pagos contra ese id.

**Falta un paso que no se puede hacer desde el código:** en el dashboard de
Supabase → Authentication → Providers → Google, pegar el Client ID y el Client
Secret de Google Cloud, y agregar como Authorized redirect URI
`https://<proyecto>.supabase.co/auth/v1/callback`. En Google Cloud Console hay
que crear un OAuth Client (tipo Web) con esa misma URI.

---

## Pendientes

1. ~~Aplicar `0021_billing.sql` en producción.~~ Hecho el 2026-09-01.
2. Elegir proveedor y escribir su adaptador.
3. Contratar el certificador FEL y escribir el suyo.
4. Configurar Google OAuth en el dashboard de Supabase.
5. Definir precios reales: los de `plans` son un punto de partida
   (Q75 / mes, Q390 / 6 meses, Q690 / año).
