"use client";

import { RefreshCw } from "lucide-react";

interface RefreshControlProps {
  isRefreshing: boolean;
  isEnabled: boolean;
  lastRefreshTime: Date | null;
  nextRefreshIn: number;
  onToggle: () => void;
  onRefreshNow: () => Promise<void>;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function RefreshControl({
  isRefreshing,
  isEnabled,
  lastRefreshTime,
  nextRefreshIn,
  onToggle,
  onRefreshNow,
}: RefreshControlProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Last refresh time */}
      {lastRefreshTime && (
        <span className="text-[10px] text-gray-400">
          Updated {formatTime(lastRefreshTime)}
        </span>
      )}

      {/* Next refresh countdown */}
      {isEnabled && !isRefreshing && (
        <span className="text-[10px] text-gray-400">
          Next: {formatCountdown(nextRefreshIn)}
        </span>
      )}

      {/* Refresh button */}
      <button
        onClick={onRefreshNow}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:bg-gray-100 disabled:opacity-50"
        style={{
          color: isRefreshing ? "#9CA3AF" : "#374151",
        }}
        title={isRefreshing ? "Refreshing..." : "Refresh now"}
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
        />
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>

      {/* Auto-refresh toggle */}
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
        style={{
          backgroundColor: isEnabled ? "#ECFDF5" : "#F3F4F6",
          color: isEnabled ? "#059669" : "#6B7280",
          border: `1px solid ${isEnabled ? "#A7F3D0" : "#E5E7EB"}`,
        }}
        title={isEnabled ? "Disable auto-refresh" : "Enable auto-refresh"}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: isEnabled ? "#10B981" : "#9CA3AF",
          }}
        />
        Auto
      </button>
    </div>
  );
}