-- test_reform.sql
-- Reforma de prueba para el Código Civil (Artículo 1).
-- Requiere: seed.sql y 0002_versioning.sql ya aplicados.

do $$
declare
  v_law_id     uuid;
  v_reform_id  uuid;
  v_old_art_id uuid;
  v_new_art_id uuid;
begin
  select id into v_law_id
  from laws
  where slug = 'codigo-civil';

  insert into law_reforms (law_id, title, description, published_at)
  values (
    v_law_id,
    'Reforma de prueba — Artículo 1',
    'Reforma ficticia para pruebas de versioning. Modifica levemente el texto del Artículo 1.',
    now()
  )
  returning id into v_reform_id;

  select id into v_old_art_id
  from articles
  where law_id = v_law_id
    and number = '1'
    and is_current = true
  limit 1;

  insert into articles (
    law_id, section_id, number, heading, position,
    is_current, version, version_number,
    previous_version_id, reform_id, effective_on
  )
  select
    law_id, section_id, number, heading, position,
    true,
    version + 1,
    version_number + 1,
    v_old_art_id,
    v_reform_id,
    now()
  from articles
  where id = v_old_art_id
  returning id into v_new_art_id;

  insert into paragraphs (article_id, position, text)
  values (
    v_new_art_id,
    1,
    '[VERSIÓN REFORMADA — PRUEBA] La persona es el ser humano considerado individualmente como sujeto de derechos y obligaciones. La ley reconoce su personalidad civil desde el momento de su concepción para todos los efectos que le sean favorables, siempre que nazca viva.'
  );

  update articles
  set is_current    = false,
      superseded_at = now()
  where id = v_old_art_id;

end $$;
