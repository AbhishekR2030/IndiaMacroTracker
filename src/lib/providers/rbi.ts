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
 * Integrates with Reserve Bank of India's Database on Indian Economy (DBIE)
 * API for real-time data on:
 * - Interest rates (Repo, Reverse Repo, G-Sec yields, WALR)
 * - Credit & deposits (Bank credit, Deposits, Credit-Deposit ratio)
 * - Liquidity (LAF, Reverse repo outstanding, MSF)
 * - FX data (FX Reserves, USD/INR, REER)
 * - Money supply (M3, Currency in circulation)
 *
 * API Documentation: https://dbie.rbi.org.in/DBIE/dbie.rbi?site=api
 */

interface RBIObservation {
  date: string;
  value: number;
}

interface RBIResponse {
  seriesCode: string;
  seriesName?: string;
  frequency?: string;
  observations: RBIObservation[];
}

// RBI DBIE API Series Codes for our indicators
const RBI_SERIES_MAP: Record<
  string,
  {
    seriesCode: string;
    frequency: string;
    transform?: string;
  }
> = {
  "repo-rate": {
    seriesCode: "RLCR_A_001",
    frequency: "D",
  },
  "reverse-repo-rate": {
    seriesCode: "RLCR_A_002",
    frequency: "D",
  },
  "10y-gsec": {
    seriesCode: "RLCR_A_010",
    frequency: "D",
  },
  "walr": {
    seriesCode: "RLCR_A_015",
    frequency: "M",
  },
  "bank-credit-growth-yoy": {
    seriesCode: "CRDT_A_001",
    frequency: "F",
    transform: "YoY",
  },
  "deposits-growth-yoy": {
    seriesCode: "DPST_A_001",
    frequency: "F",
    transform: "YoY",
  },
  "laf-net-liquidity": {
    seriesCode: "LIQD_A_001",
    frequency: "D",
  },
  "m3-growth-yoy": {
    seriesCode: "MNSY_A_001",
    frequency: "F",
    transform: "YoY",
  },
  "fx-reserves": {
    seriesCode: "FXRS_A_001",
    frequency: "W",
  },
  "usd-inr": {
    seriesCode: "EXCR_A_001",
    frequency: "D",
  },
  "reer-36": {
    seriesCode: "REER_A_001",
    frequency: "M",
  },
};

// Cache for RBI data
const rbiDataCache: Map<string, { data: RBIResponse; timestamp: number }> = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Fetch data from RBI DBIE API
 */
async function fetchRBIData(
  seriesCode: string,
  fromDate?: string,
  toDate?: string
): Promise<RBIResponse | null> {
  const cacheKey = `${seriesCode}_${fromDate}_${toDate}`;
  const now = Date.now();

  const cached = rbiDataCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const params = new URLSearchParams({
      series: seriesCode,
      format: "json",
    });

    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);

    const response = await fetch(`/api/rbi/data?${params.toString()}`);
    const result = await response.json();

    if (result.success && result.data) {
      rbiDataCache.set(cacheKey, {
        data: result.data,
        timestamp: now,
      });
      return result.data;
    }

    throw new Error(result.error || "Failed to fetch RBI data");
  } catch (error) {
    console.error(`Error fetching RBI data for ${seriesCode}:`, error);
    return null;
  }
}

/**
 * Check if an indicator can be fetched from RBI
 */
export function canFetchFromRBI(indicatorId: string): boolean {
  return indicatorId in RBI_SERIES_MAP;
}

/**
 * RBI Data Provider implementation
 */
export const rbiProvider: DataProvider = {
  async getIndicators(): Promise<Indicator[]> {
    return [];
  },

  async getLatest(indicatorId: string): Promise<Observation> {
    const config = RBI_SERIES_MAP[indicatorId];

    if (!config) {
      throw new Error(`Indicator ${indicatorId} not available from RBI`);
    }

    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const data = await fetchRBIData(
      config.seriesCode,
      fromDate.toISOString().split("T")[0],
      toDate.toISOString().split("T")[0]
    );

    if (!data || !data.observations || data.observations.length === 0) {
      throw new Error(`No data available for ${indicatorId}`);
    }

    const sorted = [...data.observations].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const latest = sorted[0];
    const prior = sorted[1];

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
    const config = RBI_SERIES_MAP[indicatorId];

    if (!config) {
      throw new Error(`Indicator ${indicatorId} not available from RBI`);
    }

    const toDate = opts?.to || new Date().toISOString().split("T")[0];
    const fromDate =
      opts?.from ||
      new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const data = await fetchRBIData(config.seriesCode, fromDate, toDate);

    if (!data || !data.observations) {
      return [];
    }

    let series: TimeSeriesData[] = data.observations.map((obs) => ({
      date: obs.date,
      value: obs.value,
    }));

    series.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (config.transform === "YoY" && series.length > 12) {
      const yoyData: TimeSeriesData[] = [];
      for (let i = 12; i < series.length; i++) {
        const current = series[i];
        const yearAgo = series[i - 12];
        if (yearAgo.value !== 0) {
          yoyData.push({
            date: current.date,
            value: parseFloat(
              (((current.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100).toFixed(2)
            ),
          });
        }
      }
      series = yoyData;
    }

    return series;
  },

  async getNextRelease(indicatorId: string): Promise<string | null> {
    const config = RBI_SERIES_MAP[indicatorId];

    if (!config) {
      return null;
    }

    const now = new Date();
    const nextRelease = new Date(now);

    switch (config.frequency) {
      case "D":
        nextRelease.setDate(nextRelease.getDate() + 1);
        break;
      case "W":
        nextRelease.setDate(nextRelease.getDate() + ((5 - now.getDay() + 7) % 7 || 7));
        break;
      case "F":
        if (now.getDate() < 15) {
          nextRelease.setDate(15);
        } else {
          nextRelease.setMonth(nextRelease.getMonth() + 1, 1);
        }
        break;
      case "M":
        nextRelease.setMonth(nextRelease.getMonth() + 1, 15);
        break;
      default:
        return null;
    }

    return nextRelease.toISOString().split("T")[0];
  },
};