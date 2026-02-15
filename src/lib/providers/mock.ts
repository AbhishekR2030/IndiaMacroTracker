import type { DataProvider } from "./interface";
import type {
  Indicator,
  Observation,
  DataFilter,
  SeriesOptions,
  TimeSeriesData,
} from "../types";

/**
 * Generate realistic time series data with trend and volatility
 */
function generateSeries(
  base: number,
  volatility: number,
  count: number = 24,
  trend: number = 0
): TimeSeriesData[] {
  const arr: TimeSeriesData[] = [];
  let val = base;
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    val += (Math.random() - 0.48) * volatility + trend;
    arr.push({
      date: d.toISOString().slice(0, 7), // YYYY-MM format
      value: parseFloat(val.toFixed(2)),
    });
  }

  return arr;
}

/**
 * Mock indicators - 24 Indian macroeconomic indicators (all with live data sources)
 * Used as fallback data when live APIs are unavailable
 */
const MOCK_INDICATORS: Array<
  Indicator & {
    series: TimeSeriesData[];
    forecast?: number;
    nextRelease?: string;
  }
> = [
  // ─── INFLATION (3 indicators) ───
  {
    id: "cpi-headline",
    name: "CPI Headline (YoY)",
    category: "Inflation",
    unit: "%",
    frequency: "Monthly",
    source: "MoSPI",
    description:
      "Consumer Price Index headline inflation rate, all-India combined (Rural+Urban)",
    transformOptions: ["Level", "YoY", "MoM"],
    tags: ["inflation", "consumer-prices", "headline"],
    series: generateSeries(4.8, 0.3, 24),
    forecast: 4.5,
    nextRelease: "2026-03-14",
  },
  {
    id: "wpi",
    name: "WPI (YoY)",
    category: "Inflation",
    unit: "%",
    frequency: "Monthly",
    source: "MoSPI",
    description: "Wholesale Price Index inflation - all commodities",
    transformOptions: ["Level", "YoY", "MoM"],
    tags: ["inflation", "wholesale-prices"],
    series: generateSeries(1.8, 0.5, 24),
    forecast: 2.0,
    nextRelease: "2026-03-14",
  },
  {
    id: "cpi-food",
    name: "CPI Food (YoY)",
    category: "Inflation",
    unit: "%",
    frequency: "Monthly",
    source: "MoSPI",
    description: "Consumer food price inflation - Food & Beverages group",
    transformOptions: ["Level", "YoY", "MoM"],
    tags: ["inflation", "food-prices"],
    series: generateSeries(6.2, 0.8, 24),
    forecast: 5.8,
    nextRelease: "2026-03-14",
  },

  // ─── GROWTH (2 indicators) ───
  {
    id: "gdp-yoy",
    name: "GDP Growth (YoY)",
    category: "Growth",
    unit: "%",
    frequency: "Quarterly",
    source: "MoSPI",
    description: "Gross Domestic Product real growth rate at constant prices",
    transformOptions: ["Level", "YoY"],
    tags: ["growth", "gdp", "output"],
    series: generateSeries(6.7, 0.4, 12, 0.05),
    forecast: 6.5,
    nextRelease: "2026-05-31",
  },
  {
    id: "iip",
    name: "IIP Growth (YoY)",
    category: "Growth",
    unit: "%",
    frequency: "Monthly",
    source: "MoSPI",
    description: "Index of Industrial Production growth - General Index",
    transformOptions: ["Level", "YoY", "MoM"],
    tags: ["growth", "industrial-output"],
    series: generateSeries(4.5, 1.2, 24),
    forecast: 4.8,
    nextRelease: "2026-03-12",
  },

  // ─── LABOUR (2 indicators) ───
  {
    id: "unemployment",
    name: "Unemployment Rate",
    category: "Labour",
    unit: "%",
    frequency: "Monthly",
    source: "MoSPI",
    description: "Unemployment rate from Periodic Labour Force Survey (PLFS)",
    transformOptions: ["Level"],
    tags: ["labour", "unemployment"],
    series: generateSeries(7.8, 0.6, 24, -0.02),
    forecast: 7.5,
    nextRelease: "2026-03-15",
  },
  {
    id: "lfpr",
    name: "Labour Force Participation",
    category: "Labour",
    unit: "%",
    frequency: "Quarterly",
    source: "MoSPI",
    description: "Labour Force Participation Rate (15+ years) from PLFS",
    transformOptions: ["Level"],
    tags: ["labour", "lfpr"],
    series: generateSeries(41.2, 0.5, 12),
    nextRelease: "2026-06-30",
  },

  // ─── RATES & CREDIT (4 indicators) ───
  {
    id: "repo-rate",
    name: "RBI Repo Rate",
    category: "Rates & Credit",
    unit: "%",
    frequency: "Bi-monthly",
    source: "RBI",
    description: "Reserve Bank of India policy repo rate",
    transformOptions: ["Level"],
    tags: ["rates", "monetary-policy", "rbi"],
    series: generateSeries(6.5, 0.0, 12).map((d, i) => ({
      ...d,
      value: i > 9 ? 6.25 : 6.5,
    })),
    forecast: 6.0,
    nextRelease: "2026-04-09",
  },
  {
    id: "gsec-10y",
    name: "G-Sec 10Y Yield",
    category: "Rates & Credit",
    unit: "%",
    frequency: "Daily",
    source: "RBI",
    description: "10-year Government Security benchmark yield",
    transformOptions: ["Level"],
    tags: ["rates", "bonds", "yields"],
    series: generateSeries(6.85, 0.08, 24, -0.01),
  },
  {
    id: "bank-credit",
    name: "Bank Credit Growth",
    category: "Rates & Credit",
    unit: "% YoY",
    frequency: "Bi-weekly",
    source: "RBI",
    description: "Scheduled Commercial Banks credit growth year-on-year",
    transformOptions: ["Level"],
    tags: ["credit", "banking"],
    series: generateSeries(15.5, 0.8, 24, -0.1),
    nextRelease: "2026-03-07",
  },
  {
    id: "walr",
    name: "WALR (Fresh Loans)",
    category: "Rates & Credit",
    unit: "%",
    frequency: "Monthly",
    source: "RBI",
    description: "Weighted Average Lending Rate on fresh rupee loans",
    transformOptions: ["Level"],
    tags: ["rates", "lending", "banking"],
    series: generateSeries(9.2, 0.1, 24, -0.02),
    nextRelease: "2026-03-28",
  },

  // ─── FX (1 indicator) ───
  {
    id: "usdinr",
    name: "USD/INR",
    category: "FX",
    unit: "₹",
    frequency: "Daily",
    source: "RBI",
    description: "USD/INR reference rate",
    transformOptions: ["Level"],
    tags: ["fx", "exchange-rate", "dollar"],
    series: generateSeries(83.5, 0.3, 24, 0.08),
  },

  // ─── LIQUIDITY & MONEY (1 indicator) ───
  {
    id: "laf-liquidity",
    name: "LAF Net Liquidity",
    category: "Liquidity & Money",
    unit: "₹ Lakh Cr",
    frequency: "Daily",
    source: "RBI",
    description: "Liquidity Adjustment Facility net position (negative = deficit)",
    transformOptions: ["Level"],
    tags: ["liquidity", "money-market", "laf"],
    series: generateSeries(-0.5, 0.4, 24),
  },

  // ─── MARKETS (11 indicators) ───
  {
    id: "nifty50",
    name: "Nifty 50",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "NSE",
    description: "NSE Nifty 50 broad market index",
    transformOptions: ["Level", "YoY"],
    tags: ["markets", "equity", "nifty"],
    series: generateSeries(22500, 400, 24, 120),
  },
  {
    id: "nifty-bank",
    name: "Nifty Bank",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "NSE",
    description: "NSE Bank Nifty sectoral index",
    transformOptions: ["Level", "YoY"],
    tags: ["markets", "equity", "banking"],
    series: generateSeries(47000, 800, 24, 200),
  },
  {
    id: "india-vix",
    name: "India VIX",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "NSE",
    description: "India Volatility Index - market fear gauge",
    transformOptions: ["Level"],
    tags: ["markets", "volatility"],
    series: generateSeries(13.5, 1.5, 24),
  },
  {
    id: "nifty-it",
    name: "Nifty IT",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "NSE",
    description: "NSE Nifty IT sectoral index - Information Technology",
    transformOptions: ["Level", "YoY"],
    tags: ["markets", "equity", "it", "sectoral"],
    series: generateSeries(34000, 600, 24, 150),
  },
  {
    id: "nifty-fmcg",
    name: "Nifty FMCG",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "NSE",
    description: "NSE Nifty FMCG sectoral index - Fast Moving Consumer Goods",
    transformOptions: ["Level", "YoY"],
    tags: ["markets", "equity", "fmcg", "sectoral"],
    series: generateSeries(56000, 800, 24, 200),
  },
  {
    id: "nifty-pharma",
    name: "Nifty Pharma",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "NSE",
    description: "NSE Nifty Pharma sectoral index - Pharmaceutical",
    transformOptions: ["Level", "YoY"],
    tags: ["markets", "equity", "pharma", "sectoral"],
    series: generateSeries(19000, 400, 24, 100),
  },
  {
    id: "nifty-auto",
    name: "Nifty Auto",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "NSE",
    description: "NSE Nifty Auto sectoral index - Automobile",
    transformOptions: ["Level", "YoY"],
    tags: ["markets", "equity", "auto", "sectoral"],
    series: generateSeries(24000, 500, 24, 130),
  },
  {
    id: "nifty-metal",
    name: "Nifty Metal",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "NSE",
    description: "NSE Nifty Metal sectoral index - Metal & Mining",
    transformOptions: ["Level", "YoY"],
    tags: ["markets", "equity", "metal", "sectoral"],
    series: generateSeries(8500, 300, 24, 50),
  },
  {
    id: "nifty-energy",
    name: "Nifty Energy",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "NSE",
    description: "NSE Nifty Energy sectoral index - Energy",
    transformOptions: ["Level", "YoY"],
    tags: ["markets", "equity", "energy", "sectoral"],
    series: generateSeries(38000, 700, 24, 180),
  },
  {
    id: "nifty-psu-bank",
    name: "Nifty PSU Bank",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "NSE",
    description: "NSE Nifty PSU Bank sectoral index - Public Sector Banks",
    transformOptions: ["Level", "YoY"],
    tags: ["markets", "equity", "banking", "psu", "sectoral"],
    series: generateSeries(7000, 250, 24, 80),
  },
  {
    id: "nifty-fin-services",
    name: "Nifty Financial Services",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "NSE",
    description: "NSE Nifty Financial Services sectoral index",
    transformOptions: ["Level", "YoY"],
    tags: ["markets", "equity", "financial", "sectoral"],
    series: generateSeries(23000, 450, 24, 120),
  },
];

/**
 * Mock Data Provider Implementation
 */
export class MockDataProvider implements DataProvider {
  async getIndicators(filter?: DataFilter): Promise<Indicator[]> {
    let indicators = MOCK_INDICATORS;

    if (filter) {
      if (filter.category) {
        indicators = indicators.filter(
          (ind) => ind.category === filter.category
        );
      }
      if (filter.source) {
        indicators = indicators.filter((ind) => ind.source === filter.source);
      }
      if (filter.frequency) {
        indicators = indicators.filter(
          (ind) => ind.frequency === filter.frequency
        );
      }
      if (filter.tags && filter.tags.length > 0) {
        indicators = indicators.filter((ind) =>
          filter.tags!.some((tag) => ind.tags.includes(tag))
        );
      }
    }

    // Return without series data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return indicators.map(({ series, forecast, nextRelease, ...ind }) => ind);
  }

  async getLatest(indicatorId: string): Promise<Observation> {
    const indicator = MOCK_INDICATORS.find((ind) => ind.id === indicatorId);
    if (!indicator) {
      throw new Error(`Indicator ${indicatorId} not found`);
    }

    const latest = indicator.series[indicator.series.length - 1];
    const prior =
      indicator.series.length > 1
        ? indicator.series[indicator.series.length - 2]
        : null;

    return {
      indicatorId,
      date: latest.date,
      value: latest.value,
      prior: prior?.value,
      forecast: indicator.forecast,
      surprise: indicator.forecast
        ? latest.value - indicator.forecast
        : undefined,
    };
  }

  async getSeries(
    indicatorId: string,
    opts?: SeriesOptions
  ): Promise<TimeSeriesData[]> {
    const indicator = MOCK_INDICATORS.find((ind) => ind.id === indicatorId);
    if (!indicator) {
      throw new Error(`Indicator ${indicatorId} not found`);
    }

    let series = [...indicator.series];

    // Apply date filtering
    if (opts?.from) {
      series = series.filter((d) => d.date >= opts.from!);
    }
    if (opts?.to) {
      series = series.filter((d) => d.date <= opts.to!);
    }

    // Apply transformation
    if (opts?.transform === "YoY" && series.length > 12) {
      series = series.slice(12).map((d, i) => ({
        date: d.date,
        value: parseFloat(
          (((d.value - series[i].value) / Math.abs(series[i].value)) * 100).toFixed(2)
        ),
      }));
    } else if (opts?.transform === "MoM" && series.length > 1) {
      series = series.slice(1).map((d, i) => ({
        date: d.date,
        value: parseFloat(
          (((d.value - series[i].value) / Math.abs(series[i].value)) * 100).toFixed(2)
        ),
      }));
    }

    return series;
  }

  async getNextRelease(indicatorId: string): Promise<string | null> {
    const indicator = MOCK_INDICATORS.find((ind) => ind.id === indicatorId);
    if (!indicator) {
      throw new Error(`Indicator ${indicatorId} not found`);
    }

    return indicator.nextRelease || null;
  }
}

// Export singleton instance for use in hybrid provider
export const mockProvider = new MockDataProvider();
