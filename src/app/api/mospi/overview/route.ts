import { NextResponse } from "next/server";
import { mospiLogger } from "@/lib/logger";
import { categorizeError } from "@/lib/errors";

const MOSPI_API_URL = process.env.MOSPI_API_URL || "https://api.mospi.gov.in";

/**
 * GET /api/mospi/overview
 * Returns overview of all 7 MoSPI datasets available
 * Datasets: PLFS, CPI, IIP, ASI, NAS, WPI, ENERGY
 */
export async function GET() {
  const timer = mospiLogger.startTimer();
  const operation = "get_overview";

  try {
    mospiLogger.debug("Fetching MoSPI overview", { operation });

    // Return static overview of available datasets
    const data = {
      datasets: [
        {
          code: "PLFS",
          name: "Periodic Labour Force Survey",
          description: "Jobs, unemployment, wages, workforce participation",
          topics: ["employment", "unemployment", "wages", "labor force"]
        },
        {
          code: "CPI",
          name: "Consumer Price Index",
          description: "Retail inflation, cost of living, commodity prices",
          topics: ["inflation", "consumer prices", "cost of living"]
        },
        {
          code: "IIP",
          name: "Index of Industrial Production",
          description: "Industrial growth, manufacturing output",
          topics: ["industrial production", "manufacturing", "mining", "electricity"]
        },
        {
          code: "ASI",
          name: "Annual Survey of Industries",
          description: "Factory performance, industrial employment",
          topics: ["industries", "factories", "manufacturing statistics"]
        },
        {
          code: "NAS",
          name: "National Accounts Statistics",
          description: "GDP, economic growth, national income",
          topics: ["GDP", "economic growth", "national accounts"]
        },
        {
          code: "WPI",
          name: "Wholesale Price Index",
          description: "Wholesale inflation, producer prices",
          topics: ["wholesale prices", "inflation", "commodities"]
        },
        {
          code: "ENERGY",
          name: "Energy Statistics",
          description: "Energy production, consumption, fuel mix",
          topics: ["energy", "power", "fuel", "electricity"]
        }
      ],
      api_base_url: MOSPI_API_URL,
      note: "Use the indicators endpoint to get available indicators for each dataset"
    };

    const durationMs = timer();
    mospiLogger.logRequestSuccess(operation, durationMs);

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const durationMs = timer();
    const apiError = categorizeError(error, "MoSPI");

    mospiLogger.logRequestError(
      operation,
      error instanceof Error ? error : new Error(String(error)),
      durationMs
    );

    return NextResponse.json(
      {
        success: false,
        error: apiError.message,
        fallbackToMock: true,
      },
      { status: apiError.statusCode }
    );
  }
}