# India Macro Tracker 🇮🇳

A production-grade Next.js dashboard for tracking Indian macroeconomic indicators with real-time data visualization.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)

## 🚀 Project Status

- ✅ **Phase 1: Project Scaffold** - Complete
- ✅ **Phase 2: App Shell + Core Components** - Complete
- 🚧 **Phase 3: Detail View + Special Views** - Next
- ⏳ **Phase 4: MoSPI MCP Integration** - Planned
- ⏳ **Phase 5: Additional Data Sources** - Planned

## 📊 Features

### Currently Implemented

- **34 Macroeconomic Indicators** across 9 categories:
  - 📊 Inflation (CPI, WPI)
  - 📈 Growth (GDP, IIP, PMI, GST)
  - 👷 Labour (Unemployment, LFPR)
  - 🏦 Rates & Credit (Repo Rate, G-Sec Yields, Credit Growth)
  - 💱 FX (USD/INR, REER)
  - 💧 Liquidity & Money (LAF, M3, Deposits)
  - 🌍 External Sector (Trade Balance, Current Account, FX Reserves)
  - 📉 Markets (Nifty, Sensex, Bank Nifty, VIX, Oil, Gold)
  - 🏛️ Fiscal (Deficit, Tax Collections, Debt-to-GDP)

- **Interactive Dashboard**
  - Collapsible sidebar with category navigation
  - Live search across indicators
  - Time range selector (1M, 3M, 1Y, 5Y)
  - Watchlist with localStorage persistence
  - Responsive 4-column grid layout

- **Beautiful Card Design**
  - Category-colored gradients
  - Sparkline charts (last 12 data points)
  - Status badges (Heating/Cooling/Watch/Neutral)
  - Change indicators with forecast surprises
  - Hover animations

### Coming Soon (Phase 3)

- Detail drawer with interactive charts
- Calendar view for upcoming data releases
- Risk Dashboard with 5 assessment cards
- Transform toggles (Level/YoY/MoM)
- History tables

### Future (Phase 4+)

- Live data from MoSPI eSankhyiki MCP Server
- RBI DBIE API integration
- NSE/BSE market data
- Real-time updates
- Alert notifications

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3.4
- **Charts:** Recharts 2.15
- **Data:** TanStack Query (React Query) 5
- **Icons:** Lucide React

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/AbhishekR2030/IndiaMacroTracker.git
cd IndiaMacroTracker

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## 🎨 Design System

The app uses a carefully crafted design system with exact color specifications:

- **Deep Green:** `#109750` (Rates & Credit, FX)
- **Coral:** `#CE593A` (Growth, Fiscal)
- **Indigo:** `#5265B4` (Inflation)
- **Steel Blue:** `#A3B6C9` (External Sector, Calendar)
- **Magenta:** `#B837AA` (Labour, Markets)
- **Lime:** `#C1C240` (Liquidity)

Typography: **DM Sans** from Google Fonts

## 📁 Project Structure

```
india-macro-tracker/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main dashboard
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── AppShell.tsx        # Main layout container
│   │   ├── Sidebar.tsx         # Category navigation
│   │   ├── TopBar.tsx          # Search + filters
│   │   ├── CardGrid.tsx        # Responsive grid
│   │   ├── IndicatorCard.tsx   # Indicator display card
│   │   └── Sparkline.tsx       # Mini chart component
│   └── lib/
│       ├── tokens.ts           # Design tokens
│       ├── types.ts            # TypeScript types
│       ├── utils.ts            # Utility functions
│       └── providers/
│           ├── interface.ts    # DataProvider interface
│           ├── mock.ts         # Mock data (Phase 1-3)
│           └── index.ts        # Provider switcher
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 🔄 Data Architecture

The app uses a clean provider pattern that allows seamless switching between data sources:

```typescript
interface DataProvider {
  getIndicators(filter?: DataFilter): Promise<Indicator[]>;
  getLatest(indicatorId: string): Promise<Observation>;
  getSeries(indicatorId: string, opts?: SeriesOptions): Promise<TimeSeriesData[]>;
  getNextRelease(indicatorId: string): Promise<string | null>;
}
```

Currently using mock data. Phase 4 will integrate:
- MoSPI eSankhyiki MCP Server for CPI, WPI, IIP, GDP, PLFS
- RBI DBIE for rates, credit, FX reserves
- NSE/BSE for market indices

## 🎯 Keyboard Shortcuts

- **`/`** - Focus search input
- **`Esc`** - Close detail drawer (Phase 3)

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📝 License

MIT

## 🙏 Acknowledgments

- Data sources: MoSPI, RBI, NSE, BSE, S&P Global, CMIE
- Design inspiration: Modern financial dashboards
- Built with ❤️ for tracking the Indian economy

---

**Note:** Currently using realistic mock data. Live data integration coming in Phase 4.
