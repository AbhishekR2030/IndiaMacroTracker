import { NextResponse } from "next/server";

const MOSPI_MCP_URL = process.env.MOSPI_MCP_URL || "https://mcp.mospi.gov.in";

/**
 * GET /api/mospi/overview
 * Calls MoSPI tool 1: know_about_mospi_api()
 * Returns overview of all 7 datasets available
 */
export async function GET() {
  try {
    const response = await fetch(`${MOSPI_MCP_URL}/api/tools/1_know_about_mospi_api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`MoSPI API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching MoSPI overview:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch MoSPI overview",
        fallbackToMock: true,
      },
      { status: 500 }
    );
  }
}