"use client";

import type { LiveSource } from "@/lib/providers/hybrid";

interface DataSourceBadgeProps {
  source: LiveSource;
  size?: "sm" | "md";
}

const SOURCE_STYLES: Record<
  LiveSource,
  { bg: string; text: string; dot: string; label: string }
> = {
  MoSPI: {
    bg: "#ECFDF5",
    text: "#059669",
    dot: "#10B981",
    label: "MoSPI Live",
  },
  RBI: {
    bg: "#EFF6FF",
    text: "#2563EB",
    dot: "#3B82F6",
    label: "RBI Live",
  },
  NSE: {
    bg: "#FDF4FF",
    text: "#9333EA",
    dot: "#A855F7",
    label: "NSE Live",
  },
  Mock: {
    bg: "#F3F4F6",
    text: "#6B7280",
    dot: "#9CA3AF",
    label: "Mock",
  },
};

export function DataSourceBadge({ source, size = "sm" }: DataSourceBadgeProps) {
  const style = SOURCE_STYLES[source];
  const isLive = source !== "Mock";

  const fontSize = size === "sm" ? "9px" : "10px";
  const padding = size === "sm" ? "1px 5px" : "2px 7px";

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-semibold tracking-wide uppercase"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        fontSize,
        padding,
        border: `1px solid ${style.text}20`,
      }}
    >
      {/* Animated pulse dot for live sources */}
      <span
        className="relative flex"
        style={{ width: size === "sm" ? "5px" : "6px", height: size === "sm" ? "5px" : "6px" }}
      >
        {isLive && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-75"
            style={{ backgroundColor: style.dot }}
          />
        )}
        <span
          className="relative inline-flex rounded-full"
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: style.dot,
          }}
        />
      </span>
      {style.label}
    </span>
  );
}

interface SourceStatusBarProps {
  sources: Record<string, boolean | null>;
}

export function SourceStatusBar({ sources }: SourceStatusBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
        Data Sources:
      </span>
      {Object.entries(sources).map(([name, available]) => (
        <div key={name} className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor:
                available === true
                  ? "#10B981"
                  : available === false
                  ? "#EF4444"
                  : "#9CA3AF",
            }}
          />
          <span className="text-[10px] font-medium text-gray-600 uppercase">
            {name}
          </span>
          <span
            className="text-[9px]"
            style={{
              color:
                available === true
                  ? "#059669"
                  : available === false
                  ? "#DC2626"
                  : "#9CA3AF",
            }}
          >
            {available === true
              ? "Connected"
              : available === false
              ? "Offline"
              : "Pending"}
          </span>
        </div>
      ))}
    </div>
  );
}