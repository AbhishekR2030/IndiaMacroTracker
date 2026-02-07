import type {
  Indicator,
  Observation,
  TimeSeriesData,
  SeriesOptions,
  DataFilter,
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

interface MoSPIDataset {
  code: string;
  name: string;
  description: string;
}

// Cache for metadata to avoid repeated API calls
const metadataCache: Map<string, any> = new Map();
const overviewCache: { data: MoSPIDataset[] | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

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
 * Fetch overview of all datasets (Tool 1)
 */
async function fetchOverview(): Promise<MoSPIDataset[]> {
  const now = Date.now();
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Return cached data if fresh
  if (overviewCache.data && now - overviewCache.timestamp < CACHE_DURATION) {
    return overviewCache.data;
  }

  try {
    const response = await fetch("/api/mospi/overview");
    const result = await response.json();

    if (result.success && result.data) {
      overviewCache.data = result.data.datasets || [];
      overviewCache.timestamp = now;
      return overviewCache.data;
    }

    throw new Error(result.error || "Failed to fetch overview");
  } catch (error) {
    console.error("Error fetching MoSPI overview:", error);
    return [];
  }
}

/**
 * Fetch metadata for a dataset (Tool 3)
 */
async function fetchMetadata(dataset: string): Promise<any> {
  const cacheKey = `metadata_${dataset}`;

  // Check cache
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey);
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
): Promise<any> {
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
  async getIndicators(filter?: DataFilter): Promise<Indicator[]> {
    // For now, return empty array as we'll use hybrid provider
    // which delegates to mock provider for the full list
    return [];
  },

  async getLatest(indicatorId: string): Promise<Observation> {
    const config = INDICATOR_MOSPI_MAP[indicatorId];

    if (!config) {
      throw new Error(`Indicator ${indicatorId} not available from MoSPI`);
    }

    // Fetch metadata first (required by MoSPI workflow)
    await fetchMetadata(config.dataset);

    // Fetch data
    const data = await fetchMoSPIData(config.dataset, config.filters);

    if (!data || !data.observations || data.observations.length === 0) {
      throw new Error(`No data available for ${indicatorId}`);
    }

    // Get the latest observation
    const sorted = [...data.observations].sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
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

    // Fetch metadata first
    await fetchMetadata(config.dataset);

    // Fetch data
    const data = await fetchMoSPIData(config.dataset, config.filters);

    if (!data || !data.observations) {
      return [];
    }

    // Transform to our TimeSeriesData format
    let series: TimeSeriesData[] = data.observations.map((obs: any) => ({
      date: obs.date,
      value: obs.value,
    }));

    // Apply date filtering if specified
    if (opts?.from) {
      const fromDate = new Date(opts.from);
      series = series.filter((d) => new Date(d.date) >= fromDate);
    }

    if (opts?.to) {
      const toDate = new Date(opts.to);
      series = series.filter((d) => new Date(d.date) <= toDate);
    }

    // Sort by date ascending
    series.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return series;
  },

  async getNextRelease(indicatorId: string): Promise<string | null> {
    const config = INDICATOR_MOSPI_MAP[indicatorId];

    if (!config) {
      return null;
    }

    // MoSPI doesn't provide release schedules yet
    // Return estimated next release based on frequency
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 12);

    return nextMonth.toISOString().split("T")[0];
  },
};