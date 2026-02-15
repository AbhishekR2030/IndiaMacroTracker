/**
 * Structured Logging Utility for India Macro Tracker
 * Provides JSON-formatted logs for better observability and monitoring
 */

import { DataSource } from "./errors";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogContext {
  source: DataSource;
  operation: string;
  indicator?: string;
  series?: string;
  symbol?: string;
  dataset?: string;
  durationMs?: number;
  statusCode?: number;
  error?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

interface LogEntry extends LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
}

/**
 * Structured logger for API operations
 */
export class Logger {
  private source: DataSource;

  constructor(source: DataSource) {
    this.source = source;
  }

  /**
   * Log an info message
   */
  info(message: string, context: Partial<LogContext> = {}): void {
    this.log("info", message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context: Partial<LogContext> = {}): void {
    this.log("warn", message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, context: Partial<LogContext> = {}): void {
    this.log("error", message, context);
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context: Partial<LogContext> = {}): void {
    if (process.env.NODE_ENV === "development") {
      this.log("debug", message, context);
    }
  }

  /**
   * Create a timer for measuring operation duration
   */
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  /**
   * Log an API request start
   */
  logRequestStart(operation: string, context: Partial<LogContext> = {}): () => number {
    this.debug(`${operation} - Request started`, {
      operation,
      ...context,
    });
    return this.startTimer();
  }

  /**
   * Log an API request success
   */
  logRequestSuccess(
    operation: string,
    durationMs: number,
    context: Partial<LogContext> = {}
  ): void {
    this.info(`${operation} - Success`, {
      operation,
      durationMs,
      statusCode: 200,
      ...context,
    });
  }

  /**
   * Log an API request error
   */
  logRequestError(
    operation: string,
    error: Error,
    durationMs?: number,
    context: Partial<LogContext> = {}
  ): void {
    this.error(`${operation} - Error: ${error.message}`, {
      operation,
      durationMs,
      error: error.message,
      errorCode: error.name,
      ...context,
    });
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context: Partial<LogContext>): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      source: this.source,
      operation: "unknown",
      ...context,
    } satisfies LogEntry;

    // Use console methods based on level
    const consoleMethod = level === "error" ? console.error :
                         level === "warn" ? console.warn :
                         console.log;

    // In production, log as JSON for structured logging systems
    if (process.env.NODE_ENV === "production") {
      consoleMethod(JSON.stringify(entry));
    } else {
      // In development, log human-readable format
      const emoji = level === "error" ? "❌" :
                    level === "warn" ? "⚠️" :
                    level === "info" ? "ℹ️" : "🔍";
      consoleMethod(
        `${emoji} [${entry.source}] ${message}`,
        context.durationMs !== undefined ? `(${context.durationMs}ms)` : "",
        context
      );
    }
  }
}

/**
 * Logger instances for each data source
 */
export const mospiLogger = new Logger("MoSPI");
export const rbiLogger = new Logger("RBI");
export const nseLogger = new Logger("NSE");
export const bseLogger = new Logger("BSE");
export const mockLogger = new Logger("Mock");

/**
 * Get logger for a specific source
 */
export function getLogger(source: DataSource): Logger {
  switch (source) {
    case "MoSPI":
      return mospiLogger;
    case "RBI":
      return rbiLogger;
    case "NSE":
      return nseLogger;
    case "BSE":
      return bseLogger;
    case "Mock":
      return mockLogger;
    default:
      return new Logger(source);
  }
}
