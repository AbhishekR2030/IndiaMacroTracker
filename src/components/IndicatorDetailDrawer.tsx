"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CATEGORY_MAP } from "@/lib/tokens";
import type { ProcessedIndicator, Transform, Status } from "@/lib/types";

interface IndicatorDetailDrawerProps {
  indicator: ProcessedIndicator | null;
  isOpen: boolean;
  onClose: () => void;
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
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide"
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
  if (unit === "₹" || unit === "₹/bbl" || unit === "₹/10g" || unit === "₹ Lakh Cr") {
    return `₹${value.toLocaleString("en-IN")}`;
  }
  if (unit === "$ Bn") {
    return `$${value.toFixed(1)}B`;
  }
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function getDisplayUnit(unit: string): string {
  if (["₹", "$ Bn", "₹/bbl", "₹/10g", "₹ Lakh Cr"].includes(unit)) {
    return "";
  }
  return unit;
}

export function IndicatorDetailDrawer({
  indicator,
  isOpen,
  onClose,
}: IndicatorDetailDrawerProps) {
  const [activeTransform, setActiveTransform] = useState<Transform>("Level");

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!indicator) return null;

  const cat = CATEGORY_MAP[indicator.category];
  const color = cat.color;
  const isPositive = indicator.change >= 0;

  // Prepare chart data
  const chartData = indicator.series.map((d) => ({
    date: d.date,
    value: d.value,
  }));

  // Get last 12 observations for history table
  const historyData = [...indicator.series].reverse().slice(0, 12);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: isOpen ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0)",
          backdropFilter: isOpen ? "blur(4px)" : "blur(0px)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 bg-white shadow-2xl overflow-y-auto transition-transform duration-300 ease-in-out"
        style={{
          width: "580px",
          maxWidth: "90vw",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 bg-white border-b border-gray-200"
          style={{ padding: "20px 24px" }}
        >
          <div className="flex items-start gap-3">
            {/* Icon badge */}
            <div
              className="shrink-0 flex items-center justify-center text-lg"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "#FFFFFF",
                border: `2.5px solid ${color}`,
                boxShadow: `0 2px 8px ${color}25`,
              }}
            >
              {cat.icon}
            </div>

            {/* Title and metadata */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 leading-tight mb-1">
                {indicator.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span
                  className="font-semibold px-2 py-0.5 rounded"
                  style={{
                    color: color,
                    backgroundColor: `${color}12`,
                  }}
                >
                  {indicator.category}
                </span>
                <span>•</span>
                <span>{indicator.source}</span>
                <span>•</span>
                <span>{indicator.frequency}</span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Big value section */}
          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: `${color}08`,
              border: `1px solid ${color}20`,
            }}
          >
            <div className="grid grid-cols-3 gap-4 mb-3">
              {/* Current value */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Current</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatValue(indicator.latestValue, indicator.unit)}
                  {getDisplayUnit(indicator.unit) && (
                    <span className="text-xs text-gray-400 ml-1">
                      {getDisplayUnit(indicator.unit)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {indicator.latestDate}
                </div>
              </div>

              {/* Prior + change */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Prior</div>
                <div className="text-lg font-semibold text-gray-700">
                  {formatValue(indicator.prior, indicator.unit)}
                </div>
                <div
                  className="text-xs font-semibold mt-0.5"
                  style={{ color: isPositive ? "#10B981" : "#EF4444" }}
                >
                  {isPositive ? "▲" : "▼"} {Math.abs(indicator.change).toFixed(2)} (
                  {Math.abs(indicator.changePct).toFixed(1)}%)
                </div>
              </div>

              {/* Forecast + surprise */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Forecast</div>
                {indicator.forecast !== undefined ? (
                  <>
                    <div className="text-lg font-semibold text-gray-700">
                      {formatValue(indicator.forecast, indicator.unit)}
                    </div>
                    {indicator.forecastSurprise !== undefined && (
                      <div
                        className="text-xs font-semibold mt-0.5"
                        style={{
                          color: indicator.forecastSurprise > 0 ? "#D97706" : "#6366F1",
                        }}
                      >
                        {indicator.forecastSurprise > 0 ? "+" : ""}
                        {indicator.forecastSurprise.toFixed(2)} surprise
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-400">N/A</div>
                )}
              </div>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2">
              <StatusBadge status={indicator.status} />
              {indicator.nextRelease && (
                <span className="text-xs text-gray-500">
                  Next release: {indicator.nextRelease}
                </span>
              )}
            </div>
          </div>

          {/* Interactive chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Historical Data</h3>
              {/* Transform toggles */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {indicator.transformOptions.map((transform) => (
                  <button
                    key={transform}
                    onClick={() => setActiveTransform(transform)}
                    className="px-3 py-1 text-xs font-medium rounded transition-all"
                    style={{
                      backgroundColor:
                        activeTransform === transform ? color : "transparent",
                      color: activeTransform === transform ? "#FFFFFF" : "#6B7280",
                    }}
                  >
                    {transform}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="bg-gray-50 rounded-xl p-4" style={{ height: "280px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`gradient-${indicator.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    style={{ fontSize: "11px" }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        year: "2-digit",
                      });
                    }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    style={{ fontSize: "11px" }}
                    tickFormatter={(value) => value.toFixed(1)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: `1px solid ${color}40`,
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [
                      formatValue(value, indicator.unit),
                      "Value",
                    ]}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      });
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2.5}
                    fill={`url(#gradient-${indicator.id})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* History table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent History</h3>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">
                      Value
                    </th>
                    <th className="text-right py-2.5 px-3 font-semibold text-gray-700">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((item, idx) => {
                    const prevValue = historyData[idx + 1]?.value;
                    const change = prevValue ? item.value - prevValue : null;
                    const changePct = prevValue ? ((change! / prevValue) * 100) : null;

                    return (
                      <tr key={item.date} className="border-b border-gray-100 last:border-0">
                        <td className="py-2.5 px-3 text-gray-600">{item.date}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-gray-900">
                          {formatValue(item.value, indicator.unit)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {change !== null ? (
                            <span
                              className="font-medium"
                              style={{
                                color: change >= 0 ? "#10B981" : "#EF4444",
                              }}
                            >
                              {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)} (
                              {Math.abs(changePct!).toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* About section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">About this indicator</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              {indicator.description}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {indicator.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Alerts placeholder */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🔔</span>
              <h3 className="text-sm font-semibold text-gray-900">Alerts</h3>
              <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                Coming soon
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Set custom alerts based on thresholds, direction changes, or cooldown periods.
              Get notified via email or push notifications.
            </p>
          </div>

          {/* Notes placeholder */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">📝</span>
              <h3 className="text-sm font-semibold text-gray-900">Notes & Analysis</h3>
              <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                Coming soon
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Add your own notes, analysis, and insights to this indicator. Share with your
              team or keep them private.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}