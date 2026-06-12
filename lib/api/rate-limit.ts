import 'server-only'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

const redis = url && token ? new Redis({ url, token }) : null

if (!redis) {
  console.warn('Rate limiting disabled: UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set.')
}

// 30 req/min por IP — usado en /api/search.
export const searchLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'ratelimit:search' })
  : null

// 60 req/min por usuario autenticado — usado en /api/v1/*.
export const apiLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'ratelimit:api' })
  : null

// Fail-open: si Redis no responde, se permite la solicitud (disponibilidad > estrictez).
export async function checkRateLimit(limiter: Ratelimit | null, identifier: string): Promise<boolean> {
  if (!limiter) return true

  try {
    const { success } = await limiter.limit(identifier)
    return success
  } catch (e) {
    console.error('Rate limit check failed, failing open:', e)
    return true
  }
}
