import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface RateLimitEntry {
  count: number
  resetTime: number
  blockedUntil?: number
}

const memoryStore: Map<string, RateLimitEntry> = new Map()

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0]?.trim() ?? 'unknown' : 'unknown'
  return ip
}

async function checkSupabase(
  clientId: string,
  bucket: string,
  options: { windowMs: number; maxRequests: number; blockDurationMs?: number }
): Promise<{ allowed: boolean; remaining: number; resetTime: number; retryAfter?: number }> {
  const now = Date.now()
  const { windowMs, maxRequests, blockDurationMs = 0 } = options

  try {
    const supabase = await createServiceClient()
    const { data: entry } = await supabase
      .from('rate_limits')
      .select('count, reset_at, blocked_until')
      .eq('client_id', clientId)
      .eq('bucket', bucket)
      .single()

    if (entry?.blocked_until) {
      const blockedUntil = new Date(entry.blocked_until).getTime()
      if (blockedUntil > now) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: blockedUntil,
          retryAfter: Math.ceil((blockedUntil - now) / 1000),
        }
      }
    }

    const resetAt = entry ? new Date(entry.reset_at).getTime() : 0
    const count = entry && resetAt > now ? entry.count : 0
    const newResetAt = resetAt > now ? resetAt : now + windowMs
    const newCount = count + 1

    if (newCount > maxRequests) {
      const blockedUntil = blockDurationMs > 0 ? new Date(now + blockDurationMs).toISOString() : null

      await supabase.from('rate_limits').upsert({
        client_id: clientId,
        bucket,
        count: newCount,
        reset_at: new Date(newResetAt).toISOString(),
        blocked_until: blockedUntil,
      })

      return {
        allowed: false,
        remaining: 0,
        resetTime: newResetAt,
        retryAfter: blockDurationMs > 0 ? Math.ceil(blockDurationMs / 1000) : Math.ceil((newResetAt - now) / 1000),
      }
    }

    await supabase.from('rate_limits').upsert({
      client_id: clientId,
      bucket,
      count: newCount,
      reset_at: new Date(newResetAt).toISOString(),
      blocked_until: null,
    })

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - newCount),
      resetTime: newResetAt,
    }
  } catch {
    return checkMemory(clientId, options)
  }
}

function checkMemory(
  clientId: string,
  options: { windowMs: number; maxRequests: number; blockDurationMs?: number }
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const now = Date.now()
  const { windowMs, maxRequests, blockDurationMs = 0 } = options

  let entry = memoryStore.get(clientId)

  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    }
  }

  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + windowMs }
  }

  entry.count++

  if (entry.count > maxRequests) {
    if (blockDurationMs > 0) entry.blockedUntil = now + blockDurationMs
    memoryStore.set(clientId, entry)
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: blockDurationMs > 0 ? Math.ceil(blockDurationMs / 1000) : Math.ceil((entry.resetTime - now) / 1000),
    }
  }

  memoryStore.set(clientId, entry)
  return { allowed: true, remaining: Math.max(0, maxRequests - entry.count), resetTime: entry.resetTime }
}

class RateLimiter {
  private useSupabase: boolean

  constructor(useSupabase = true) {
    this.useSupabase = useSupabase
  }

  async check(
    request: NextRequest,
    options: { windowMs: number; maxRequests: number; blockDurationMs?: number },
    bucket = 'default'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number; retryAfter?: number }> {
    const clientId = getClientId(request)

    if (this.useSupabase) {
      return checkSupabase(clientId, bucket, options)
    }
    return checkMemory(clientId, options)
  }
}

export const rateLimiter = new RateLimiter()

export function createRateLimitMiddleware(options: {
  windowMs: number
  maxRequests: number
  blockDurationMs?: number
  message?: string
  bucket?: string
}) {
  return async (request: NextRequest) => {
    const result = await rateLimiter.check(request, options, options.bucket || 'api')

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: options.message || 'Too many requests',
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': options.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetTime.toString(),
            'Retry-After': result.retryAfter?.toString() || '60',
          },
        }
      )
    }

    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': options.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
      },
    }
  }
}

// Pre-configured rate limiters
export const authRateLimiter = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  blockDurationMs: 15 * 60 * 1000,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  bucket: 'auth',
})

export const apiRateLimiter = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'API rate limit exceeded. Please slow down.',
  bucket: 'api',
})

export const secRateLimiter = createRateLimitMiddleware({
  windowMs: 1000,
  maxRequests: 10,
  message: 'SEC rate limit - requests throttled.',
  bucket: 'sec',
})

// Token bucket implementation for SEC API (more granular control)
class TokenBucket {
  private tokens: number
  private lastRefill: number
  private readonly maxTokens: number
  private readonly refillRate: number // tokens per second

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens
    this.tokens = maxTokens
    this.refillRate = refillRate
    this.lastRefill = Date.now()
  }

  private refill() {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    const tokensToAdd = elapsed * this.refillRate
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  async consume(tokens: number = 1): Promise<boolean> {
    this.refill()
    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }
    return false
  }

  async waitForToken(): Promise<void> {
    while (!(await this.consume())) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  getAvailableTokens(): number {
    this.refill()
    return Math.floor(this.tokens)
  }
}

// SEC API token bucket: 10 requests/second with burst capability
export const secTokenBucket = new TokenBucket(10, 10)

// Helper to rate-limit SEC requests
export async function withSecRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  await secTokenBucket.waitForToken()
  return fn()
}
