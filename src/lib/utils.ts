import type {
  Indicator,
  ProcessedIndicator,
  TimeSeriesData,
  Status,
} from "./types";

/**
 * Calculate status based on percentage change
 */
export function getStatus(changePct: number): Status {
  if (changePct > 0.3) return "Heating";
  if (changePct < -0.3) return "Cooling";
  if (Math.abs(changePct) > 0.15) return "Watch";
  return "Neutral";
}

/**
 * Process an indicator with its series data into a ProcessedIndicator
 * with computed fields for display
 */
export async function processIndicator(
  indicator: Indicator,
  series: TimeSeriesData[],
  latest: { value: number; prior?: number; forecast?: number },
  nextRelease?: string | null
): Promise<ProcessedIndicator> {
  const latestValue = latest.value;
  const latestDate = series[series.length - 1]?.date || "";
  const prior = latest.prior || series[series.length - 2]?.value || latestValue;

  const change = latestValue - prior;
  const changePct = (change / Math.abs(prior)) * 100;

  const forecastSurprise =
    latest.forecast !== undefined && latest.forecast !== null
      ? latestValue - latest.forecast
      : undefined;

  return {
    ...indicator,
    latestValue,
    latestDate,
    prior,
    change,
    changePct,
    forecast: latest.forecast,
    forecastSurprise,
    status: getStatus(changePct),
    series,
    nextRelease: nextRelease || undefined,
  };
}

/**
 * Filter indicators by search query
 */
export function filterBySearch(
  indicators: ProcessedIndicator[],
  query: string
): ProcessedIndicator[] {
  if (!query.trim()) return indicators;

  const q = query.toLowerCase();
  return indicators.filter(
    (ind) =>
      ind.name.toLowerCase().includes(q) ||
      ind.category.toLowerCase().includes(q) ||
      ind.source.toLowerCase().includes(q) ||
      ind.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

/**
 * Sort indicators by latest release date (most recent first)
 */
export function sortByLatestRelease(
  indicators: ProcessedIndicator[]
): ProcessedIndicator[] {
  return [...indicators].sort((a, b) =>
    (b.latestDate || "").localeCompare(a.latestDate || "")
  );
}