'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getActor } from '@/lib/authz'
import { runAction, type ActionResult } from '@/lib/action-result'
import * as jurisprudenciaService from '@/lib/services/jurisprudencia'
import type { JurisprudenciaRef } from '@/lib/types'

export async function saveJurisprudenciaRef(data: {
  jurisprudenciaId?: string | null
  expediente: string
  fechaSentencia?: string | null
  label?: string | null
  note?: string | null
  url?: string | null
}): Promise<ActionResult<JurisprudenciaRef>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient()
    const actor = await getActor(supabase)
    const input = jurisprudenciaService.SaveRefInput.parse(data)
    const ref = await jurisprudenciaService.saveJurisprudenciaRef(supabase, actor, input)

    revalidatePath('/jurisprudencia')
    return ref
  })
}

export async function updateJurisprudenciaRef(data: {
  refId: string
  label?: string | null
  note?: string | null
}): Promise<ActionResult<JurisprudenciaRef>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient()
    const actor = await getActor(supabase)
    const input = jurisprudenciaService.UpdateRefInput.parse(data)
    const ref = await jurisprudenciaService.updateJurisprudenciaRef(supabase, actor, input)

    revalidatePath('/jurisprudencia')
    revalidatePath('/casos')
    return ref
  })
}

export async function deleteJurisprudenciaRef(refId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient()
    const actor = await getActor(supabase)
    const input = jurisprudenciaService.DeleteRefInput.parse({ refId })
    await jurisprudenciaService.deleteJurisprudenciaRef(supabase, actor, input)

    revalidatePath('/jurisprudencia')
    revalidatePath('/casos')
  })
}

export async function addRefToCase(data: {
  caseId: string
  refId: string
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient()
    const actor = await getActor(supabase)
    const input = jurisprudenciaService.AddRefToCaseInput.parse(data)
    await jurisprudenciaService.addRefToCase(supabase, actor, input)

    revalidatePath('/casos')
    revalidatePath(`/casos/${input.caseId}`)
  })
}

export async function removeRefFromCase(
  caseJurisprudenciaId: string
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient()
    const actor = await getActor(supabase)
    const input = jurisprudenciaService.RemoveRefFromCaseInput.parse({ caseJurisprudenciaId })
    await jurisprudenciaService.removeRefFromCase(supabase, actor, input)

    revalidatePath('/casos')
  })
}
