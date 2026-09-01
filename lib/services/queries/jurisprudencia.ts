import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Jurisprudencia, JurisprudenciaRefWithSource } from '@/lib/types'

const COLUMNS =
  'id, expediente, expedientes, tipo_proceso, tipo_resolucion, resultado, fecha_sentencia, sumario, gaceta, periodo, pagina, source_url'

export type SearchJurisprudenciaInput = {
  q: string
  /** Uno o varios expedientes, como los acepta el portal: "1920-2003 1930". */
  expediente?: string | null
  tipoProceso?: string | null
  resultado?: string | null
  desde?: string | null
  hasta?: string | null
  limit: number
  offset?: number
}

export type SearchJurisprudenciaResult = {
  results: Jurisprudencia[]
  total: number
}

/**
 * Búsqueda sobre el índice de jurisprudencia.
 *
 * Réplica de los modos del portal de la CC en una sola consulta: texto libre
 * (`plainto_tsquery('spanish')`, igual que `/buscar`), número de expediente,
 * lapso de fechas y tipo de proceso. La tabla es Pro-only por RLS, así que un
 * usuario sin plan recibe cero filas en lugar de un error — la página es la
 * que decide mostrar el paywall.
 */
export async function searchJurisprudencia(
  db: SupabaseClient,
  input: SearchJurisprudenciaInput
): Promise<SearchJurisprudenciaResult> {
  const { q, expediente, tipoProceso, resultado, desde, hasta, limit } = input
  const offset = input.offset ?? 0

  let query = db
    .from('jurisprudencia')
    .select(COLUMNS, { count: 'exact' })
    .order('fecha_sentencia', { ascending: false })
    .range(offset, offset + limit - 1)

  const text = q.trim()
  if (text.length >= 2) {
    query = query.textSearch('search_vector', text, { type: 'plain', config: 'spanish' })
  }

  // Los expedientes se escriben separados por espacio, como en el portal. Un
  // fragmento ("1920") también sirve, igual que allá.
  const numbers = (expediente ?? '').trim().split(/\s+/).filter(Boolean)
  if (numbers.length > 0) {
    query = query.or(numbers.map((n) => `expediente.ilike.%${n.replace(/[%,]/g, '')}%`).join(','))
  }

  if (tipoProceso) query = query.eq('tipo_proceso', tipoProceso)
  if (resultado) query = query.eq('resultado', resultado)
  if (desde) query = query.gte('fecha_sentencia', desde)
  if (hasta) query = query.lte('fecha_sentencia', hasta)

  const { data, count, error } = await query
  if (error) throw error

  return { results: (data ?? []) as Jurisprudencia[], total: count ?? 0 }
}

/** Una resolución por su id. */
export async function getJurisprudencia(
  db: SupabaseClient,
  id: string
): Promise<Jurisprudencia | null> {
  const { data, error } = await db.from('jurisprudencia').select(COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Jurisprudencia | null) ?? null
}

/**
 * Los valores que existen de verdad en el índice, para llenar los filtros.
 *
 * Se leen del dato en vez de fijarse en una constante porque el catálogo de la
 * Unidad de Jurisprudencia crece: "PARCIALMENTE CON LUGAR" apareció en la
 * gaceta 154 y no estaba en el manual de 2018.
 */
export async function getJurisprudenciaFacets(
  db: SupabaseClient
): Promise<{ tiposProceso: string[]; resultados: string[] }> {
  // Por RPC y no por SELECT: PostgREST no hace DISTINCT, así que llenar dos
  // desplegables de ~20 y ~30 valores costaba traer miles de filas en cada
  // carga. La función devuelve dos arrays y nada más.
  const { data, error } = await db.rpc('jurisprudencia_facets').maybeSingle()
  if (error) throw error

  const row = (data ?? null) as { tipos_proceso: string[]; resultados: string[] } | null
  return {
    tiposProceso: row?.tipos_proceso ?? [],
    resultados: row?.resultados ?? [],
  }
}

/** Las referencias que el usuario ha guardado, la más reciente primero. */
export async function listJurisprudenciaRefs(
  db: SupabaseClient,
  userId: string
): Promise<JurisprudenciaRefWithSource[]> {
  const { data, error } = await db
    .from('jurisprudencia_refs')
    .select(`*, jurisprudencia:jurisprudencia_id(${COLUMNS})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as JurisprudenciaRefWithSource[]
}

/**
 * Los ids de jurisprudencia que el usuario ya guardó, para marcar el listado
 * sin una consulta por resultado.
 */
export async function getSavedJurisprudenciaIds(
  db: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data, error } = await db
    .from('jurisprudencia_refs')
    .select('jurisprudencia_id')
    .eq('user_id', userId)
    .not('jurisprudencia_id', 'is', null)
  if (error) throw error
  return new Set(
    ((data ?? []) as { jurisprudencia_id: string }[]).map((r) => r.jurisprudencia_id)
  )
}

export type CaseJurisprudenciaRow = {
  id: string
  case_id: string
  ref: JurisprudenciaRefWithSource
}

/** Las referencias adjuntas a un caso. */
export async function getCaseJurisprudencia(
  db: SupabaseClient,
  caseId: string
): Promise<CaseJurisprudenciaRow[]> {
  const { data, error } = await db
    .from('case_jurisprudencia')
    .select(`id, case_id, ref:ref_id(*, jurisprudencia:jurisprudencia_id(${COLUMNS}))`)
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as CaseJurisprudenciaRow[]
}
