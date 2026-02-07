import { NextRequest, NextResponse } from "next/server";

const MOSPI_MCP_URL = process.env.MOSPI_MCP_URL || "https://mcp.mospi.gov.in";

/**
 * GET /api/mospi/metadata?dataset=CPI
 * Calls MoSPI tool 3: get_metadata(dataset, ...)
 * Returns valid filter values: states, years, categories, sectors
 * CRITICAL: Must be called before fetching data to get valid filter codes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataset = searchParams.get("dataset");

    if (!dataset) {
      return NextResponse.json(
        {
          success: false,
          error: "Dataset parameter is required",
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${MOSPI_MCP_URL}/api/tools/3_get_metadata`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataset,
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
    console.error("Error fetching MoSPI metadata:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch MoSPI metadata",
        fallbackToMock: true,
      },
      { status: 500 }
    );
  }
}