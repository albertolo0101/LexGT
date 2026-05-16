-- 0008_collections.sql
-- Colecciones temáticas de leyes para el selector de modo en la UI

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE law_collections (
  id          serial PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text,
  position    integer NOT NULL,
  is_default  boolean DEFAULT false
);

CREATE TABLE law_collection_items (
  id            serial PRIMARY KEY,
  collection_id integer REFERENCES law_collections(id) ON DELETE CASCADE,
  law_id        uuid REFERENCES laws(id) ON DELETE CASCADE,
  position      integer NOT NULL,
  UNIQUE(collection_id, law_id)
);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE law_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_collection_items ENABLE ROW LEVEL SECURITY;

-- law_collections: lectura pública, escritura solo admin
CREATE POLICY "law_collections_select" ON law_collections
  FOR SELECT USING (true);

CREATE POLICY "law_collections_admin_insert" ON law_collections
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "law_collections_admin_update" ON law_collections
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "law_collections_admin_delete" ON law_collections
  FOR DELETE USING (public.is_admin());

-- law_collection_items: lectura pública, escritura solo admin
CREATE POLICY "law_collection_items_select" ON law_collection_items
  FOR SELECT USING (true);

CREATE POLICY "law_collection_items_admin_insert" ON law_collection_items
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "law_collection_items_admin_update" ON law_collection_items
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "law_collection_items_admin_delete" ON law_collection_items
  FOR DELETE USING (public.is_admin());

-- ============================================================
-- SEED — 7 colecciones predeterminadas
-- ============================================================

INSERT INTO law_collections (slug, name, description, position, is_default) VALUES
  ('default',            'Biblioteca completa',  'Toda la legislación disponible',         1, true),
  ('derecho-civil',      'Derecho Civil',         'Código Civil, Procesal Civil, Comercio', 2, false),
  ('derecho-penal',      'Derecho Penal',         'Código Penal y Procesal Penal',          3, false),
  ('derecho-laboral',    'Derecho Laboral',        'Código de Trabajo',                      4, false),
  ('derecho-mercantil',  'Derecho Mercantil',      'Código de Comercio y leyes mercantiles', 5, false),
  ('derecho-tributario', 'Derecho Tributario',     'Código Tributario y leyes fiscales',     6, false),
  ('derecho-municipal',  'Derecho Municipal',      'Código Municipal y organismo judicial',  7, false);

-- ============================================================
-- SEED — items de colecciones
-- Solo las leyes que ya existen en prod. WHERE EXISTS garantiza
-- que no falla si una ley aún no está cargada.
-- Agregar más items aquí a medida que se cargue contenido.
-- ============================================================

-- Biblioteca completa — todas las leyes existentes
INSERT INTO law_collection_items (collection_id, law_id, position)
SELECT
  (SELECT id FROM law_collections WHERE slug = 'default'),
  (SELECT id FROM laws WHERE slug = 'codigo-civil'),
  1
WHERE EXISTS (SELECT 1 FROM laws WHERE slug = 'codigo-civil');

INSERT INTO law_collection_items (collection_id, law_id, position)
SELECT
  (SELECT id FROM law_collections WHERE slug = 'default'),
  (SELECT id FROM laws WHERE slug = 'codigo-trabajo'),
  2
WHERE EXISTS (SELECT 1 FROM laws WHERE slug = 'codigo-trabajo');

-- Derecho Civil
INSERT INTO law_collection_items (collection_id, law_id, position)
SELECT
  (SELECT id FROM law_collections WHERE slug = 'derecho-civil'),
  (SELECT id FROM laws WHERE slug = 'codigo-civil'),
  1
WHERE EXISTS (SELECT 1 FROM laws WHERE slug = 'codigo-civil');

-- Derecho Laboral
INSERT INTO law_collection_items (collection_id, law_id, position)
SELECT
  (SELECT id FROM law_collections WHERE slug = 'derecho-laboral'),
  (SELECT id FROM laws WHERE slug = 'codigo-trabajo'),
  1
WHERE EXISTS (SELECT 1 FROM laws WHERE slug = 'codigo-trabajo');

-- Los demás items (Penal, Mercantil, Tributario, Municipal) se agregarán
-- cuando se carguen esas leyes en Phase 10/11.
