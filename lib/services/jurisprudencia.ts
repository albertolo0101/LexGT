import 'server-only'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Actor } from '@/lib/authz'
import { requirePro } from '@/lib/authz'
import { ActionError } from '@/lib/action-result'
import type { JurisprudenciaRef } from '@/lib/types'

/** "7843-2023" — el formato que imprime la gaceta y acepta el portal. */
const EXPEDIENTE_RE = /^\d{1,5}-\d{4}$/

export const SaveRefInput = z.object({
  /** Nulo cuando el usuario anota un expediente que aún no está en el índice. */
  jurisprudenciaId: z.string().uuid().nullable().optional(),
  expediente: z
    .string()
    .trim()
    .transform((v) => v.replace(/[–—]/g, '-').replace(/\s+/g, ''))
    .refine((v) => EXPEDIENTE_RE.test(v), 'El expediente va como 1234-2024.'),
  fechaSentencia: z.string().date().nullable().optional(),
  label: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(5000).nullable().optional(),
  url: z.string().url().max(1000).nullable().optional(),
})
export type SaveRefInput = z.infer<typeof SaveRefInput>

/**
 * Guarda una referencia a una resolución.
 *
 * Es idempotente por expediente cuando la referencia está enlazada al índice:
 * guardar dos veces el mismo resultado devuelve la fila que ya existía en vez
 * de fallar con un choque de índice único.
 */
export async function saveJurisprudenciaRef(
  db: SupabaseClient,
  actor: Actor,
  input: SaveRefInput
): Promise<JurisprudenciaRef> {
  requirePro(actor)

  if (input.jurisprudenciaId) {
    const { data: existing, error: readError } = await db
      .from('jurisprudencia_refs')
      .select('*')
      .eq('user_id', actor.userId)
      .eq('jurisprudencia_id', input.jurisprudenciaId)
      .maybeSingle()
    if (readError) throw readError
    if (existing) return existing as JurisprudenciaRef
  }

  const { data, error } = await db
    .from('jurisprudencia_refs')
    .insert({
      user_id: actor.userId,
      jurisprudencia_id: input.jurisprudenciaId ?? null,
      expediente: input.expediente,
      fecha_sentencia: input.fechaSentencia ?? null,
      label: input.label ?? null,
      note: input.note ?? null,
      url: input.url ?? null,
    })
    .select('*')
    .single()
  if (error) throw error

  return data as JurisprudenciaRef
}

export const UpdateRefInput = z.object({
  refId: z.string().uuid(),
  label: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(5000).nullable().optional(),
})
export type UpdateRefInput = z.infer<typeof UpdateRefInput>

export async function updateJurisprudenciaRef(
  db: SupabaseClient,
  actor: Actor,
  input: UpdateRefInput
): Promise<JurisprudenciaRef> {
  requirePro(actor)

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.label !== undefined) patch.label = input.label
  if (input.note !== undefined) patch.note = input.note

  const { data, error } = await db
    .from('jurisprudencia_refs')
    .update(patch)
    .eq('id', input.refId)
    .eq('user_id', actor.userId)
    .select('*')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ActionError('NOT_FOUND', 'Esa referencia ya no existe.')

  return data as JurisprudenciaRef
}

export const DeleteRefInput = z.object({ refId: z.string().uuid() })
export type DeleteRefInput = z.infer<typeof DeleteRefInput>

export async function deleteJurisprudenciaRef(
  db: SupabaseClient,
  actor: Actor,
  input: DeleteRefInput
): Promise<void> {
  requirePro(actor)

  const { error } = await db
    .from('jurisprudencia_refs')
    .delete()
    .eq('id', input.refId)
    .eq('user_id', actor.userId)
  if (error) throw error
}

export const AddRefToCaseInput = z.object({
  caseId: z.string().uuid(),
  refId: z.string().uuid(),
})
export type AddRefToCaseInput = z.infer<typeof AddRefToCaseInput>

export async function addRefToCase(
  db: SupabaseClient,
  actor: Actor,
  input: AddRefToCaseInput
): Promise<void> {
  requirePro(actor)

  const { error } = await db
    .from('case_jurisprudencia')
    .insert({ case_id: input.caseId, ref_id: input.refId })

  // Ya estaba en el caso: mismo criterio que addAnnotationToCase.
  if (error && !error.message.includes('duplicate')) throw error
}

export const RemoveRefFromCaseInput = z.object({ caseJurisprudenciaId: z.string().uuid() })
export type RemoveRefFromCaseInput = z.infer<typeof RemoveRefFromCaseInput>

export async function removeRefFromCase(
  db: SupabaseClient,
  actor: Actor,
  input: RemoveRefFromCaseInput
): Promise<void> {
  requirePro(actor)

  const { error } = await db
    .from('case_jurisprudencia')
    .delete()
    .eq('id', input.caseJurisprudenciaId)
  if (error) throw error
}
