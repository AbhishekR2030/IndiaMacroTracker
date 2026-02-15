import { NextRequest, NextResponse } from "next/server";
import { nseRateLimiter } from "@/lib/rate-limiter";
import { nseLogger, bseLogger } from "@/lib/logger";
import { categorizeError, ValidationError, RateLimitError } from "@/lib/errors";

const NSE_API_URL = process.env.NSE_API_URL || "https://www.nseindia.com/api";
const BSE_API_URL = process.env.BSE_API_URL || "https://api.bseindia.com";

// =====================================================
// NSE COOKIE / SESSION MANAGEMENT
// =====================================================
// NSE requires valid cookies from visiting the homepage before API calls work.
// We maintain a server-side cookie jar with auto-refresh.

let nseCookies: string | null = null;
let nseCookiesExpiry = 0;
let cookieRefreshPromise: Promise<string | null> | null = null;
const COOKIE_LIFETIME_MS = 4 * 60 * 1000; // 4 minutes (cookies expire quickly on NSE)

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://www.nseindia.com/",
  Connection: "keep-alive",
};

async function getNSECookies(): Promise<string | null> {
  const now = Date.now();

  if (nseCookies && now < nseCookiesExpiry) {
    return nseCookies;
  }

  // Deduplicate concurrent refreshes
  if (cookieRefreshPromise) {
    return cookieRefreshPromise;
  }

  cookieRefreshPromise = (async () => {
    try {
      // Visit NSE homepage to get session cookies
      const response = await fetch("https://www.nseindia.com", {
        headers: NSE_HEADERS,
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });

      const setCookieHeaders = response.headers.getSetCookie?.() || [];

      if (setCookieHeaders.length === 0) {
        // Fallback: try the raw header
        const rawCookie = response.headers.get("set-cookie");
        if (rawCookie) {
          nseCookies = rawCookie
            .split(",")
            .map((c) => c.split(";")[0].trim())
            .join("; ");
        }
      } else {
        nseCookies = setCookieHeaders
          .map((c) => c.split(";")[0].trim())
          .join("; ");
      }

      if (nseCookies) {
        nseCookiesExpiry = now + COOKIE_LIFETIME_MS;
        nseLogger.debug("NSE cookies refreshed", {
          operation: "cookie_refresh",
          source: "NSE",
        });
      }

      return nseCookies;
    } catch (error) {
      nseLogger.warn("Failed to refresh NSE cookies", {
        operation: "cookie_refresh",
        source: "NSE",
        metadata: { error: String(error) },
      });
      return null;
    } finally {
      cookieRefreshPromise = null;
    }
  })();

  return cookieRefreshPromise;
}

/**
 * Make an authenticated fetch to NSE API (with cookies)
 */
async function nseFetch(url: string, timeoutMs = 15000): Promise<Response> {
  const cookies = await getNSECookies();

  const headers: Record<string, string> = { ...NSE_HEADERS };
  if (cookies) {
    headers["Cookie"] = cookies;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  // If we get 401/403, refresh cookies and retry once
  if ((response.status === 401 || response.status === 403) && cookies) {
    nseCookies = null;
    nseCookiesExpiry = 0;
    const newCookies = await getNSECookies();

    if (newCookies) {
      headers["Cookie"] = newCookies;
      return fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
    }
  }

  return response;
}

// =====================================================
// ROUTE HANDLER
// =====================================================

/**
 * GET /api/nse/data?symbol=NIFTY%2050&exchange=NSE&type=current
 * Fetches real-time or historical market data from NSE/BSE
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const exchange = searchParams.get("exchange") || "NSE";
  const logger = exchange === "BSE" ? bseLogger : nseLogger;
  const timer = logger.startTimer();
  const operation = "get_market_data";

  try {
    const type = searchParams.get("type") || "current"; // current or historical
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!symbol) {
      const validationError = new ValidationError(
        exchange === "BSE" ? "BSE" : "NSE",
        "Symbol parameter is required",
        "symbol"
      );
      logger.warn(validationError.message, { operation });

      return NextResponse.json(
        {
          success: false,
          error: validationError.message,
        },
        { status: 400 }
      );
    }

    // Rate limiting check
    const rateLimitKey = `nse_${symbol}_${exchange}`;
    const { allowed, retryAfter } = nseRateLimiter.checkLimit(rateLimitKey);

    if (!allowed) {
      const rateLimitError = new RateLimitError(
        exchange === "BSE" ? "BSE" : "NSE",
        "Rate limit exceeded. Please try again later.",
        retryAfter
      );
      logger.warn(rateLimitError.message, { operation, symbol: symbol ?? undefined, metadata: { retryAfter } });

      return NextResponse.json(
        {
          success: false,
          error: rateLimitError.message,
          fallbackToMock: true,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    logger.debug("Fetching market data", { operation, symbol: symbol ?? undefined, metadata: { exchange, type } });

    let data;

    if (exchange === "NSE") {
      if (type === "historical") {
        // Fetch historical data from NSE using the correct indicesHistory endpoint
        // NSE expects DD-MM-YYYY date format
        const formatNSEDate = (isoDate: string): string => {
          const [y, m, d] = isoDate.split("-");
          return `${d}-${m}-${y}`;
        };

        const fromDate = from
          ? formatNSEDate(from)
          : formatNSEDate(
              new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0]
            );
        const toDate = to
          ? formatNSEDate(to)
          : formatNSEDate(new Date().toISOString().split("T")[0]);

        const nseUrl = `${NSE_API_URL}/historical/indicesHistory?indexType=${encodeURIComponent(
          symbol
        )}&from=${fromDate}&to=${toDate}`;

        const response = await nseFetch(nseUrl);

        if (!response.ok) {
          throw new Error(`NSE API returned ${response.status}`);
        }

        const result = await response.json();

        // NSE returns data in indexCloseOnlineRecords or data array
        const records =
          result.data?.indexCloseOnlineRecords ||
          result.data?.indexTurnoverRecords ||
          result.data ||
          [];

        const historical = Array.isArray(records)
          ? records.map(
              (r: {
                TIMESTAMP?: string;
                EOD_CLOSE_INDEX_VAL?: number;
                EOD_INDEX_VAL?: number;
                CLOSE?: number;
                close?: number;
              }) => ({
                date: r.TIMESTAMP
                  ? new Date(r.TIMESTAMP).toISOString().split("T")[0]
                  : "",
                close:
                  r.EOD_CLOSE_INDEX_VAL ||
                  r.EOD_INDEX_VAL ||
                  r.CLOSE ||
                  r.close ||
                  0,
              })
            )
          : [];

        data = {
          symbol,
          exchange: "NSE",
          historical,
        };
      } else {
        // Fetch current/live data from NSE
        const nseUrl = `${NSE_API_URL}/equity-stockIndices?index=${encodeURIComponent(
          symbol
        )}`;

        const response = await nseFetch(nseUrl);

        if (!response.ok) {
          throw new Error(`NSE API returned ${response.status}`);
        }

        const result = await response.json();

        // Extract the relevant index data
        const indexData = result.data?.find(
          (item: { index?: string; symbol?: string; last?: number; lastPrice?: number; previousClose?: number; open?: number; dayHigh?: number; high?: number; dayLow?: number; low?: number; change?: number; pChange?: number; timestamp?: string }) =>
            item.index === symbol || item.symbol === symbol
        );

        if (!indexData) {
          throw new Error(`Index ${symbol} not found in NSE response`);
        }

        data = {
          symbol,
          exchange: "NSE",
          lastPrice: indexData.last || indexData.lastPrice,
          previousClose: indexData.previousClose,
          open: indexData.open,
          high: indexData.dayHigh || indexData.high,
          low: indexData.dayLow || indexData.low,
          change: indexData.change,
          pChange: indexData.pChange,
          timestamp: indexData.timestamp || new Date().toISOString(),
        };
      }
    } else if (exchange === "BSE") {
      // Fetch from BSE API
      const bseUrl = `${BSE_API_URL}/BseIndiaAPI/api/MktData/idxmkt/${symbol}`;

      const response = await fetch(bseUrl, {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      if (!response.ok) {
        throw new Error(`BSE API returned ${response.status}`);
      }

      const result = await response.json();

      data = {
        symbol,
        exchange: "BSE",
        lastPrice: result.CurrRate || result.close,
        previousClose: result.PrevRate,
        open: result.OpenRate,
        high: result.HighRate,
        low: result.LowRate,
        change: result.chg,
        pChange: result.PcChg,
        timestamp: result.updtime || new Date().toISOString(),
      };
    } else {
      throw new Error(`Unknown exchange: ${exchange}`);
    }

    // Validate response data
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response structure from market API");
    }

    const durationMs = timer();
    logger.logRequestSuccess(operation, durationMs, { symbol: symbol ?? undefined, metadata: { exchange } });

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const durationMs = timer();
    const apiError = categorizeError(error, exchange === "BSE" ? "BSE" : "NSE");

    logger.logRequestError(
      operation,
      error instanceof Error ? error : new Error(String(error)),
      durationMs,
      { symbol: symbol ?? undefined, metadata: { exchange } }
    );

    return NextResponse.json(
      {
        success: false,
        error: apiError.message,
        fallbackToMock: true,
      },
      { status: apiError.statusCode }
    );
  }
}
