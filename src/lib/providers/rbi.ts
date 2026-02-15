import type {
  Indicator,
  Observation,
  TimeSeriesData,
  SeriesOptions,
} from "../types";
import type { DataProvider } from "./interface";

/**
 * RBI DBIE Data Provider
 *
 * Integrates with Reserve Bank of India's CIMS Gateway (DBIE) for live data on:
 * - Interest rates (Repo Rate)
 * - Exchange rates (USD/INR)
 * - G-Sec 10Y yields, WALR, LAF liquidity
 * - Bank credit growth
 *
 * Two-tier data strategy:
 *   Tier 1: Current snapshot from dbie_getPublicationDataImpala (unencrypted)
 *   Tier 2: Historical time series via encrypted CIMS Gateway endpoints
 *
 * API Reference: https://data.rbi.org.in/DBIE/
 */

// =====================================================
// INDICATOR CONFIGURATION
// =====================================================

interface RBIIndicatorConfig {
  /** Tier 1: exact "name" field from dbie_getPublicationDataImpala response */
  tier1Name?: string;
  /** For USD/INR, also match on currencyDesc */
  tier1CurrencyDesc?: string;

  /** Tier 2: DSD code for historical CIMS Gateway queries */
  dsdCode?: string;
  /** Tier 2: numeric element ID */
  dsdId?: number;
  /** Whether the Tier 2 endpoint requires AES encryption */
  encrypted?: boolean;

  /** Data frequency for next-release estimation */
  frequency: "D" | "W" | "BW" | "M" | "BM" | "Q";
  /** If raw data needs YoY calculation */
  transform?: "YoY";
}

/**
 * Indicator ID → RBI configuration mapping.
 * IDs match the mock provider exactly (mock.ts).
 */
const RBI_INDICATOR_MAP: Record<string, RBIIndicatorConfig> = {
  // ─── Rates & Credit ───
  "repo-rate": {
    tier1Name: "Policy Repo Rate",
    dsdCode: "POLICY_RATE_SC",
    dsdId: 2413,
    frequency: "BM",
  },
  "gsec-10y": {
    dsdCode: "YIELD_GOV_SEC_RN",
    dsdId: 2858,
    encrypted: true,
    frequency: "D",
  },
  walr: {
    dsdCode: "MRKT_RATE_SC",
    dsdId: 2411,
    encrypted: true,
    frequency: "M",
  },
  "bank-credit": {
    dsdCode: "BANK_STATS_M_SC",
    dsdId: 2383,
    encrypted: true,
    frequency: "BW",
    transform: "YoY",
  },

  // ─── FX ───
  usdinr: {
    tier1Name: "Exchange Rate",
    tier1CurrencyDesc: "US Dollar",
    dsdCode: "FOREX_RATE_D_RN",
    dsdId: 2839,
    encrypted: true,
    frequency: "D",
  },

  // ─── Liquidity & Money ───
  "laf-liquidity": {
    dsdCode: "MRKT_RATE_SC",
    dsdId: 2411,
    encrypted: true,
    frequency: "D",
  },
};

// =====================================================
// TIER 1: CURRENT RATES CACHE
// =====================================================

interface PublicationRate {
  name: string;
  rate: number;
  timeDate?: number;
  timeMonth?: string;
  currencyDesc?: string;
}

let currentRatesCache: {
  data: PublicationRate[];
  timestamp: number;
} | null = null;
const CURRENT_RATES_CACHE_MS = 15 * 60 * 1000; // 15 minutes

async function fetchCurrentRates(): Promise<PublicationRate[]> {
  const now = Date.now();
  if (currentRatesCache && now - currentRatesCache.timestamp < CURRENT_RATES_CACHE_MS) {
    return currentRatesCache.data;
  }

  const response = await fetch("/api/rbi/data?type=current");
  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error("Failed to fetch current RBI rates");
  }

  // Navigate the CIMS response structure
  const body =
    (result.data as Record<string, unknown>).body as Record<string, unknown> | undefined;
  const rates = (body?.result as PublicationRate[]) || [];

  if (rates.length === 0) {
    throw new Error("No rates in RBI publication data response");
  }

  currentRatesCache = { data: rates, timestamp: now };
  return rates;
}

// =====================================================
// TIER 2: HISTORICAL SERIES CACHE
// =====================================================

const seriesCache: Map<string, { data: TimeSeriesData[]; timestamp: number }> =
  new Map();
const SERIES_CACHE_MS = 30 * 60 * 1000; // 30 minutes

async function fetchHistoricalSeries(
  indicatorId: string,
  config: RBIIndicatorConfig,
  fromDate?: string,
  toDate?: string
): Promise<TimeSeriesData[]> {
  if (!config.dsdCode) {
    return [];
  }

  const cacheKey = `${indicatorId}_${fromDate}_${toDate}`;
  const now = Date.now();
  const cached = seriesCache.get(cacheKey);
  if (cached && now - cached.timestamp < SERIES_CACHE_MS) {
    return cached.data;
  }

  const payload = {
    dsdCode: config.dsdCode,
    dsdId: config.dsdId,
    fromDate:
      fromDate ||
      new Date(Date.now() - 2 * 365 * 86400000).toISOString().split("T")[0],
    toDate: toDate || new Date().toISOString().split("T")[0],
  };

  try {
    const response = await fetch("/api/rbi/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceName: "dbie_getDataByDsdId",
        payload,
        encrypted: config.encrypted ?? false,
      }),
    });

    const result = await response.json();
    if (!result.success || !result.data) {
      return [];
    }

    let series = parseSeriesResponse(result.data);

    // Apply YoY transform if needed
    if (config.transform === "YoY" && series.length > 12) {
      series = computeYoY(series);
    }

    seriesCache.set(cacheKey, { data: series, timestamp: now });
    return series;
  } catch (error) {
    console.error(`RBI Tier 2 fetch failed for ${indicatorId}:`, error);
    return [];
  }
}

/**
 * Parse CIMS Gateway response into TimeSeriesData[].
 * Handles multiple response shapes observed from different endpoints.
 */
function parseSeriesResponse(data: unknown): TimeSeriesData[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  const items: unknown[] =
    d?.body?.result || d?.result || d?.body?.data || d?.data || [];

  if (!Array.isArray(items)) return [];

  return items
    .map((item: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = item as any;
      const rawDate = r.date || r.period || r.timeDate;
      const rawValue = r.value ?? r.rate ?? r.amount;

      if (rawDate == null || rawValue == null) return null;

      const date =
        typeof rawDate === "number"
          ? new Date(rawDate).toISOString().split("T")[0]
          : String(rawDate);

      const value = parseFloat(String(rawValue));
      if (isNaN(value)) return null;

      return { date, value } as TimeSeriesData;
    })
    .filter((d): d is TimeSeriesData => d !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeYoY(series: TimeSeriesData[]): TimeSeriesData[] {
  const yoy: TimeSeriesData[] = [];
  for (let i = 12; i < series.length; i++) {
    const current = series[i];
    const yearAgo = series[i - 12];
    if (yearAgo.value !== 0) {
      yoy.push({
        date: current.date,
        value: parseFloat(
          (
            ((current.value - yearAgo.value) / Math.abs(yearAgo.value)) *
            100
          ).toFixed(2)
        ),
      });
    }
  }
  return yoy;
}

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Indicators that have working Tier 1 (publication data) support.
 * Tier 2 (encrypted CIMS Gateway dbie_getImpalaDQActionEnhanced) requires
 * complex multi-field encrypted payloads that are not yet implemented.
 * Only claim live for indicators where Tier 1 provides data.
 */
const TIER1_LIVE_INDICATORS = new Set(["repo-rate", "usdinr"]);

/**
 * Check if an indicator can be fetched from RBI.
 * Only returns true for indicators with working Tier 1 support.
 */
export function canFetchFromRBI(indicatorId: string): boolean {
  return TIER1_LIVE_INDICATORS.has(indicatorId);
}

/**
 * RBI Data Provider implementation
 */
export const rbiProvider: DataProvider = {
  async getIndicators(): Promise<Indicator[]> {
    // Indicator metadata comes from mock provider; RBI only provides data values
    return [];
  },

  async getLatest(indicatorId: string): Promise<Observation> {
    const config = RBI_INDICATOR_MAP[indicatorId];
    if (!config) {
      throw new Error(`Indicator ${indicatorId} not available from RBI`);
    }

    // ── Tier 1: Try current publication data first ──
    if (config.tier1Name) {
      try {
        const rates = await fetchCurrentRates();
        const match = rates.find((r) => {
          // Normalize non-breaking spaces (\u00a0) to regular spaces for comparison
          const name = r.name?.replace(/\u00a0/g, " ");
          if (name !== config.tier1Name) return false;
          // For exchange rate, also match on currency
          if (config.tier1CurrencyDesc) {
            const curr = r.currencyDesc?.replace(/\u00a0/g, " ");
            return curr === config.tier1CurrencyDesc;
          }
          return true;
        });

        if (match) {
          const value = match.rate;
          const date = match.timeDate
            ? new Date(match.timeDate).toISOString().split("T")[0]
            : match.timeMonth
              ? parseRBIMonth(match.timeMonth)
              : new Date().toISOString().split("T")[0];

          return {
            indicatorId,
            date,
            value: typeof value === "number" ? value : parseFloat(String(value)),
          };
        }
      } catch {
        // Fall through to Tier 2
      }
    }

    // ── Tier 2: Fetch recent historical data and pick latest ──
    const toDate = new Date().toISOString().split("T")[0];
    const fromDate = new Date(Date.now() - 60 * 86400000)
      .toISOString()
      .split("T")[0];
    const series = await fetchHistoricalSeries(
      indicatorId,
      config,
      fromDate,
      toDate
    );

    if (series.length === 0) {
      throw new Error(`No data available for ${indicatorId} from RBI`);
    }

    const latest = series[series.length - 1];
    const prior = series.length > 1 ? series[series.length - 2] : undefined;

    return {
      indicatorId,
      date: latest.date,
      value: latest.value,
      prior: prior?.value,
    };
  },

  async getSeries(
    indicatorId: string,
    opts?: SeriesOptions
  ): Promise<TimeSeriesData[]> {
    const config = RBI_INDICATOR_MAP[indicatorId];
    if (!config) {
      throw new Error(`Indicator ${indicatorId} not available from RBI`);
    }

    return fetchHistoricalSeries(indicatorId, config, opts?.from, opts?.to);
  },

  async getNextRelease(indicatorId: string): Promise<string | null> {
    const config = RBI_INDICATOR_MAP[indicatorId];
    if (!config) return null;

    const now = new Date();
    const next = new Date(now);

    switch (config.frequency) {
      case "D":
        next.setDate(next.getDate() + 1);
        break;
      case "W":
        next.setDate(
          next.getDate() + ((5 - now.getDay() + 7) % 7 || 7)
        );
        break;
      case "BW":
        if (now.getDate() < 15) {
          next.setDate(15);
        } else {
          next.setMonth(next.getMonth() + 1, 1);
        }
        break;
      case "M":
        next.setMonth(next.getMonth() + 1, 15);
        break;
      case "BM": {
        // RBI MPC meets every 2 months (Feb, Apr, Jun, Aug, Oct, Dec)
        const mpcMonths = [2, 4, 6, 8, 10, 12];
        const currentMonth = now.getMonth() + 1;
        const nextMpc =
          mpcMonths.find((m) => m > currentMonth) || mpcMonths[0];
        next.setMonth(nextMpc - 1, 9); // MPC decisions typically around 9th
        if (next <= now) next.setFullYear(next.getFullYear() + 1);
        break;
      }
      case "Q":
        next.setMonth(
          next.getMonth() + 3 - (next.getMonth() % 3),
          30
        );
        break;
      default:
        return null;
    }

    return next.toISOString().split("T")[0];
  },
};

// =====================================================
// HELPERS
// =====================================================

/**
 * Parse RBI month format "MMM-YYYY" (e.g., "FEB-2026") into ISO date
 */
function parseRBIMonth(monthStr: string): string {
  const months: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };

  const parts = monthStr.split("-");
  if (parts.length !== 2) return new Date().toISOString().split("T")[0];

  const month = months[parts[0].toUpperCase()];
  const year = parseInt(parts[1], 10);

  if (month === undefined || isNaN(year)) {
    return new Date().toISOString().split("T")[0];
  }

  return new Date(year, month, 1).toISOString().split("T")[0];
}
