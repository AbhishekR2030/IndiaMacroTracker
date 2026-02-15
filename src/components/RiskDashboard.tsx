"use client";

import { CATEGORY_MAP } from "@/lib/tokens";
import type { ProcessedIndicator } from "@/lib/types";

interface RiskDashboardProps {
  indicators: ProcessedIndicator[];
}

type RiskLevel = "High" | "Moderate" | "Low";

interface RiskCard {
  title: string;
  icon: string;
  description: string;
  riskLevel: RiskLevel;
  color: string;
  indicators: Array<{
    name: string;
    value: string;
    status: string;
  }>;
}

function getRiskLevelStyle(level: RiskLevel): { bg: string; text: string; border: string } {
  switch (level) {
    case "High":
      return { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" };
    case "Moderate":
      return { bg: "#FEF3C7", text: "#D97706", border: "#FCD34D" };
    case "Low":
      return { bg: "#D1FAE5", text: "#059669", border: "#6EE7B7" };
  }
}

function assessRisks(indicators: ProcessedIndicator[]): RiskCard[] {
  const findIndicator = (id: string) => indicators.find((ind) => ind.id === id);

  // 1. Inflation Risk
  const cpiHeadline = findIndicator("cpi-headline");
  const cpiFood = findIndicator("cpi-food");
  const wpi = findIndicator("wpi");

  const avgInflation =
    ((cpiHeadline?.latestValue || 0) +
      (cpiFood?.latestValue || 0) +
      (wpi?.latestValue || 0)) /
    3;
  const inflationRisk: RiskLevel = avgInflation > 5.5 ? "High" : avgInflation > 4.5 ? "Moderate" : "Low";

  // 2. Growth Momentum
  const gdp = findIndicator("gdp-yoy");
  const iip = findIndicator("iip");

  const avgGrowth = ((gdp?.latestValue || 0) + (iip?.latestValue || 0)) / 2;
  const growthRisk: RiskLevel = avgGrowth < 5.5 ? "High" : avgGrowth < 6.5 ? "Moderate" : "Low";

  // 3. Liquidity Stress
  const laf = findIndicator("laf-liquidity");
  const creditGrowth = findIndicator("bank-credit");

  const liquidityRisk: RiskLevel =
    (laf?.latestValue || 0) < -2.0 ? "High" : (laf?.latestValue || 0) < -1.0 ? "Moderate" : "Low";

  // 4. Market & FX Risk
  const vix = findIndicator("india-vix");
  const usdinr = findIndicator("usdinr");
  const gsec10y = findIndicator("gsec-10y");

  const marketFxRisk: RiskLevel =
    (vix?.latestValue || 0) > 20 ? "High" : (vix?.latestValue || 0) > 15 ? "Moderate" : "Low";

  return [
    {
      title: "Inflation Risk",
      icon: "🔥",
      description:
        "Measures price stability risk based on consumer and wholesale inflation indicators.",
      riskLevel: inflationRisk,
      color: CATEGORY_MAP["Inflation"].color,
      indicators: [
        {
          name: cpiHeadline?.name || "CPI Headline",
          value: cpiHeadline ? `${cpiHeadline.latestValue.toFixed(1)}%` : "N/A",
          status: cpiHeadline?.status || "Neutral",
        },
        {
          name: cpiFood?.name || "CPI Food",
          value: cpiFood ? `${cpiFood.latestValue.toFixed(1)}%` : "N/A",
          status: cpiFood?.status || "Neutral",
        },
        {
          name: wpi?.name || "WPI",
          value: wpi ? `${wpi.latestValue.toFixed(1)}%` : "N/A",
          status: wpi?.status || "Neutral",
        },
      ],
    },
    {
      title: "Growth Momentum",
      icon: "📈",
      description:
        "Assesses economic growth trajectory based on GDP and industrial production.",
      riskLevel: growthRisk,
      color: CATEGORY_MAP["Growth"].color,
      indicators: [
        {
          name: gdp?.name || "GDP Growth",
          value: gdp ? `${gdp.latestValue.toFixed(1)}%` : "N/A",
          status: gdp?.status || "Neutral",
        },
        {
          name: iip?.name || "IIP Growth",
          value: iip ? `${iip.latestValue.toFixed(1)}%` : "N/A",
          status: iip?.status || "Neutral",
        },
      ],
    },
    {
      title: "Liquidity Stress",
      icon: "💧",
      description:
        "Evaluates banking system liquidity conditions and credit availability.",
      riskLevel: liquidityRisk,
      color: CATEGORY_MAP["Liquidity & Money"].color,
      indicators: [
        {
          name: laf?.name || "LAF Net Liquidity",
          value: laf ? `₹${laf.latestValue.toFixed(2)} Lakh Cr` : "N/A",
          status: laf?.status || "Neutral",
        },
        {
          name: creditGrowth?.name || "Credit Growth",
          value: creditGrowth ? `${creditGrowth.latestValue.toFixed(1)}%` : "N/A",
          status: creditGrowth?.status || "Neutral",
        },
      ],
    },
    {
      title: "Market & FX Risk",
      icon: "📉",
      description:
        "Monitors market volatility, exchange rate pressure, and bond yield movements.",
      riskLevel: marketFxRisk,
      color: CATEGORY_MAP["Markets"].color,
      indicators: [
        {
          name: vix?.name || "India VIX",
          value: vix ? `${vix.latestValue.toFixed(1)}` : "N/A",
          status: vix?.status || "Neutral",
        },
        {
          name: usdinr?.name || "USD/INR",
          value: usdinr ? `₹${usdinr.latestValue.toFixed(2)}` : "N/A",
          status: usdinr?.status || "Neutral",
        },
        {
          name: gsec10y?.name || "G-Sec 10Y",
          value: gsec10y ? `${gsec10y.latestValue.toFixed(2)}%` : "N/A",
          status: gsec10y?.status || "Neutral",
        },
      ],
    },
  ];
}

export function RiskDashboard({ indicators }: RiskDashboardProps) {
  const riskCards = assessRisks(indicators);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Risk Dashboard
        </h2>
        <p className="text-[13px] text-gray-500">
          Real-time assessment of key macroeconomic risks facing the Indian economy
        </p>
      </div>

      {/* Risk cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-5">
        {riskCards.map((card) => {
          const levelStyle = getRiskLevelStyle(card.riskLevel);

          return (
            <div
              key={card.title}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Top accent bar */}
              <div
                className="h-2"
                style={{
                  background: `linear-gradient(90deg, ${card.color} 0%, ${levelStyle.border} 100%)`,
                }}
              />

              {/* Card content */}
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{card.icon}</span>
                    <h3 className="text-[15px] font-bold text-gray-900">
                      {card.title}
                    </h3>
                  </div>

                  {/* Risk level badge */}
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wide"
                    style={{
                      backgroundColor: levelStyle.bg,
                      color: levelStyle.text,
                      border: `1px solid ${levelStyle.border}`,
                    }}
                  >
                    {card.riskLevel}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  {card.description}
                </p>

                {/* Contributing indicators */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-gray-700 mb-2">
                    Contributing Indicators
                  </div>
                  {card.indicators.map((ind, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-gray-600 truncate">
                          {ind.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[12px] font-semibold text-gray-900">
                          {ind.value}
                        </span>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor:
                              ind.status === "Heating"
                                ? "#FEE2E2"
                                : ind.status === "Cooling"
                                ? "#DBEAFE"
                                : ind.status === "Watch"
                                ? "#FEF3C7"
                                : "#F3F4F6",
                            color:
                              ind.status === "Heating"
                                ? "#DC2626"
                                : ind.status === "Cooling"
                                ? "#2563EB"
                                : ind.status === "Watch"
                                ? "#D97706"
                                : "#6B7280",
                          }}
                        >
                          {ind.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Methodology note */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0">📊</span>
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-1">
              Risk Assessment Methodology
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Risk levels are calculated using a rules-based model that considers historical
              thresholds, trends, and policy targets. High risk indicates immediate policy
              attention may be needed. Moderate risk suggests monitoring. Low risk indicates
              stable conditions. This is a simplified model for educational purposes and
              should not be used for investment decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
