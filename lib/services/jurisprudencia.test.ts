import { describe, it, expect } from 'vitest'
import type { Actor } from '@/lib/authz'
import { AuthzError } from '@/lib/authz'
import { makeBuilder, makeDb } from '@/lib/test/mock-supabase'
import {
  SaveRefInput,
  addRefToCase,
  deleteJurisprudenciaRef,
  saveJurisprudenciaRef,
  updateJurisprudenciaRef,
} from './jurisprudencia'

const anonActor: Actor = { userId: null, tier: 'anonymous', isAdmin: false }
const freeActor: Actor = { userId: 'free-user', tier: 'free', isAdmin: false }
const proActor: Actor = { userId: 'pro-user', tier: 'pro', isAdmin: false }

describe('SaveRefInput', () => {
  it('accepts an expediente as the gaceta prints it', () => {
    expect(SaveRefInput.parse({ expediente: '7843-2023' }).expediente).toBe('7843-2023')
  })

  it('normalizes the en dash the gaceta sometimes uses', () => {
    expect(SaveRefInput.parse({ expediente: '7843–2023' }).expediente).toBe('7843-2023')
  })

  it('strips stray whitespace inside the number', () => {
    expect(SaveRefInput.parse({ expediente: ' 7843 - 2023 ' }).expediente).toBe('7843-2023')
  })

  it('rejects anything that is not <número>-<año>', () => {
    expect(() => SaveRefInput.parse({ expediente: 'amparo' })).toThrow()
    expect(() => SaveRefInput.parse({ expediente: '7843' })).toThrow()
    expect(() => SaveRefInput.parse({ expediente: '7843-23' })).toThrow()
  })
})

describe('saveJurisprudenciaRef', () => {
  it('rejects anonymous users', async () => {
    await expect(
      saveJurisprudenciaRef(makeDb([]), anonActor, { expediente: '1-2024' })
    ).rejects.toBeInstanceOf(AuthzError)
  })

  it('rejects free users — the índice is Pro', async () => {
    await expect(
      saveJurisprudenciaRef(makeDb([]), freeActor, { expediente: '1-2024' })
    ).rejects.toMatchObject({ code: 'PRO_REQUIRED' })
  })

  it('inserts a reference scoped to the owner', async () => {
    const lookup = makeBuilder({ data: null, error: null })
    const insert = makeBuilder({ data: { id: 'ref1' }, error: null })
    const db = makeDb([lookup, insert])

    const ref = await saveJurisprudenciaRef(db, proActor, {
      jurisprudenciaId: '11111111-1111-1111-1111-111111111111',
      expediente: '7843-2023',
      fechaSentencia: '2024-10-01',
      note: 'Sirve para el punto 3',
    })

    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'pro-user',
        expediente: '7843-2023',
        fecha_sentencia: '2024-10-01',
        note: 'Sirve para el punto 3',
      })
    )
    expect(ref).toEqual({ id: 'ref1' })
  })

  it('returns the existing row instead of colliding on a second save', async () => {
    const lookup = makeBuilder({ data: { id: 'ref-existente' }, error: null })
    const db = makeDb([lookup])

    const ref = await saveJurisprudenciaRef(db, proActor, {
      jurisprudenciaId: '11111111-1111-1111-1111-111111111111',
      expediente: '7843-2023',
    })

    expect(ref).toEqual({ id: 'ref-existente' })
  })

  it('skips the lookup when there is nothing to link to', async () => {
    const insert = makeBuilder({ data: { id: 'ref1' }, error: null })
    const db = makeDb([insert])

    await saveJurisprudenciaRef(db, proActor, { expediente: '9-2026' })

    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ jurisprudencia_id: null, expediente: '9-2026' })
    )
  })
})

describe('updateJurisprudenciaRef', () => {
  it('rejects free users', async () => {
    await expect(
      updateJurisprudenciaRef(makeDb([]), freeActor, {
        refId: '11111111-1111-1111-1111-111111111111',
        note: 'x',
      })
    ).rejects.toMatchObject({ code: 'PRO_REQUIRED' })
  })

  it('scopes the update to the owner', async () => {
    const update = makeBuilder({ data: { id: 'ref1', note: 'x' }, error: null })
    const db = makeDb([update])

    await updateJurisprudenciaRef(db, proActor, {
      refId: '11111111-1111-1111-1111-111111111111',
      note: 'x',
    })

    expect(update.eq).toHaveBeenCalledWith('id', '11111111-1111-1111-1111-111111111111')
    expect(update.eq).toHaveBeenCalledWith('user_id', 'pro-user')
  })

  it('reports NOT_FOUND instead of pretending it worked', async () => {
    const db = makeDb([makeBuilder({ data: null, error: null })])

    await expect(
      updateJurisprudenciaRef(db, proActor, {
        refId: '11111111-1111-1111-1111-111111111111',
        note: 'x',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('deleteJurisprudenciaRef', () => {
  it('scopes the delete to the owner', async () => {
    const del = makeBuilder({ data: null, error: null })
    const db = makeDb([del])

    await deleteJurisprudenciaRef(db, proActor, {
      refId: '11111111-1111-1111-1111-111111111111',
    })

    expect(del.delete).toHaveBeenCalled()
    expect(del.eq).toHaveBeenCalledWith('user_id', 'pro-user')
  })
})

describe('addRefToCase', () => {
  it('rejects free users', async () => {
    await expect(
      addRefToCase(makeDb([]), freeActor, {
        caseId: '11111111-1111-1111-1111-111111111111',
        refId: '22222222-2222-2222-2222-222222222222',
      })
    ).rejects.toMatchObject({ code: 'PRO_REQUIRED' })
  })

  it('treats an already-attached reference as success', async () => {
    const db = makeDb([
      makeBuilder({ data: null, error: { message: 'duplicate key value violates…' } }),
    ])

    await expect(
      addRefToCase(db, proActor, {
        caseId: '11111111-1111-1111-1111-111111111111',
        refId: '22222222-2222-2222-2222-222222222222',
      })
    ).resolves.toBeUndefined()
  })

  it('still surfaces a real error', async () => {
    const db = makeDb([makeBuilder({ data: null, error: { message: 'permission denied' } })])

    await expect(
      addRefToCase(db, proActor, {
        caseId: '11111111-1111-1111-1111-111111111111',
        refId: '22222222-2222-2222-2222-222222222222',
      })
    ).rejects.toMatchObject({ message: 'permission denied' })
  })
})
