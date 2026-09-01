import 'server-only'

/**
 * Facturación Electrónica en Línea (FEL) — SAT Guatemala.
 *
 * En FEL la factura no la emite el comercio: la certifica un **certificador**
 * autorizado (Infile, Guatefacturas, Digifact…) que devuelve serie, número,
 * UUID de autorización y el PDF. LexGT solo guarda ese resultado en
 * `invoices`; el XML firmado vive en el certificador.
 *
 * Estado: **adaptador vacío**. Falta el contrato real de Infile, que se
 * entrega al contratar el servicio:
 *
 *   1. `FEL_CERTIFIER=infile`, `INFILE_USER`, `INFILE_KEY`, `INFILE_TOKEN` y
 *      el NIT emisor (`FEL_NIT_EMISOR`), más la URL del ambiente de pruebas.
 *   2. El XML del DTE (tipo FACT, con el receptor, el ítem "Suscripción
 *      LexGT Pro", el IVA incluido y el total) y el endpoint de certificación.
 *   3. Qué devuelve al certificar: UUID, serie, número y el PDF.
 *
 * Reglas del negocio que ya se pueden fijar sin el contrato:
 *   - se factura **después** de que el pago quedó en `paid`, nunca antes;
 *   - si el usuario no da NIT, la factura va a **CF** (consumidor final);
 *   - un fallo al certificar **no** revierte el pago ni quita el tier: la
 *     factura queda `failed` y se reintenta desde el panel.
 */

export type FelRequest = {
  paymentId: string
  amountCents: number
  currency: string
  description: string
  /** NIT del receptor; `null` o vacío = CF (consumidor final). */
  nit: string | null
  nombre: string | null
}

export type FelResult = {
  serie: string
  numero: string
  uuid: string
  authorizedAt: string
  pdfUrl: string | null
  raw: unknown
}

export type FelCertifier = {
  readonly name: string
  isConfigured(): boolean
  certify(request: FelRequest): Promise<FelResult>
}

const REQUIRED = ['INFILE_USER', 'INFILE_KEY', 'INFILE_TOKEN', 'FEL_NIT_EMISOR'] as const

function missingEnv(): string[] {
  return REQUIRED.filter((key) => !process.env[key])
}

export const infile: FelCertifier = {
  name: 'infile',

  isConfigured() {
    return missingEnv().length === 0
  },

  async certify(_request: FelRequest): Promise<FelResult> {
    void _request
    throw new Error(
      `El certificador FEL "infile" no está configurado. Faltan: ${missingEnv().join(', ')}.`
    )
  },
}

export const CERTIFIERS: Record<string, FelCertifier> = { infile }

export function getCertifier(): FelCertifier | null {
  const name = process.env.FEL_CERTIFIER?.trim().toLowerCase()
  if (!name || name === 'none') return null
  return CERTIFIERS[name] ?? null
}

export function felEnabled(): boolean {
  const certifier = getCertifier()
  return certifier !== null && certifier.isConfigured()
}

/** Normaliza un NIT: sin guiones ni espacios; vacío o "CF" → consumidor final. */
export function normalizeNit(nit: string | null | undefined): string {
  const clean = (nit ?? '').replace(/[\s-]/g, '').toUpperCase()
  if (clean === '' || clean === 'CF' || clean === 'C/F') return 'CF'
  return clean
}
