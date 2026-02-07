import type { DataProvider } from "./interface";
import { MockDataProvider } from "./mock";

/**
 * Get the active data provider based on environment configuration
 * For Phase 1-3: Uses mock data
 * For Phase 4+: Can switch to MoSPI or hybrid providers
 */
export function getDataProvider(): DataProvider {
  const dataSource = process.env.NEXT_PUBLIC_DATA_SOURCE || "mock";

  switch (dataSource) {
    case "mock":
      return new MockDataProvider();
    // Phase 4: Add MoSPI provider
    // case "mospi":
    //   return new MoSPIDataProvider();
    // case "hybrid":
    //   return new HybridDataProvider();
    default:
      console.warn(
        `Unknown DATA_SOURCE: ${dataSource}. Falling back to mock.`
      );
      return new MockDataProvider();
  }
}

// Export singleton instance
export const dataProvider = getDataProvider();

// Re-export types for convenience
export type { DataProvider } from "./interface";
export type {
  Indicator,
  Observation,
  DataFilter,
  SeriesOptions,
  TimeSeriesData,
  ProcessedIndicator,
} from "../types";