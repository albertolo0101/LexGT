import 'server-only'
import { AuthzError, type AuthzCode } from './authz'

export type ActionErrorCode =
  | AuthzCode
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'INTERNAL'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: ActionErrorCode; message: string }

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

export function err(code: ActionErrorCode, message: string): ActionResult<never> {
  return { ok: false, code, message }
}

// Para errores de negocio (NOT_FOUND, VALIDATION, CONFLICT) que no son de
// autorización pero sí deben llegar al cliente con un código y mensaje propios.
export class ActionError extends Error {
  code: ActionErrorCode

  constructor(code: ActionErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

const FALLBACK_MESSAGES: Record<ActionErrorCode, string> = {
  UNAUTHENTICATED: 'Debes iniciar sesión para hacer esto.',
  PRO_REQUIRED: 'Esta función requiere el plan Pro.',
  ADMIN_REQUIRED: 'No autorizado.',
  NOT_FOUND: 'No encontrado.',
  VALIDATION: 'Datos inválidos.',
  CONFLICT: 'Ya existe.',
  INTERNAL: 'Ocurrió un error. Intenta de nuevo.',
}

function isPostgrestError(e: unknown): e is { code: string; message: string } {
  return typeof e === 'object' && e !== null && 'code' in e && 'message' in e
}

// Ejecuta una acción y mapea cualquier excepción a un ActionResult tipado.
// Nunca expone pgError.message al cliente — se loguea server-side y se
// devuelve un mensaje genérico.
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn())
  } catch (e) {
    if (e instanceof AuthzError) {
      return err(e.code, FALLBACK_MESSAGES[e.code])
    }
    if (e instanceof ActionError) {
      return err(e.code, e.message)
    }
    if (isPostgrestError(e)) {
      if (e.code === '23505') return err('CONFLICT', FALLBACK_MESSAGES.CONFLICT)
    }
    console.error(e)
    return err('INTERNAL', FALLBACK_MESSAGES.INTERNAL)
  }
}
