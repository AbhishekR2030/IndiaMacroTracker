import type {
  Indicator,
  Observation,
  DataFilter,
  SeriesOptions,
  TimeSeriesData,
} from "../types";

/**
 * DataProvider interface - all data sources must implement this
 * Allows swapping between mock and live data without changing components
 */
export interface DataProvider {
  /**
   * Get list of available indicators, optionally filtered
   */
  getIndicators(filter?: DataFilter): Promise<Indicator[]>;

  /**
   * Get the latest observation for a specific indicator
   */
  getLatest(indicatorId: string): Promise<Observation>;

  /**
   * Get time series data for an indicator
   */
  getSeries(
    indicatorId: string,
    opts?: SeriesOptions
  ): Promise<TimeSeriesData[]>;

  /**
   * Get the next scheduled release date for an indicator
   * Returns null if not available or not scheduled
   */
  getNextRelease(indicatorId: string): Promise<string | null>;
}