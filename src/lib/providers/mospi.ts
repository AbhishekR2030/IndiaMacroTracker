import type {
  Indicator,
  Observation,
  TimeSeriesData,
  SeriesOptions,
} from "../types";
import type { DataProvider } from "./interface";

/**
 * MoSPI eSankhyiki Data Provider
 *
 * Fetches live economic data from MoSPI's eSankhyiki REST API:
 * - CPI (Consumer Price Index) → Inflation indicators
 * - WPI (Wholesale Price Index)
 * - IIP (Index of Industrial Production)
 * - NAS (National Accounts Statistics) → GDP
 * - PLFS (Periodic Labour Force Survey) → Unemployment, LFPR
 *
 * API: https://api.mospi.gov.in
 */

// =====================================================
// MONTH NAME → NUMBER MAPPING
// =====================================================

const MONTH_MAP: Record<string, string> = {
  January: "01", February: "02", March: "03", April: "04",
  May: "05", June: "06", July: "07", August: "08",
  September: "09", October: "10", November: "11", December: "12",
};

// =====================================================
// INDICATOR CONFIGURATION
// =====================================================

interface MoSPIIndicatorConfig {
  /** Which MoSPI dataset to query */
  dataset: string;
  /** Query parameters passed to the MoSPI API */
  filters: Record<string, string>;
  /** Field name to extract the numeric value from each record */
  valueField: string;
  /** Optional: filter response records to only matching ones */
  recordFilter?: { field: string; value: string };
  /** How to extract dates from records */
  dateType: "monthly" | "annual_fy" | "quarterly_fy";
  /** Whether to compute YoY% from raw index/level values */
  computeYoY?: boolean;
}

/**
 * Indicator ID → MoSPI API configuration.
 * IDs match the mock provider exactly (mock.ts).
 */
const INDICATOR_MOSPI_MAP: Record<string, MoSPIIndicatorConfig> = {
  // ─── Inflation ───
  "cpi-headline": {
    dataset: "CPI",
    filters: {
      base_year: "2012", series: "Current",
      sector_code: "3", group_code: "0", state_code: "99",
      Format: "JSON", limit: "200",
    },
    valueField: "inflation",
    recordFilter: { field: "subgroup", value: "General-Overall" },
    dateType: "monthly",
  },
  "cpi-food": {
    dataset: "CPI",
    filters: {
      base_year: "2012", series: "Current",
      sector_code: "3", group_code: "1", state_code: "99",
      Format: "JSON", limit: "200",
    },
    valueField: "inflation",
    recordFilter: { field: "subgroup", value: "Food and Beverages-Overall" },
    dateType: "monthly",
  },
  // Note: CPI Core (ex Food & Fuel) is not directly available from MoSPI API.
  // It falls through to mock via the hybrid provider.

  wpi: {
    dataset: "WPI",
    filters: {
      major_group_code: "1000000000",
      Format: "JSON", limit: "200",
    },
    valueField: "index_value",
    dateType: "monthly",
    computeYoY: true,
  },

  // ─── Growth ───
  "gdp-yoy": {
    dataset: "NAS",
    filters: {
      series: "Current", frequency_code: "Quarterly", indicator_code: "5",
      Format: "JSON", limit: "200",
    },
    valueField: "constant_price",
    dateType: "quarterly_fy",
    computeYoY: true,
  },
  iip: {
    dataset: "IIP",
    filters: {
      base_year: "2011-12", type: "General", frequency: "Monthly",
      Format: "JSON", limit: "200",
    },
    valueField: "growth_rate",
    dateType: "monthly",
  },

  // ─── Labour ───
  unemployment: {
    dataset: "PLFS",
    filters: {
      indicator_code: "3", frequency_code: "1",
      gender_code: "3", sector_code: "3", age_code: "1",
      weekly_status_code: "1", religion_code: "1", social_category_code: "1",
      Format: "JSON", limit: "200",
    },
    valueField: "value",
    recordFilter: { field: "General_Education", value: "all" },
    dateType: "annual_fy",
  },
  lfpr: {
    dataset: "PLFS",
    filters: {
      indicator_code: "1", frequency_code: "1",
      gender_code: "3", sector_code: "3", age_code: "1",
      weekly_status_code: "1", religion_code: "1", social_category_code: "1",
      Format: "JSON", limit: "200",
    },
    valueField: "value",
    recordFilter: { field: "General_Education", value: "all" },
    dateType: "annual_fy",
  },
};

// =====================================================
// DATA CACHE
// =====================================================

const dataCache: Map<string, { records: TimeSeriesData[]; timestamp: number }> = new Map();
const DATA_CACHE_MS = 30 * 60 * 1000; // 30 minutes

// =====================================================
// DATE EXTRACTION HELPERS
// =====================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Extract ISO date string from a MoSPI record based on its date type.
 */
function extractDate(record: any, dateType: MoSPIIndicatorConfig["dateType"]): string | null {
  switch (dateType) {
    case "monthly": {
      // CPI/WPI/IIP: { year: 2025, month: "December" }
      const year = record.year;
      const monthName = record.month;
      if (!year || !monthName) return null;
      const mm = MONTH_MAP[monthName];
      if (!mm) return null;
      return `${year}-${mm}`;
    }

    case "annual_fy": {
      // PLFS: { year: "2017-18" } → end of fiscal year (March of second year)
      const fy = String(record.year);
      const parts = fy.split("-");
      if (parts.length !== 2) return null;
      const startYear = parseInt(parts[0], 10);
      if (isNaN(startYear)) return null;
      // Fiscal year "2017-18" ends March 2018
      return `${startYear + 1}-03`;
    }

    case "quarterly_fy": {
      // NAS: { year: "2025-26", quarter: "Q1" }
      const fy = String(record.year);
      const q = String(record.quarter);
      const parts = fy.split("-");
      if (parts.length !== 2) return null;
      const startYear = parseInt(parts[0], 10);
      if (isNaN(startYear)) return null;
      // Indian fiscal year: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
      switch (q) {
        case "Q1": return `${startYear}-06`;
        case "Q2": return `${startYear}-09`;
        case "Q3": return `${startYear}-12`;
        case "Q4": return `${startYear + 1}-03`;
        default: return null;
      }
    }

    default:
      return null;
  }
}

/**
 * Extract numeric value from a MoSPI record.
 */
function extractValue(record: any, valueField: string): number | null {
  const raw = record[valueField];
  if (raw == null) return null;
  const val = parseFloat(String(raw));
  return isNaN(val) ? null : val;
}

/**
 * Check if a record matches the optional filter criteria.
 */
function matchesFilter(record: any, filter?: MoSPIIndicatorConfig["recordFilter"]): boolean {
  if (!filter) return true;
  const fieldValue = record[filter.field];
  if (fieldValue == null) return false;
  return String(fieldValue).toLowerCase() === filter.value.toLowerCase();
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// =====================================================
// DATA FETCHING
// =====================================================

/**
 * Fetch data from MoSPI via our API route and parse into time series.
 */
async function fetchMoSPITimeSeries(
  indicatorId: string,
  config: MoSPIIndicatorConfig
): Promise<TimeSeriesData[]> {
  // Check cache
  const now = Date.now();
  const cached = dataCache.get(indicatorId);
  if (cached && now - cached.timestamp < DATA_CACHE_MS) {
    return cached.records;
  }

  try {
    const response = await fetch("/api/mospi/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset: config.dataset,
        filters: config.filters,
      }),
    });

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || "MoSPI API returned no data");
    }

    // The API route wraps the raw MoSPI response: result.data = { data: [...], statusCode, meta_data, msg }
    const rawData = result.data;
    const records: unknown[] = rawData.data || rawData.records || [];

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error(`No records in MoSPI response for ${indicatorId}`);
    }

    // Parse records into time series
    let series: TimeSeriesData[] = [];

    for (const record of records) {
      // Apply record filter if configured
      if (!matchesFilter(record, config.recordFilter)) continue;

      const date = extractDate(record, config.dateType);
      const value = extractValue(record, config.valueField);

      if (date && value !== null) {
        series.push({ date, value });
      }
    }

    // Deduplicate by date (keep last occurrence)
    const dateMap = new Map<string, number>();
    for (const point of series) {
      dateMap.set(point.date, point.value);
    }
    series = Array.from(dateMap.entries()).map(([date, value]) => ({ date, value }));

    // Sort chronologically
    series.sort((a, b) => a.date.localeCompare(b.date));

    // Compute YoY if needed (compare with same period in previous year)
    if (config.computeYoY && series.length > 0) {
      series = computeYoY(series, config.dateType);
    }

    // Cache the results
    dataCache.set(indicatorId, { records: series, timestamp: now });

    return series;
  } catch (error) {
    console.error(`MoSPI fetch failed for ${indicatorId}:`, error);
    throw error;
  }
}

/**
 * Compute Year-over-Year percentage change.
 * For monthly data, compares 12 months apart.
 * For quarterly data, compares 4 quarters apart.
 */
function computeYoY(
  series: TimeSeriesData[],
  dateType: MoSPIIndicatorConfig["dateType"]
): TimeSeriesData[] {
  const lookback = dateType === "quarterly_fy" ? 4 : 12;

  if (series.length <= lookback) return [];

  const yoy: TimeSeriesData[] = [];
  for (let i = lookback; i < series.length; i++) {
    const current = series[i];
    const yearAgo = series[i - lookback];
    if (yearAgo.value !== 0) {
      yoy.push({
        date: current.date,
        value: parseFloat(
          (((current.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100).toFixed(2)
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
 * Check if an indicator can be fetched from MoSPI
 */
export function canFetchFromMoSPI(indicatorId: string): boolean {
  return indicatorId in INDICATOR_MOSPI_MAP;
}

/**
 * MoSPI Data Provider implementation
 */
export const mospiProvider: DataProvider = {
  async getIndicators(): Promise<Indicator[]> {
    // Indicator metadata comes from mock provider; MoSPI only provides data values
    return [];
  },

  async getLatest(indicatorId: string): Promise<Observation> {
    const config = INDICATOR_MOSPI_MAP[indicatorId];
    if (!config) {
      throw new Error(`Indicator ${indicatorId} not available from MoSPI`);
    }

    const series = await fetchMoSPITimeSeries(indicatorId, config);

    if (series.length === 0) {
      throw new Error(`No data available for ${indicatorId} from MoSPI`);
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
    const config = INDICATOR_MOSPI_MAP[indicatorId];
    if (!config) {
      throw new Error(`Indicator ${indicatorId} not available from MoSPI`);
    }

    let series = await fetchMoSPITimeSeries(indicatorId, config);

    // Apply date range filters
    if (opts?.from) {
      series = series.filter((d) => d.date >= opts.from!);
    }
    if (opts?.to) {
      series = series.filter((d) => d.date <= opts.to!);
    }

    return series;
  },

  async getNextRelease(indicatorId: string): Promise<string | null> {
    const config = INDICATOR_MOSPI_MAP[indicatorId];
    if (!config) return null;

    const now = new Date();

    // Most MoSPI datasets release around 12th-15th of the following month
    if (config.dateType === "monthly") {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 12);
      return nextMonth.toISOString().split("T")[0];
    }

    // Quarterly data (NAS/GDP) releases ~2 months after quarter end
    if (config.dateType === "quarterly_fy") {
      const currentQ = Math.floor(now.getMonth() / 3);
      const nextQEnd = new Date(now.getFullYear(), (currentQ + 1) * 3 + 2, 28);
      return nextQEnd.toISOString().split("T")[0];
    }

    // Annual data (PLFS) releases once a year
    if (config.dateType === "annual_fy") {
      const nextRelease = new Date(now.getFullYear(), 5, 30); // June 30
      if (nextRelease <= now) nextRelease.setFullYear(nextRelease.getFullYear() + 1);
      return nextRelease.toISOString().split("T")[0];
    }

    return null;
  },
};
