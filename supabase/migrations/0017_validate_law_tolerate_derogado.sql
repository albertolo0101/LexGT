-- Phase 6.2a — refine validate_law's articles_have_paragraphs check.
-- Articles whose heading marks them as repealed ("Derogado") are legitimately
-- empty (55 of the ~1,062 zero-paragraph articles found in the 2026-06-11
-- audit). The remaining ~1,007 are real extraction gaps and still fail this
-- check, as intended — see LEXGT_EXECUTION_PLAN.md §6.2.

create or replace function public.validate_law(law_slug text)
returns table(check_name text, ok boolean, detail text)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_law_id uuid;
begin
  select id into v_law_id from public.laws where slug = law_slug;

  if v_law_id is null then
    return query select 'law_exists'::text, false, format('No law found with slug %L', law_slug);
    return;
  end if;

  return query select 'law_exists'::text, true, null::text;

  return query
    select 'has_sections'::text, count(*) > 0, format('%s sections', count(*))
    from public.sections where law_id = v_law_id;

  return query
    select 'sections_kind_valid'::text, count(*) = 0, format('%s sections with invalid kind', count(*))
    from public.sections
    where law_id = v_law_id
      and kind not in ('libro','titulo','capitulo','seccion','parte','parrafo','subseccion','articulo','disposiciones');

  return query
    select 'sections_sibling_position_unique'::text, count(*) = 0, format('%s duplicate (parent_id, position) pairs', count(*))
    from (
      select parent_id, position
      from public.sections
      where law_id = v_law_id
      group by parent_id, position
      having count(*) > 1
    ) dupes;

  return query
    select 'articles_have_paragraphs'::text, count(*) = 0, format('%s articles with zero paragraphs', count(*))
    from public.articles a
    where a.law_id = v_law_id
      and a.heading not ilike '%derogad%'
      and not exists (select 1 from public.paragraphs p where p.article_id = a.id);

  return query
    select 'paragraphs_position_unique'::text, count(*) = 0, format('%s duplicate (article_id, position) pairs', count(*))
    from (
      select p.article_id, p.position
      from public.paragraphs p
      join public.articles a on a.id = p.article_id
      where a.law_id = v_law_id
      group by p.article_id, p.position
      having count(*) > 1
    ) dupes;

  return query
    select 'one_current_article_per_number'::text, count(*) = 0, format('%s article numbers without exactly one current version', count(*))
    from (
      select number
      from public.articles
      where law_id = v_law_id
      group by number
      having count(*) filter (where is_current) <> 1
    ) bad;

  return query
    select 'paragraphs_nonempty_text'::text, count(*) = 0, format('%s paragraphs with empty text', count(*))
    from public.paragraphs p
    join public.articles a on a.id = p.article_id
    where a.law_id = v_law_id
      and length(trim(p.text)) = 0;

  return query
    select 'articles_search_vector'::text, count(*) = 0, format('%s articles with null search_vector', count(*))
    from public.articles
    where law_id = v_law_id and search_vector is null;

  return query
    select 'paragraphs_search_vector'::text, count(*) = 0, format('%s paragraphs with null search_vector', count(*))
    from public.paragraphs p
    join public.articles a on a.id = p.article_id
    where a.law_id = v_law_id and p.search_vector is null;
end;
$$;
