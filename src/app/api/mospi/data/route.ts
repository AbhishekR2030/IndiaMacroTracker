import { NextRequest, NextResponse } from "next/server";

const MOSPI_MCP_URL = process.env.MOSPI_MCP_URL || "https://mcp.mospi.gov.in";

/**
 * POST /api/mospi/data
 * Calls MoSPI tool 4: get_data(dataset, filters)
 * Fetches actual time-series data using filter key-value pairs from step 3
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dataset, filters } = body;

    if (!dataset) {
      return NextResponse.json(
        {
          success: false,
          error: "Dataset parameter is required",
        },
        { status: 400 }
      );
    }

    if (!filters || typeof filters !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Filters object is required",
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${MOSPI_MCP_URL}/api/tools/4_get_data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataset,
        filters,
      }),
    });

    if (!response.ok) {
      throw new Error(`MoSPI API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      dataset,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching MoSPI data:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch MoSPI data",
        fallbackToMock: true,
      },
      { status: 500 }
    );
  }
}