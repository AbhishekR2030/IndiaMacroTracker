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
 * Mock indicators - 34 realistic Indian macroeconomic indicators
 */
const MOCK_INDICATORS: Array<
  Indicator & {
    series: TimeSeriesData[];
    forecast?: number;
    nextRelease?: string;
  }
> = [
  // ─── INFLATION (4 indicators) ───
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
    id: "cpi-core",
    name: "CPI Core (YoY)",
    category: "Inflation",
    unit: "%",
    frequency: "Monthly",
    source: "MoSPI",
    description: "CPI excluding food and fuel - core inflation measure",
    transformOptions: ["Level", "YoY", "MoM"],
    tags: ["inflation", "consumer-prices", "core"],
    series: generateSeries(4.2, 0.2, 24),
    forecast: 4.1,
    nextRelease: "2026-03-14",
  },
  {
    id: "wpi",
    name: "WPI (YoY)",
    category: "Inflation",
    unit: "%",
    frequency: "Monthly",
    source: "DPIIT",
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

  // ─── GROWTH (5 indicators) ───
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
  {
    id: "pmi-mfg",
    name: "PMI Manufacturing",
    category: "Growth",
    unit: "Index",
    frequency: "Monthly",
    source: "S&P Global",
    description: "Purchasing Managers Index - Manufacturing sector",
    transformOptions: ["Level"],
    tags: ["growth", "pmi", "manufacturing"],
    series: generateSeries(56.5, 1.5, 24),
    forecast: 57.0,
    nextRelease: "2026-03-03",
  },
  {
    id: "pmi-services",
    name: "PMI Services",
    category: "Growth",
    unit: "Index",
    frequency: "Monthly",
    source: "S&P Global",
    description: "Purchasing Managers Index - Services sector",
    transformOptions: ["Level"],
    tags: ["growth", "pmi", "services"],
    series: generateSeries(58.2, 1.2, 24),
    forecast: 58.5,
    nextRelease: "2026-03-05",
  },
  {
    id: "gst-collections",
    name: "GST Collections",
    category: "Growth",
    unit: "₹ Lakh Cr",
    frequency: "Monthly",
    source: "MoF",
    description: "Goods & Services Tax monthly gross collections",
    transformOptions: ["Level", "YoY"],
    tags: ["growth", "tax-revenue", "gst"],
    series: generateSeries(1.72, 0.08, 24, 0.015),
    forecast: 1.85,
    nextRelease: "2026-03-01",
  },

  // ─── LABOUR (3 indicators) ───
  {
    id: "unemployment",
    name: "Unemployment Rate",
    category: "Labour",
    unit: "%",
    frequency: "Monthly",
    source: "CMIE",
    description:
      "Urban+Rural unemployment rate from CMIE Consumer Pyramids Household Survey",
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
  {
    id: "employment-rate",
    name: "Employment Rate",
    category: "Labour",
    unit: "%",
    frequency: "Monthly",
    source: "CMIE",
    description: "Worker population ratio - employed as % of working age population",
    transformOptions: ["Level"],
    tags: ["labour", "employment"],
    series: generateSeries(37.5, 0.4, 24),
    nextRelease: "2026-03-15",
  },

  // ─── RATES & CREDIT (5 indicators) ───
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
      value: i > 9 ? 6.25 : 6.5, // Recent rate cut
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
    source: "CCIL",
    description: "10-year Government Security benchmark yield",
    transformOptions: ["Level"],
    tags: ["rates", "bonds", "yields"],
    series: generateSeries(6.85, 0.08, 24, -0.01),
  },
  {
    id: "gsec-2y",
    name: "G-Sec 2Y Yield",
    category: "Rates & Credit",
    unit: "%",
    frequency: "Daily",
    source: "CCIL",
    description: "2-year Government Security yield",
    transformOptions: ["Level"],
    tags: ["rates", "bonds", "yields"],
    series: generateSeries(6.55, 0.06, 24, -0.01),
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

  // ─── FX (2 indicators) ───
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
  {
    id: "reer",
    name: "REER (36-currency)",
    category: "FX",
    unit: "Index",
    frequency: "Monthly",
    source: "RBI",
    description: "Real Effective Exchange Rate (36-currency basket)",
    transformOptions: ["Level"],
    tags: ["fx", "reer", "competitiveness"],
    series: generateSeries(104.5, 0.8, 24),
    nextRelease: "2026-03-15",
  },

  // ─── LIQUIDITY & MONEY (3 indicators) ───
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
  {
    id: "m3-growth",
    name: "M3 Growth (YoY)",
    category: "Liquidity & Money",
    unit: "%",
    frequency: "Bi-weekly",
    source: "RBI",
    description: "Broad money supply (M3) growth year-on-year",
    transformOptions: ["Level"],
    tags: ["money-supply", "liquidity"],
    series: generateSeries(10.8, 0.4, 24),
    nextRelease: "2026-03-07",
  },
  {
    id: "deposits-growth",
    name: "Bank Deposits Growth",
    category: "Liquidity & Money",
    unit: "% YoY",
    frequency: "Bi-weekly",
    source: "RBI",
    description: "Aggregate deposits growth of Scheduled Commercial Banks",
    transformOptions: ["Level"],
    tags: ["deposits", "banking"],
    series: generateSeries(12.5, 0.5, 24),
    nextRelease: "2026-03-07",
  },

  // ─── EXTERNAL SECTOR (3 indicators) ───
  {
    id: "trade-balance",
    name: "Trade Balance",
    category: "External Sector",
    unit: "$ Bn",
    frequency: "Monthly",
    source: "MoCI",
    description: "Merchandise trade balance (exports minus imports)",
    transformOptions: ["Level"],
    tags: ["trade", "external-sector"],
    series: generateSeries(-22.5, 2.5, 24),
    forecast: -21.0,
    nextRelease: "2026-03-15",
  },
  {
    id: "current-account",
    name: "Current Account (% GDP)",
    category: "External Sector",
    unit: "% of GDP",
    frequency: "Quarterly",
    source: "RBI",
    description: "Current account balance as share of GDP",
    transformOptions: ["Level"],
    tags: ["external-sector", "current-account"],
    series: generateSeries(-1.2, 0.3, 12),
    forecast: -1.0,
    nextRelease: "2026-06-30",
  },
  {
    id: "fx-reserves",
    name: "FX Reserves",
    category: "External Sector",
    unit: "$ Bn",
    frequency: "Weekly",
    source: "RBI",
    description: "India's foreign exchange reserves",
    transformOptions: ["Level"],
    tags: ["external-sector", "reserves", "fx"],
    series: generateSeries(620, 8, 24, 2),
    nextRelease: "2026-02-14",
  },

  // ─── MARKETS (6 indicators) ───
  {
    id: "nifty50",
    name: "Nifty 50",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "NSE",
    description: "NSE Nifty 50 index",
    transformOptions: ["Level", "YoY"],
    tags: ["markets", "equity", "nifty"],
    series: generateSeries(22500, 400, 24, 120),
  },
  {
    id: "sensex",
    name: "Sensex",
    category: "Markets",
    unit: "Index",
    frequency: "Daily",
    source: "BSE",
    description: "BSE Sensex 30 index",
    transformOptions: ["Level", "YoY"],
    tags: ["markets", "equity", "sensex"],
    series: generateSeries(74000, 1200, 24, 400),
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
    id: "brent",
    name: "Brent Crude (INR)",
    category: "Markets",
    unit: "₹/bbl",
    frequency: "Daily",
    source: "ICE/RBI",
    description: "Brent crude oil price in INR terms (per barrel)",
    transformOptions: ["Level", "YoY"],
    tags: ["commodities", "oil", "energy"],
    series: generateSeries(6800, 300, 24, 20),
  },
  {
    id: "gold-inr",
    name: "Gold (INR)",
    category: "Markets",
    unit: "₹/10g",
    frequency: "Daily",
    source: "MCX/IBJA",
    description: "Gold price per 10 grams in INR",
    transformOptions: ["Level", "YoY"],
    tags: ["commodities", "gold"],
    series: generateSeries(62000, 1500, 24, 600),
  },

  // ─── FISCAL (3 indicators) ───
  {
    id: "fiscal-deficit",
    name: "Fiscal Deficit (FYTD)",
    category: "Fiscal",
    unit: "% of BE",
    frequency: "Monthly",
    source: "CGA",
    description:
      "Fiscal deficit as % of Budget Estimate, fiscal year to date",
    transformOptions: ["Level"],
    tags: ["fiscal", "deficit"],
    series: generateSeries(55, 5, 12),
    nextRelease: "2026-03-31",
  },
  {
    id: "tax-collections",
    name: "Gross Tax Collections",
    category: "Fiscal",
    unit: "₹ Lakh Cr",
    frequency: "Monthly",
    source: "MoF",
    description: "Gross tax revenue collections fiscal year to date",
    transformOptions: ["Level", "YoY"],
    tags: ["fiscal", "tax-revenue"],
    series: generateSeries(18.5, 0.8, 12, 0.3),
    nextRelease: "2026-03-31",
  },
  {
    id: "debt-gdp",
    name: "Debt-to-GDP",
    category: "Fiscal",
    unit: "%",
    frequency: "Annual",
    source: "MoF",
    description: "General government debt as share of GDP",
    transformOptions: ["Level"],
    tags: ["fiscal", "debt"],
    series: generateSeries(82, 0.5, 8, -0.3),
    nextRelease: "2026-07-31",
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
