/**
 * Token Bucket Rate Limiter
 * Implements a token bucket algorithm for rate limiting API requests
 * Features:
 * - Configurable tokens per time period
 * - LRU eviction to prevent memory leaks
 * - Per-key rate limiting
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class TokenBucketRateLimiter {
  private buckets = new Map<string, Bucket>();
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private maxBuckets: number;

  /**
   * Create a new rate limiter
   * @param maxTokens - Maximum tokens in bucket
   * @param refillRate - How many tokens to add per second
   * @param maxBuckets - Maximum number of buckets to store (LRU eviction)
   */
  constructor(maxTokens: number, refillRate: number, maxBuckets: number = 1000) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.maxBuckets = maxBuckets;
  }

  /**
   * Check if a request is allowed under the rate limit
   * @param key - Unique identifier for the rate limit (e.g., "nse_NIFTY_NSE")
   * @returns {allowed: true} if request is allowed, or {allowed: false, retryAfter: seconds} if rate limited
   */
  checkLimit(key: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      // Create new bucket with full tokens
      bucket = {
        tokens: this.maxTokens - 1, // Consume 1 token immediately
        lastRefill: now,
      };
      this.buckets.set(key, bucket);

      // Enforce max buckets limit (LRU eviction)
      if (this.buckets.size > this.maxBuckets) {
        const firstKey = this.buckets.keys().next().value as string | undefined;
        if (firstKey) this.buckets.delete(firstKey);
      }

      return { allowed: true };
    }

    // Refill tokens based on time elapsed
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if we have tokens available
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true };
    }

    // Rate limited - calculate retry after time
    const tokensNeeded = 1 - bucket.tokens;
    const retryAfter = Math.ceil(tokensNeeded / this.refillRate);

    return {
      allowed: false,
      retryAfter,
    };
  }

  /**
   * Clear all rate limit buckets
   */
  reset(): void {
    this.buckets.clear();
  }

  /**
   * Get current bucket state (for debugging)
   */
  getBucketState(key: string): Bucket | undefined {
    return this.buckets.get(key);
  }

  /**
   * Get number of active buckets
   */
  getActiveBuckets(): number {
    return this.buckets.size;
  }
}

/**
 * NSE Rate Limiter Instance
 * Configured for 10 requests per minute per symbol
 */
export const nseRateLimiter = new TokenBucketRateLimiter(
  10, // 10 tokens max
  10 / 60 // Refill at 10 tokens per 60 seconds = 0.1667 tokens/second
);
