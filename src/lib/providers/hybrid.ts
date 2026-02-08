import type {
  Indicator,
  Observation,
  TimeSeriesData,
  SeriesOptions,
  DataFilter,
} from "../types";
import type { DataProvider } from "./interface";
import { mockProvider } from "./mock";
import { mospiProvider, canFetchFromMoSPI } from "./mospi";
import { rbiProvider, canFetchFromRBI } from "./rbi";
import { nseProvider, canFetchFromNSE } from "./nse";

/**
 * Hybrid Data Provider
 *
 * Intelligently combines multiple data sources with priority-based routing:
 *
 * Priority order per indicator:
 * 1. MoSPI MCP  → CPI, WPI, IIP, GDP, PLFS (Inflation, Growth, Labour)
 * 2. RBI DBIE   → Repo Rate, G-Sec, WALR, Credit, Deposits, LAF, M3, FX Reserves, USD/INR, REER
 * 3. NSE/BSE    → Nifty 50, Nifty Bank, Sensex, India VIX
 * 4. Mock       → Fallback for everything else or when live sources are unavailable
 *
 * Each source gracefully degrades to mock on failure.
 */

// Source name type
export type LiveSource = "MoSPI" | "RBI" | "NSE" | "Mock";

// Track availability of each source
const sourceStatus: Record<string, { available: boolean | null; lastCheck: number }> = {
  mospi: { available: null, lastCheck: 0 },
  rbi: { available: null, lastCheck: 0 },
  nse: { available: null, lastCheck: 0 },
};
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a specific source is available
 */
async function checkSourceAvailability(source: string): Promise<boolean> {
  const now = Date.now();
  const status = sourceStatus[source];

  if (status.available !== null && now - status.lastCheck < CHECK_INTERVAL) {
    return status.available;
  }

  try {
    let url: string;
    switch (source) {
      case "mospi":
        url = "/api/mospi/overview";
        break;
      case "rbi":
        url = "/api/rbi/data?series=RLCR_A_001&from=" +
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        break;
      case "nse":
        url = "/api/nse/data?symbol=" + encodeURIComponent("NIFTY 50") + "&exchange=NSE";
        break;
      default:
        return false;
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    const result = await response.json();
    status.available = result.success === true;
    status.lastCheck = now;

    if (!status.available) {
      console.warn(`⚠️ ${source.toUpperCase()} unavailable - using mock fallback`);
    }

    return status.available;
  } catch (error) {
    console.warn(`⚠️ ${source.toUpperCase()} check failed - using mock:`, error);
    status.available = false;
    status.lastCheck = now;
    return false;
  }
}

/**
 * Decide which provider to use for an indicator (priority-based routing)
 */
async function selectProvider(indicatorId: string): Promise<{ provider: DataProvider; source: LiveSource }> {
  // Priority 1: MoSPI (government statistics)
  if (canFetchFromMoSPI(indicatorId)) {
    const available = await checkSourceAvailability("mospi");
    if (available) return { provider: mospiProvider, source: "MoSPI" };
  }

  // Priority 2: RBI DBIE (rates, credit, liquidity, FX)
  if (canFetchFromRBI(indicatorId)) {
    const available = await checkSourceAvailability("rbi");
    if (available) return { provider: rbiProvider, source: "RBI" };
  }

  // Priority 3: NSE/BSE (market indices)
  if (canFetchFromNSE(indicatorId)) {
    const available = await checkSourceAvailability("nse");
    if (available) return { provider: nseProvider, source: "NSE" };
  }

  // Fallback: Mock data
  return { provider: mockProvider, source: "Mock" };
}

/**
 * Hybrid Data Provider implementation
 */
export const hybridProvider: DataProvider = {
  async getIndicators(filter?: DataFilter): Promise<Indicator[]> {
    // Always get full indicator list from mock provider
    // In the future, we can merge with MoSPI's list
    return mockProvider.getIndicators(filter);
  },

  async getLatest(indicatorId: string): Promise<Observation> {
    const { provider, source } = await selectProvider(indicatorId);

    try {
      const result = await provider.getLatest(indicatorId);
      // Track which source was used for UI display
      lastUsedSource.set(indicatorId, source);
      return result;
    } catch (error) {
      console.error(`Error fetching latest for ${indicatorId} from ${source}, falling back to mock:`, error);

      if (provider !== mockProvider) {
        lastUsedSource.set(indicatorId, "Mock");
        return mockProvider.getLatest(indicatorId);
      }

      throw error;
    }
  },

  async getSeries(
    indicatorId: string,
    opts?: SeriesOptions
  ): Promise<TimeSeriesData[]> {
    const { provider, source } = await selectProvider(indicatorId);

    try {
      return await provider.getSeries(indicatorId, opts);
    } catch (error) {
      console.error(`Error fetching series for ${indicatorId} from ${source}, falling back to mock:`, error);

      if (provider !== mockProvider) {
        return mockProvider.getSeries(indicatorId, opts);
      }

      throw error;
    }
  },

  async getNextRelease(indicatorId: string): Promise<string | null> {
    const { provider, source } = await selectProvider(indicatorId);

    try {
      return await provider.getNextRelease(indicatorId);
    } catch (error) {
      console.error(
        `Error fetching next release for ${indicatorId} from ${source}, falling back to mock:`,
        error
      );

      if (provider !== mockProvider) {
        return mockProvider.getNextRelease(indicatorId);
      }

      throw error;
    }
  },
};

// Track which source was actually used for each indicator (for UI badges)
const lastUsedSource: Map<string, LiveSource> = new Map();

/**
 * Get the data source name for an indicator (for display purposes)
 */
export function getDataSource(indicatorId: string): LiveSource {
  return lastUsedSource.get(indicatorId) || "Mock";
}

/**
 * Get the expected data source for an indicator (before fetching)
 */
export function getExpectedSource(indicatorId: string): LiveSource {
  if (canFetchFromMoSPI(indicatorId)) return "MoSPI";
  if (canFetchFromRBI(indicatorId)) return "RBI";
  if (canFetchFromNSE(indicatorId)) return "NSE";
  return "Mock";
}

/**
 * Get availability status of all sources
 */
export function getSourceStatuses(): Record<string, boolean | null> {
  return {
    mospi: sourceStatus.mospi.available,
    rbi: sourceStatus.rbi.available,
    nse: sourceStatus.nse.available,
  };
}

/**
 * Force refresh all source availability checks
 */
export function refreshAllSources(): void {
  for (const key of Object.keys(sourceStatus)) {
    sourceStatus[key].available = null;
    sourceStatus[key].lastCheck = 0;
  }
}