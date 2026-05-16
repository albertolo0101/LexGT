-- 1. Columna tsvector en articles
ALTER TABLE articles ADD COLUMN search_vector tsvector;

-- 2. Columna tsvector en paragraphs
ALTER TABLE paragraphs ADD COLUMN search_vector tsvector;

-- 3. Función + trigger para articles
CREATE FUNCTION update_article_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish',
    coalesce(NEW.number::text, '') || ' ' || coalesce(NEW.heading, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_search_vector_update
  BEFORE INSERT OR UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_article_search_vector();

-- 4. Función + trigger para paragraphs
CREATE FUNCTION update_paragraph_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish', coalesce(NEW.text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER paragraphs_search_vector_update
  BEFORE INSERT OR UPDATE ON paragraphs
  FOR EACH ROW EXECUTE FUNCTION update_paragraph_search_vector();

-- 5. Índices GIN
CREATE INDEX articles_search_idx ON articles USING GIN(search_vector);
CREATE INDEX paragraphs_search_idx ON paragraphs USING GIN(search_vector);

-- 6. Poblar las filas existentes
UPDATE articles SET search_vector = to_tsvector('spanish',
  coalesce(number::text, '') || ' ' || coalesce(heading, '')
) WHERE is_current = true;

UPDATE paragraphs SET search_vector = to_tsvector('spanish', coalesce(text, ''));
