import type { Category } from "./tokens";

// Data source types
export type DataSource =
  | "MoSPI"
  | "RBI"
  | "NSE";

// Frequency types
export type Frequency =
  | "Monthly"
  | "Quarterly"
  | "Daily"
  | "Bi-monthly"
  | "Bi-weekly";

// Unit types
export type Unit =
  | "%"
  | "Index"
  | "₹ Lakh Cr"
  | "₹"
  | "% YoY";

// Transform types
export type Transform = "Level" | "YoY" | "MoM";

// Status types
export type Status = "Heating" | "Cooling" | "Watch" | "Neutral";

// Indicator interface
export interface Indicator {
  id: string;
  name: string;
  category: Category;
  unit: Unit;
  frequency: Frequency;
  source: DataSource;
  description: string;
  transformOptions: Transform[];
  tags: string[];
}

// Observation interface (single data point)
export interface Observation {
  indicatorId: string;
  date: string; // ISO date or YYYY-MM format
  value: number;
  prior?: number;
  forecast?: number;
  surprise?: number; // value - forecast
}

// Time series data
export interface TimeSeriesData {
  date: string;
  value: number;
}

// Indicator with computed fields (for display)
export interface ProcessedIndicator extends Indicator {
  latestValue: number;
  latestDate: string;
  prior: number;
  change: number;
  changePct: number;
  forecast?: number;
  forecastSurprise?: number;
  status: Status;
  series: TimeSeriesData[];
  nextRelease?: string;
  liveSource?: "MoSPI" | "RBI" | "NSE" | "Mock"; // Which live data source was used
}

// Filter options for data queries
export interface DataFilter {
  category?: Category;
  source?: DataSource;
  frequency?: Frequency;
  tags?: string[];
}

// Options for getSeries
export interface SeriesOptions {
  from?: string; // ISO date
  to?: string; // ISO date
  transform?: Transform;
}