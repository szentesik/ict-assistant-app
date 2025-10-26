/**
 * Utility for handling rate limits and retries with exponential backoff
 */

import { APICallError } from "ai";

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

interface RetryError extends Error {
  isRateLimit?: boolean;
  retryAfterMs?: number;
}

/**
 * Checks if the error is a rate limit error from OpenAI
 */
export function isRateLimitError(error: any): boolean {
  return (
    error?.name === 'AI_APICallError' &&
    (error?.message?.includes('Rate limit') || error?.cause?.status === 429)
  );
}

/**
 * Extracts retry-after time from error response
 */
export function extractRetryAfterMs(error: any): number|null {
  if (error?.cause?.response?.headers) {
    const retryAfter = error.cause.response.headers.get('retry-after-ms');
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }
  }
  return null;
}

/**
 * Sleeps for the specified milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retries a function with exponential backoff, specifically handling rate limits
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 60000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      console.warn('Error calling embedding function:', error)
      lastError = error;

      // Check if it's a rate limit error
      const isRateLimit = isRateLimitError(error);
      
      // If it's the last attempt or not a rate limit error, throw
      if (!isRateLimit || attempt === maxRetries) {
        throw error;
      }

      // Extract retry-after-ms header if available
      const retryAfterMs = extractRetryAfterMs(error);
      const waitTime = retryAfterMs || delay;

      console.warn(
        `Rate limit hit (attempt ${attempt + 1}/${maxRetries + 1}). ` +
        `Waiting ${waitTime}ms before retry...`
      );

      await sleep(Math.min(waitTime, maxDelayMs));
      
      // Increase delay for next attempt (unless we used retry-after header)
      if (!retryAfterMs) {
        delay = Math.min(delay * backoffMultiplier, maxDelayMs);
      }
    }
  }

  throw lastError!;
}
