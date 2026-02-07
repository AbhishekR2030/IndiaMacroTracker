# India Macro Tracker — Claude Code Master Prompt

> **How to use this document:** Copy each phase into Claude Code one at a time. Wait for Phase 1 to complete before starting Phase 2, and so on. This phased approach gives Claude Code focused context and produces higher-quality output.

---

## CONTEXT FOR CLAUDE CODE

You are a senior product engineer + UI/UX designer building a production-grade Next.js (App Router) web app called **"India Macro Tracker"** — a dashboard for tracking Indian macroeconomic indicators.

**Primary data source (live):** The MoSPI eSankhyiki MCP Server at `https://mcp.mospi.gov.in`, launched by the National Statistics Office on 6 Feb 2026. It provides 7 datasets: CPI, WPI, IIP, NAS (GDP), PLFS (labour), ASI, and Energy Statistics. The MCP uses a 4-tool sequential workflow that must be called in order. See the full source code and docs at `https://github.com/nso-india/esankhyiki-mcp`.

**Future data sources (to be plugged in later):** RBI DBIE (rates, credit, FX reserves, liquidity), NSE (market indices), CCIL (bond yields), data.gov.in, CMIE.

---

## PHASE 1: Project Scaffold + Design System + Mock Data

### 1A. Create the Next.js project

```bash
npx create-next-app@latest india-macro-tracker --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd india-macro-tracker
npm install recharts @tanstack/react-query lucide-react clsx
```

### 1B. Design Tokens

Create `/src/lib/tokens.ts` with these exact values. These were extracted from the reference design and are non-negotiable:

```
EXACT HEX COLORS
- Deep Green: #109750
- Red/Coral: #CE593A
- Indigo/Blue: #5265B4
- Steel Blue: #A3B6C9
- Magenta/Purple: #B837AA
- Lime/Yellow-Green: #C1C240
- Surface: #FDFDFD
- Surface Muted: #EFEFEF
- Text Primary: #1A1D23
- Text Secondary: #6B7280
- Text Tertiary: #9CA3AF
- Border: #E5E7EB

CATEGORY → COLOR MAPPING
- Inflation → #5265B4 (Indigo/Blue)
- Growth → #CE593A (Coral/Orange)
- Labour → #B837AA (Magenta/Purple)
- Rates & Credit → #109750 (Deep Green)
- Liquidity & Money → #C1C240 (Lime)
- External Sector → #A3B6C9 (Steel Blue)
- Markets → #B837AA (Magenta/Purple)
- Fiscal → #CE593A (Coral/Orange)
- FX → #109750 (Deep Green)
- Calendar → #A3B6C9 (Steel Blue)

GRADIENT RULE for left accent strip on cards:
Each category gets a subtle vertical gradient from its color down to #A3B6C9 (Steel Blue) or a lighter tint.
Example: Inflation strip → linear-gradient(180deg, #5265B4 0%, #A3B6C9 100%)
```

### 1C. Data Layer Architecture

Create a clean provider pattern so we can swap mock → live data without touching components:

```
/src/lib/
  tokens.ts              ← design tokens and category config
  types.ts               ← Indicator, Observation, DataFilter types
  providers/
    interface.ts         ← DataProvider interface (getIndicators, getLatest, getSeries, etc.)
    mock.ts              ← Mock provider with 30-40 realistic Indian indicators
    mospi.ts             ← MoSPI MCP provider (Phase 4)
    index.ts             ← Exports active provider based on env var DATA_SOURCE=mock|mospi
```

**Data types:**
```typescript
interface Indicator {
  id: string;
  name: string;
  category: Category; // Inflation | Growth | Labour | "Rates & Credit" | FX | "Liquidity & Money" | "External Sector" | Markets | Fiscal
  unit: string;       // "%" | "Index" | "₹ Lakh Cr" | "$ Bn" | "₹" | "₹/10g" | "₹/bbl" etc.
  frequency: string;  // Monthly | Quarterly | Weekly | Daily | Bi-monthly | Annual
  source: string;     // MoSPI | RBI | NSE | BSE | S&P Global | CMIE | CCIL | MoF | MoCI | DPIIT | CGA | ICE/RBI | MCX/IBJA
  description: string;
  transformOptions: string[]; // ["Level", "YoY", "MoM"]
  tags: string[];
}

interface Observation {
  indicatorId: string;
  date: string;       // ISO date or YYYY-MM
  value: number;
  prior?: number;
  forecast?: number;
  surprise?: number;  // value - forecast
}

interface DataProvider {
  getIndicators(filter?: { category?: string }): Promise<Indicator[]>;
  getLatest(indicatorId: string): Promise<Observation>;
  getSeries(indicatorId: string, opts?: { from?: string; transform?: string }): Promise<Observation[]>;
  getNextRelease(indicatorId: string): Promise<string | null>;
}
```

### 1D. Mock Data Requirements

Create `/src/lib/providers/mock.ts` with **30–40 realistic Indian indicators** spanning ALL categories. Use historically accurate base values and realistic volatility:

**Inflation (4 indicators):**
- CPI Headline YoY — base ~4.8%, vol ±0.3, source: MoSPI, monthly
- CPI Core YoY — base ~4.2%, vol ±0.2, source: MoSPI, monthly
- WPI YoY — base ~1.8%, vol ±0.5, source: DPIIT, monthly
- CPI Food YoY — base ~6.2%, vol ±0.8, source: MoSPI, monthly

**Growth (5 indicators):**
- GDP Growth YoY — base ~6.7%, vol ±0.4, source: MoSPI, quarterly
- IIP Growth YoY — base ~4.5%, vol ±1.2, source: MoSPI, monthly
- PMI Manufacturing — base ~56.5, vol ±1.5, source: S&P Global, monthly
- PMI Services — base ~58.2, vol ±1.2, source: S&P Global, monthly
- GST Collections — base ~₹1.72 Lakh Cr, vol ±0.08, source: MoF, monthly

**Labour (3 indicators):**
- Unemployment Rate — base ~7.8%, vol ±0.6, source: CMIE, monthly
- LFPR — base ~41.2%, vol ±0.5, source: PLFS, quarterly
- Employment Rate — base ~37.5%, vol ±0.4, source: CMIE, monthly

**Rates & Credit (5 indicators):**
- RBI Repo Rate — 6.50% → 6.25% (stepped down recently), source: RBI, bi-monthly
- G-Sec 10Y Yield — base ~6.85%, vol ±0.08, source: CCIL/RBI, daily
- G-Sec 2Y Yield — base ~6.55%, vol ±0.06, source: CCIL/RBI, daily
- Bank Credit Growth YoY — base ~15.5%, vol ±0.8, source: RBI, bi-weekly
- WALR Fresh Loans — base ~9.2%, vol ±0.1, source: RBI, monthly

**FX (2 indicators):**
- USD/INR — base ~83.5, slight depreciation trend, source: RBI, daily
- REER 36-currency — base ~104.5, vol ±0.8, source: RBI, monthly

**Liquidity & Money (3 indicators):**
- LAF Net Liquidity — base ~-0.5 ₹ Lakh Cr, vol ±0.4, source: RBI, daily
- M3 Growth YoY — base ~10.8%, vol ±0.4, source: RBI, bi-weekly
- Bank Deposits Growth YoY — base ~12.5%, vol ±0.5, source: RBI, bi-weekly

**External Sector (3 indicators):**
- Trade Balance — base ~-$22.5 Bn, vol ±2.5, source: MoCI, monthly
- Current Account % GDP — base ~-1.2%, vol ±0.3, source: RBI, quarterly
- FX Reserves — base ~$620 Bn, slight uptrend, source: RBI, weekly

**Markets (6 indicators):**
- Nifty 50 — base ~22500, vol ±400, uptrend, source: NSE, daily
- Sensex — base ~74000, vol ±1200, uptrend, source: BSE, daily
- Nifty Bank — base ~47000, vol ±800, source: NSE, daily
- India VIX — base ~13.5, vol ±1.5, source: NSE, daily
- Brent Crude INR — base ~₹6800/bbl, vol ±300, source: ICE/RBI, daily
- Gold INR — base ~₹62000/10g, vol ±1500, uptrend, source: MCX/IBJA, daily

**Fiscal (3 indicators):**
- Fiscal Deficit FYTD — base ~55% of BE, source: CGA, monthly
- Gross Tax Collections — base ~₹18.5 Lakh Cr, uptrend, source: MoF, monthly
- Debt-to-GDP — base ~82%, slight downtrend, source: MoF, annual

Generate 24 data points per indicator (monthly cadence for most, 12 for quarterly/annual). Include realistic `nextReleaseDate` values anchored to early-mid 2026.

### 1E. Environment Config

Create `.env.example`:
```
# Data source: "mock" for development, "mospi" when MCP is wired up
DATA_SOURCE=mock

# MoSPI MCP Server (for Phase 4)
MOSPI_MCP_URL=https://mcp.mospi.gov.in

# Future data sources (Phase 5+)
# RBI_DBIE_API_URL=
# DATA_GOV_IN_API_KEY=
# NSE_DATA_URL=
```

### Phase 1 Deliverables
After completing this phase, I should be able to run `npm run dev` and see a blank page with no errors. The data layer should be importable and return mock data. Run `npx tsc --noEmit` to verify no type errors.

---

## PHASE 2: App Shell + Core Components

### 2A. App Shell Layout

```
/src/app/
  layout.tsx        ← root layout with providers (QueryClientProvider, etc.)
  page.tsx          ← main dashboard page
  globals.css       ← Tailwind + custom styles + Google Font (DM Sans)

/src/components/
  AppShell.tsx      ← flex container: sidebar + main area
  Sidebar.tsx       ← collapsible left sidebar
  TopBar.tsx        ← search + time range + tabs
  CardGrid.tsx      ← responsive grid wrapper
  IndicatorCard.tsx ← individual card component
  Sparkline.tsx     ← mini chart component
```

### 2B. Sidebar (Collapsible + Persisted)

- **Expanded state**: icons + labels, ~210px wide
- **Collapsed state**: icons only + tooltips on hover, ~60px wide
- Collapse state persists in localStorage
- Smooth CSS transition on width change (0.25s ease)
- Categories:
  - Overview, Inflation, Growth, Labour, Rates & Credit, FX, Liquidity & Money, External Sector, Markets, Fiscal, Calendar, Settings
- Active category gets: colored left border accent (3px), tinted background, bold text
- Each category uses its assigned color from tokens
- Bottom of sidebar: collapse/expand toggle button

### 2C. TopBar

- App name: "India Macro Tracker" (left)
- Search input (center-left):
  - Placeholder: `Search indicators... (press "/")`
  - "/" keyboard shortcut focuses it
  - Filters indicators by name, category, or source
- Time range selector: 1M | 3M | 1Y | 5Y (pill toggle group)
- Tab bar (right): All | My Watchlist | Latest Releases | Risk Dashboard
  - Active tab gets dark bg + white text

### 2D. CardGrid

Responsive grid with generous gaps (16-20px):
- Desktop (>1200px): **exactly 4 columns**
- Tablet (900-1200px): 3 columns
- Small tablet (600-900px): 2 columns
- Mobile (<600px): 1 column

### 2E. IndicatorCard (Critical — match reference design exactly)

Each card must have:
1. **Left vertical accent strip** (5px wide) with the category's gradient
2. **Circular icon badge**: white center, colored ring (2.5px border), subtle shadow. Icon is the category emoji.
3. **Title** (13px, bold) + **source badge** (small pill with category color tint) + frequency label
4. **Current value** (26px, bold) with appropriate formatting:
   - "%" unit → show number + "%"
   - "₹" prefix units → "₹xx,xxx" (Indian comma format)
   - "$ Bn" → "$xx.xB"
   - "Index" → plain number with commas
5. **Change indicators**:
   - vs prior: ▲/▼ with green/red + absolute + percentage
   - vs forecast (if available): pill showing surprise
6. **Status tag**: Heating (red) / Cooling (blue) / Watch (amber) / Neutral (gray)
7. **Sparkline**: last 12 data points, category color, with subtle area fill
8. **Footer**: "Updated: YYYY-MM" + "Next: YYYY-MM-DD" (if available)
9. **Quick actions** (visible on hover): ☆ watchlist toggle, 🔔 alert bell

**Card hover state**: slight lift (translateY -2px), colored border tint, enhanced shadow.

### Phase 2 Deliverables
Dashboard renders with all mock indicators in the card grid. Sidebar navigates between categories. Search filters cards. Time range selector present (visual only for now). Cards match the described design.

---

## PHASE 3: Detail View + Watchlist + Special Views

### 3A. Indicator Detail Drawer

Clicking any card opens a slide-in drawer from the right (max-width 580px):
- **Header**: icon badge + name + category/source/frequency + close button
- **Big value section** (tinted background):
  - 3-column grid: Current (large) | Prior + change | Forecast + surprise
  - Status badge
- **Interactive chart** (Recharts):
  - Transform toggle: Level | YoY | MoM buttons
  - AreaChart with grid, axis labels, tooltip
  - Category-colored line + gradient fill
- **History table**: last 12 observations with date, value, change columns
- **About section**: indicator description text
- **Alerts placeholder**: "Coming soon" card for threshold/direction/cooldown config
- **Notes placeholder**: "Coming soon" card for analysis notes
- Drawer has smooth slide-in animation + backdrop overlay with blur
- Escape key closes it

### 3B. Watchlist (localStorage)

- Clicking ☆ on a card toggles that indicator's ID in a localStorage array
- "My Watchlist" tab filters the grid to only watchlisted indicators
- Empty state: "No indicators in your watchlist yet. Click ☆ on any card to add."
- Watchlist count shown in Settings view

### 3C. Calendar View

When sidebar "Calendar" is selected, show a list of upcoming data releases:
- Each event: date, label, source, category color accent strip
- Include at least 12 events covering:
  - GST collections, PMI Mfg/Services, IIP, CPI, WPI, Trade data, FX reserves
  - RBI MPC decision and minutes dates
  - GDP release
- Sort by date ascending

### 3D. Risk Dashboard

When "Risk Dashboard" tab is active, show 5 risk assessment cards:
1. **Inflation Risk** — based on CPI/WPI indicators
2. **Growth Momentum** — based on PMI, IIP
3. **Liquidity Stress** — based on LAF, deposit-credit gap
4. **External Vulnerability** — based on trade deficit, FX reserves, INR
5. **Fiscal Health** — based on deficit pace, tax buoyancy

Each card shows: risk label, description, risk level badge (High/Moderate/Low with color), and the contributing indicator chips with their latest values.

### Phase 3 Deliverables
Full interactive dashboard with detail drawer, working watchlist, calendar view, and risk dashboard. All navigation works. All transitions are smooth.

---

## PHASE 4: MoSPI MCP Integration (Live Data)

This is where we replace mock data with real government statistics from the MoSPI eSankhyiki MCP Server.

### 4A. Understanding the MoSPI MCP Server

**Server URL:** `https://mcp.mospi.gov.in`
**GitHub:** `https://github.com/nso-india/esankhyiki-mcp`
**Protocol:** Model Context Protocol (MCP) by Anthropic, implemented with FastMCP 3.0
**Auth:** None required (open access beta)

**Available Datasets:**

| Code | Full Name | Maps to Our Category |
|------|-----------|---------------------|
| CPI | Consumer Price Index | Inflation |
| WPI | Wholesale Price Index | Inflation |
| IIP | Index of Industrial Production | Growth |
| NAS | National Accounts Statistics (GDP) | Growth |
| PLFS | Periodic Labour Force Survey | Labour |
| ASI | Annual Survey of Industries | Growth |
| ENERGY | Energy Statistics | (supplementary) |

**The 4-Tool Sequential Workflow (MUST be called in this order):**

```
Step 1: 1_know_about_mospi_api()
   → Returns overview of all 7 datasets. Call once at app startup to discover available data.

Step 2: 2_get_indicators(dataset, user_query?)
   → For a given dataset (e.g., "CPI"), returns available indicators/sub-indicators.
   → Example: CPI dataset has Group-level and Item-level indicators

Step 3: 3_get_metadata(dataset, ...)
   → Returns valid filter values: states, years, categories, sectors.
   → CRITICAL: You MUST call this before fetching data to get valid filter codes.

Step 4: 4_get_data(dataset, filters)
   → Fetches actual data using the filter key-value pairs obtained from Step 3.
   → Returns time-series observations.
```

**Important constraints:**
- Tools MUST be called in sequence (1 → 2 → 3 → 4). Skipping Step 3 causes invalid filter errors.
- The server is read-only.
- Overly broad queries (e.g., "all data for all states") may time out. Be specific with filters.
- Responses are JSON with attributed source metadata.

### 4B. Create the MoSPI Data Provider

Create `/src/lib/providers/mospi.ts` implementing the same `DataProvider` interface as mock.

**Strategy for integration:**
1. On app load, call `1_know_about_mospi_api()` once and cache the dataset overview.
2. For each of our indicator categories that map to MoSPI datasets, call `2_get_indicators()` to discover available sub-indicators.
3. Cache the metadata (Step 3) results per dataset — these rarely change.
4. For actual data fetches, call `4_get_data()` with specific filters.

**MoSPI → Our Indicator Mapping:**

| Our Indicator | MoSPI Dataset | Query Approach |
|--------------|---------------|----------------|
| CPI Headline YoY | CPI | Get CPI Combined (Rural+Urban), General Index |
| CPI Core YoY | CPI | CPI ex Food & Fuel (may need calculation) |
| CPI Food YoY | CPI | CPI Food & Beverages group |
| WPI YoY | WPI | WPI All Commodities |
| GDP Growth | NAS | GDP at constant prices, YoY |
| IIP Growth | IIP | IIP General Index |
| Unemployment Rate | PLFS | Unemployment rate from PLFS quarterly bulletin |
| LFPR | PLFS | Labour force participation rate |

**For indicators NOT covered by MoSPI (markets, RBI rates, FX, fiscal):** Continue using mock data for now. Structure the provider so it falls back to mock for categories without a live source. We will add RBI, NSE, and other sources in Phase 5.

### 4C. API Route for MoSPI Communication

Since MoSPI MCP is a server-to-server protocol, create Next.js API routes as a proxy:

```
/src/app/api/mospi/
  overview/route.ts    → calls 1_know_about_mospi_api
  indicators/route.ts  → calls 2_get_indicators
  metadata/route.ts    → calls 3_get_metadata
  data/route.ts        → calls 4_get_data
```

Use TanStack Query on the frontend with these API routes, with appropriate stale times:
- Overview: staleTime 24 hours (datasets don't change often)
- Indicators: staleTime 24 hours
- Metadata: staleTime 1 hour
- Data: staleTime 5 minutes for daily series, 1 hour for monthly, 6 hours for quarterly

### 4D. Hybrid Provider

Create `/src/lib/providers/hybrid.ts` that:
- Uses MoSPI provider for: CPI, WPI, IIP, NAS, PLFS (Inflation, Growth, Labour)
- Falls back to mock provider for: Rates & Credit, FX, Liquidity, External Sector, Markets, Fiscal
- Merges results seamlessly so the UI doesn't know the difference

### 4E. Error Handling and Loading States

- Show skeleton loading cards while data loads
- If MoSPI server is unreachable, gracefully fall back to mock data with a small banner: "⚠️ Live data unavailable — showing cached data"
- Show "Source: MoSPI eSankhyiki" badge on cards with live data vs "Source: Mock" on others
- Log MoSPI API errors to console with the full response for debugging

### Phase 4 Deliverables
CPI, WPI, IIP, GDP, and PLFS indicators now show live data from the MoSPI MCP server. Other categories still use mock data. The app gracefully degrades if the MCP server is down. All data is properly attributed.

---

## PHASE 5+ (Future Iterations)

These are planned enhancements for after the MVP is live. Do NOT build these now — just ensure the architecture supports them.

### Additional Data Sources to Plug In
- **RBI DBIE API** (`https://api.rbi.org.in/`): Repo rate, G-Sec yields, bank credit, FX reserves, M3, WALR, LAF liquidity
- **NSE India**: Nifty 50, Nifty Bank, India VIX (public JSON endpoints)
- **BSE India**: Sensex
- **CCIL**: Bond yield data
- **data.gov.in API**: Supplementary government datasets
- **CMIE** (requires subscription): High-frequency employment, consumer sentiment

### Feature Roadmap
- Indicator comparison view (overlay 2-3 indicators on one chart)
- Alerts system (email/push notifications on threshold breaches)
- Notes and annotations on indicators
- Export to PDF/Excel
- User accounts and saved views
- Seasonal adjustment transforms
- Correlation matrix between indicators
- Mobile app (React Native or PWA)

---

## NON-NEGOTIABLE UI REQUIREMENTS (Apply to ALL Phases)

### Card Visual Design
Cards MUST follow this exact pattern:
- Neutral card surface (white `#FFFFFF`)
- A LEFT vertical accent strip (5px) with subtle 2-tone gradient
- A circular icon badge (white center, colored ring, subtle shadow)
- Category title and small accents match the category's color
- Keep gradients subtle (no neon, no harsh contrasts)
- Consistent ring thickness and icon sizing across ALL cards

### Typography
- Primary font: DM Sans (import from Google Fonts)
- Values: 26px bold
- Card titles: 13px, font-weight 650
- Source badges: 9.5px uppercase
- Body: 12-13px

### Spacing and Layout
- Card grid gap: 18-20px
- Card border-radius: 14px
- Card internal padding: 18px horizontal, 14-18px vertical
- Sidebar expanded: 210px, collapsed: 60px

### Interactions
- Card hover: translateY(-2px), colored border, enhanced shadow
- Sidebar collapse: smooth 0.25s transition
- Drawer: slide-in from right with backdrop blur
- "/" focuses search
- Escape closes drawer
- All transitions: cubic-bezier(0.4, 0, 0.2, 1)

---

## RUNNING LOCALLY

```bash
git clone <repo>
cd india-macro-tracker
cp .env.example .env.local
npm install
npm run dev
# Open http://localhost:3000
```

To switch to live MoSPI data:
```
# In .env.local
DATA_SOURCE=mospi
```
