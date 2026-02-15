import { NextRequest, NextResponse } from "next/server";
import { mospiLogger } from "@/lib/logger";
import { categorizeError, ValidationError } from "@/lib/errors";

const MOSPI_API_URL = process.env.MOSPI_API_URL || "https://api.mospi.gov.in";

/**
 * POST /api/mospi/data
 * Fetches actual time-series data from MoSPI using filter parameters
 * Body: { dataset: string, filters: object }
 *
 * Example for CPI:
 * {
 *   dataset: "CPI",
 *   filters: {
 *     base_year: "2024",
 *     sector_code: "1",
 *     division_code: "01",
 *     from_date: "2024-01",
 *     to_date: "2024-12"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const timer = mospiLogger.startTimer();
  const operation = "get_data";

  try {
    const body = await request.json();
    const { dataset, filters } = body;

    if (!dataset) {
      const validationError = new ValidationError(
        "MoSPI",
        "Dataset parameter is required",
        "dataset"
      );
      mospiLogger.warn(validationError.message, { operation });

      return NextResponse.json(
        {
          success: false,
          error: validationError.message,
        },
        { status: 400 }
      );
    }

    if (!filters || typeof filters !== "object") {
      const validationError = new ValidationError(
        "MoSPI",
        "Filters object is required",
        "filters"
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

    mospiLogger.debug("Fetching MoSPI data", { operation, dataset, metadata: { filters } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any;
    let apiUrl: string;
    const params = new URLSearchParams();

    // Build parameters based on dataset type
    switch (dataset.toUpperCase()) {
      case "CPI":
        // Determine which CPI endpoint to use
        const baseYear = filters.base_year || "2024";

        if (baseYear === "2024") {
          // Unified endpoint for base year 2024
          apiUrl = `${MOSPI_API_URL}/api/cpi/getCPIData`;
        } else if (filters.level === "Group" || !filters.level) {
          // Group-level endpoint for older base years
          apiUrl = `${MOSPI_API_URL}/api/cpi/getCPIIndex`;
        } else {
          // Item-level endpoint
          apiUrl = `${MOSPI_API_URL}/api/cpi/getItemIndex`;
        }

        // Add all filter parameters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, String(value));
          }
        });

        const cpiResponse = await fetch(`${apiUrl}?${params.toString()}`, {
          signal: AbortSignal.timeout(30000),
        });

        if (!cpiResponse.ok) {
          throw new Error(`MoSPI API returned ${cpiResponse.status}: ${cpiResponse.statusText}`);
        }

        data = await cpiResponse.json();
        break;

      case "PLFS":
        apiUrl = `${MOSPI_API_URL}/api/plfs/getData`;

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, String(value));
          }
        });

        const plfsResponse = await fetch(`${apiUrl}?${params.toString()}`, {
          signal: AbortSignal.timeout(30000),
        });

        if (!plfsResponse.ok) {
          throw new Error(`MoSPI API returned ${plfsResponse.status}: ${plfsResponse.statusText}`);
        }

        data = await plfsResponse.json();
        break;

      case "IIP":
        // Choose Annual or Monthly endpoint based on frequency
        const frequency = filters.frequency || "Annually";
        apiUrl = frequency === "Monthly"
          ? `${MOSPI_API_URL}/api/iip/getIIPMonthly`
          : `${MOSPI_API_URL}/api/iip/getIIPAnnual`;

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, String(value));
          }
        });

        const iipResponse = await fetch(`${apiUrl}?${params.toString()}`, {
          signal: AbortSignal.timeout(30000),
        });

        if (!iipResponse.ok) {
          throw new Error(`MoSPI API returned ${iipResponse.status}: ${iipResponse.statusText}`);
        }

        data = await iipResponse.json();
        break;

      case "ASI":
        apiUrl = `${MOSPI_API_URL}/api/asi/getASIData`;

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, String(value));
          }
        });

        const asiResponse = await fetch(`${apiUrl}?${params.toString()}`, {
          signal: AbortSignal.timeout(30000),
        });

        if (!asiResponse.ok) {
          throw new Error(`MoSPI API returned ${asiResponse.status}: ${asiResponse.statusText}`);
        }

        data = await asiResponse.json();
        break;

      case "NAS":
        apiUrl = `${MOSPI_API_URL}/api/nas/getNASData`;

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, String(value));
          }
        });

        const nasResponse = await fetch(`${apiUrl}?${params.toString()}`, {
          signal: AbortSignal.timeout(30000),
        });

        if (!nasResponse.ok) {
          throw new Error(`MoSPI API returned ${nasResponse.status}: ${nasResponse.statusText}`);
        }

        data = await nasResponse.json();
        break;

      case "WPI":
        apiUrl = `${MOSPI_API_URL}/api/wpi/getWpiRecords`;

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, String(value));
          }
        });

        const wpiResponse = await fetch(`${apiUrl}?${params.toString()}`, {
          signal: AbortSignal.timeout(30000),
        });

        if (!wpiResponse.ok) {
          throw new Error(`MoSPI API returned ${wpiResponse.status}: ${wpiResponse.statusText}`);
        }

        data = await wpiResponse.json();
        break;

      case "ENERGY":
        apiUrl = `${MOSPI_API_URL}/api/energy/getEnergyRecords`;

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, String(value));
          }
        });

        const energyResponse = await fetch(`${apiUrl}?${params.toString()}`, {
          signal: AbortSignal.timeout(30000),
        });

        if (!energyResponse.ok) {
          throw new Error(`MoSPI API returned ${energyResponse.status}: ${energyResponse.statusText}`);
        }

        data = await energyResponse.json();
        break;

      default:
        throw new ValidationError(
          "MoSPI",
          `Unknown dataset: ${dataset}. Supported: CPI, PLFS, IIP, ASI, NAS, WPI, ENERGY`,
          "dataset"
        );
    }

    const durationMs = timer();

    // Calculate record count if available
    let recordCount = 0;
    if (data && data.data) {
      if (Array.isArray(data.data)) {
        recordCount = data.data.length;
      } else if (data.data.records && Array.isArray(data.data.records)) {
        recordCount = data.data.records.length;
      }
    }

    mospiLogger.logRequestSuccess(operation, durationMs, { dataset, metadata: { recordCount } });

    return NextResponse.json({
      success: true,
      dataset,
      data,
      recordCount,
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
