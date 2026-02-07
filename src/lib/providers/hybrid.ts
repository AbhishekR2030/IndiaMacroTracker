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

/**
 * Hybrid Data Provider
 *
 * Intelligently combines multiple data sources:
 * - Uses MoSPI MCP for: CPI, WPI, IIP, NAS (GDP), PLFS (Inflation, Growth, Labour)
 * - Falls back to mock data for: Rates, FX, Markets, Fiscal, Liquidity, External Sector
 * - Gracefully degrades if MoSPI is unavailable
 *
 * This approach allows us to:
 * 1. Use live government data where available
 * 2. Maintain full functionality with mock data for other categories
 * 3. Handle API failures transparently
 */

// Track MoSPI availability
let mospiAvailable: boolean | null = null;
let lastMoSPICheck = 0;
const MOSPI_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

/**
 * Check if MoSPI server is available
 */
async function checkMoSPIAvailability(): Promise<boolean> {
  const now = Date.now();

  // Return cached status if recent
  if (mospiAvailable !== null && now - lastMoSPICheck < MOSPI_CHECK_INTERVAL) {
    return mospiAvailable;
  }

  try {
    const response = await fetch("/api/mospi/overview", {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const result = await response.json();
    mospiAvailable = result.success === true;
    lastMoSPICheck = now;

    if (!mospiAvailable) {
      console.warn("⚠️ MoSPI server unavailable - using cached/mock data");
    }

    return mospiAvailable;
  } catch (error) {
    console.warn("⚠️ MoSPI server check failed - using mock data:", error);
    mospiAvailable = false;
    lastMoSPICheck = now;
    return false;
  }
}

/**
 * Decide which provider to use for an indicator
 */
async function selectProvider(indicatorId: string): Promise<DataProvider> {
  // Check if indicator can be fetched from MoSPI
  if (!canFetchFromMoSPI(indicatorId)) {
    return mockProvider;
  }

  // Check if MoSPI is available
  const available = await checkMoSPIAvailability();

  if (!available) {
    return mockProvider;
  }

  return mospiProvider;
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
    const provider = await selectProvider(indicatorId);

    try {
      return await provider.getLatest(indicatorId);
    } catch (error) {
      console.error(`Error fetching latest for ${indicatorId}, falling back to mock:`, error);

      // Fallback to mock if MoSPI fails
      if (provider !== mockProvider) {
        return mockProvider.getLatest(indicatorId);
      }

      throw error;
    }
  },

  async getSeries(
    indicatorId: string,
    opts?: SeriesOptions
  ): Promise<TimeSeriesData[]> {
    const provider = await selectProvider(indicatorId);

    try {
      return await provider.getSeries(indicatorId, opts);
    } catch (error) {
      console.error(`Error fetching series for ${indicatorId}, falling back to mock:`, error);

      // Fallback to mock if MoSPI fails
      if (provider !== mockProvider) {
        return mockProvider.getSeries(indicatorId, opts);
      }

      throw error;
    }
  },

  async getNextRelease(indicatorId: string): Promise<string | null> {
    const provider = await selectProvider(indicatorId);

    try {
      return await provider.getNextRelease(indicatorId);
    } catch (error) {
      console.error(
        `Error fetching next release for ${indicatorId}, falling back to mock:`,
        error
      );

      // Fallback to mock if MoSPI fails
      if (provider !== mockProvider) {
        return mockProvider.getNextRelease(indicatorId);
      }

      throw error;
    }
  },
};

/**
 * Get the data source name for an indicator (for display purposes)
 */
export function getDataSource(indicatorId: string): string {
  if (canFetchFromMoSPI(indicatorId) && mospiAvailable) {
    return "MoSPI Live";
  }

  return "Mock";
}

/**
 * Force refresh MoSPI availability check
 */
export function refreshMoSPIStatus(): void {
  mospiAvailable = null;
  lastMoSPICheck = 0;
}