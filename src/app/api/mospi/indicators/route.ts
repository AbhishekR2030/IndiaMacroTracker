import { NextRequest, NextResponse } from "next/server";

const MOSPI_MCP_URL = process.env.MOSPI_MCP_URL || "https://mcp.mospi.gov.in";

/**
 * GET /api/mospi/indicators?dataset=CPI&query=...
 * Calls MoSPI tool 2: get_indicators(dataset, user_query?)
 * Returns available indicators/sub-indicators for a dataset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataset = searchParams.get("dataset");
    const userQuery = searchParams.get("query");

    if (!dataset) {
      return NextResponse.json(
        {
          success: false,
          error: "Dataset parameter is required",
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${MOSPI_MCP_URL}/api/tools/2_get_indicators`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataset,
        user_query: userQuery || undefined,
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
    console.error("Error fetching MoSPI indicators:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch MoSPI indicators",
        fallbackToMock: true,
      },
      { status: 500 }
    );
  }
}