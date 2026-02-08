import type {
  Indicator,
  Observation,
  TimeSeriesData,
  SeriesOptions,
} from "../types";
import type { DataProvider } from "./interface";

/**
 * MoSPI eSankhyiki MCP Data Provider
 *
 * Implements the DataProvider interface using the MoSPI MCP Server
 * Follows the 4-tool sequential workflow:
 * 1. know_about_mospi_api() - Get overview
 * 2. get_indicators() - Get available indicators
 * 3. get_metadata() - Get valid filter values
 * 4. get_data() - Fetch actual data
 */

interface MoSPIObservation {
  date: string;
  value: number;
  forecast?: number;
}

interface MoSPIResponse {
  observations?: MoSPIObservation[];
}

// Cache for metadata to avoid repeated API calls
const metadataCache: Map<string, Record<string, unknown>> = new Map();

// Mapping from our indicator IDs to MoSPI datasets and filters
const INDICATOR_MOSPI_MAP: Record<
  string,
  {
    dataset: string;
    filters: Record<string, string>;
    transform?: string;
  }
> = {
  "cpi-headline-yoy": {
    dataset: "CPI",
    filters: { group: "General Index", sector: "Combined" },
    transform: "YoY",
  },
  "cpi-core-yoy": {
    dataset: "CPI",
    filters: { group: "Core (ex Food & Fuel)", sector: "Combined" },
    transform: "YoY",
  },
  "cpi-food-yoy": {
    dataset: "CPI",
    filters: { group: "Food and Beverages", sector: "Combined" },
    transform: "YoY",
  },
  "wpi-yoy": {
    dataset: "WPI",
    filters: { group: "All Commodities" },
    transform: "YoY",
  },
  "gdp-growth-yoy": {
    dataset: "NAS",
    filters: { indicator: "GDP at Constant Prices" },
    transform: "YoY",
  },
  "iip-growth-yoy": {
    dataset: "IIP",
    filters: { sector: "General Index" },
    transform: "YoY",
  },
  "unemployment-rate": {
    dataset: "PLFS",
    filters: { indicator: "Unemployment Rate", sector: "All India" },
  },
  "lfpr": {
    dataset: "PLFS",
    filters: { indicator: "Labour Force Participation Rate", sector: "All India" },
  },
};

/**
 * Fetch metadata for a dataset (Tool 3)
 */
async function fetchMetadata(dataset: string): Promise<Record<string, unknown> | null> {
  const cacheKey = `metadata_${dataset}`;

  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey) ?? null;
  }

  try {
    const response = await fetch(`/api/mospi/metadata?dataset=${dataset}`);
    const result = await response.json();

    if (result.success && result.data) {
      metadataCache.set(cacheKey, result.data);
      return result.data;
    }

    throw new Error(result.error || "Failed to fetch metadata");
  } catch (error) {
    console.error(`Error fetching metadata for ${dataset}:`, error);
    return null;
  }
}

/**
 * Fetch data from MoSPI (Tool 4)
 */
async function fetchMoSPIData(
  dataset: string,
  filters: Record<string, string>
): Promise<MoSPIResponse | null> {
  try {
    const response = await fetch("/api/mospi/data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataset,
        filters,
      }),
    });

    const result = await response.json();

    if (result.success && result.data) {
      return result.data;
    }

    throw new Error(result.error || "Failed to fetch data");
  } catch (error) {
    console.error(`Error fetching data for ${dataset}:`, error);
    return null;
  }
}

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
    return [];
  },

  async getLatest(indicatorId: string): Promise<Observation> {
    const config = INDICATOR_MOSPI_MAP[indicatorId];

    if (!config) {
      throw new Error(`Indicator ${indicatorId} not available from MoSPI`);
    }

    await fetchMetadata(config.dataset);

    const data = await fetchMoSPIData(config.dataset, config.filters);

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
      surprise: latest.forecast ? latest.value - latest.forecast : undefined,
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

    await fetchMetadata(config.dataset);

    const data = await fetchMoSPIData(config.dataset, config.filters);

    if (!data || !data.observations) {
      return [];
    }

    let series: TimeSeriesData[] = data.observations.map((obs) => ({
      date: obs.date,
      value: obs.value,
    }));

    if (opts?.from) {
      const fromDate = new Date(opts.from);
      series = series.filter((d) => new Date(d.date) >= fromDate);
    }

    if (opts?.to) {
      const toDate = new Date(opts.to);
      series = series.filter((d) => new Date(d.date) <= toDate);
    }

    series.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return series;
  },

  async getNextRelease(indicatorId: string): Promise<string | null> {
    const config = INDICATOR_MOSPI_MAP[indicatorId];

    if (!config) {
      return null;
    }

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 12);

    return nextMonth.toISOString().split("T")[0];
  },
};