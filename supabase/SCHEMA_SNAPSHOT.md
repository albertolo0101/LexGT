# LexGT — Schema Snapshot (post-0009)

> Generated 2026-06-10 from the live Supabase project (`enrykddxhqsibbokrood`)
> after applying `0009_schema_reconciliation.sql`. This document is the
> source of truth for "what prod looks like" — regenerate it whenever a new
> migration changes tables, constraints, policies, functions, or triggers.
>
> Migrations 0001-0009 applied to an empty database produce this schema.

---

## Tables

### `public.laws`
| column | type | nullable | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| slug | text | no | — |
| short_name | text | no | — |
| full_name | text | no | — |
| decree | text | yes | — |
| enacted_on | date | yes | — |
| is_active | boolean | yes | `true` |
| created_at | timestamptz | yes | `now()` |

- PK: `laws_pkey (id)`
- UNIQUE: `laws_slug_key (slug)`
- RLS: enabled
  - `public read laws` — SELECT, `true`

### `public.sections`
| column | type | nullable | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| law_id | uuid | no | — |
| parent_id | uuid | yes | — |
| kind | text | no | — |
| number | text | yes | — |
| heading | text | no | — |
| position | integer | no | — |
| created_at | timestamptz | yes | `now()` |

- PK: `sections_pkey (id)`
- FK: `sections_law_id_fkey (law_id) -> laws(id) ON DELETE CASCADE`
- FK: `sections_parent_id_fkey (parent_id) -> sections(id) ON DELETE CASCADE`
- CHECK: `sections_kind_check` — `kind IN ('libro','titulo','capitulo','seccion','parte','parrafo','subseccion','articulo','disposiciones')` *(widened by 0009)*
- Indexes: `sections_law_id_idx (law_id)`, `sections_parent_id_idx (parent_id)`
- RLS: enabled
  - `public read sections` — SELECT, `true`

### `public.articles`
| column | type | nullable | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| law_id | uuid | no | — |
| section_id | uuid | yes | — |
| number | text | no | — |
| heading | text | yes | — |
| position | integer | no | — |
| is_current | boolean | yes | `true` |
| version | integer | no | `1` |
| superseded_by | uuid | yes | — |
| effective_on | date | yes | — |
| created_at | timestamptz | yes | `now()` |
| version_number | integer | no | `1` |
| superseded_at | timestamptz | yes | — |
| previous_version_id | uuid | yes | — |
| reform_id | uuid | yes | — |
| search_vector | tsvector | yes | — |

- PK: `articles_pkey (id)`
- FK: `articles_law_id_fkey (law_id) -> laws(id) ON DELETE CASCADE`
- FK: `articles_section_id_fkey (section_id) -> sections(id) ON DELETE SET NULL`
- FK: `articles_superseded_by_fkey (superseded_by) -> articles(id)`
- FK: `articles_previous_version_id_fkey (previous_version_id) -> articles(id)`
- FK: `fk_article_reform (reform_id) -> law_reforms(id)`
- Indexes: `articles_law_id_idx (law_id)`, `articles_section_id_idx (section_id)`, `articles_is_current_idx (is_current)`, `articles_reform_id_idx (reform_id)`, `articles_search_idx GIN(search_vector)`
- Triggers: `articles_search_vector_update` BEFORE INSERT/UPDATE → `update_article_search_vector()`
- RLS: enabled
  - `public read articles` — SELECT, `true`

### `public.paragraphs`
| column | type | nullable | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| article_id | uuid | no | — |
| position | integer | no | — |
| text | text | no | — |
| created_at | timestamptz | yes | `now()` |
| search_vector | tsvector | yes | — |

- PK: `paragraphs_pkey (id)`
- FK: `paragraphs_article_id_fkey (article_id) -> articles(id) ON DELETE CASCADE`
- Indexes: `paragraphs_article_id_idx (article_id)`, `paragraphs_search_idx GIN(search_vector)`
- Triggers: `paragraphs_search_vector_update` BEFORE INSERT/UPDATE → `update_paragraph_search_vector()`
- RLS: enabled
  - `public read paragraphs` — SELECT, `true`

### `public.annotations`
| column | type | nullable | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| user_id | uuid | no | — |
| paragraph_id | uuid | no | — |
| article_id | uuid | no | — |
| color | text | no | `'yellow'` |
| char_start | integer | no | — |
| char_end | integer | no | — |
| note | text | yes | — |
| is_pinned_to_old_version | boolean | yes | `false` |
| created_at | timestamptz | yes | `now()` |
| updated_at | timestamptz | yes | `now()` |

- PK: `annotations_pkey (id)`
- FK: `annotations_user_id_fkey (user_id) -> auth.users(id) ON DELETE CASCADE`
- FK: `annotations_article_id_fkey (article_id) -> articles(id) ON DELETE CASCADE`
- FK: `annotations_paragraph_id_fkey (paragraph_id) -> paragraphs(id) ON DELETE CASCADE`
- CHECK: `annotations_color_check` — `color IN ('yellow','green','blue','pink')`
- Indexes: `annotations_user_id_idx (user_id)`, `annotations_paragraph_id_idx (paragraph_id)`
- RLS: enabled
  - `owner read annotations` — SELECT, `auth.uid() = user_id`
  - `owner insert annotations` — INSERT, WITH CHECK `auth.uid() = user_id`
  - `owner update annotations` — UPDATE, `auth.uid() = user_id`
  - `owner delete annotations` — DELETE, `auth.uid() = user_id`
  - ⚠️ **No tier check** — a free user can INSERT `color != 'yellow'` or non-null `note` directly via PostgREST. (Phase 1, Step 1.3 — E3)

### `public.cases`
| column | type | nullable | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| user_id | uuid | no | — |
| title | text | no | — |
| description | text | yes | — |
| color | text | no | `'gray'` |
| created_at | timestamptz | no | `now()` |
| updated_at | timestamptz | no | `now()` |

- PK: `cases_pkey (id)`
- FK: `cases_user_id_fkey (user_id) -> auth.users(id) ON DELETE CASCADE`
- RLS: enabled
  - `cases: owner all` — ALL, `auth.uid() = user_id` / WITH CHECK `auth.uid() = user_id`
  - ⚠️ **No tier check** — a free user can INSERT into `cases` directly via PostgREST. (Phase 1, Step 1.3 — E3)

### `public.case_annotations`
| column | type | nullable | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| case_id | uuid | no | — |
| annotation_id | uuid | no | — |
| created_at | timestamptz | no | `now()` |

- PK: `case_annotations_pkey (id)`
- FK: `case_annotations_case_id_fkey (case_id) -> cases(id) ON DELETE CASCADE`
- FK: `case_annotations_annotation_id_fkey (annotation_id) -> annotations(id) ON DELETE CASCADE`
- UNIQUE: `case_annotations_case_id_annotation_id_key (case_id, annotation_id)`
- RLS: enabled
  - `case_annotations: case owner all` — ALL, owner check via `cases` join (both `using` and `with_check`)
  - ⚠️ Inherits the `cases` tier gap (Phase 1, Step 1.3 — E3)

### `public.law_reforms`
| column | type | nullable | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| law_id | uuid | no | — |
| title | text | no | — |
| description | text | yes | — |
| published_at | timestamptz | yes | — |
| created_at | timestamptz | yes | `now()` |
| status | text | no | `'draft'` |

- PK: `law_reforms_pkey (id)`
- FK: `law_reforms_law_id_fkey (law_id) -> laws(id) ON DELETE CASCADE`
- Indexes: `law_reforms_law_id_idx (law_id)`
- RLS: enabled
  - `public read law_reforms` — SELECT, `true`
  - `admin insert law_reforms` — INSERT, WITH CHECK `is_admin()`
  - `admin update law_reforms` — UPDATE, `is_admin()`

### `public.reform_notifications`
| column | type | nullable | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| user_id | uuid | no | — |
| reform_id | uuid | no | — |
| seen_at | timestamptz | yes | — |

- PK: `reform_notifications_pkey (id)`
- FK: `reform_notifications_user_id_fkey (user_id) -> auth.users(id) ON DELETE CASCADE`
- FK: `reform_notifications_reform_id_fkey (reform_id) -> law_reforms(id) ON DELETE CASCADE`
- Indexes: `reform_notifications_user_id_idx (user_id)`, `reform_notifications_reform_id_idx (reform_id)`
- RLS: enabled
  - `owner select reform_notifications` — SELECT, `auth.uid() = user_id`
  - `owner insert reform_notifications` — INSERT, WITH CHECK `auth.uid() = user_id`

### `public.reform_draft_articles`
| column | type | nullable | default |
|---|---|---|---|
| id | uuid | no | `gen_random_uuid()` |
| reform_id | uuid | no | — |
| article_id | uuid | no | — |
| new_text | text | no | — |
| created_at | timestamptz | yes | `now()` |

- PK: `reform_draft_articles_pkey (id)`
- FK: `reform_draft_articles_reform_id_fkey (reform_id) -> law_reforms(id) ON DELETE CASCADE`
- FK: `reform_draft_articles_article_id_fkey (article_id) -> articles(id)`
- Indexes: `reform_draft_articles_reform_id_idx (reform_id)`
- RLS: enabled
  - `admin select/insert/update/delete reform_draft_articles` — all via `is_admin()`

### `public.user_profiles`
| column | type | nullable | default |
|---|---|---|---|
| user_id | uuid | no | — |
| tier | text | no | `'free'` |
| tier_expires_at | timestamptz | yes | — |
| tier_source | text | no | `'manual'` |
| created_at | timestamptz | yes | `now()` |

- PK: `user_profiles_pkey (user_id)`
- FK: `user_profiles_user_id_fkey (user_id) -> auth.users(id) ON DELETE CASCADE`
- RLS: enabled
  - `owner select user_profiles` — SELECT, `auth.uid() = user_id`
  - `owner update user_profiles` — UPDATE, `auth.uid() = user_id`, **no `WITH CHECK`** — column-unrestricted
  - `admin insert user_profiles` — INSERT, WITH CHECK `is_admin()`
  - `admin update user_profiles` — UPDATE, `is_admin()`
  - ⚠️ **`PATCH .../user_profiles?user_id=eq.<me>` with `{"tier":"pro"}` succeeds for any authenticated user** (Phase 1, Step 1.2 — E2)
- Trigger (on `auth.users`): `on_auth_user_created` AFTER INSERT → `handle_new_user()` (creates the profile row)

### `public.law_collections`
| column | type | nullable | default |
|---|---|---|---|
| id | integer | no | `nextval('law_collections_id_seq')` |
| slug | text | no | — |
| name | text | no | — |
| description | text | yes | — |
| position | integer | no | — |
| is_default | boolean | yes | `false` |

- PK: `law_collections_pkey (id)`
- UNIQUE: `law_collections_slug_key (slug)`
- RLS: enabled
  - `law_collections_select` — SELECT, `true`
  - `law_collections_admin_insert/update/delete` — via `is_admin()`

### `public.law_collection_items`
| column | type | nullable | default |
|---|---|---|---|
| id | integer | no | `nextval('law_collection_items_id_seq')` |
| collection_id | integer | yes | — |
| law_id | uuid | yes | — |
| position | integer | no | — |

- PK: `law_collection_items_pkey (id)`
- FK: `law_collection_items_collection_id_fkey (collection_id) -> law_collections(id) ON DELETE CASCADE`
- FK: `law_collection_items_law_id_fkey (law_id) -> laws(id) ON DELETE CASCADE`
- UNIQUE: `law_collection_items_collection_id_law_id_key (collection_id, law_id)`
- RLS: enabled
  - `law_collection_items_select` — SELECT, `true`
  - `law_collection_items_admin_insert/update/delete` — via `is_admin()`

---

## Functions (public schema)

| function | language | security | notes |
|---|---|---|---|
| `is_admin()` | sql | invoker, stable | `select (auth.jwt()->'user_metadata'->>'role') = 'admin'` — ⚠️ reads **`user_metadata`**, which is self-writable via `auth.updateUser()`. Full admin takeover (Phase 1, Step 1.1 — E1). |
| `admin_find_user_by_email(email_input text)` | plpgsql | definer, `search_path=''` | Also checks `auth.jwt()->'user_metadata'->>'role' = 'admin'` — same E1 issue, must be fixed alongside `is_admin()` in Phase 1 even though not explicitly named in the plan. |
| `handle_new_user()` | plpgsql | definer, `search_path=''` | Trigger fn for `on_auth_user_created`; inserts default `user_profiles` row. |
| `update_article_search_vector()` | plpgsql | invoker | Trigger fn; sets `articles.search_vector` from `number` + `heading`. |
| `update_paragraph_search_vector()` | plpgsql | invoker | Trigger fn; sets `paragraphs.search_vector` from `text`. |

---

## Triggers

| table | trigger | timing | event | function |
|---|---|---|---|---|
| `auth.users` | `on_auth_user_created` | AFTER | INSERT | `handle_new_user()` |
| `articles` | `articles_search_vector_update` | BEFORE | INSERT, UPDATE | `update_article_search_vector()` |
| `paragraphs` | `paragraphs_search_vector_update` | BEFORE | INSERT, UPDATE | `update_paragraph_search_vector()` |

---

## Known issues carried forward to Phase 1

These are **documented, not fixed**, by 0009 (Phase 0 is "no behavior changes"):

- **E1** — `is_admin()` and `admin_find_user_by_email()` both trust `user_metadata.role`, which any authenticated user can set via `supabase.auth.updateUser({ data: { role: 'admin' } })`. → Step 1.1 must update **both** functions, not just `is_admin()`.
- **E2** — `user_profiles` owner UPDATE policy has no `WITH CHECK`, so `tier`/`tier_expires_at`/`tier_source` are self-writable. → Step 1.2.
- **E3** — `annotations` and `cases`/`case_annotations` INSERT/UPDATE policies don't enforce tier; only `CHECK (color IN (...))` and Server Action logic gate Pro features. → Step 1.3.
