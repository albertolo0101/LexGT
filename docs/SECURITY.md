# Seguridad — superficie de escritura del anon key

La `anon key` de Supabase es pública por diseño (va en el bundle del cliente).
Cualquier cosa que no esté impuesta por **RLS o triggers a nivel de DB** no
está protegida por nada: los Server Actions y la UI son atajos de UX, no
fronteras de seguridad — son evitables con `curl` + el anon key.

**Regla:** toda tabla nueva escribible por usuarios DEBE codificar sus reglas
de tier/ownership en políticas RLS (`USING` / `WITH CHECK`), nunca solo en
Server Actions. Los Server Actions pueden duplicar la validación para dar
mensajes de error amigables, pero nunca son la única barrera.

---

## `app_metadata` vs `user_metadata`

- `user_metadata` es **autoescribible** por el usuario vía
  `supabase.auth.updateUser({ data: {...} })`. Nunca debe usarse para roles,
  permisos ni nada sensible.
- `app_metadata` solo puede escribirse con la `service_role` key (dashboard
  de Supabase o backend con clave de servicio). Es la única fuente válida
  para `role: 'admin'`.
- `public.is_admin()` y `public.admin_find_user_by_email()` leen
  `auth.jwt()->'app_metadata'->>'role'`. `middleware.ts`,
  `app/admin/layout.tsx` y `app/admin/actions.ts#requireAdmin` leen
  `user.app_metadata.role`. Nunca volver a leer `user_metadata` para esto
  (ver `0010_admin_app_metadata.sql`).

---

## Matriz: tabla × operación × política RLS

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `laws` | público (`true`) | — (sin política → denegado) | — | — |
| `sections` | público | — | — | — |
| `articles` | público | — | — | — |
| `paragraphs` | público | — | — | — |
| `annotations` | dueño (`user_id = auth.uid()`) | dueño **y** (`is_pro()` o `color='yellow' and note is null`) | dueño, mismo check que insert | dueño |
| `user_profiles` | dueño | admin (`is_admin()`) | admin (`is_admin()`); trigger `prevent_tier_self_update` bloquea cambios a `tier`/`tier_expires_at`/`tier_source` salvo admin | — |
| `cases` | dueño | dueño **y** `is_pro()` | dueño (using); dueño **y** `is_pro()` (check) | dueño |
| `case_annotations` | dueño del `case` referenciado | dueño del case **y** `is_pro()` | dueño del case (using); dueño **y** `is_pro()` (check) | dueño del case |
| `law_reforms` | público | admin | admin | — |
| `reform_draft_articles` | admin | admin | admin | admin |
| `reform_notifications` | dueño | dueño | — | — |
| `law_collections` | público | admin | admin | admin |
| `law_collection_items` | público | admin | admin | admin |

"—" = sin política para esa operación → PostgREST devuelve 401/42501 para
cualquier rol no-`service_role`.

---

## Tier enforcement: `current_user_tier()` / `is_pro()`

`public.current_user_tier()` (security definer) es la única fuente de verdad
sobre el tier de un usuario:

- `anonymous` si `auth.uid()` es null.
- `pro` si existe una fila en `user_profiles` con `tier = 'pro'` y
  (`tier_expires_at is null` o `tier_expires_at > now()`).
- `free` en cualquier otro caso.

`public.is_pro()` es `current_user_tier() = 'pro'`.

**Regla: la lógica de tier vive en `WITH CHECK`, no en los Server Actions.**
Los Server Actions (`requirePro`, validaciones de color/nota) son UX —
mensajes de error amigables y paywalls — pero el INSERT/UPDATE crudo vía
PostgREST con el anon key debe fallar igual aunque el Server Action no exista
o tenga un bug. Cualquier feature nueva que dependa del tier (módulos de
Phase 7, etc.) debe replicar este patrón: `is_pro()` (o el check que
corresponda) dentro de la política `WITH CHECK`/`USING` de la tabla, no solo
en la capa de aplicación.

**Caso borde — Pro vencido:** un usuario con `tier_expires_at` en el pasado
se comporta como `free` para escrituras (`is_pro()` = false), pero conserva
SELECT sobre sus `cases`/`case_annotations`/`annotations` existentes
(historial de solo lectura) — las políticas de SELECT no tienen condición de
tier.

---

## Vectores cerrados en Phase 1

| # | Vector | Migración / archivo |
|---|---|---|
| E1 | Auto-otorgarse `role: 'admin'` vía `user_metadata` | `0010_admin_app_metadata.sql`, `middleware.ts`, `app/admin/layout.tsx`, `app/admin/actions.ts` |
| E2 | `PATCH user_profiles` para auto-asignarse `tier='pro'` | `0011_lock_user_profiles.sql` |
| E3 | INSERT directo de anotaciones/casos Pro vía PostgREST con anon key | `0012_tier_enforcement.sql` |
