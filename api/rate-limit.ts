import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import type { TrpcContext } from "./context";

/**
 * Simple in-memory rate limiter.
 * Tracks request counts per IP within a sliding time window.
 * Automatically cleans up expired entries to prevent memory leaks.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getClientIp(req: Request): string {
  // Check common proxy headers
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

/**
 * Check rate limit for a given action.
 * @param identifier - unique key (usually IP + action name)
 * @param maxAttempts - max requests allowed in the window
 * @param windowMs - time window in milliseconds
 * @returns true if allowed, throws if rate limited
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number,
  windowMs: number
): void {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    // First request or window expired — reset
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= maxAttempts) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many attempts. Please try again in ${retryAfterSec} seconds.`,
    });
  }

  entry.count++;
}

/**
 * Creates a tRPC middleware that rate-limits by client IP.
 * @param action - name of the action (used as part of the rate limit key)
 * @param maxAttempts - max attempts per window
 * @param windowMs - window duration in milliseconds
 */
export function createRateLimitMiddleware(
  t: ReturnType<typeof initTRPC.context<TrpcContext>["create"]>,
  action: string,
  maxAttempts: number,
  windowMs: number
) {
  return t.middleware(async ({ ctx, next }) => {
    const ip = getClientIp(ctx.req);
    const key = `${action}:${ip}`;
    checkRateLimit(key, maxAttempts, windowMs);
    return next();
  });
}
