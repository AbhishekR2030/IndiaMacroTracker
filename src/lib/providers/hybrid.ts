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
 * 1. MoSPI  → CPI, WPI, IIP, GDP, PLFS (Inflation, Growth, Labour)
 * 2. RBI    → Repo Rate, G-Sec 10Y, WALR, Bank Credit, USD/INR, LAF Liquidity
 * 3. NSE    → Nifty 50, Bank, VIX + sector indices (IT, FMCG, Pharma, Auto, Metal, Energy, PSU Bank, Fin Services)
 * 4. Mock   → Fallback when live sources are unavailable
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

// Per-source check deduplication: prevent concurrent health checks for the same source
const pendingChecks: Map<string, Promise<boolean>> = new Map();

// Initial check promise - all callers await the same promise
let initialCheckPromise: Promise<void> | null = null;

/**
 * Check if a specific source is available (with deduplication).
 * Multiple concurrent callers for the same source will share one in-flight check.
 */
async function checkSourceAvailability(source: string): Promise<boolean> {
  const now = Date.now();
  const status = sourceStatus[source];

  // Return cached result if still valid
  if (status.available !== null && now - status.lastCheck < CHECK_INTERVAL) {
    return status.available;
  }

  // If a check is already in flight for this source, await it
  const pending = pendingChecks.get(source);
  if (pending) {
    return pending;
  }

  // Start a new check and store the promise so concurrent callers share it
  const checkPromise = (async (): Promise<boolean> => {
    try {
      let url: string;
      switch (source) {
        case "mospi":
          url = "/api/mospi/overview";
          break;
        case "rbi":
          url = "/api/rbi/data?type=health";
          break;
        case "nse":
          url = "/api/nse/data?symbol=" + encodeURIComponent("NIFTY 50") + "&exchange=NSE";
          break;
        default:
          return false;
      }

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000), // 5s timeout for health checks
      });

      const result = await response.json();
      status.available = result.success === true;
      status.lastCheck = Date.now();

      if (!status.available) {
        console.warn(`⚠️ ${source.toUpperCase()} unavailable - using mock fallback`);
      }

      return status.available;
    } catch (error) {
      console.warn(`⚠️ ${source.toUpperCase()} check failed - using mock:`, error);
      status.available = false;
      status.lastCheck = Date.now();
      return false;
    } finally {
      pendingChecks.delete(source);
    }
  })();

  pendingChecks.set(source, checkPromise);
  return checkPromise;
}

/**
 * Pre-check all sources in parallel (called once at startup).
 * All callers await the same promise, ensuring the check runs exactly once.
 */
async function ensureInitialCheck(): Promise<void> {
  if (!initialCheckPromise) {
    initialCheckPromise = Promise.all([
      checkSourceAvailability("mospi"),
      checkSourceAvailability("rbi"),
      checkSourceAvailability("nse"),
    ]).then(() => {
      console.log("✅ Initial source availability check complete:", {
        mospi: sourceStatus.mospi.available,
        rbi: sourceStatus.rbi.available,
        nse: sourceStatus.nse.available,
      });
    });
  }

  // Always await – even if it was started by another caller
  return initialCheckPromise;
}

/**
 * Decide which provider to use for an indicator (priority-based routing)
 */
async function selectProvider(indicatorId: string): Promise<{ provider: DataProvider; source: LiveSource }> {
  // Wait for the initial availability check to finish before routing
  await ensureInitialCheck();

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
      const series = await provider.getSeries(indicatorId, opts);
      // If the live provider returned empty series, fall back to mock sparkline
      if (series.length === 0 && provider !== mockProvider) {
        return mockProvider.getSeries(indicatorId, opts);
      }
      return series;
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
  initialCheckPromise = null;
}
