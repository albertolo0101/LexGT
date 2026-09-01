import { describe, it, expect } from 'vitest'
import { makeBuilder, makeDb } from '@/lib/test/mock-supabase'
import { searchLaws } from './search'

const LAWS = [
  {
    id: 'l1',
    slug: 'ley-organica-del-instituto-guatemalteco-de-seguridad-social',
    short_name: 'Ley Orgánica del IGSS',
    full_name: 'Ley Orgánica del Instituto Guatemalteco de Seguridad Social',
    decree: 'Decreto 295',
  },
  {
    id: 'l2',
    slug: 'codigo-civil',
    short_name: 'Código Civil',
    full_name: 'Código Civil de la República de Guatemala',
    decree: 'Decreto Ley 106',
  },
  {
    id: 'l3',
    slug: 'codigo-de-trabajo',
    short_name: 'Código de Trabajo',
    full_name: 'Código de Trabajo de la República de Guatemala',
    decree: 'Decreto 1441',
  },
]

function db() {
  return makeDb([makeBuilder({ data: LAWS, error: null })])
}

describe('searchLaws', () => {
  it('finds a law by its full name — the case that was broken', async () => {
    const hits = await searchLaws(db(), 'ley organica del instituto')
    expect(hits.map((l) => l.slug)).toEqual([
      'ley-organica-del-instituto-guatemalteco-de-seguridad-social',
    ])
  })

  it('ignores accents in either direction', async () => {
    expect((await searchLaws(db(), 'codigo civil')).map((l) => l.slug)).toEqual(['codigo-civil'])
    expect((await searchLaws(db(), 'Código Civil')).map((l) => l.slug)).toEqual(['codigo-civil'])
  })

  it('ignores word order', async () => {
    const hits = await searchLaws(db(), 'trabajo codigo')
    expect(hits.map((l) => l.slug)).toEqual(['codigo-de-trabajo'])
  })

  it('finds a law by its decree number', async () => {
    const hits = await searchLaws(db(), '1441')
    expect(hits.map((l) => l.slug)).toEqual(['codigo-de-trabajo'])
  })

  it('requires every meaningful term, so unrelated laws do not leak in', async () => {
    const hits = await searchLaws(db(), 'codigo penal')
    expect(hits).toEqual([])
  })

  it('does not let stopwords alone match everything', async () => {
    expect(await searchLaws(db(), 'de la')).toEqual([])
  })

  it('ranks the short name above the long one', async () => {
    const hits = await searchLaws(db(), 'codigo')
    expect(hits.map((l) => l.slug)).toEqual(['codigo-civil', 'codigo-de-trabajo'])
  })

  it('honours the limit', async () => {
    const hits = await searchLaws(db(), 'codigo', 1)
    expect(hits).toHaveLength(1)
  })

  it('returns nothing for a query with no usable term', async () => {
    expect(await searchLaws(db(), 'a')).toEqual([])
  })
})
