"use client";

import { useState } from "react";
import { CATEGORY_MAP } from "@/lib/tokens";
import { Sparkline } from "./Sparkline";
import { DataSourceBadge } from "./DataSourceBadge";
import type { ProcessedIndicator, Status } from "@/lib/types";

interface IndicatorCardProps {
  indicator: ProcessedIndicator;
  isWatchlisted: boolean;
  onToggleWatchlist: (id: string) => void;
  onClick: (indicator: ProcessedIndicator) => void;
}

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, { bg: string; text: string; label: string }> = {
    Heating: { bg: "#FEE2E2", text: "#DC2626", label: "▲ Heating" },
    Cooling: { bg: "#DBEAFE", text: "#2563EB", label: "▼ Cooling" },
    Watch: { bg: "#FEF3C7", text: "#D97706", label: "⬤ Watch" },
    Neutral: { bg: "#F3F4F6", text: "#6B7280", label: "— Neutral" },
  };

  const s = styles[status];

  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide"
      style={{
        backgroundColor: s.bg,
        color: s.text,
      }}
    >
      {s.label}
    </span>
  );
}

function formatValue(value: number, unit: string): string {
  // Currency formatting
  if (unit === "₹" || unit === "₹/bbl" || unit === "₹/10g" || unit === "₹ Lakh Cr") {
    return `₹${value.toLocaleString("en-IN")}`;
  }

  // Billion dollars
  if (unit === "$ Bn") {
    return `$${value.toFixed(1)}B`;
  }

  // Regular numbers
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function getDisplayUnit(unit: string): string {
  // Don't show unit if it's already in the prefix
  if (["₹", "$ Bn", "₹/bbl", "₹/10g", "₹ Lakh Cr"].includes(unit)) {
    return "";
  }
  return unit;
}

export function IndicatorCard({
  indicator,
  isWatchlisted,
  onToggleWatchlist,
  onClick,
}: IndicatorCardProps) {
  const [hovered, setHovered] = useState(false);

  const cat = CATEGORY_MAP[indicator.category];
  const color = cat.color;
  const isPositive = indicator.change >= 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(indicator)}
      className="relative bg-white overflow-hidden cursor-pointer flex flex-col"
      style={{
        borderRadius: "14px",
        border: `1px solid ${hovered ? color + "40" : "#E5E7EB"}`,
        boxShadow: hovered
          ? `0 8px 24px ${color}15, 0 2px 8px rgba(0,0,0,0.06)`
          : "0 1px 4px rgba(0,0,0,0.04)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      {/* Left accent strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[5px]"
        style={{
          background: cat.gradient,
          borderRadius: "14px 0 0 14px",
        }}
      />

      {/* Card content */}
      <div className="flex-1 flex flex-col" style={{ padding: "18px 18px 14px 26px" }}>
        {/* Top row: icon badge + title + source */}
        <div className="flex items-start gap-2.5 mb-3">
          {/* Circular icon badge */}
          <div
            className="shrink-0 flex items-center justify-center text-base"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#FFFFFF",
              border: `2.5px solid ${color}`,
              boxShadow: `0 2px 8px ${color}20`,
            }}
          >
            {cat.icon}
          </div>

          {/* Title and metadata */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[13px] font-[650] text-gray-900 leading-tight">
                {indicator.name}
              </div>
              {/* Data source badge - shows if data is Mock or Live */}
              {indicator.liveSource && (
                <div className="shrink-0">
                  <DataSourceBadge source={indicator.liveSource} size="sm" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded tracking-wider uppercase"
                style={{
                  color: color,
                  backgroundColor: `${color}12`,
                }}
              >
                {indicator.source}
              </span>
              <span className="text-[9.5px] text-gray-400">
                {indicator.frequency}
              </span>
            </div>
          </div>
        </div>

        {/* Value + unit */}
        <div className="flex items-baseline gap-2 mb-1.5">
          <span
            className="text-[26px] font-bold text-gray-900 tracking-tight"
            style={{ letterSpacing: "-0.5px" }}
          >
            {formatValue(indicator.latestValue, indicator.unit)}
          </span>
          {getDisplayUnit(indicator.unit) && (
            <span className="text-[11px] text-gray-400">
              {getDisplayUnit(indicator.unit)}
            </span>
          )}
        </div>

        {/* Change indicators */}
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <span
            className="text-[11.5px] font-semibold"
            style={{ color: isPositive ? "#10B981" : "#EF4444" }}
          >
            {isPositive ? "▲" : "▼"} {Math.abs(indicator.change).toFixed(2)} (
            {Math.abs(indicator.changePct).toFixed(1)}%)
          </span>

          {indicator.forecastSurprise !== null &&
            indicator.forecastSurprise !== undefined && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{
                  color: indicator.forecastSurprise > 0 ? "#D97706" : "#6366F1",
                  backgroundColor:
                    indicator.forecastSurprise > 0 ? "#FEF3C7" : "#EEF2FF",
                }}
              >
                vs fcst: {indicator.forecastSurprise > 0 ? "+" : ""}
                {indicator.forecastSurprise.toFixed(2)}
              </span>
            )}

          <StatusBadge status={indicator.status} />
        </div>

        {/* Sparkline */}
        <div className="mb-2">
          <Sparkline data={indicator.series} color={color} height={36} />
        </div>

        {/* Footer */}
        <div
          className="flex justify-between items-center border-t border-gray-100 pt-2 mt-auto"
        >
          <div className="text-[9.5px] text-gray-400">
            Updated: {indicator.latestDate}
            {indicator.nextRelease && (
              <span> · Next: {indicator.nextRelease}</span>
            )}
          </div>

          {/* Quick actions */}
          <div
            className="flex gap-1 transition-opacity duration-200"
            style={{ opacity: hovered ? 1 : 0.3 }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist(indicator.id);
              }}
              className="p-0.5 text-sm hover:scale-110 transition-transform"
              style={{
                color: isWatchlisted ? "#F59E0B" : "#9CA3AF",
              }}
              title={
                isWatchlisted ? "Remove from watchlist" : "Add to watchlist"
              }
            >
              {isWatchlisted ? "★" : "☆"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="p-0.5 text-[13px] text-gray-400 hover:scale-110 transition-transform"
              title="Set alert"
            >
              🔔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}