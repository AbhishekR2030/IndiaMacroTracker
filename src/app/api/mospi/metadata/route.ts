import { NextRequest, NextResponse } from "next/server";
import { mospiLogger } from "@/lib/logger";
import { categorizeError, ValidationError } from "@/lib/errors";

const MOSPI_API_URL = process.env.MOSPI_API_URL || "https://api.mospi.gov.in";

/**
 * GET /api/mospi/metadata?dataset=CPI&base_year=2024&level=Group
 * Returns valid filter values for a MoSPI dataset
 * Required parameters vary by dataset
 */
export async function GET(request: NextRequest) {
  const timer = mospiLogger.startTimer();
  const operation = "get_metadata";

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

    mospiLogger.debug("Fetching MoSPI metadata", { operation, dataset: dataset ?? undefined });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any;
    let apiUrl: string;
    const params = new URLSearchParams();

    // Fetch metadata/filters based on dataset type
    switch (dataset.toUpperCase()) {
      case "CPI":
        // CPI metadata requires base_year and level
        const baseYear = searchParams.get("base_year") || "2024";
        const level = searchParams.get("level") || "Group";
        const seriesCode = searchParams.get("series_code") || "Current";

        params.append("base_year", baseYear);
        params.append("level", level);
        params.append("series_code", seriesCode);

        apiUrl = `${MOSPI_API_URL}/api/cpi/getCpiFilterByLevelAndBaseYear?${params.toString()}`;

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
            base_year: baseYear,
            level,
            series_code: seriesCode,
            filters: data.data,
            note: "Use these filter codes when fetching CPI data"
          };
        }
        break;

      case "PLFS":
        // PLFS metadata requires indicator_code and frequency_code
        const indicatorCode = searchParams.get("indicator_code") || "1";
        const frequencyCode = searchParams.get("frequency_code") || "1";
        const year = searchParams.get("year");
        const monthCode = searchParams.get("month_code");

        params.append("indicator_code", indicatorCode);
        params.append("frequency_code", frequencyCode);
        if (year) params.append("year", year);
        if (monthCode) params.append("month_code", monthCode);

        apiUrl = `${MOSPI_API_URL}/api/plfs/getFilterByIndicatorId?${params.toString()}`;

        const plfsResponse = await fetch(apiUrl, {
          signal: AbortSignal.timeout(30000),
        });

        if (!plfsResponse.ok) {
          throw new Error(`MoSPI API returned ${plfsResponse.status}: ${plfsResponse.statusText}`);
        }

        data = await plfsResponse.json();
        if (data.statusCode && data.data) {
          data = {
            dataset: "PLFS",
            indicator_code: indicatorCode,
            frequency_code: frequencyCode,
            filters: data.data,
            note: "frequency_code: 1=Annual, 2=Quarterly, 3=Monthly"
          };
        }
        break;

      case "IIP":
        // IIP metadata requires base_year and frequency
        const iipBaseYear = searchParams.get("base_year") || "2011-12";
        const frequency = searchParams.get("frequency") || "Annually";

        params.append("base_year", iipBaseYear);
        params.append("frequency", frequency);

        apiUrl = `${MOSPI_API_URL}/api/iip/getIipFilter?${params.toString()}`;

        const iipResponse = await fetch(apiUrl, {
          signal: AbortSignal.timeout(30000),
        });

        if (!iipResponse.ok) {
          throw new Error(`MoSPI API returned ${iipResponse.status}: ${iipResponse.statusText}`);
        }

        data = await iipResponse.json();
        if (data.statusCode && data.data) {
          data = {
            dataset: "IIP",
            base_year: iipBaseYear,
            frequency,
            filters: data.data,
            note: "frequency: 'Annually' or 'Monthly'. base_year: '2011-12', '2004-05', or '1993-94'"
          };
        }
        break;

      case "ASI":
        // ASI metadata requires classification_year
        const classificationYear = searchParams.get("classification_year") || "2008";

        params.append("classification_year", classificationYear);

        apiUrl = `${MOSPI_API_URL}/api/asi/getAsiFilter?${params.toString()}`;

        const asiResponse = await fetch(apiUrl, {
          signal: AbortSignal.timeout(30000),
        });

        if (!asiResponse.ok) {
          throw new Error(`MoSPI API returned ${asiResponse.status}: ${asiResponse.statusText}`);
        }

        data = await asiResponse.json();
        if (data.statusCode && data.data) {
          data = {
            dataset: "ASI",
            classification_year: classificationYear,
            filters: data.data,
            note: "classification_year: '2008' (2008-09 to 2023-24), '2004' (2004-05 to 2007-08), '1998', '1987'"
          };
        }
        break;

      case "NAS":
        // NAS metadata requires series, frequency_code, and indicator_code
        const nasSeries = searchParams.get("series") || "Current";
        const nasFreqCode = searchParams.get("frequency_code") || "1";
        const nasIndicatorCode = searchParams.get("indicator_code") || "1";

        params.append("series", nasSeries);
        params.append("frequency_code", nasFreqCode);
        params.append("indicator_code", nasIndicatorCode);

        apiUrl = `${MOSPI_API_URL}/api/nas/getNasFilterByIndicatorId?${params.toString()}`;

        const nasResponse = await fetch(apiUrl, {
          signal: AbortSignal.timeout(30000),
        });

        if (!nasResponse.ok) {
          throw new Error(`MoSPI API returned ${nasResponse.status}: ${nasResponse.statusText}`);
        }

        data = await nasResponse.json();
        if (data.statusCode && data.data) {
          data = {
            dataset: "NAS",
            series: nasSeries,
            frequency_code: nasFreqCode,
            indicator_code: nasIndicatorCode,
            filters: data.data,
            note: "series: 'Current' or 'Back'. frequency_code: 1=Annual, 2=Quarterly"
          };
        }
        break;

      case "WPI":
        // WPI has a general filter endpoint
        apiUrl = `${MOSPI_API_URL}/api/wpi/getWpiData`;

        const wpiResponse = await fetch(apiUrl, {
          signal: AbortSignal.timeout(30000),
        });

        if (!wpiResponse.ok) {
          throw new Error(`MoSPI API returned ${wpiResponse.status}: ${wpiResponse.statusText}`);
        }

        data = await wpiResponse.json();
        if (data.statusCode && data.data) {
          data = {
            dataset: "WPI",
            filters: data.data,
            note: "Available filters: year, month, major_group, group, sub_group, sub_sub_group, item"
          };
        }
        break;

      case "ENERGY":
        // Energy metadata requires indicator_code and use_of_energy_balance_code
        const energyIndicatorCode = searchParams.get("indicator_code") || "1";
        const balanceCode = searchParams.get("use_of_energy_balance_code") || "1";

        params.append("indicator_code", energyIndicatorCode);
        params.append("use_of_energy_balance_code", balanceCode);

        apiUrl = `${MOSPI_API_URL}/api/energy/getEnergyFilterByIndicatorId?${params.toString()}`;

        const energyResponse = await fetch(apiUrl, {
          signal: AbortSignal.timeout(30000),
        });

        if (!energyResponse.ok) {
          throw new Error(`MoSPI API returned ${energyResponse.status}: ${energyResponse.statusText}`);
        }

        data = await energyResponse.json();
        if (data.statusCode && data.data) {
          data = {
            dataset: "ENERGY",
            indicator_code: energyIndicatorCode,
            use_of_energy_balance_code: balanceCode,
            filters: data.data,
            note: "indicator_code: 1=KToE, 2=PetaJoules. use_of_energy_balance_code: 1=Supply, 2=Consumption"
          };
        }
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
