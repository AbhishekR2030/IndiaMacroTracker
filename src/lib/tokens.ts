// Design tokens extracted from reference design - non-negotiable exact values
export const COLORS = {
  // Exact hex colors
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
} as const;

// Category type
export type Category =
  | "Inflation"
  | "Growth"
  | "Labour"
  | "Rates & Credit"
  | "FX"
  | "Liquidity & Money"
  | "External Sector"
  | "Markets"
  | "Fiscal";

// Category configuration with colors and gradients
export interface CategoryConfig {
  color: string;
  icon: string;
  gradient: string;
}

// Category → color mapping with gradients for left accent strip
export const CATEGORY_MAP: Record<Category, CategoryConfig> = {
  Inflation: {
    color: "#5265B4",
    icon: "📊",
    gradient: "linear-gradient(180deg, #5265B4 0%, #A3B6C9 100%)",
  },
  Growth: {
    color: "#CE593A",
    icon: "📈",
    gradient: "linear-gradient(180deg, #CE593A 0%, #E8A090 100%)",
  },
  Labour: {
    color: "#B837AA",
    icon: "👷",
    gradient: "linear-gradient(180deg, #B837AA 0%, #D48BCC 100%)",
  },
  "Rates & Credit": {
    color: "#109750",
    icon: "🏦",
    gradient: "linear-gradient(180deg, #109750 0%, #A3B6C9 100%)",
  },
  "Liquidity & Money": {
    color: "#C1C240",
    icon: "💧",
    gradient: "linear-gradient(180deg, #C1C240 0%, #D8D88A 100%)",
  },
  "External Sector": {
    color: "#A3B6C9",
    icon: "🌍",
    gradient: "linear-gradient(180deg, #A3B6C9 0%, #C9D6E3 100%)",
  },
  Markets: {
    color: "#B837AA",
    icon: "📉",
    gradient: "linear-gradient(180deg, #B837AA 0%, #A3B6C9 100%)",
  },
  Fiscal: {
    color: "#CE593A",
    icon: "🏛️",
    gradient: "linear-gradient(180deg, #CE593A 0%, #A3B6C9 100%)",
  },
  FX: {
    color: "#109750",
    icon: "💱",
    gradient: "linear-gradient(180deg, #109750 0%, #6BC490 100%)",
  },
} as const;