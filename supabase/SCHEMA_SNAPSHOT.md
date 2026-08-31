# LexGT — Schema Snapshot (prod, post-`0019`)

> Generado 2026-08-31 desde el proyecto Supabase en vivo
> (`enrykddxhqsibbokrood`). Documenta **lo que es producción hoy**:
> migraciones `0001`-`0019` (incluidos los grants de `0018`). `0020` existe
> en el repo pero **no está aplicada** — los datos legacy la violan; entra
> con la recarga de contenido.
>
> Regenerar este archivo cada vez que una migración cambie tablas,
> constraints, políticas, funciones o triggers.

Volumen al momento del snapshot: 16 leyes · 1,111 secciones · 6,330
artículos · 10,769 párrafos · 28 fragmentos · 4 usuarios · 14 anotaciones ·
1 caso · 0 reformas.

---

## Tablas de contenido (lectura pública, escritura solo service role)

### `public.laws`
| columna | tipo | null | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| slug | text | no | — |
| short_name | text | no | — |
| full_name | text | no | — |
| decree | text | sí | — |
| enacted_on | date | sí | — |
| is_active | boolean | sí | `true` |
| created_at | timestamptz | sí | `now()` |
| promulgation | jsonb | sí | — *(extractor, `0019`)* |

PK `id` · UNIQUE `slug` · RLS: `public read laws` SELECT `true`.

### `public.sections`
| columna | tipo | null | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| law_id | uuid | no | — |
| parent_id | uuid | sí | — |
| kind | text | no | — |
| number | text | sí | — |
| heading | text | no | — |
| position | integer | no | — |
| created_at | timestamptz | sí | `now()` |

PK `id` · FK `law_id → laws(id) ON DELETE CASCADE`, `parent_id → sections(id)
ON DELETE CASCADE` · CHECK `kind IN (libro, titulo, capitulo, seccion, parte,
parrafo, subseccion, articulo, disposiciones)` · índices btree en `law_id` y
`parent_id` · RLS: `public read sections` SELECT `true`.

*(`0020` agregaría `UNIQUE (law_id, parent_id, position) NULLS NOT DISTINCT`
— pendiente de aplicar.)*

### `public.articles`
| columna | tipo | null | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| law_id | uuid | no | — |
| section_id | uuid | sí | — |
| number | text | no | — |
| heading | text | sí | — |
| position | integer | no | — |
| is_current | boolean | sí | `true` |
| version | integer | no | `1` |
| superseded_by | uuid | sí | — |
| effective_on | date | sí | — |
| created_at | timestamptz | sí | `now()` |
| version_number | integer | no | `1` |
| superseded_at | timestamptz | sí | — |
| previous_version_id | uuid | sí | — |
| reform_id | uuid | sí | — |
| search_vector | tsvector | sí | — |
| amendment_note | text | sí | — *(extractor, `0019`)* |
| disposicion_kind | text | sí | — *(extractor, `0019`)* |

PK `id` · FK `law_id → laws ON DELETE CASCADE`, `section_id → sections ON
DELETE SET NULL`, `previous_version_id` / `superseded_by → articles`,
`reform_id → law_reforms` · CHECK `disposicion_kind IS NULL OR IN
(transitoria, derogatoria, final)` · índices btree en `law_id`, `section_id`,
`is_current`, `reform_id` + GIN `articles_search_idx (search_vector)` ·
trigger `articles_search_vector_update` BEFORE INSERT/UPDATE · RLS:
`public read articles` SELECT `true`.

Versionado copy-on-write: una reforma inserta una fila nueva
(`is_current = true`, `previous_version_id` → la anterior) y marca la vieja
`is_current = false`.

### `public.paragraphs`
| columna | tipo | null | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| article_id | uuid | no | — |
| position | integer | no | — |
| text | text | no | — |
| created_at | timestamptz | sí | `now()` |
| search_vector | tsvector | sí | — |

PK `id` · FK `article_id → articles ON DELETE CASCADE` · **UNIQUE
`(article_id, position)`** *(`0016`)* · índice btree `article_id` + GIN
`paragraphs_search_idx` · trigger `paragraphs_search_vector_update` · RLS:
`public read paragraphs` SELECT `true`.

Unidad anotable: `annotations.char_start/char_end` son offsets sobre
`paragraphs.text`. **Prohibido el `UPDATE` crudo** — las correcciones van por
`correctParagraphText` (re-ancla las anotaciones del párrafo).

### `public.law_fragments` *(extractor, `0019`)*
| columna | tipo | null | default |
|---|---|---|---|
| id | uuid | no | — |
| law_id | uuid | no | — |
| raw_text | text | no | — |
| context_hint | text | sí | — |
| fragment_type | text | sí | — |
| position | integer | no | — |
| reviewed | boolean | no | `false` |

PK `id` · FK `law_id → laws ON DELETE CASCADE` · índice `law_id` · RLS:
`law_fragments_admin_all` ALL con `is_admin()` en USING y CHECK. Es el buzón
del texto que el extractor no logró estructurar, para revisión editorial.

---

## Datos de usuario (RLS por dueño + tier)

### `public.annotations`
| columna | tipo | null | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| user_id | uuid | no | — |
| paragraph_id | uuid | no | — |
| article_id | uuid | no | — |
| color | text | no | `'yellow'` |
| char_start | integer | no | — |
| char_end | integer | no | — |
| note | text | sí | — |
| is_pinned_to_old_version | boolean | sí | `false` |
| created_at / updated_at | timestamptz | sí | `now()` |
| quote | text | sí | — *(`0014`)* |
| prefix | text | sí | — *(`0014`)* |
| suffix | text | sí | — *(`0014`)* |
| text_checksum | text | sí | — *(`0014`)* |
| anchor_status | text | no | `'anchored'` *(`0014`)* |

PK `id` · FK `user_id → auth.users`, `paragraph_id → paragraphs`,
`article_id → articles`, todas ON DELETE CASCADE · CHECK `color IN (yellow,
green, blue, pink)` y `anchor_status IN (anchored, reanchored, orphaned)` ·
índices btree en `user_id` y `paragraph_id`.

RLS:
- SELECT / DELETE: `auth.uid() = user_id`
- INSERT / UPDATE CHECK: `auth.uid() = user_id AND (is_pro() OR (color =
  'yellow' AND note IS NULL))` — **el tier se impone aquí**, no en la app.

### `public.cases` y `public.case_annotations`
`cases`: `id, user_id, title, description, color ('gray'), created_at,
updated_at`; PK `id`, FK `user_id → auth.users ON DELETE CASCADE`.
`case_annotations`: `id, case_id, annotation_id, created_at`; UNIQUE
`(case_id, annotation_id)`; ambas FK ON DELETE CASCADE.

RLS: SELECT/DELETE por dueño (en `case_annotations`, por el dueño del `case`
referenciado); INSERT/UPDATE CHECK exigen además `is_pro()`. Un Pro vencido
conserva lectura de su historial pero no puede escribir.

### `public.user_profiles`
`user_id (PK, FK auth.users)`, `tier ('free')`, `tier_expires_at`,
`tier_source ('manual')`, `created_at`. La fila la crea el trigger
`handle_new_user()` (SECURITY DEFINER) al registrarse.

RLS: SELECT del dueño; INSERT/UPDATE solo `is_admin()`. **No existe política
de UPDATE para el dueño** *(`0011`)*, y el trigger `prevent_tier_self_update`
bloquea cambios a `tier`/`tier_expires_at`/`tier_source` que no vengan de un
admin.

### `public.reform_notifications`
`id, user_id, reform_id, seen_at`. FKs ON DELETE CASCADE, índice en cada una.
RLS: SELECT e INSERT del dueño (`auth.uid() = user_id`); sin UPDATE ni DELETE.

---

## Reformas y colecciones

### `public.law_reforms`
`id, law_id, title, description, published_at, created_at, status ('draft')`.
FK `law_id → laws ON DELETE CASCADE`, índice `law_id`.
RLS: SELECT público; INSERT/UPDATE solo `is_admin()`.

### `public.reform_draft_articles`
`id, reform_id, article_id, new_text, created_at`. FK `reform_id →
law_reforms ON DELETE CASCADE`, `article_id → articles`. RLS: las cuatro
operaciones exigen `is_admin()`.

### `public.law_collections` y `public.law_collection_items`
`law_collections`: `id (serial), slug (UNIQUE), name, description, position,
is_default`. `law_collection_items`: `id (serial), collection_id, law_id
(uuid), position`; UNIQUE `(collection_id, law_id)`; FKs ON DELETE CASCADE.
RLS: SELECT público; INSERT/UPDATE/DELETE con `is_admin()`.

---

## Funciones

| función | retorna | seguridad | search_path |
|---|---|---|---|
| `is_admin()` | boolean | invoker | `''` |
| `current_user_tier()` | text | **definer** | `public` |
| `is_pro()` | boolean | invoker | `public` |
| `admin_find_user_by_email(text)` | uuid | **definer** | `''` |
| `handle_new_user()` | trigger | **definer** | `''` |
| `prevent_tier_self_update()` | trigger | invoker | `public` |
| `update_article_search_vector()` | trigger | invoker | — |
| `update_paragraph_search_vector()` | trigger | invoker | — |
| `validate_law(text)` | `TABLE(check_name, ok, detail)` | invoker | `''` |

- `is_admin()` = `auth.jwt()->'app_metadata'->>'role' = 'admin'`. **Nunca
  `user_metadata`**, que es autoescribible por el usuario.
- `current_user_tier()` → `anonymous` / `pro` (fila en `user_profiles` con
  `tier='pro'` y no vencida) / `free`. `is_pro()` la envuelve.
- `admin_find_user_by_email` valida el rol admin adentro y lanza
  `Not authorized` si no lo es — por eso el advisor de Supabase que la marca
  ejecutable por `anon` es benigno.
- `validate_law(slug)` corre 10 checks de integridad de contenido por ley; es
  el gate del pipeline del extractor.

## Triggers

| tabla | trigger | función |
|---|---|---|
| `articles` | `articles_search_vector_update` BEFORE INSERT/UPDATE | `update_article_search_vector()` |
| `paragraphs` | `paragraphs_search_vector_update` BEFORE INSERT/UPDATE | `update_paragraph_search_vector()` |
| `user_profiles` | `prevent_tier_self_update` BEFORE UPDATE | `prevent_tier_self_update()` |
| `auth.users` | `on_auth_user_created` AFTER INSERT | `handle_new_user()` |

## Grants

`0018_grant_table_privileges.sql` otorga SELECT/INSERT/UPDATE/DELETE a
`anon`, `authenticated` y `service_role` sobre todas las tablas de `public`
(más `alter default privileges`). Sin el grant de tabla, PostgREST falla
antes de evaluar RLS: prod ya los tenía por el provisioning de Supabase, un
`db reset` local no.

## Migraciones aplicadas en prod

`0001`-`0018` (las `0001`-`0008` son anteriores al tracking del CLI),
`001_extractor_columns` (DDL crudo aplicado por el extractor el 2026-06-13,
reconciliado después por `0019`) y `0019_extractor_content_reconciliation`.
**`0020` pendiente.**
