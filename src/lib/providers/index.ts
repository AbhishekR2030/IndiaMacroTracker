import type { DataProvider } from "./interface";
import { MockDataProvider } from "./mock";
import { mospiProvider } from "./mospi";
import { rbiProvider } from "./rbi";
import { nseProvider } from "./nse";
import { hybridProvider } from "./hybrid";

/**
 * Get the active data provider based on environment configuration
 * - "mock":   Uses mock data only (Phase 1-3, always works)
 * - "mospi":  Uses MoSPI MCP Server only (Phase 4 - testing)
 * - "rbi":    Uses RBI DBIE API only (Phase 5 - testing)
 * - "nse":    Uses NSE/BSE API only (Phase 5 - testing)
 * - "hybrid": Combines MoSPI + RBI + NSE + mock (Phase 5 - recommended)
 */
export function getDataProvider(): DataProvider {
  const dataSource = process.env.NEXT_PUBLIC_DATA_SOURCE || "mock";

  switch (dataSource) {
    case "mock":
      return new MockDataProvider();
    case "mospi":
      return mospiProvider;
    case "rbi":
      return rbiProvider;
    case "nse":
      return nseProvider;
    case "hybrid":
      return hybridProvider;
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