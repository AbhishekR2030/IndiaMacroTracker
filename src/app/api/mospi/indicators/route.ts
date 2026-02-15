import { NextRequest, NextResponse } from "next/server";
import { mospiLogger } from "@/lib/logger";
import { categorizeError, ValidationError } from "@/lib/errors";

const MOSPI_API_URL = process.env.MOSPI_API_URL || "https://api.mospi.gov.in";

/**
 * GET /api/mospi/indicators?dataset=CPI
 * Returns available indicators for a MoSPI dataset
 * Supported: CPI, PLFS, IIP, ASI, NAS, WPI, ENERGY
 */
export async function GET(request: NextRequest) {
  const timer = mospiLogger.startTimer();
  const operation = "get_indicators";

  try {
    const { searchParams } = new URL(request.url);
    const dataset = searchParams.get("dataset");

    if (!dataset) {
      const validationError = new ValidationError(
        "MoSPI",
        "Dataset parameter is required",
        "dataset"
      );
      mospiLogger.warn(validationError.message, { operation, dataset: dataset ?? undefined });

      return NextResponse.json(
        {
          success: false,
          error: validationError.message,
        },
        { status: 400 }
      );
    }

    mospiLogger.debug("Fetching MoSPI indicators", { operation, dataset: dataset ?? undefined });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any;
    let apiUrl: string;

    // Fetch indicators based on dataset type
    switch (dataset.toUpperCase()) {
      case "CPI":
        // Fetch CPI base years which include level information
        apiUrl = `${MOSPI_API_URL}/api/cpi/getCpiBaseYear`;
        const cpiResponse = await fetch(apiUrl, {
          signal: AbortSignal.timeout(30000),
        });
        if (!cpiResponse.ok) {
          throw new Error(`MoSPI API returned ${cpiResponse.status}: ${cpiResponse.statusText}`);
        }
        data = await cpiResponse.json();
        if (data.statusCode && data.data) {
          data = {
            dataset: "CPI",
            base_years: data.data,
            note: "Use base_year and level parameters to get CPI filters. Latest: 2024"
          };
        }
        break;

      case "PLFS":
        // Fetch PLFS indicators by frequency (Annual=1, Quarterly=2, Monthly=3)
        apiUrl = `${MOSPI_API_URL}/api/plfs/getIndicatorListByFrequency?frequency_code=1`;
        const plfsResponse = await fetch(apiUrl, {
          signal: AbortSignal.timeout(30000),
        });
        if (!plfsResponse.ok) {
          throw new Error(`MoSPI API returned ${plfsResponse.status}: ${plfsResponse.statusText}`);
        }
        const plfsData = await plfsResponse.json();
        if (plfsData.statusCode && plfsData.data) {
          data = {
            dataset: "PLFS",
            indicators: plfsData.data,
            note: "frequency_code: 1=Annual, 2=Quarterly, 3=Monthly"
          };
        } else {
          data = plfsData;
        }
        break;

      case "NAS":
        // Fetch NAS indicator list
        apiUrl = `${MOSPI_API_URL}/api/nas/getNasIndicatorList`;
        const nasResponse = await fetch(apiUrl, {
          signal: AbortSignal.timeout(30000),
        });
        if (!nasResponse.ok) {
          throw new Error(`MoSPI API returned ${nasResponse.status}: ${nasResponse.statusText}`);
        }
        const nasData = await nasResponse.json();
        if (nasData.statusCode && nasData.data) {
          data = {
            dataset: "NAS",
            indicators: nasData.data,
            note: "National Accounts Statistics - GDP, economic growth"
          };
        } else {
          data = nasData;
        }
        break;

      case "ENERGY":
        // Fetch Energy indicators
        apiUrl = `${MOSPI_API_URL}/api/energy/getEnergyIndicatorList`;
        const energyResponse = await fetch(apiUrl, {
          signal: AbortSignal.timeout(30000),
        });
        if (!energyResponse.ok) {
          throw new Error(`MoSPI API returned ${energyResponse.status}: ${energyResponse.statusText}`);
        }
        const energyData = await energyResponse.json();
        if (energyData.statusCode && energyData.data) {
          data = {
            dataset: "ENERGY",
            indicators: energyData.data,
            note: "Energy production and consumption statistics"
          };
        } else {
          data = energyData;
        }
        break;

      case "IIP":
      case "ASI":
      case "WPI":
        // These datasets have filter endpoints instead of indicator lists
        data = {
          dataset,
          message: `${dataset} uses filter-based structure. Use metadata endpoint to get available filters.`,
          note: "IIP: Industrial Production, ASI: Annual Survey of Industries, WPI: Wholesale Price Index"
        };
        break;

      default:
        throw new ValidationError(
          "MoSPI",
          `Unknown dataset: ${dataset}. Supported: CPI, PLFS, IIP, ASI, NAS, WPI, ENERGY`,
          "dataset"
        );
    }

    const durationMs = timer();
    mospiLogger.logRequestSuccess(operation, durationMs, { dataset });

    return NextResponse.json({
      success: true,
      dataset,
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
