"use client";

import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Sidebar, type SidebarCategory } from "@/components/Sidebar";
import { TopBar, type TimeRange, type TabType } from "@/components/TopBar";
import { CardGrid } from "@/components/CardGrid";
import { IndicatorCard } from "@/components/IndicatorCard";
import { IndicatorDetailDrawer } from "@/components/IndicatorDetailDrawer";
import { CalendarView } from "@/components/CalendarView";
import { RiskDashboard } from "@/components/RiskDashboard";
import { dataProvider } from "@/lib/providers";
import { processIndicator, filterBySearch, sortByLatestRelease } from "@/lib/utils";
import type { ProcessedIndicator } from "@/lib/types";

export default function Home() {
  // State
  const [activeCategory, setActiveCategory] = useState<SidebarCategory>("overview");
  const [activeTab, setActiveTab] = useState<TabType>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("1Y");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [indicators, setIndicators] = useState<ProcessedIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndicator, setSelectedIndicator] = useState<ProcessedIndicator | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        const allIndicators = await dataProvider.getIndicators();

        // Process each indicator with its data
        const processed = await Promise.all(
          allIndicators.map(async (ind) => {
            const series = await dataProvider.getSeries(ind.id);
            const latest = await dataProvider.getLatest(ind.id);
            const nextRelease = await dataProvider.getNextRelease(ind.id);

            return processIndicator(ind, series, latest, nextRelease);
          })
        );

        setIndicators(processed);
      } catch (error) {
        console.error("Failed to load indicators:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("watchlist");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setWatchlist(parsed);
        }
      } catch (e) {
        console.error("Failed to parse watchlist:", e);
      }
    }
  }, []);

  // Save watchlist to localStorage
  useEffect(() => {
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  // Toggle watchlist
  const toggleWatchlist = (id: string) => {
    setWatchlist((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Filter indicators
  const filteredIndicators = useMemo(() => {
    let result = indicators;

    // Filter by tab
    if (activeTab === "My Watchlist") {
      result = result.filter((ind) => watchlist.includes(ind.id));
    } else if (activeTab === "Latest Releases") {
      result = sortByLatestRelease(result).slice(0, 16);
    }

    // Filter by category
    if (
      activeCategory !== "overview" &&
      activeCategory !== "settings" &&
      activeCategory !== "Calendar"
    ) {
      result = result.filter((ind) => ind.category === activeCategory);
    }

    // Filter by search
    result = filterBySearch(result, searchQuery);

    return result;
  }, [indicators, activeCategory, activeTab, searchQuery, watchlist]);

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">
            Loading India Macro Tracker...
          </div>
          <div className="text-sm text-gray-500">
            Fetching 34 macroeconomic indicators
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      }
      topBar={
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      }
    >
      {/* Category header */}
      {activeCategory !== "overview" &&
        activeCategory !== "settings" &&
        activeCategory !== "Calendar" && (
          <div className="mb-4 flex items-center gap-2.5">
            <span className="text-[22px]">
              {activeCategory === "Inflation" && "📊"}
              {activeCategory === "Growth" && "📈"}
              {activeCategory === "Labour" && "👷"}
              {activeCategory === "Rates & Credit" && "🏦"}
              {activeCategory === "FX" && "💱"}
              {activeCategory === "Liquidity & Money" && "💧"}
              {activeCategory === "External Sector" && "🌍"}
              {activeCategory === "Markets" && "📉"}
              {activeCategory === "Fiscal" && "🏛️"}
            </span>
            <h2 className="text-xl font-bold text-gray-900">
              {activeCategory}
            </h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {filteredIndicators.length} indicators
            </span>
          </div>
        )}

      {/* Overview header */}
      {activeCategory === "overview" && activeTab !== "Risk Dashboard" && (
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {activeTab === "My Watchlist"
              ? "⭐ My Watchlist"
              : activeTab === "Latest Releases"
              ? "🕐 Latest Releases"
              : "◎ Overview"}
          </h2>
          <p className="text-[13px] text-gray-500">
            {activeTab === "My Watchlist"
              ? `${watchlist.length} indicators tracked`
              : "All Indian macro indicators at a glance"}
          </p>
        </div>
      )}

      {/* Settings view */}
      {activeCategory === "settings" ? (
        <div className="max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ Settings</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-[13px] font-semibold text-gray-900 mb-2">
              Data Settings
            </div>
            <div className="text-xs text-gray-500 mb-4">
              Configure data sources, API keys, and refresh intervals. Coming soon in the live version.
            </div>
            <div className="text-[13px] font-semibold text-gray-900 mb-2">
              Notifications
            </div>
            <div className="text-xs text-gray-500 mb-4">
              Email and push alert preferences. Coming soon.
            </div>
            <div className="text-[13px] font-semibold text-gray-900 mb-2">
              Watchlist
            </div>
            <div className="text-xs text-gray-500">
              You have {watchlist.length} indicators in your watchlist.
            </div>
          </div>
        </div>
      ) : activeCategory === "Calendar" ? (
        <CalendarView />
      ) : activeTab === "Risk Dashboard" ? (
        <RiskDashboard indicators={indicators} />
      ) : (
        /* Card Grid */
        <>
          {filteredIndicators.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📭</div>
              <div className="text-sm font-medium text-gray-900">
                {activeTab === "My Watchlist"
                  ? "No indicators in your watchlist yet. Click ☆ on any card to add."
                  : "No indicators match your search."}
              </div>
            </div>
          ) : (
            <CardGrid>
              {filteredIndicators.map((ind) => (
                <IndicatorCard
                  key={ind.id}
                  indicator={ind}
                  isWatchlisted={watchlist.includes(ind.id)}
                  onToggleWatchlist={toggleWatchlist}
                  onClick={(indicator) => {
                    setSelectedIndicator(indicator);
                    setIsDrawerOpen(true);
                  }}
                />
              ))}
            </CardGrid>
          )}
        </>
      )}

      {/* Indicator Detail Drawer */}
      <IndicatorDetailDrawer
        indicator={selectedIndicator}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedIndicator(null);
        }}
      />
    </AppShell>
  );
}