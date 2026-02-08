import { NextRequest, NextResponse } from "next/server";

const RBI_DBIE_URL = process.env.RBI_DBIE_URL || "https://dbie.rbi.org.in/DBIE/dbie.rbi";

/**
 * GET /api/rbi/data?series=RLCR_A_001&from=2024-01-01&to=2024-12-31
 * Fetches time-series data from RBI DBIE API
 * Returns observations for the specified series code and date range
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const series = searchParams.get("series");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const format = searchParams.get("format") || "json";

    if (!series) {
      return NextResponse.json(
        {
          success: false,
          error: "Series code parameter is required",
        },
        { status: 400 }
      );
    }

    // Build RBI API request
    const rbiParams = new URLSearchParams({
      site: "statistics",
      m: "tseries",
      series: series,
      format: format,
    });

    if (from) rbiParams.append("from", from);
    if (to) rbiParams.append("to", to);

    const response = await fetch(`${RBI_DBIE_URL}?${rbiParams.toString()}`, {
      headers: {
        "User-Agent": "IndiaMacroTracker/1.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`RBI API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform RBI response to our standard format
    const observations = data.items?.map((item: { date?: string; period?: string; value: string }) => ({
      date: item.date || item.period,
      value: parseFloat(item.value),
    })) || [];

    return NextResponse.json({
      success: true,
      series,
      data: {
        seriesCode: series,
        seriesName: data.seriesName || series,
        frequency: data.frequency,
        observations,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching RBI data:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch RBI data",
        fallbackToMock: true,
      },
      { status: 500 }
    );
  }
}