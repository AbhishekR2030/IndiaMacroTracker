import type {
  Indicator,
  Observation,
  TimeSeriesData,
  SeriesOptions,
} from "../types";
import type { DataProvider } from "./interface";

/**
 * NSE/BSE Market Data Provider
 *
 * Integrates with NSE India and BSE APIs for real-time market data:
 * - Nifty 50 index
 * - Nifty Bank index
 * - Sensex (BSE)
 * - India VIX (volatility index)
 *
 * NSE API: https://www.nseindia.com/api
 * BSE API: https://api.bseindia.com
 */

interface MarketQuote {
  lastPrice?: number;
  close?: number;
  value?: number;
  previousClose?: number;
  open?: number;
  timestamp?: string;
}

interface HistoricalItem {
  date: string;
  close?: number;
  value?: number;
}

// NSE/BSE Symbol mapping for our indicators
const MARKET_SYMBOL_MAP: Record<
  string,
  {
    symbol: string;
    exchange: "NSE" | "BSE";
    indexType?: string;
  }
> = {
  "nifty-50": {
    symbol: "NIFTY 50",
    exchange: "NSE",
    indexType: "broad",
  },
  "nifty-bank": {
    symbol: "NIFTY BANK",
    exchange: "NSE",
    indexType: "sectoral",
  },
  sensex: {
    symbol: "SENSEX",
    exchange: "BSE",
    indexType: "broad",
  },
  "india-vix": {
    symbol: "INDIA VIX",
    exchange: "NSE",
    indexType: "volatility",
  },
};

// Cache for market data (shorter duration due to real-time nature)
const marketDataCache: Map<string, { data: MarketQuote; timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for market data

/**
 * Fetch current market data from NSE/BSE
 */
async function fetchMarketData(symbol: string, exchange: "NSE" | "BSE"): Promise<MarketQuote | null> {
  const cacheKey = `${exchange}_${symbol}`;
  const now = Date.now();

  const cached = marketDataCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `/api/nse/data?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}`
    );
    const result = await response.json();

    if (result.success && result.data) {
      marketDataCache.set(cacheKey, {
        data: result.data,
        timestamp: now,
      });
      return result.data;
    }

    throw new Error(result.error || "Failed to fetch market data");
  } catch (error) {
    console.error(`Error fetching market data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch historical market data
 */
async function fetchHistoricalData(
  symbol: string,
  exchange: "NSE" | "BSE",
  fromDate?: string,
  toDate?: string
): Promise<TimeSeriesData[]> {
  try {
    const params = new URLSearchParams({
      symbol,
      exchange,
      type: "historical",
    });

    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);

    const response = await fetch(`/api/nse/data?${params.toString()}`);
    const result = await response.json();

    if (result.success && result.data?.historical) {
      return result.data.historical.map((item: HistoricalItem) => ({
        date: item.date,
        value: item.close || item.value || 0,
      }));
    }

    return [];
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return [];
  }
}

/**
 * Check if an indicator can be fetched from NSE/BSE
 */
export function canFetchFromNSE(indicatorId: string): boolean {
  return indicatorId in MARKET_SYMBOL_MAP;
}

/**
 * NSE/BSE Data Provider implementation
 */
export const nseProvider: DataProvider = {
  async getIndicators(): Promise<Indicator[]> {
    return [];
  },

  async getLatest(indicatorId: string): Promise<Observation> {
    const config = MARKET_SYMBOL_MAP[indicatorId];

    if (!config) {
      throw new Error(`Indicator ${indicatorId} not available from NSE/BSE`);
    }

    const data = await fetchMarketData(config.symbol, config.exchange);

    if (!data) {
      throw new Error(`No data available for ${indicatorId}`);
    }

    const current = data.lastPrice || data.close || data.value || 0;
    const prior = data.previousClose || data.open;

    return {
      indicatorId,
      date: data.timestamp || new Date().toISOString().split("T")[0],
      value: current,
      prior: prior,
    };
  },

  async getSeries(
    indicatorId: string,
    opts?: SeriesOptions
  ): Promise<TimeSeriesData[]> {
    const config = MARKET_SYMBOL_MAP[indicatorId];

    if (!config) {
      throw new Error(`Indicator ${indicatorId} not available from NSE/BSE`);
    }

    const toDate = opts?.to || new Date().toISOString().split("T")[0];
    const fromDate =
      opts?.from ||
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const series = await fetchHistoricalData(
      config.symbol,
      config.exchange,
      fromDate,
      toDate
    );

    series.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return series;
  },

  async getNextRelease(indicatorId: string): Promise<string | null> {
    const config = MARKET_SYMBOL_MAP[indicatorId];
    if (!config) {
      return null;
    }

    const now = new Date();
    const nextDay = new Date(now);

    if (now.getDay() === 6) {
      nextDay.setDate(nextDay.getDate() + 2);
    } else if (now.getDay() === 0) {
      nextDay.setDate(nextDay.getDate() + 1);
    } else if (now.getHours() >= 15 && now.getMinutes() >= 30) {
      nextDay.setDate(nextDay.getDate() + 1);
      if (nextDay.getDay() === 6) nextDay.setDate(nextDay.getDate() + 2);
      if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1);
    }

    return nextDay.toISOString().split("T")[0];
  },
};