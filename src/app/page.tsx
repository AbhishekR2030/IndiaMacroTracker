"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Sidebar, type SidebarCategory } from "@/components/Sidebar";
import { TopBar, type TimeRange, type TabType } from "@/components/TopBar";
import { CardGrid } from "@/components/CardGrid";
import { IndicatorCard } from "@/components/IndicatorCard";
import { IndicatorDetailDrawer } from "@/components/IndicatorDetailDrawer";
import { CalendarView } from "@/components/CalendarView";
import { RiskDashboard } from "@/components/RiskDashboard";
import { SourceStatusBar } from "@/components/DataSourceBadge";
import { RefreshControl } from "@/components/RefreshControl";
import { dataProvider } from "@/lib/providers";
import { getSourceStatuses, getDataSource } from "@/lib/providers/hybrid";
import { processIndicator, filterBySearch, sortByLatestRelease } from "@/lib/utils";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import type { ProcessedIndicator, Status } from "@/lib/types";

export default function Home() {
  // State
  const [activeCategory, setActiveCategory] = useState<SidebarCategory>("overview");
  const [activeTab, setActiveTab] = useState<TabType>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("1Y");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [indicators, setIndicators] = useState<ProcessedIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<ProcessedIndicator | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sourceStatuses, setSourceStatuses] = useState<Record<string, boolean | null>>({
    mospi: null,
    rbi: null,
    nse: null,
  });

  // Data loading function (reusable for refresh)
  const loadData = useCallback(async () => {
    setError(null);
    const timeout = setTimeout(() => {
      console.warn("⚠️ Data loading is taking longer than expected. The app may be experiencing network issues.");
    }, 10000); // Warn after 10 seconds

    // Absolute timeout - if data doesn't load in 30 seconds, show error
    const abortTimeout = setTimeout(() => {
      setError("Data loading timed out. Using fallback mock data.");
      setLoading(false);
    }, 30000);

    try {
      const allIndicators = await dataProvider.getIndicators();

      const processed = await Promise.all(
        allIndicators.map(async (ind) => {
          try {
            const series = await dataProvider.getSeries(ind.id);
            const latest = await dataProvider.getLatest(ind.id);
            const nextRelease = await dataProvider.getNextRelease(ind.id);

            const processedInd = await processIndicator(ind, series, latest, nextRelease);

            // Capture which live source was actually used (for hybrid mode)
            try {
              const liveSource = getDataSource(ind.id);
              return { ...processedInd, liveSource };
            } catch {
              // getDataSource may not be available in pure mock mode
              return processedInd;
            }
          } catch (indError) {
            console.error(`Error processing indicator ${ind.id}:`, indError);
            // Return a basic processed indicator with error state
            return {
              ...ind,
              latestValue: 0,
              latestDate: new Date().toISOString().split('T')[0],
              prior: 0,
              change: 0,
              changePct: 0,
              status: "Neutral" as Status,
              series: [],
              liveSource: "Mock" as const,
            };
          }
        })
      );

      clearTimeout(timeout);
      clearTimeout(abortTimeout);

      setIndicators(processed);

      // Update source statuses after data load
      try {
        setSourceStatuses(getSourceStatuses());
      } catch {
        // getSourceStatuses may not be available in mock mode
      }
    } catch (error) {
      clearTimeout(timeout);
      clearTimeout(abortTimeout);
      console.error("Failed to load indicators:", error);
      setError(error instanceof Error ? error.message : "Failed to load data");
    } finally {
      clearTimeout(timeout);
      clearTimeout(abortTimeout);
      setLoading(false);
    }
  }, []);

  // Auto-refresh hook
  const {
    isRefreshing,
    lastRefreshTime,
    nextRefreshIn,
    isEnabled: autoRefreshEnabled,
    toggle: toggleAutoRefresh,
    refreshNow,
  } = useAutoRefresh({
    interval: 5 * 60 * 1000, // 5 minutes
    enabled: false, // Disabled by default, user can enable
    onRefresh: loadData,
  });

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

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
          {/* Loading skeleton */}
          <div className="mt-6 flex justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-3 h-3 bg-gray-300 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <div className="mt-4 text-xs text-gray-400">
            This may take a moment on first load...
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-xl font-bold text-gray-900 mb-2">
            Failed to Load Data
          </div>
          <div className="text-sm text-gray-600 mb-6">
            {error}
          </div>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              loadData();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
          <div className="mt-4 text-xs text-gray-500">
            If this persists, please check your network connection or try again later.
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
      {/* Source status bar */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <SourceStatusBar sources={sourceStatuses} />
        <RefreshControl
          isRefreshing={isRefreshing}
          isEnabled={autoRefreshEnabled}
          lastRefreshTime={lastRefreshTime}
          nextRefreshIn={nextRefreshIn}
          onToggle={toggleAutoRefresh}
          onRefreshNow={refreshNow}
        />
      </div>

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
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <div className="text-[13px] font-semibold text-gray-900 mb-2">
                Data Sources
              </div>
              <div className="text-xs text-gray-500 mb-3">
                Current data provider: <span className="font-semibold text-gray-700">{process.env.NEXT_PUBLIC_DATA_SOURCE || "mock"}</span>
              </div>
              <div className="space-y-2">
                {Object.entries(sourceStatuses).map(([name, status]) => (
                  <div key={name} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                    <span className="text-xs font-medium text-gray-700 uppercase">{name}</span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: status === true ? "#ECFDF5" : status === false ? "#FEF2F2" : "#F3F4F6",
                        color: status === true ? "#059669" : status === false ? "#DC2626" : "#6B7280",
                      }}
                    >
                      {status === true ? "Connected" : status === false ? "Offline" : "Not checked"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-gray-900 mb-2">
                Auto-Refresh
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {autoRefreshEnabled
                  ? `Auto-refresh is enabled (every 5 minutes). Next refresh in ${Math.floor(nextRefreshIn / 60)}m ${nextRefreshIn % 60}s.`
                  : "Auto-refresh is disabled. Enable it to get automatic data updates."}
              </div>
              <button
                onClick={toggleAutoRefresh}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{
                  backgroundColor: autoRefreshEnabled ? "#FEF2F2" : "#ECFDF5",
                  color: autoRefreshEnabled ? "#DC2626" : "#059669",
                }}
              >
                {autoRefreshEnabled ? "Disable Auto-Refresh" : "Enable Auto-Refresh"}
              </button>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-gray-900 mb-2">
                Notifications
              </div>
              <div className="text-xs text-gray-500">
                Email and push alert preferences. Coming soon.
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-gray-900 mb-2">
                Watchlist
              </div>
              <div className="text-xs text-gray-500">
                You have {watchlist.length} indicators in your watchlist.
              </div>
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