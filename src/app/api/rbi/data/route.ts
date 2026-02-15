import { NextRequest, NextResponse } from "next/server";
import { rbiLogger } from "@/lib/logger";
import { categorizeError, ValidationError, NetworkError } from "@/lib/errors";
import { encryptPayload, decryptPayload } from "@/lib/rbi-crypto";

const RBI_CIMS_BASE =
  process.env.RBI_DBIE_URL ||
  "https://data.rbi.org.in/CIMS_Gateway_DBIE/GATEWAY/SERVICES";

// =====================================================
// SESSION TOKEN MANAGEMENT (server-side singleton)
// =====================================================

let sessionToken: string | null = null;
let sessionExpiresAt = 0;
let refreshPromise: Promise<string> | null = null;
const SESSION_LIFETIME_MS = 12 * 60 * 1000; // Refresh every 12 min (expires at ~14 min)

async function getSessionToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid
  if (sessionToken && now < sessionExpiresAt) {
    return sessionToken;
  }

  // If a refresh is already in progress, await it (prevents concurrent refreshes)
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      rbiLogger.debug("Generating new RBI session token", {
        operation: "session_refresh",
        source: "RBI",
      });

      const response = await fetch(
        `${RBI_CIMS_BASE}/security_generateSessionToken`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            channelkey: "key1",
            datatype: "application/json",
          },
          body: JSON.stringify({ body: {} }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new NetworkError(
          "RBI",
          `Session token request failed: ${response.status}`
        );
      }

      // Session token is returned in the authorization response header
      const authHeader = response.headers.get("authorization");
      if (!authHeader) {
        throw new NetworkError(
          "RBI",
          "No authorization header in session token response"
        );
      }

      sessionToken = authHeader;
      sessionExpiresAt = Date.now() + SESSION_LIFETIME_MS;

      rbiLogger.info("RBI session token refreshed", {
        operation: "session_refresh",
        source: "RBI",
      });

      return sessionToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Invalidate the current session and force re-auth on next call
 */
function invalidateSession(): void {
  sessionToken = null;
  sessionExpiresAt = 0;
}

// =====================================================
// HTML ENTITY DECODING
// =====================================================

function decodeHtmlEntities(text: string): string {
  return text
    // Hex character references: &#x7b; → {
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    // Decimal character references: &#123; → {
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCharCode(parseInt(dec, 10))
    )
    // Named entities (order matters: &amp; first, then entities it could produce)
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// =====================================================
// GENERIC CIMS GATEWAY CALLER
// =====================================================

async function callCimsService(
  serviceName: string,
  bodyPayload: Record<string, unknown>,
  options: { encrypted?: boolean; timeoutMs?: number } = {}
): Promise<unknown> {
  const { encrypted = false, timeoutMs = 20000 } = options;
  const token = await getSessionToken();

  const requestBody = encrypted
    ? { body: encryptPayload(JSON.stringify(bodyPayload)) }
    : { body: bodyPayload };

  const response = await fetch(`${RBI_CIMS_BASE}/${serviceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      channelkey: "key1",
      datatype: "application/json",
      authorization: token,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeoutMs),
  });

  // On auth failure, invalidate session and retry once
  if (response.status === 401 || response.status === 403) {
    invalidateSession();

    const retryToken = await getSessionToken();
    const retryBody = encrypted
      ? { body: encryptPayload(JSON.stringify(bodyPayload)) }
      : { body: bodyPayload };

    const retryResponse = await fetch(`${RBI_CIMS_BASE}/${serviceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        channelkey: "key1",
        datatype: "application/json",
        authorization: retryToken,
      },
      body: JSON.stringify(retryBody),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!retryResponse.ok) {
      throw new NetworkError(
        "RBI",
        `CIMS ${serviceName} retry failed: ${retryResponse.status}`
      );
    }

    return parseResponse(retryResponse, encrypted);
  }

  if (!response.ok) {
    throw new NetworkError(
      "RBI",
      `CIMS ${serviceName} failed: ${response.status}`
    );
  }

  return parseResponse(response, encrypted);
}

async function parseResponse(
  response: Response,
  encrypted: boolean
): Promise<unknown> {
  const rawText = await response.text();
  const decoded = decodeHtmlEntities(rawText);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(decoded);
  } catch {
    throw new NetworkError("RBI", "Invalid JSON in CIMS response");
  }

  // Check for CIMS error responses
  const header = data.header as Record<string, unknown> | undefined;
  if (header?.status === "error") {
    const errorMsg =
      (header.errorMessage as string) || "CIMS Gateway error";
    const errorCode = header.errorCode as string;

    // Session expired — invalidate for next call
    if (errorCode === "4311" || errorCode === "8706") {
      invalidateSession();
    }

    throw new NetworkError("RBI", `CIMS error ${errorCode}: ${errorMsg}`);
  }

  // If the body is an encrypted string, decrypt it
  if (encrypted && typeof data.body === "string") {
    try {
      const decryptedText = decryptPayload(data.body as string);
      return { ...data, body: JSON.parse(decryptedText) };
    } catch {
      throw new NetworkError("RBI", "Failed to decrypt CIMS response body");
    }
  }

  return data;
}

// =====================================================
// ROUTE HANDLERS
// =====================================================

/**
 * GET /api/rbi/data?type=health  — Lightweight health check
 * GET /api/rbi/data?type=current — Tier 1 current key rates (unencrypted)
 */
export async function GET(request: NextRequest) {
  const timer = rbiLogger.startTimer();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "current";

  if (type === "health") {
    try {
      await getSessionToken();
      const durationMs = timer();
      rbiLogger.logRequestSuccess("health_check", durationMs, {
        source: "RBI",
        operation: "health_check",
      });
      return NextResponse.json({ success: true, status: "connected" });
    } catch (error) {
      const durationMs = timer();
      rbiLogger.logRequestError(
        "health_check",
        error instanceof Error ? error : new Error(String(error)),
        durationMs,
        { source: "RBI", operation: "health_check" }
      );
      return NextResponse.json(
        { success: false, status: "unavailable" },
        { status: 503 }
      );
    }
  }

  if (type === "current") {
    const operation = "rbi_current_rates";
    try {
      const result = await callCimsService(
        "dbie_getPublicationDataImpala",
        {},
        { encrypted: false }
      );

      const durationMs = timer();
      rbiLogger.logRequestSuccess(operation, durationMs, {
        source: "RBI",
        operation,
      });

      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const durationMs = timer();
      const apiError = categorizeError(error, "RBI");
      rbiLogger.logRequestError(
        operation,
        error instanceof Error ? error : new Error(String(error)),
        durationMs,
        { source: "RBI", operation }
      );

      return NextResponse.json(
        { success: false, error: apiError.message, fallbackToMock: true },
        { status: apiError.statusCode }
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      error: `Unknown type: ${type}. Use 'health' or 'current'.`,
    },
    { status: 400 }
  );
}

/**
 * POST /api/rbi/data — Tier 2 historical/encrypted data queries
 *
 * Body: { serviceName: string, payload: object, encrypted?: boolean }
 */
export async function POST(request: NextRequest) {
  const timer = rbiLogger.startTimer();
  const operation = "rbi_series_query";

  try {
    const body = await request.json();
    const { serviceName, payload, encrypted } = body;

    if (!serviceName) {
      throw new ValidationError(
        "RBI",
        "serviceName is required",
        "serviceName"
      );
    }

    rbiLogger.debug("Fetching RBI time series", {
      source: "RBI",
      operation,
      metadata: { serviceName },
    });

    const result = await callCimsService(serviceName, payload || {}, {
      encrypted: encrypted ?? false,
    });

    const durationMs = timer();
    rbiLogger.logRequestSuccess(operation, durationMs, {
      source: "RBI",
      operation,
      metadata: { serviceName },
    });

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const durationMs = timer();
    const apiError = categorizeError(error, "RBI");
    rbiLogger.logRequestError(
      operation,
      error instanceof Error ? error : new Error(String(error)),
      durationMs,
      { source: "RBI", operation }
    );

    return NextResponse.json(
      { success: false, error: apiError.message, fallbackToMock: true },
      { status: apiError.statusCode }
    );
  }
}
