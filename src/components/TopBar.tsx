"use client";

import { useRef, useEffect } from "react";

export type TimeRange = "1M" | "3M" | "1Y" | "5Y";
export type TabType = "All" | "My Watchlist" | "Latest Releases" | "Risk Dashboard";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TIME_RANGES: TimeRange[] = ["1M", "3M", "1Y", "5Y"];
const TABS: TabType[] = ["All", "My Watchlist", "Latest Releases", "Risk Dashboard"];

export function TopBar({
  searchQuery,
  onSearchChange,
  timeRange,
  onTimeRangeChange,
  activeTab,
  onTabChange,
}: TopBarProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" keyboard shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-6 flex items-center gap-4 shrink-0 flex-wrap" style={{ minHeight: "56px" }}>
      {/* App name */}
      <div className="font-bold text-base text-gray-900 flex items-center gap-1.5 mr-2">
        <span className="text-green-600">India</span> Macro Tracker
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-[320px]">
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder='Search indicators... (press "/")'
          className="w-full py-1.5 px-3 pl-8 rounded-lg border border-gray-200 text-[12.5px] bg-gray-50 text-gray-900 outline-none transition-colors focus:border-indigo-500"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">
          🔍
        </span>
      </div>

      {/* Time range selector */}
      <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5">
        {TIME_RANGES.map((range) => (
          <button
            key={range}
            onClick={() => onTimeRangeChange(range)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              timeRange === range
                ? "bg-white text-gray-900 shadow-sm"
                : "bg-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 ml-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all ${
              activeTab === tab
                ? "bg-gray-900 text-white"
                : "bg-transparent text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </header>
  );
}