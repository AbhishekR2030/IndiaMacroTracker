/**
 * Standardized Error Types for India Macro Tracker APIs
 * Provides consistent error handling and serialization across all data sources
 */

export type DataSource = "MoSPI" | "RBI" | "NSE" | "BSE" | "Mock";

export interface ErrorResponse {
  success: false;
  error: {
    source: DataSource;
    code: string;
    message: string;
    statusCode: number;
  };
  fallbackToMock: boolean;
  timestamp: string;
}

/**
 * Base API Error class with standardized serialization
 */
export class APIError extends Error {
  public source: DataSource;
  public code: string;
  public statusCode: number;

  constructor(
    source: DataSource,
    code: string,
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "APIError";
    this.source = source;
    this.code = code;
    this.statusCode = statusCode;
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        source: this.source,
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
      },
      fallbackToMock: true,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Network-related errors (timeouts, connection failures, DNS errors)
 */
export class NetworkError extends APIError {
  constructor(source: DataSource, message: string, originalError?: Error) {
    const fullMessage = originalError
      ? `${message}: ${originalError.message}`
      : message;
    super(source, "NETWORK_ERROR", 503, fullMessage);
    this.name = "NetworkError";
  }
}

/**
 * API response errors (non-200 status codes, malformed responses)
 */
export class DataAPIError extends APIError {
  public responseStatus?: number;

  constructor(
    source: DataSource,
    statusCode: number,
    message: string,
    responseStatus?: number
  ) {
    super(source, "API_ERROR", statusCode, message);
    this.name = "DataAPIError";
    this.responseStatus = responseStatus;
  }
}

/**
 * Validation errors (missing parameters, invalid formats)
 */
export class ValidationError extends APIError {
  public field?: string;

  constructor(source: DataSource, message: string, field?: string) {
    super(source, "VALIDATION_ERROR", 400, message);
    this.name = "ValidationError";
    this.field = field;
  }
}

/**
 * Rate limit exceeded errors
 */
export class RateLimitError extends APIError {
  public retryAfter?: number;

  constructor(source: DataSource, message: string, retryAfter?: number) {
    super(source, "RATE_LIMIT_ERROR", 429, message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }

  override toJSON(): ErrorResponse & { retryAfter?: number } {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Timeout errors (request took too long)
 */
export class TimeoutError extends NetworkError {
  public timeoutMs: number;

  constructor(source: DataSource, timeoutMs: number) {
    super(source, `Request timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
    this.code = "TIMEOUT_ERROR";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Data parsing/transformation errors
 */
export class DataTransformError extends APIError {
  constructor(source: DataSource, message: string) {
    super(source, "TRANSFORM_ERROR", 500, message);
    this.name = "DataTransformError";
  }
}

/**
 * Helper function to determine error type from fetch error
 */
export function categorizeError(
  error: unknown,
  source: DataSource
): APIError {
  if (error instanceof APIError) {
    return error;
  }

  if (error instanceof Error) {
    // Timeout errors
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return new TimeoutError(source, 30000);
    }

    // Network errors
    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ENOTFOUND")
    ) {
      return new NetworkError(source, "Network request failed", error);
    }

    // Generic API error
    return new DataAPIError(source, 500, error.message);
  }

  // Unknown error type
  return new DataAPIError(source, 500, "An unknown error occurred");
}

/**
 * Helper to check if error is retryable
 */
export function isRetryableError(error: APIError): boolean {
  return (
    error instanceof NetworkError ||
    error instanceof TimeoutError ||
    (error instanceof DataAPIError && error.statusCode >= 500)
  );
}
