"use client";

import { CATEGORY_MAP } from "@/lib/tokens";
import type { Category } from "@/lib/tokens";

interface CalendarEvent {
  date: string;
  label: string;
  source: string;
  category: Category;
  time?: string;
}

// Upcoming data releases for 2026
const upcomingReleases: CalendarEvent[] = [
  {
    date: "2026-02-12",
    label: "CPI Inflation (January)",
    source: "MoSPI",
    category: "Inflation",
  },
  {
    date: "2026-02-14",
    label: "WPI Inflation (January)",
    source: "MoSPI",
    category: "Inflation",
  },
  {
    date: "2026-02-28",
    label: "GDP Growth (Q3 FY26)",
    source: "MoSPI",
    category: "Growth",
  },
  {
    date: "2026-03-07",
    label: "RBI MPC Policy Decision",
    source: "RBI",
    category: "Rates & Credit",
    time: "10:00 AM IST",
  },
  {
    date: "2026-03-09",
    label: "RBI MPC Minutes Released",
    source: "RBI",
    category: "Rates & Credit",
  },
  {
    date: "2026-03-12",
    label: "IIP Growth (January)",
    source: "MoSPI",
    category: "Growth",
  },
  {
    date: "2026-03-12",
    label: "CPI Inflation (February)",
    source: "MoSPI",
    category: "Inflation",
  },
  {
    date: "2026-03-14",
    label: "WPI Inflation (February)",
    source: "MoSPI",
    category: "Inflation",
  },
];

function formatEventDate(dateStr: string): { day: string; month: string; dayOfWeek: string } {
  const date = new Date(dateStr);
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString("en-US", { month: "short" }),
    dayOfWeek: date.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

function getRelativeDateLabel(dateStr: string): string {
  const eventDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);

  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return "";
}

export function CalendarView() {
  // Sort events by date
  const sortedEvents = [...upcomingReleases].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          📅 Data Release Calendar
        </h2>
        <p className="text-[13px] text-gray-500">
          Upcoming releases for Indian macroeconomic indicators
        </p>
      </div>

      {/* Event list */}
      <div className="space-y-3">
        {sortedEvents.map((event, idx) => {
          const dateInfo = formatEventDate(event.date);
          const cat = CATEGORY_MAP[event.category];
          const color = cat.color;
          const relativeLabel = getRelativeDateLabel(event.date);

          return (
            <div
              key={`${event.date}-${idx}`}
              className="relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Left accent strip */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[5px]"
                style={{
                  background: cat.gradient,
                }}
              />

              <div className="flex items-center gap-4 p-4 pl-6">
                {/* Date box */}
                <div
                  className="shrink-0 flex flex-col items-center justify-center rounded-lg"
                  style={{
                    width: "70px",
                    height: "70px",
                    backgroundColor: `${color}10`,
                    border: `1.5px solid ${color}30`,
                  }}
                >
                  <div
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: color }}
                  >
                    {dateInfo.month}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {dateInfo.day}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase">
                    {dateInfo.dayOfWeek}
                  </div>
                </div>

                {/* Event details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-[14px] font-semibold text-gray-900 leading-tight">
                      {event.label}
                    </h3>
                    {relativeLabel && (
                      <span
                        className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full"
                        style={{
                          backgroundColor:
                            relativeLabel === "Today"
                              ? "#FEE2E2"
                              : relativeLabel === "Tomorrow"
                              ? "#FEF3C7"
                              : "#F3F4F6",
                          color:
                            relativeLabel === "Today"
                              ? "#DC2626"
                              : relativeLabel === "Tomorrow"
                              ? "#D97706"
                              : "#6B7280",
                        }}
                      >
                        {relativeLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category badge */}
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded tracking-wider uppercase"
                      style={{
                        color: color,
                        backgroundColor: `${color}12`,
                      }}
                    >
                      {event.category}
                    </span>

                    {/* Source */}
                    <span className="text-xs text-gray-500">
                      Source: {event.source}
                    </span>

                    {/* Time if available */}
                    {event.time && (
                      <>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-500">{event.time}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Icon */}
                <div
                  className="shrink-0 flex items-center justify-center text-lg"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#FFFFFF",
                    border: `2px solid ${color}`,
                    boxShadow: `0 2px 6px ${color}20`,
                  }}
                >
                  {cat.icon}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0">ℹ️</span>
          <div>
            <div className="text-sm font-semibold text-blue-900 mb-1">
              Release Schedule Notes
            </div>
            <p className="text-xs text-blue-700 leading-relaxed">
              Release dates are indicative and subject to change by source agencies. Monthly
              indicators are typically released 2-3 weeks after month-end. Quarterly
              indicators follow a 6-8 week lag. Subscribe to alerts to get notified of
              actual releases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}