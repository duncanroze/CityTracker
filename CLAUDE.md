# CityTracker

Paris public transport routing application (Metro, RER, Tram, Transilien).

## Architecture

- **Next.js 16** App Router — single deployable app (frontend + API)
- **Prisma 6** + PostgreSQL (Neon on Vercel, Docker locally)
- **React 19** + Tailwind CSS v4 + shadcn/ui + React Leaflet
- **Vercel** serverless deployment (free tier compatible)

## Key Commands

```bash
# Development
pnpm install              # install deps (runs prisma generate via postinstall)
pnpm dev                  # next dev on http://localhost:3000

# Database
pnpm db:generate          # prisma generate
pnpm db:migrate           # prisma migrate dev
pnpm db:seed              # prisma db seed (seed.ts + seed-idfm.ts)

# Build & Production
pnpm build                # next build
pnpm start                # next start

# Docker (PostgreSQL only, for local dev)
docker compose up -d
```

## Project Structure

```
app/
  layout.tsx                # Root layout (html, body, metadata, globals.css)
  globals.css               # Tailwind v4 + shadcn/ui CSS variables + Leaflet overrides
  (main)/
    layout.tsx              # Sidebar + Map layout wrapper
    page.tsx                # Itinéraire — route planning
    lignes/
      page.tsx              # All lines grid
      [lineCode]/
        page.tsx            # Line detail with station timeline
    trafic/
      page.tsx              # Disruption dashboard
  api/
    stations/route.ts       # GET /api/stations
    route/route.ts          # GET /api/route?from=&to=
    lines/route.ts          # GET /api/lines
    departures/route.ts     # GET /api/departures?lineStopId=
    disruptions/route.ts    # GET /api/disruptions

components/
  ui/                       # shadcn/ui primitives
  Layout.tsx                # App shell: sidebar + map split, dark mode toggle, nav
  AppMap.tsx                # Leaflet map (loaded via next/dynamic, ssr: false)
  AppNav.tsx                # Tab navigation (next/link + usePathname)
  RouteForm.tsx             # Origin/destination form
  StationPicker.tsx         # Station autocomplete
  RouteOptions.tsx          # Route alternatives list
  RouteOptionBubbles.tsx    # Metro-style bubble cards
  RouteResult.tsx           # Detailed route view
  RouteSummary.tsx          # Duration/stations/transfers grid
  RouteSegment.tsx          # Vertical timeline with stops
  TransferIndicator.tsx     # Walking transfer indicator
  LineBadge.tsx             # Line badge with disruption dot

contexts/
  MapContext.tsx            # Map overlay state + dark mode (React Context)

hooks/
  useRoute.ts               # Route search (fetch /api/route)
  useStations.ts            # Station list (fetch /api/stations)
  useLines.ts               # Lines list (fetch /api/lines)
  useDisruptions.ts         # Disruption polling (fetch /api/disruptions)

lib/
  utils.ts                  # cn() utility (clsx + tailwind-merge)
  server/
    prisma.ts               # Prisma client singleton (globalThis pattern)
    env.ts                  # Zod env validation (DATABASE_URL, PRIM_API_KEY)
    graph.ts                # Transport graph (adjacency list from DB) + line termini
    pathfinder.ts           # Dijkstra routing with transfer penalties + direction
    prim.ts                 # PRIM IDFM real-time API client (SIRI Lite)
    departures.ts           # Route enrichment with real-time departures & wait times
    headways.ts             # Per-line headway tracking (from PRIM data, with defaults)
    disruptions.ts          # Line disruption status from PRIM general-message API

types/
  index.ts                  # Shared TypeScript interfaces

prisma/
  schema.prisma             # DB schema (with directUrl for Neon)
  seed.ts                   # Main seed script
  seed-idfm.ts             # IDFM stop mapping seed
  data/
    paris-transport.ts      # Static transport data
    idfm-mapping.ts         # Line code → IDFM ID mapping
```

## Key Patterns

- Next.js App Router with `'use client'` directives for interactive components
- API Route Handlers (`export async function GET(request: NextRequest)`) replace Express routes
- Prisma singleton via `globalThis` (works in serverless)
- Transport graph cached at module level, rebuilds on cold start (~1s for ~600 nodes)
- `@/*` path alias resolves from project root
- React Leaflet loaded via `next/dynamic` with `ssr: false` (Leaflet requires `window`)

## UI Layout

- **Sidebar + Map split**: 380px fixed sidebar on the left, persistent Leaflet map fills the rest
- **Tab navigation**: 3 tabs (Itinéraire, Lignes, Infos trafic) via `next/link` + `usePathname()`
- **MapContext**: React Context manages map overlay state and dark mode; pages push overlays, map consumes them
- **Layout pattern**: `Layout` renders `MapProvider`, `LayoutInner` consumes context

## UI Design System

- shadcn/ui components with CSS variables (light + dark mode via `.dark` class)
- Design principle: neutral grayscale shell, transport line colors are the only chromatic elements
- Dark mode state managed in MapContext, persisted in localStorage, toggleable from header
- Tailwind CSS v4 with `@theme inline {}` and `@custom-variant dark`
- Map uses CartoDB Light/Dark tiles, TileLayer keyed by theme to force remount on toggle
- Route option cards: metro-style circle bubbles with line colors; RER/Transilien use rounded rectangles

## Real-time Departures & Wait Times

- PRIM (IDFM SIRI Lite) provides real-time next departures per stop
- `departures.ts` enriches routes sequentially: arrival time propagates through segments
- Wait time per segment = time between arrival at station and next real-time departure
- Fallback: when PRIM has no future departures, uses `headway/2` from `headways.ts`
- `totalDurationSeconds` includes travel + walking transfers + wait times at each boarding

## Disruptions

- `lib/server/disruptions.ts` fetches line disruption status from PRIM general-message API
- Severity levels: `ok`, `disrupted`, `interrupted`
- Results cached for 1 minute
- Client polls via `useDisruptions` hook

## Database Models

- **Line**: Transport lines (M1-M14, RER-A/B/C/D/E, T1-T3A, Transilien H/J/K/L/N/P/R/U)
- **Station**: Physical stations with coordinates
- **LineStop**: Junction of line + station (position, travelTimeToNext)
- **Connection**: Walking transfers between line stops
- **IdfmStopMapping**: Maps LineStop → IDFM stop ID for real-time API

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon pooler URL) | Yes |
| `DIRECT_URL` | PostgreSQL direct URL (for Prisma migrations) | Yes |
| `PRIM_API_KEY` | IDFM PRIM API key for real-time data | Optional (degrades gracefully) |

## Deployment

- **Vercel project**: `citytracker` (team: `duncans-projects-1257a09e`)
- All env vars (`DATABASE_URL`, `DIRECT_URL`, `PRIM_API_KEY`) are set for production, preview, and development
- Auto-detected as Next.js; `postinstall` script runs `prisma generate` during build
- **Neon**: Vercel-integrated Neon PostgreSQL. `DATABASE_URL` = pooler URL, `DIRECT_URL` = direct URL for migrations
- **Local dev**: `pnpm dev` for Next.js (connects to Neon directly via .env)
- **Docker**: `docker-compose.yml` available for local PostgreSQL (optional)
- **Vercel CLI**: `vercel` (linked via `.vercel/project.json`), `vercel env ls` to list env vars
