import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// ─── DESIGN TOKENS ────────────────────────────────────────────────
const COLORS = {
  deepGreen: "#109750",
  coral: "#CE593A",
  indigo: "#5265B4",
  steelBlue: "#A3B6C9",
  magenta: "#B837AA",
  lime: "#C1C240",
  surface: "#FDFDFD",
  surfaceMuted: "#EFEFEF",
  textPrimary: "#1A1D23",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  border: "#E5E7EB",
  white: "#FFFFFF",
};

const CATEGORY_MAP = {
  Inflation: { color: "#5265B4", icon: "📊", gradient: "linear-gradient(180deg, #5265B4 0%, #A3B6C9 100%)" },
  Growth: { color: "#CE593A", icon: "📈", gradient: "linear-gradient(180deg, #CE593A 0%, #E8A090 100%)" },
  Labour: { color: "#B837AA", icon: "👷", gradient: "linear-gradient(180deg, #B837AA 0%, #D48BCC 100%)" },
  "Rates & Credit": { color: "#109750", icon: "🏦", gradient: "linear-gradient(180deg, #109750 0%, #A3B6C9 100%)" },
  "Liquidity & Money": { color: "#C1C240", icon: "💧", gradient: "linear-gradient(180deg, #C1C240 0%, #D8D88A 100%)" },
  "External Sector": { color: "#A3B6C9", icon: "🌍", gradient: "linear-gradient(180deg, #A3B6C9 0%, #C9D6E3 100%)" },
  Markets: { color: "#B837AA", icon: "📉", gradient: "linear-gradient(180deg, #B837AA 0%, #A3B6C9 100%)" },
  Fiscal: { color: "#CE593A", icon: "🏛️", gradient: "linear-gradient(180deg, #CE593A 0%, #A3B6C9 100%)" },
  FX: { color: "#109750", icon: "💱", gradient: "linear-gradient(180deg, #109750 0%, #6BC490 100%)" },
  Calendar: { color: "#A3B6C9", icon: "📅", gradient: "linear-gradient(180deg, #A3B6C9 0%, #C9D6E3 100%)" },
};

// ─── MOCK DATA ────────────────────────────────────────────────────
function generateSeries(base, volatility, count = 24, trend = 0) {
  const arr = [];
  let val = base;
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    val += (Math.random() - 0.48) * volatility + trend;
    arr.push({ date: d.toISOString().slice(0, 7), value: parseFloat(val.toFixed(2)) });
  }
  return arr;
}

function getStatus(change) {
  if (change > 0.3) return "Heating";
  if (change < -0.3) return "Cooling";
  if (Math.abs(change) > 0.15) return "Watch";
  return "Neutral";
}

const INDICATORS = [
  // Inflation
  { id: "cpi-headline", name: "CPI Headline (YoY)", category: "Inflation", unit: "%", frequency: "Monthly", source: "MoSPI", description: "Consumer Price Index headline inflation rate, all-India", series: generateSeries(4.8, 0.3, 24), forecast: 4.5, nextRelease: "2026-03-14" },
  { id: "cpi-core", name: "CPI Core (YoY)", category: "Inflation", unit: "%", frequency: "Monthly", source: "MoSPI", description: "CPI excluding food & fuel", series: generateSeries(4.2, 0.2, 24), forecast: 4.1, nextRelease: "2026-03-14" },
  { id: "wpi", name: "WPI (YoY)", category: "Inflation", unit: "%", frequency: "Monthly", source: "DPIIT", description: "Wholesale Price Index inflation", series: generateSeries(1.8, 0.5, 24), forecast: 2.0, nextRelease: "2026-03-14" },
  { id: "cpi-food", name: "CPI Food (YoY)", category: "Inflation", unit: "%", frequency: "Monthly", source: "MoSPI", description: "Consumer food price inflation", series: generateSeries(6.2, 0.8, 24), forecast: 5.8, nextRelease: "2026-03-14" },
  // Growth
  { id: "gdp-yoy", name: "GDP Growth (YoY)", category: "Growth", unit: "%", frequency: "Quarterly", source: "MoSPI", description: "Gross Domestic Product real growth rate", series: generateSeries(6.7, 0.4, 12, 0.05), forecast: 6.5, nextRelease: "2026-05-31" },
  { id: "iip", name: "IIP Growth (YoY)", category: "Growth", unit: "%", frequency: "Monthly", source: "MoSPI", description: "Index of Industrial Production growth", series: generateSeries(4.5, 1.2, 24), forecast: 4.8, nextRelease: "2026-03-12" },
  { id: "pmi-mfg", name: "PMI Manufacturing", category: "Growth", unit: "Index", frequency: "Monthly", source: "S&P Global", description: "Purchasing Managers Index - Manufacturing", series: generateSeries(56.5, 1.5, 24), forecast: 57.0, nextRelease: "2026-03-03" },
  { id: "pmi-services", name: "PMI Services", category: "Growth", unit: "Index", frequency: "Monthly", source: "S&P Global", description: "Purchasing Managers Index - Services", series: generateSeries(58.2, 1.2, 24), forecast: 58.5, nextRelease: "2026-03-05" },
  { id: "gst-collections", name: "GST Collections", category: "Growth", unit: "₹ Lakh Cr", frequency: "Monthly", source: "MoF", description: "Goods & Services Tax monthly gross collections", series: generateSeries(1.72, 0.08, 24, 0.015), forecast: 1.85, nextRelease: "2026-03-01" },
  // Labour
  { id: "unemployment", name: "Unemployment Rate", category: "Labour", unit: "%", frequency: "Monthly", source: "CMIE", description: "Urban+Rural unemployment rate from CMIE CPHS", series: generateSeries(7.8, 0.6, 24, -0.02), forecast: 7.5, nextRelease: "2026-03-15" },
  { id: "lfpr", name: "Labour Force Participation", category: "Labour", unit: "%", frequency: "Quarterly", source: "PLFS", description: "Labour Force Participation Rate (15+ years)", series: generateSeries(41.2, 0.5, 12), forecast: null, nextRelease: "2026-06-30" },
  { id: "employment-rate", name: "Employment Rate", category: "Labour", unit: "%", frequency: "Monthly", source: "CMIE", description: "Worker population ratio", series: generateSeries(37.5, 0.4, 24), forecast: null, nextRelease: "2026-03-15" },
  // Rates & Credit
  { id: "repo-rate", name: "RBI Repo Rate", category: "Rates & Credit", unit: "%", frequency: "Bi-monthly", source: "RBI", description: "RBI policy repo rate", series: generateSeries(6.5, 0.0, 12).map((d, i) => ({ ...d, value: i > 9 ? 6.25 : 6.5 })), forecast: 6.0, nextRelease: "2026-04-09" },
  { id: "gsec-10y", name: "G-Sec 10Y Yield", category: "Rates & Credit", unit: "%", frequency: "Daily", source: "CCIL/RBI", description: "10-year Government Security benchmark yield", series: generateSeries(6.85, 0.08, 24, -0.01), forecast: null, nextRelease: null },
  { id: "gsec-2y", name: "G-Sec 2Y Yield", category: "Rates & Credit", unit: "%", frequency: "Daily", source: "CCIL/RBI", description: "2-year Government Security yield", series: generateSeries(6.55, 0.06, 24, -0.01), forecast: null, nextRelease: null },
  { id: "bank-credit", name: "Bank Credit Growth", category: "Rates & Credit", unit: "% YoY", frequency: "Bi-weekly", source: "RBI", description: "Scheduled Commercial Banks credit growth", series: generateSeries(15.5, 0.8, 24, -0.1), forecast: null, nextRelease: "2026-03-07" },
  { id: "walr", name: "WALR (Fresh Loans)", category: "Rates & Credit", unit: "%", frequency: "Monthly", source: "RBI", description: "Weighted Average Lending Rate on fresh rupee loans", series: generateSeries(9.2, 0.1, 24, -0.02), forecast: null, nextRelease: "2026-03-28" },
  // FX
  { id: "usdinr", name: "USD/INR", category: "FX", unit: "₹", frequency: "Daily", source: "RBI", description: "USD/INR reference rate", series: generateSeries(83.5, 0.3, 24, 0.08), forecast: null, nextRelease: null },
  { id: "reer", name: "REER (36-currency)", category: "FX", unit: "Index", frequency: "Monthly", source: "RBI", description: "Real Effective Exchange Rate (36-currency basket)", series: generateSeries(104.5, 0.8, 24), forecast: null, nextRelease: "2026-03-15" },
  // Liquidity & Money
  { id: "laf-liquidity", name: "LAF Net Liquidity", category: "Liquidity & Money", unit: "₹ Lakh Cr", frequency: "Daily", source: "RBI", description: "Liquidity Adjustment Facility net position", series: generateSeries(-0.5, 0.4, 24), forecast: null, nextRelease: null },
  { id: "m3-growth", name: "M3 Growth (YoY)", category: "Liquidity & Money", unit: "%", frequency: "Bi-weekly", source: "RBI", description: "Broad money supply growth", series: generateSeries(10.8, 0.4, 24), forecast: null, nextRelease: "2026-03-07" },
  { id: "deposits-growth", name: "Bank Deposits Growth", category: "Liquidity & Money", unit: "% YoY", frequency: "Bi-weekly", source: "RBI", description: "Aggregate deposits growth of SCBs", series: generateSeries(12.5, 0.5, 24), forecast: null, nextRelease: "2026-03-07" },
  // External Sector
  { id: "trade-balance", name: "Trade Balance", category: "External Sector", unit: "$ Bn", frequency: "Monthly", source: "MoCI", description: "Merchandise trade balance", series: generateSeries(-22.5, 2.5, 24), forecast: -21.0, nextRelease: "2026-03-15" },
  { id: "current-account", name: "Current Account (% GDP)", category: "External Sector", unit: "%", frequency: "Quarterly", source: "RBI", description: "Current account balance as share of GDP", series: generateSeries(-1.2, 0.3, 12), forecast: -1.0, nextRelease: "2026-06-30" },
  { id: "fx-reserves", name: "FX Reserves", category: "External Sector", unit: "$ Bn", frequency: "Weekly", source: "RBI", description: "India's foreign exchange reserves", series: generateSeries(620, 8, 24, 2), forecast: null, nextRelease: "2026-02-14" },
  // Markets
  { id: "nifty50", name: "Nifty 50", category: "Markets", unit: "Index", frequency: "Daily", source: "NSE", description: "NSE Nifty 50 index", series: generateSeries(22500, 400, 24, 120), forecast: null, nextRelease: null },
  { id: "sensex", name: "Sensex", category: "Markets", unit: "Index", frequency: "Daily", source: "BSE", description: "BSE Sensex 30 index", series: generateSeries(74000, 1200, 24, 400), forecast: null, nextRelease: null },
  { id: "nifty-bank", name: "Nifty Bank", category: "Markets", unit: "Index", frequency: "Daily", source: "NSE", description: "NSE Bank Nifty index", series: generateSeries(47000, 800, 24, 200), forecast: null, nextRelease: null },
  { id: "india-vix", name: "India VIX", category: "Markets", unit: "Index", frequency: "Daily", source: "NSE", description: "India Volatility Index", series: generateSeries(13.5, 1.5, 24), forecast: null, nextRelease: null },
  { id: "brent", name: "Brent Crude (INR)", category: "Markets", unit: "₹/bbl", frequency: "Daily", source: "ICE/RBI", description: "Brent crude oil price in INR terms", series: generateSeries(6800, 300, 24, 20), forecast: null, nextRelease: null },
  { id: "gold-inr", name: "Gold (INR)", category: "Markets", unit: "₹/10g", frequency: "Daily", source: "MCX/IBJA", description: "Gold price per 10 grams in INR", series: generateSeries(62000, 1500, 24, 600), forecast: null, nextRelease: null },
  // Fiscal
  { id: "fiscal-deficit", name: "Fiscal Deficit (FYTD)", category: "Fiscal", unit: "% of BE", frequency: "Monthly", source: "CGA", description: "Fiscal deficit as % of Budget Estimate, fiscal year to date", series: generateSeries(55, 5, 12), forecast: null, nextRelease: "2026-03-31" },
  { id: "tax-collections", name: "Gross Tax Collections", category: "Fiscal", unit: "₹ Lakh Cr", frequency: "Monthly", source: "MoF", description: "Gross tax revenue collections FYTD", series: generateSeries(18.5, 0.8, 12, 0.3), forecast: null, nextRelease: "2026-03-31" },
  { id: "debt-gdp", name: "Debt-to-GDP", category: "Fiscal", unit: "%", frequency: "Annual", source: "MoF", description: "General government debt as share of GDP", series: generateSeries(82, 0.5, 8, -0.3), forecast: null, nextRelease: "2026-07-31" },
];

// Process indicators with computed fields
const processedIndicators = INDICATORS.map(ind => {
  const latest = ind.series[ind.series.length - 1];
  const prior = ind.series[ind.series.length - 2];
  const change = latest.value - prior.value;
  const changePct = ((change / Math.abs(prior.value)) * 100);
  const forecastSurprise = ind.forecast ? latest.value - ind.forecast : null;
  return {
    ...ind,
    latestValue: latest.value,
    latestDate: latest.date,
    prior: prior.value,
    change,
    changePct,
    forecast: ind.forecast,
    forecastSurprise,
    status: getStatus(changePct),
  };
});

// ─── SIDEBAR CATEGORIES ────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { id: "overview", label: "Overview", icon: "◎" },
  { id: "Inflation", label: "Inflation", icon: "📊" },
  { id: "Growth", label: "Growth", icon: "📈" },
  { id: "Labour", label: "Labour", icon: "👷" },
  { id: "Rates & Credit", label: "Rates & Credit", icon: "🏦" },
  { id: "FX", label: "FX", icon: "💱" },
  { id: "Liquidity & Money", label: "Liquidity", icon: "💧" },
  { id: "External Sector", label: "External", icon: "🌍" },
  { id: "Markets", label: "Markets", icon: "📉" },
  { id: "Fiscal", label: "Fiscal", icon: "🏛️" },
  { id: "Calendar", label: "Calendar", icon: "📅" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

// ─── STATUS BADGE ────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    Heating: { bg: "#FEE2E2", text: "#DC2626", label: "▲ Heating" },
    Cooling: { bg: "#DBEAFE", text: "#2563EB", label: "▼ Cooling" },
    Watch: { bg: "#FEF3C7", text: "#D97706", label: "⬤ Watch" },
    Neutral: { bg: "#F3F4F6", text: "#6B7280", label: "— Neutral" },
  };
  const s = styles[status] || styles.Neutral;
  return (
    <span style={{ background: s.bg, color: s.text, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, letterSpacing: 0.3 }}>
      {s.label}
    </span>
  );
}

// ─── SPARKLINE ────────────────────────────────────────────────────
function Sparkline({ data, color, width = 100, height = 32 }) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data.slice(-12)} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color.replace("#", "")})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── INDICATOR CARD ────────────────────────────────────────────────
function IndicatorCard({ indicator, onOpen, isWatchlisted, onToggleWatchlist }) {
  const [hovered, setHovered] = useState(false);
  const cat = CATEGORY_MAP[indicator.category] || CATEGORY_MAP["Calendar"];
  const color = cat.color;
  const isPositive = indicator.change >= 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(indicator)}
      style={{
        position: "relative",
        background: COLORS.white,
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        border: `1px solid ${hovered ? color + "40" : COLORS.border}`,
        boxShadow: hovered ? `0 8px 24px ${color}15, 0 2px 8px rgba(0,0,0,0.06)` : "0 1px 4px rgba(0,0,0,0.04)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-2px)" : "none",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Left accent strip */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: cat.gradient, borderRadius: "14px 0 0 14px" }} />

      <div style={{ padding: "18px 18px 14px 26px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top row: icon badge + title + source */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: COLORS.white, border: `2.5px solid ${color}`, boxShadow: `0 2px 8px ${color}20`,
            fontSize: 16, flexShrink: 0
          }}>
            {cat.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 650, color: COLORS.textPrimary, lineHeight: 1.3, fontFamily: "'DM Sans', sans-serif" }}>
              {indicator.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: color, background: color + "12", padding: "1px 6px", borderRadius: 4, letterSpacing: 0.4, textTransform: "uppercase" }}>
                {indicator.source}
              </span>
              <span style={{ fontSize: 9.5, color: COLORS.textTertiary }}>{indicator.frequency}</span>
            </div>
          </div>
        </div>

        {/* Value + change */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: COLORS.textPrimary, fontFamily: "'DM Sans', sans-serif", letterSpacing: -0.5 }}>
            {indicator.unit === "₹" || indicator.unit === "₹/bbl" || indicator.unit === "₹/10g" || indicator.unit === "₹ Lakh Cr"
              ? `₹${indicator.latestValue.toLocaleString("en-IN")}`
              : indicator.unit === "$ Bn"
                ? `$${indicator.latestValue.toFixed(1)}B`
                : indicator.latestValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: 11, color: COLORS.textTertiary }}>{indicator.unit !== "₹" && indicator.unit !== "$ Bn" && indicator.unit !== "₹/bbl" && indicator.unit !== "₹/10g" && indicator.unit !== "₹ Lakh Cr" ? indicator.unit : ""}</span>
        </div>

        {/* Change indicators */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: isPositive ? "#10B981" : "#EF4444" }}>
            {isPositive ? "▲" : "▼"} {Math.abs(indicator.change).toFixed(2)} ({Math.abs(indicator.changePct).toFixed(1)}%)
          </span>
          {indicator.forecastSurprise !== null && (
            <span style={{ fontSize: 10, color: indicator.forecastSurprise > 0 ? "#D97706" : "#6366F1", background: indicator.forecastSurprise > 0 ? "#FEF3C7" : "#EEF2FF", padding: "1px 6px", borderRadius: 4, fontWeight: 500 }}>
              vs fcst: {indicator.forecastSurprise > 0 ? "+" : ""}{indicator.forecastSurprise.toFixed(2)}
            </span>
          )}
          <StatusBadge status={indicator.status} />
        </div>

        {/* Sparkline */}
        <div style={{ marginBottom: 8 }}>
          <Sparkline data={indicator.series} color={color} width="100%" height={36} />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${COLORS.surfaceMuted}`, paddingTop: 8, marginTop: "auto" }}>
          <div style={{ fontSize: 9.5, color: COLORS.textTertiary }}>
            Updated: {indicator.latestDate}
            {indicator.nextRelease && <span> · Next: {indicator.nextRelease}</span>}
          </div>
          {/* Quick actions */}
          <div style={{ display: "flex", gap: 4, opacity: hovered ? 1 : 0.3, transition: "opacity 0.2s" }}>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWatchlist(indicator.id); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 2, color: isWatchlisted ? "#F59E0B" : COLORS.textTertiary }}
              title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
            >
              {isWatchlisted ? "★" : "☆"}
            </button>
            <button onClick={(e) => { e.stopPropagation(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 2, color: COLORS.textTertiary }} title="Set alert">
              🔔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL PANEL (DRAWER) ────────────────────────────────────────
function DetailDrawer({ indicator, onClose }) {
  const [transform, setTransform] = useState("Level");
  if (!indicator) return null;
  const cat = CATEGORY_MAP[indicator.category] || CATEGORY_MAP["Calendar"];
  const color = cat.color;

  const chartData = useMemo(() => {
    if (transform === "Level") return indicator.series;
    if (transform === "YoY" && indicator.series.length > 12) {
      return indicator.series.slice(12).map((d, i) => ({
        date: d.date,
        value: parseFloat(((d.value - indicator.series[i].value) / Math.abs(indicator.series[i].value) * 100).toFixed(2))
      }));
    }
    if (transform === "MoM" && indicator.series.length > 1) {
      return indicator.series.slice(1).map((d, i) => ({
        date: d.date,
        value: parseFloat(((d.value - indicator.series[i].value) / Math.abs(indicator.series[i].value) * 100).toFixed(2))
      }));
    }
    return indicator.series;
  }, [indicator, transform]);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 999, backdropFilter: "blur(2px)", animation: "fadeIn 0.2s ease" }} />
      {/* Drawer */}
      <div style={{
        position: "fixed", right: 0, top: 0, bottom: 0, width: "min(580px, 92vw)", background: COLORS.white, zIndex: 1000,
        boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", overflowY: "auto", animation: "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 20px", borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, background: COLORS.white, zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: COLORS.white, border: `3px solid ${color}`, boxShadow: `0 2px 12px ${color}25`, fontSize: 20
              }}>
                {cat.icon}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{indicator.name}</h2>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                  {indicator.category} · {indicator.source} · {indicator.frequency}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: COLORS.surfaceMuted, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textSecondary }}>✕</button>
          </div>
        </div>

        {/* Big value section */}
        <div style={{ padding: "24px 28px", background: `linear-gradient(135deg, ${color}06, ${color}03)` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: COLORS.textTertiary, fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Current</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{indicator.latestValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 11, color: COLORS.textTertiary }}>{indicator.unit}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: COLORS.textTertiary, fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Prior</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: COLORS.textSecondary }}>{indicator.prior?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 11, color: indicator.change >= 0 ? "#10B981" : "#EF4444", fontWeight: 600 }}>
                {indicator.change >= 0 ? "+" : ""}{indicator.change.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: COLORS.textTertiary, fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Forecast</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: COLORS.textSecondary }}>{indicator.forecast ?? "—"}</div>
              {indicator.forecastSurprise !== null && (
                <div style={{ fontSize: 11, color: indicator.forecastSurprise > 0 ? "#D97706" : "#6366F1", fontWeight: 600 }}>
                  Surprise: {indicator.forecastSurprise > 0 ? "+" : ""}{indicator.forecastSurprise.toFixed(2)}
                </div>
              )}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <StatusBadge status={indicator.status} />
          </div>
        </div>

        {/* Chart section */}
        <div style={{ padding: "20px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>Chart</h3>
            <div style={{ display: "flex", gap: 4 }}>
              {["Level", "YoY", "MoM"].map(t => (
                <button key={t} onClick={() => setTransform(t)} style={{
                  padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                  background: transform === t ? color : COLORS.surfaceMuted,
                  color: transform === t ? COLORS.white : COLORS.textSecondary,
                  transition: "all 0.15s"
                }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: COLORS.textTertiary }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: COLORS.textTertiary }} tickLine={false} axisLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#detailGrad)" dot={false} activeDot={{ r: 4, fill: color, stroke: COLORS.white, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* History table */}
        <div style={{ padding: "0 28px 20px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 10 }}>History (Last 12)</h3>
          <div style={{ borderRadius: 10, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: COLORS.surfaceMuted }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: COLORS.textSecondary }}>Date</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: COLORS.textSecondary }}>Value</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: COLORS.textSecondary }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {indicator.series.slice(-12).reverse().map((d, i, arr) => {
                  const prev = i < arr.length - 1 ? arr[i + 1] : null;
                  const chg = prev ? d.value - prev.value : 0;
                  return (
                    <tr key={d.date} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "7px 12px", color: COLORS.textPrimary }}>{d.date}</td>
                      <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{d.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: "7px 12px", textAlign: "right", color: chg >= 0 ? "#10B981" : "#EF4444", fontWeight: 500 }}>
                        {prev ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Description */}
        <div style={{ padding: "0 28px 20px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 6 }}>About</h3>
          <p style={{ fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.6, margin: 0 }}>{indicator.description}</p>
        </div>

        {/* Alerts placeholder */}
        <div style={{ padding: "0 28px 28px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 6 }}>Alerts</h3>
          <div style={{ background: COLORS.surfaceMuted, borderRadius: 10, padding: 16, textAlign: "center", color: COLORS.textTertiary, fontSize: 12 }}>
            🔔 Alert configuration coming soon. Set thresholds, direction, and cooldown periods.
          </div>
        </div>

        {/* Notes placeholder */}
        <div style={{ padding: "0 28px 28px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 6 }}>Notes</h3>
          <div style={{ background: COLORS.surfaceMuted, borderRadius: 10, padding: 16, color: COLORS.textTertiary, fontSize: 12, minHeight: 60 }}>
            📝 Add your analysis notes here (coming soon)
          </div>
        </div>
      </div>
    </>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────
function CalendarView() {
  const events = [
    { date: "2026-03-01", label: "GST Collections (Feb)", source: "MoF", category: "Growth" },
    { date: "2026-03-03", label: "PMI Manufacturing (Feb)", source: "S&P Global", category: "Growth" },
    { date: "2026-03-05", label: "PMI Services (Feb)", source: "S&P Global", category: "Growth" },
    { date: "2026-03-07", label: "RBI Weekly Statistical Supplement", source: "RBI", category: "Liquidity & Money" },
    { date: "2026-03-12", label: "IIP (Jan)", source: "MoSPI", category: "Growth" },
    { date: "2026-03-14", label: "CPI Inflation (Feb)", source: "MoSPI", category: "Inflation" },
    { date: "2026-03-14", label: "WPI Inflation (Feb)", source: "DPIIT", category: "Inflation" },
    { date: "2026-03-15", label: "Trade Data (Feb)", source: "MoCI", category: "External Sector" },
    { date: "2026-03-15", label: "FX Reserves (Weekly)", source: "RBI", category: "External Sector" },
    { date: "2026-04-09", label: "RBI MPC Decision", source: "RBI", category: "Rates & Credit" },
    { date: "2026-04-23", label: "RBI MPC Minutes", source: "RBI", category: "Rates & Credit" },
    { date: "2026-05-31", label: "GDP Q4 FY26 (Advance)", source: "MoSPI", category: "Growth" },
  ];

  return (
    <div style={{ padding: 4 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>📅 Upcoming Data Releases</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {events.map((ev, i) => {
          const cat = CATEGORY_MAP[ev.category] || CATEGORY_MAP["Calendar"];
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: COLORS.white,
              borderRadius: 10, border: `1px solid ${COLORS.border}`, position: "relative", overflow: "hidden"
            }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: cat.gradient }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, minWidth: 80, fontVariantNumeric: "tabular-nums", marginLeft: 8 }}>{ev.date}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{ev.label}</div>
                <div style={{ fontSize: 10.5, color: cat.color, fontWeight: 500 }}>{ev.source}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RISK DASHBOARD ────────────────────────────────────────────────
function RiskDashboard({ indicators }) {
  const riskItems = [
    { label: "Inflation Risk", desc: "CPI above RBI 4% target?", indicators: indicators.filter(i => i.category === "Inflation"), threshold: 4.5, field: "CPI" },
    { label: "Growth Momentum", desc: "PMI & IIP trends", indicators: indicators.filter(i => ["pmi-mfg", "pmi-services", "iip"].includes(i.id)) },
    { label: "Liquidity Stress", desc: "LAF deficit, deposit-credit gap", indicators: indicators.filter(i => i.category === "Liquidity & Money") },
    { label: "External Vulnerability", desc: "Trade deficit, FX reserves, INR", indicators: indicators.filter(i => i.category === "External Sector" || i.id === "usdinr") },
    { label: "Fiscal Health", desc: "Deficit pace, tax buoyancy", indicators: indicators.filter(i => i.category === "Fiscal") },
  ];

  return (
    <div style={{ padding: 4 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>🛡️ Risk Dashboard</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {riskItems.map((risk, i) => {
          const heatingCount = risk.indicators.filter(ind => ind.status === "Heating").length;
          const coolingCount = risk.indicators.filter(ind => ind.status === "Cooling").length;
          const total = risk.indicators.length;
          const riskLevel = heatingCount > total / 2 ? "High" : coolingCount > total / 2 ? "Low" : "Moderate";
          const riskColor = riskLevel === "High" ? "#EF4444" : riskLevel === "Low" ? "#10B981" : "#F59E0B";
          return (
            <div key={i} style={{ padding: "16px 20px", background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 650, color: COLORS.textPrimary }}>{risk.label}</div>
                  <div style={{ fontSize: 11, color: COLORS.textTertiary }}>{risk.desc}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: riskColor, background: riskColor + "18", padding: "3px 10px", borderRadius: 6 }}>{riskLevel}</span>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {risk.indicators.map(ind => (
                  <span key={ind.id} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: COLORS.surfaceMuted, color: COLORS.textSecondary }}>
                    {ind.name}: <strong style={{ color: ind.change >= 0 ? "#10B981" : "#EF4444" }}>{ind.latestValue.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</strong>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────
export default function IndiaMacroTracker() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState("overview");
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState("1Y");
  const [watchlist, setWatchlist] = useState([]);
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const searchRef = useRef(null);

  // Load watchlist from memory
  useEffect(() => {
    try {
      const saved = JSON.parse(window._watchlist || "[]");
      if (Array.isArray(saved)) setWatchlist(saved);
    } catch {}
  }, []);

  // Save watchlist
  useEffect(() => {
    window._watchlist = JSON.stringify(watchlist);
  }, [watchlist]);

  // "/" shortcut
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSelectedIndicator(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const toggleWatchlist = useCallback((id) => {
    setWatchlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  // Filter indicators
  const filtered = useMemo(() => {
    let result = processedIndicators;

    if (activeTab === "My Watchlist") {
      result = result.filter(i => watchlist.includes(i.id));
    } else if (activeTab === "Latest Releases") {
      result = [...result].sort((a, b) => (b.latestDate || "").localeCompare(a.latestDate || "")).slice(0, 16);
    }

    if (activeCategory !== "overview" && activeCategory !== "settings" && activeCategory !== "Calendar") {
      result = result.filter(i => i.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.source.toLowerCase().includes(q));
    }

    return result;
  }, [activeCategory, activeTab, searchQuery, watchlist]);

  const sidebarWidth = sidebarCollapsed ? 60 : 210;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F6F7F9", fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", overflow: "hidden" }}>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
      `}</style>

      {/* ─── SIDEBAR ─── */}
      <aside style={{
        width: sidebarWidth, minWidth: sidebarWidth, background: COLORS.white, borderRight: `1px solid ${COLORS.border}`,
        display: "flex", flexDirection: "column", transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 100, position: "relative", flexShrink: 0
      }}>
        {/* Logo area */}
        <div style={{ padding: sidebarCollapsed ? "16px 8px" : "16px 16px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10, minHeight: 56 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #109750, #5265B4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
            ₹
          </div>
          {!sidebarCollapsed && <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, whiteSpace: "nowrap" }}>India Macro</span>}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "8px 6px", overflowY: "auto" }}>
          {SIDEBAR_ITEMS.map(item => {
            const isActive = activeCategory === item.id;
            const catColor = CATEGORY_MAP[item.id]?.color || COLORS.indigo;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveCategory(item.id); if (item.id === "Calendar") setActiveTab("All"); }}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", padding: sidebarCollapsed ? "10px 0" : "9px 12px",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  background: isActive ? catColor + "10" : "transparent",
                  border: "none", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                  color: isActive ? catColor : COLORS.textSecondary,
                  fontWeight: isActive ? 600 : 400, fontSize: 13, transition: "all 0.15s",
                  borderLeft: isActive ? `3px solid ${catColor}` : "3px solid transparent"
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                {!sidebarCollapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(prev => !prev)}
          style={{
            padding: 12, border: "none", borderTop: `1px solid ${COLORS.border}`, background: "transparent",
            cursor: "pointer", color: COLORS.textTertiary, fontSize: 16, display: "flex", justifyContent: "center"
          }}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? "▸" : "◂"}
        </button>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* TopBar */}
        <header style={{
          background: COLORS.white, borderBottom: `1px solid ${COLORS.border}`, padding: "0 24px",
          display: "flex", alignItems: "center", gap: 16, minHeight: 56, flexShrink: 0, flexWrap: "wrap"
        }}>
          {/* App name (mobile) */}
          <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.textPrimary, marginRight: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#109750" }}>India</span> Macro Tracker
          </div>

          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 180px", maxWidth: 320 }}>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Search indicators... (press "/")'
              style={{
                width: "100%", padding: "7px 12px 7px 32px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                fontSize: 12.5, outline: "none", background: COLORS.surfaceMuted, color: COLORS.textPrimary,
                transition: "border-color 0.15s"
              }}
              onFocus={e => e.target.style.borderColor = COLORS.indigo}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: COLORS.textTertiary }}>🔍</span>
          </div>

          {/* Time range */}
          <div style={{ display: "flex", gap: 2, background: COLORS.surfaceMuted, borderRadius: 8, padding: 2 }}>
            {["1M", "3M", "1Y", "5Y"].map(t => (
              <button key={t} onClick={() => setTimeRange(t)} style={{
                padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: timeRange === t ? COLORS.white : "transparent",
                color: timeRange === t ? COLORS.textPrimary : COLORS.textTertiary,
                boxShadow: timeRange === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s"
              }}>{t}</button>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
            {["All", "My Watchlist", "Latest Releases", "Risk Dashboard"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600,
                background: activeTab === tab ? COLORS.textPrimary : "transparent",
                color: activeTab === tab ? COLORS.white : COLORS.textSecondary,
                transition: "all 0.15s"
              }}>{tab}</button>
            ))}
          </div>
        </header>

        {/* Dashboard body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 40px" }}>
          {/* Category header */}
          {activeCategory !== "overview" && activeCategory !== "settings" && activeCategory !== "Calendar" && (
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{CATEGORY_MAP[activeCategory]?.icon || "◎"}</span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>
                {activeCategory}
              </h2>
              <span style={{ fontSize: 12, color: COLORS.textTertiary, background: COLORS.surfaceMuted, padding: "2px 8px", borderRadius: 4 }}>
                {filtered.length} indicators
              </span>
            </div>
          )}

          {activeCategory === "overview" && activeTab !== "Risk Dashboard" && (
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>
                {activeTab === "My Watchlist" ? "⭐ My Watchlist" : activeTab === "Latest Releases" ? "🕐 Latest Releases" : "◎ Overview"}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.textTertiary }}>
                {activeTab === "My Watchlist" ? `${watchlist.length} indicators tracked` : "All Indian macro indicators at a glance"}
              </p>
            </div>
          )}

          {/* Calendar view */}
          {activeCategory === "Calendar" ? (
            <CalendarView />
          ) : activeTab === "Risk Dashboard" ? (
            <RiskDashboard indicators={processedIndicators} />
          ) : activeCategory === "settings" ? (
            <div style={{ maxWidth: 480, padding: 4 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16 }}>⚙️ Settings</h2>
              <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 8 }}>Data Settings</div>
                <div style={{ fontSize: 12, color: COLORS.textTertiary, marginBottom: 16 }}>Configure data sources, API keys, and refresh intervals. Coming soon in the live version.</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 8 }}>Notifications</div>
                <div style={{ fontSize: 12, color: COLORS.textTertiary, marginBottom: 16 }}>Email and push alert preferences. Coming soon.</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 8 }}>Watchlist</div>
                <div style={{ fontSize: 12, color: COLORS.textTertiary }}>You have {watchlist.length} indicators in your watchlist.</div>
              </div>
            </div>
          ) : (
            /* Card Grid */
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 18,
            }}
            data-grid="cards"
            >
              <style>{`
                @media (max-width: 1200px) {
                  div[data-grid="cards"] { grid-template-columns: repeat(3, 1fr) !important; }
                }
                @media (max-width: 900px) {
                  div[data-grid="cards"] { grid-template-columns: repeat(2, 1fr) !important; }
                }
                @media (max-width: 600px) {
                  div[data-grid="cards"] { grid-template-columns: 1fr !important; }
                }
              `}</style>
              {filtered.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 60, color: COLORS.textTertiary }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {activeTab === "My Watchlist" ? "No indicators in your watchlist yet. Click ☆ on any card to add." : "No indicators match your search."}
                  </div>
                </div>
              ) : (
                filtered.map(ind => (
                  <IndicatorCard
                    key={ind.id}
                    indicator={ind}
                    onOpen={setSelectedIndicator}
                    isWatchlisted={watchlist.includes(ind.id)}
                    onToggleWatchlist={toggleWatchlist}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* Detail drawer */}
      {selectedIndicator && (
        <DetailDrawer indicator={selectedIndicator} onClose={() => setSelectedIndicator(null)} />
      )}
    </div>
  );
}
