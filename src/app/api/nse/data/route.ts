import { NextRequest, NextResponse } from "next/server";

const NSE_API_URL = process.env.NSE_API_URL || "https://www.nseindia.com/api";
const BSE_API_URL = process.env.BSE_API_URL || "https://api.bseindia.com";

/**
 * GET /api/nse/data?symbol=NIFTY%2050&exchange=NSE&type=current
 * Fetches real-time or historical market data from NSE/BSE
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const exchange = searchParams.get("exchange") || "NSE";
    const type = searchParams.get("type") || "current"; // current or historical
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: "Symbol parameter is required",
        },
        { status: 400 }
      );
    }

    let data;

    if (exchange === "NSE") {
      if (type === "historical") {
        // Fetch historical data from NSE
        const nseUrl = `${NSE_API_URL}/historical/index/${encodeURIComponent(
          symbol
        )}`;
        const params = new URLSearchParams();
        if (from) params.append("from", from);
        if (to) params.append("to", to);

        const response = await fetch(
          `${nseUrl}${params.toString() ? `?${params.toString()}` : ""}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Accept: "application/json",
              "Accept-Language": "en-US,en;q=0.9",
              Referer: "https://www.nseindia.com/",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`NSE API returned ${response.status}`);
        }

        const result = await response.json();
        data = {
          symbol,
          exchange: "NSE",
          historical: result.data || [],
        };
      } else {
        // Fetch current/live data from NSE
        const nseUrl = `${NSE_API_URL}/equity-stockIndices?index=${encodeURIComponent(
          symbol
        )}`;

        const response = await fetch(nseUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: "https://www.nseindia.com/",
          },
        });

        if (!response.ok) {
          throw new Error(`NSE API returned ${response.status}`);
        }

        const result = await response.json();

        // Extract the relevant index data
        const indexData = result.data?.find(
          (item: { index?: string; symbol?: string; last?: number; lastPrice?: number; previousClose?: number; open?: number; dayHigh?: number; high?: number; dayLow?: number; low?: number; change?: number; pChange?: number; timestamp?: string }) =>
            item.index === symbol || item.symbol === symbol
        );

        if (!indexData) {
          throw new Error(`Index ${symbol} not found in NSE response`);
        }

        data = {
          symbol,
          exchange: "NSE",
          lastPrice: indexData.last || indexData.lastPrice,
          previousClose: indexData.previousClose,
          open: indexData.open,
          high: indexData.dayHigh || indexData.high,
          low: indexData.dayLow || indexData.low,
          change: indexData.change,
          pChange: indexData.pChange,
          timestamp: indexData.timestamp || new Date().toISOString(),
        };
      }
    } else if (exchange === "BSE") {
      // Fetch from BSE API
      const bseUrl = `${BSE_API_URL}/BseIndiaAPI/api/MktData/idxmkt/${symbol}`;

      const response = await fetch(bseUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`BSE API returned ${response.status}`);
      }

      const result = await response.json();

      data = {
        symbol,
        exchange: "BSE",
        lastPrice: result.CurrRate || result.close,
        previousClose: result.PrevRate,
        open: result.OpenRate,
        high: result.HighRate,
        low: result.LowRate,
        change: result.chg,
        pChange: result.PcChg,
        timestamp: result.updtime || new Date().toISOString(),
      };
    } else {
      throw new Error(`Unknown exchange: ${exchange}`);
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching NSE/BSE data:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch market data",
        fallbackToMock: true,
      },
      { status: 500 }
    );
  }
}