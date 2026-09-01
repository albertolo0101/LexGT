import 'server-only'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

// Un Redis inalcanzable NO debe costarle segundos al usuario. Con los reintentos
// por defecto del SDK (5, con backoff exponencial) una instancia muerta le sumaba
// ~4.6 s a cada búsqueda antes de hacer fail-open — medido, con las credenciales
// caducadas de `.env.local`. Un reintento corto es suficiente: el rate limiting
// es una protección, no una función del producto.
const redis =
  url && token ? new Redis({ url, token, retry: { retries: 1, backoff: () => 50 } }) : null

if (!redis) {
  console.warn('Rate limiting disabled: UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set.')
}

// Presupuesto de latencia del chequeo. Si Redis no contesta a tiempo, se deja
// pasar la solicitud.
export const RATE_LIMIT_TIMEOUT_MS = 400

// 30 req/min por IP — usado en /api/search.
export const searchLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'ratelimit:search' })
  : null

// 60 req/min por usuario autenticado — usado en /api/v1/*.
export const apiLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'ratelimit:api' })
  : null

let timeoutLogged = false

// Fail-open: si Redis falla o tarda más que el presupuesto, se permite la
// solicitud (disponibilidad > estrictez para una app de lectura).
export async function checkRateLimit(limiter: Ratelimit | null, identifier: string): Promise<boolean> {
  if (!limiter) return true

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      limiter.limit(identifier).then(({ success }) => success),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => {
          if (!timeoutLogged) {
            timeoutLogged = true
            console.error(`Rate limit check exceeded ${RATE_LIMIT_TIMEOUT_MS}ms, failing open.`)
          }
          resolve(true)
        }, RATE_LIMIT_TIMEOUT_MS)
      }),
    ])
  } catch (e) {
    console.error('Rate limit check failed, failing open:', e)
    return true
  } finally {
    clearTimeout(timer)
  }
}
