# API v1

Superficie HTTP para clientes mobile (React Native) sobre los servicios de
`lib/services/`. La web sigue usando Server Actions — esta API es un
transporte adicional, no un reemplazo.

## Autenticación

Todas las rutas requieren el header:

```
Authorization: Bearer <supabase_access_token>
```

El token se obtiene con `supabase.auth.signInWithPassword(...)` (o cualquier
flujo de Supabase Auth) en el cliente mobile. `lib/api/handler.ts` construye
un cliente Supabase con `lib/supabase-bearer.ts` usando ese token, así que
**RLS aplica exactamente igual que en la web** — el JWT define qué filas son
visibles/escribibles.

Sin header `Authorization` válido → `401 UNAUTHENTICATED`.

## Forma de la respuesta

Éxito:

```json
{ "ok": true, "data": { ... } }
```

Error:

```json
{ "ok": false, "code": "PRO_REQUIRED", "message": "Esta función requiere el plan Pro." }
```

| `code`            | HTTP status |
|-------------------|-------------|
| `UNAUTHENTICATED` | 401 |
| `PRO_REQUIRED`    | 403 |
| `ADMIN_REQUIRED`  | 403 |
| `NOT_FOUND`       | 404 |
| `VALIDATION`      | 422 |
| `CONFLICT`        | 409 |
| `RATE_LIMITED`    | 429 |
| `INTERNAL`        | 500 |

## Lecturas públicas

Leyes, secciones, artículos y búsqueda **no tienen endpoints v1** — son
de lectura pública y RLS ya las permite vía `anon`/`authenticated`. El
cliente mobile usa `supabase-js` directamente para esos datos, y
`/api/search?q=...&law=...&limit=...` para búsqueda full-text (sin auth).

## Endpoints

### `GET /api/v1/me`

Perfil del usuario autenticado.

```json
{ "ok": true, "data": { "userId": "...", "tier": "pro", "isAdmin": false } }
```

Errores: `401 UNAUTHENTICATED`.

---

### `POST /api/v1/annotations`

Crea un highlight/anotación. Body (`SaveAnnotationInput`):

```json
{
  "paragraph_id": "uuid",
  "article_id": "uuid",
  "char_start": 0,
  "char_end": 42,
  "color": "yellow",
  "note": null
}
```

- `color` distinto de `"yellow"` o `note` no nulo → requiere tier Pro
  (`403 PRO_REQUIRED` si el usuario es free; RLS también lo bloquearía).
- Errores: `401 UNAUTHENTICATED`, `403 PRO_REQUIRED`, `422 VALIDATION`.

---

### `PATCH /api/v1/annotations/[id]`

Actualiza la nota de una anotación propia (solo Pro). Body:

```json
{ "note": "texto de la nota o null" }
```

Errores: `401 UNAUTHENTICATED`, `403 PRO_REQUIRED`, `422 VALIDATION`.

---

### `DELETE /api/v1/annotations/[id]`

Elimina una anotación propia. Sin body.

Errores: `401 UNAUTHENTICATED`.

---

### `GET /api/v1/cases`

Lista los casos del usuario (solo Pro), con conteo de anotaciones.

```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid", "user_id": "uuid", "title": "...", "description": null,
      "color": "gray", "created_at": "...", "updated_at": "...",
      "annotation_count": 3
    }
  ]
}
```

Errores: `401 UNAUTHENTICATED`, `403 PRO_REQUIRED`.

---

### `POST /api/v1/cases`

Crea un caso (solo Pro). Body (`CreateCaseInput`):

```json
{ "title": "...", "description": "opcional", "color": "gray" }
```

Devuelve el `Case` creado. Errores: `401 UNAUTHENTICATED`,
`403 PRO_REQUIRED`, `422 VALIDATION`.

---

### `GET /api/v1/cases/[id]`

Detalle de un caso propio (solo Pro): metadatos + anotaciones asociadas con
excerpt resuelto desde el párrafo.

```json
{
  "ok": true,
  "data": {
    "id": "uuid", "title": "...", "description": null, "color": "gray",
    "created_at": "...", "updated_at": "...",
    "annotations": [
      {
        "id": "case_annotation-uuid",
        "annotation_id": "uuid",
        "color": "yellow",
        "note": null,
        "excerpt": "texto resaltado o null si fue migrado",
        "article": { "number": "1", "heading": "..." }
      }
    ]
  }
}
```

Errores: `401 UNAUTHENTICATED`, `403 PRO_REQUIRED`, `404 NOT_FOUND` (no
existe o no pertenece al usuario).

---

### `DELETE /api/v1/cases/[id]`

Elimina un caso propio (solo Pro). Sin body.

Errores: `401 UNAUTHENTICATED`, `403 PRO_REQUIRED`.

---

### `POST /api/v1/calc-laboral`

Calculadora de indemnización por despido (Art. 82 Código de Trabajo, solo
Pro) — primer módulo bajo `lib/modules/`, ver `docs/MODULES.md`. Body
(`IndemnizacionInput`):

```json
{ "monthlySalary": 4000, "startDate": "2020-01-01", "endDate": "2023-07-15" }
```

```json
{
  "ok": true,
  "data": {
    "yearsOfService": 3, "monthsOfService": 6, "daysOfService": 14,
    "amount": 14155.56
  }
}
```

Errores: `401 UNAUTHENTICATED`, `403 PRO_REQUIRED`, `422 VALIDATION`.

## Rate limiting

Sliding window vía Upstash Redis (`lib/api/rate-limit.ts`), fail-open si
Redis no responde:

- `GET /api/search`: 30 req/min, identificador = IP (`x-forwarded-for`,
  fallback `"anonymous"`).
- `/api/v1/*`: 60 req/min por usuario autenticado (`actor.userId`,
  fallback `"anonymous"`), aplicado en `lib/api/handler.ts` después de
  resolver el `Actor`.

Excedido → `429 RATE_LIMITED` con el shape estándar de error. Variables de
entorno: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (`.env.example`).
Si no están configuradas, el rate limiting queda deshabilitado (se permite
todo, con un warning en consola).
