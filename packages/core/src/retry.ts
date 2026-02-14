/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let delay = cfg.initialDelay;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === cfg.maxRetries) {
        break;
      }

      console.warn(
        `Attempt ${attempt + 1}/${cfg.maxRetries + 1} failed: ${lastError.message}. ` +
        `Retrying in ${delay}ms...`
      );

      await sleep(delay);
      delay = Math.min(delay * cfg.backoffMultiplier, cfg.maxDelay);
    }
  }

  throw new Error(
    `Failed after ${cfg.maxRetries + 1} attempts. Last error: ${lastError?.message}`
  );
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
    return true;
  }

  // Rate limit errors
  if (error?.status === 429 || error?.statusCode === 429) {
    return true;
  }

  // Server errors (5xx)
  if (error?.status >= 500 || error?.statusCode >= 500) {
    return true;
  }

  return false;
}

/**
 * Retry with conditional logic based on error type
 */
export async function withSmartRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  return withRetry(async () => {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error)) {
        throw error; // Don't retry non-retryable errors
      }
      throw error;
    }
  }, config);
}
