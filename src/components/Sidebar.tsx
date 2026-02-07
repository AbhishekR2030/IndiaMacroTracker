"use client";

import { useState, useEffect } from "react";
import { CATEGORY_MAP, type Category } from "@/lib/tokens";

export type SidebarCategory = Category | "overview" | "settings" | "Calendar";

interface SidebarItem {
  id: SidebarCategory;
  label: string;
  icon: string;
  color?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "overview", label: "Overview", icon: "◎", color: "#5265B4" },
  { id: "Inflation", label: "Inflation", icon: "📊", color: CATEGORY_MAP.Inflation.color },
  { id: "Growth", label: "Growth", icon: "📈", color: CATEGORY_MAP.Growth.color },
  { id: "Labour", label: "Labour", icon: "👷", color: CATEGORY_MAP.Labour.color },
  { id: "Rates & Credit", label: "Rates & Credit", icon: "🏦", color: CATEGORY_MAP["Rates & Credit"].color },
  { id: "FX", label: "FX", icon: "💱", color: CATEGORY_MAP.FX.color },
  { id: "Liquidity & Money", label: "Liquidity", icon: "💧", color: CATEGORY_MAP["Liquidity & Money"].color },
  { id: "External Sector", label: "External", icon: "🌍", color: CATEGORY_MAP["External Sector"].color },
  { id: "Markets", label: "Markets", icon: "📉", color: CATEGORY_MAP.Markets.color },
  { id: "Fiscal", label: "Fiscal", icon: "🏛️", color: CATEGORY_MAP.Fiscal.color },
  { id: "Calendar", label: "Calendar", icon: "📅", color: "#A3B6C9" },
  { id: "settings", label: "Settings", icon: "⚙️", color: "#6B7280" },
];

interface SidebarProps {
  activeCategory: SidebarCategory;
  onCategoryChange: (category: SidebarCategory) => void;
}

export function Sidebar({ activeCategory, onCategoryChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  const sidebarWidth = collapsed ? "60px" : "210px";

  return (
    <aside
      className="flex flex-col bg-white border-r border-gray-200 shrink-0 relative z-10"
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Logo area */}
      <div
        className="flex items-center gap-2.5 border-b border-gray-200"
        style={{
          padding: collapsed ? "16px 8px" : "16px 16px",
          minHeight: "56px",
        }}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-indigo-600 flex items-center justify-center text-white text-[15px] font-bold shrink-0">
          ₹
        </div>
        {!collapsed && (
          <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
            India Macro
          </span>
        )}
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto p-1.5">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = activeCategory === item.id;
          const color = item.color || "#5265B4";

          return (
            <button
              key={item.id}
              onClick={() => onCategoryChange(item.id)}
              title={collapsed ? item.label : undefined}
              className="w-full flex items-center gap-2.5 mb-0.5 border-l-[3px] rounded-lg transition-all duration-150"
              style={{
                padding: collapsed ? "10px 0" : "9px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                backgroundColor: isActive ? `${color}10` : "transparent",
                borderLeftColor: isActive ? color : "transparent",
                color: isActive ? color : "#6B7280",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <span className="text-base leading-none shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="text-[13px] whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapsed}
        className="p-3 border-t border-gray-200 bg-transparent text-gray-400 text-base flex justify-center hover:text-gray-600 transition-colors"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "▸" : "◂"}
      </button>
    </aside>
  );
}