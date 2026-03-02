# CityTracker

Paris public transport routing application (Metro, RER, Tram, Transilien).

## Project Overview

This is a TypeScript monorepo (CityTracker) using Next.js, Prisma, Neon PostgreSQL, and deployed on Vercel. The primary language is TypeScript — always use TypeScript, not JavaScript.

## Execution Rules

When asked to run a command (docker compose, db:push, deploy, etc.), execute it immediately. Do not enter plan mode or write a plan file unless explicitly asked to plan.

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

# Pipeline Dashboard (development tool)
cd dashboard && pnpm dev       # Vite dev server on http://localhost:5173
cd dashboard && pnpm server    # WS server on http://localhost:3002
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
  RouteForm.tsx             # Origin/destination form with favorites star + share button
  StationPicker.tsx         # Station autocomplete (address + stations)
  RouteOptions.tsx          # Route alternatives list with sort (fastest/transfers/walking)
  RouteOptionBubbles.tsx    # Metro-style bubble cards with ETA display
  RouteResult.tsx           # Detailed route view
  RouteSummary.tsx          # Duration/stations/transfers/ETA grid
  RouteSegment.tsx          # Vertical timeline with stops + real-time countdown
  TransferIndicator.tsx     # Walking transfer indicator
  LineBadge.tsx             # Line badge with disruption dot
  MobileDrawer.tsx          # Responsive drawer for mobile view

contexts/
  MapContext.tsx            # Map overlay state, dark mode, share deep-linking (React Context)

hooks/
  useRoute.ts               # Route search (fetch /api/route)
  useStations.ts            # Station list (fetch /api/stations)
  useLines.ts               # Lines list (fetch /api/lines)
  useDisruptions.ts         # Disruption polling (fetch /api/disruptions)
  useGeocode.ts             # Reverse geocoding (fetch /api/geocode)
  useFavorites.ts           # Favorite routes (localStorage, max 10)

lib/
  utils.ts                  # cn() utility (clsx + tailwind-merge)
  server/
    prisma.ts               # Prisma client singleton (globalThis pattern)
    env.ts                  # Zod env validation (DATABASE_URL, PRIM_API_KEY)
    graph.ts                # Transport graph (adjacency list from DB) + line termini + retry logic
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

dashboard/                   # Pipeline monitoring dashboard (dev tool)
  server/
    protocol.ts             # Shared TypeScript types (WS messages, agents, state)
    ws-server.ts            # HTTP + WebSocket server (port 3002)
  src/
    App.tsx                 # Root app component
    main.tsx                # Vite entry point
    globals.css             # Dashboard-specific Tailwind theme
    lib/
      types.ts              # Frontend type definitions
      config.ts             # Agent config, status styles, demo scenarios
      utils.ts              # cn() utility
    hooks/
      usePipelineSocket.ts  # WebSocket client hook (auto-reconnect)
      useElapsedTime.ts     # Elapsed time counter
    components/
      AgentDashboard.tsx    # Main dashboard orchestrator
      AgentCard.tsx         # Individual agent status card (clickable)
      AgentDetailPanel.tsx  # Agent detail drawer (logs, feedback, score)
      PipelineView.tsx      # Pipeline layout with dependency connectors
      PhaseTracker.tsx      # Phase progress indicator with iteration badge
      ActivityLog.tsx       # Real-time log stream with feedback styling
      SummaryBanner.tsx     # Pipeline completion summary
      RunHistory.tsx        # Past pipeline runs list
```

## Key Patterns

- Next.js App Router with `'use client'` directives for interactive components
- API Route Handlers (`export async function GET(request: NextRequest)`) replace Express routes
- Prisma singleton via `globalThis` (works in serverless)
- Transport graph cached at module level, rebuilds on cold start (~1s for ~600 nodes)
- Graph build retries 3 times with exponential backoff (2s, 4s, 6s) to handle Neon cold starts
- `@/*` path alias resolves from project root
- React Leaflet loaded via `next/dynamic` with `ssr: false` (Leaflet requires `window`)

## Multi-Branch Line Rendering

- Lines with multiple branches use `positionOffset` in `paris-transport.ts` (trunk: positions 0-N, branches: 100+, 200+, 300+)
- Branch detection: position gap > 1 between consecutive stations indicates a new branch (used in `graph.ts` and `AppMap.tsx`)
- `AppMap.tsx` splits stations into separate Polylines per branch to avoid diagonal lines between branch endpoints
- Metro lines with branches: M7 (Villejuif + Ivry), M10 (trunk + Auteuil loop), M13 (Saint-Denis + Les Courtilles)
- RER/Transilien lines also use branches extensively (e.g., RER A has 5 branches, RER C has 5+)

## Station Coordinate Data

- All 557 station coordinates verified against OpenStreetMap (Overpass API) to <20m accuracy
- Stations shared across transport types may have separate DB entries with suffixed slugs (e.g., `porchefontaine` for RER-C, `porchefontaine-l` for Transilien L; `porte-de-clichy` for Metro, `porte-de-clichy-rerc` for RER-C)
- Similar station names on different lines are distinct entries: `chatelet` (Metro) vs `chatelet-les-halles` (RER); `saint-michel` (M4) vs `saint-michel-notre-dame` (RER-B/C)

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

## Styling / CSS

This project uses Tailwind CSS v4 with `@theme inline` styles. When fixing dark mode issues, note that `@theme inline` declarations take priority over `.dark` CSS variables. Apply dark mode overrides with sufficient specificity or use the correct v4 approach.

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

## Database

The database is Neon PostgreSQL in production. Prisma reads `.env` (not `.env.local`). When seeding or migrating, confirm whether the target is the local Docker DB or Neon production DB. For Neon, use an extended transaction timeout (e.g., `--timeout 60000`) to avoid seed timeouts.

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

## Dev Environment

### Quick Start

```bash
# First time setup
cp .env.example .env          # Edit with your credentials
pnpm install                  # Install deps (runs prisma generate via postinstall)
cd dashboard && pnpm install  # Dashboard deps (optional)
cd ..

# Start dev (Neon DB from .env)
./scripts/dev-start.sh

# Start dev (local Docker PostgreSQL)
./scripts/dev-start.sh --local-db

# Start dev + pipeline dashboard
./scripts/dev-start.sh --with-dashboard

# Diagnose environment issues
./scripts/dev-doctor.sh
```

### Dev Scripts

| Script | Purpose |
|---|---|
| `scripts/dev-doctor.sh` | Diagnose environment issues (Node, pnpm, Docker, DB, ports) |
| `scripts/dev-start.sh` | Validate prerequisites + start dev server (idempotent) |
| `scripts/dev-start.sh --local-db` | Use Docker PostgreSQL instead of Neon |
| `scripts/dev-start.sh --with-dashboard` | Also start pipeline dashboard on :3001/:3002 |
| `scripts/dev-start.sh --seed` | Force re-seed the database on startup |

### Environment Variables

- `.env` is the primary env file — **Prisma reads `.env`, not `.env.local`**
- `.env.example` is the template — copy it and fill in values
- For local Docker DB: `DATABASE_URL=postgresql://citytracker:citytracker@localhost:5432/citytracker`
- `PRIM_API_KEY` is optional; without it, real-time features degrade gracefully

### Ports

| Port | Service | Notes |
|---|---|---|
| 3000 | Next.js dev server | Main application |
| 3001 | Dashboard Vite | Pipeline monitoring (optional) |
| 3002 | Dashboard WS server | Pipeline WebSocket (optional) |
| 5432 | PostgreSQL | Docker container (if using --local-db) |

### Common Issues

- **Docker socket permission denied**: `sudo usermod -aG docker $USER && newgrp docker`
- **Neon cold start timeout**: First connection after inactivity may take 3-5s; graph builder retries automatically
- **Port already in use**: `dev-start.sh` auto-kills stale processes; or run `lsof -ti :3000 | xargs kill`
- **Prisma client not generated**: Run `pnpm db:generate` (normally handled by postinstall)
- **`.env` vs `.env.local`**: Prisma ONLY reads `.env`. Next.js reads both, but DB credentials must be in `.env`
- **Neon vs local DB**: Default `.env` points to Neon (production). Use `--local-db` flag or manually set `DATABASE_URL` to localhost

Never spawn multiple dev server instances. Before starting a dev server, check for existing running instances with `lsof -i :3000` (or the relevant port) and kill any zombie processes first.

## Git Workflow

The `gh` CLI may not be available or on PATH. For git operations, prefer direct `git` commands. Do not suggest creating PRs when work is being pushed directly to main.

## Deployment

- **Vercel project**: `citytracker` (team: `duncans-projects-1257a09e`)
- All env vars (`DATABASE_URL`, `DIRECT_URL`, `PRIM_API_KEY`) are set for production, preview, and development
- Auto-detected as Next.js; `postinstall` script runs `prisma generate` during build
- **Neon**: Vercel-integrated Neon PostgreSQL. `DATABASE_URL` = pooler URL, `DIRECT_URL` = direct URL for migrations
- **Local dev**: `pnpm dev` for Next.js (connects to Neon directly via .env)
- **Docker**: `docker-compose.yml` available for local PostgreSQL (optional)
- **Vercel CLI**: `vercel` (linked via `.vercel/project.json`), `vercel env ls` to list env vars

## UX Features

### ETA (Estimated Time of Arrival)
- Displayed in `RouteSummary` and `RouteOptionBubbles` as "Arrivée à HH:MM"
- Calculated: current time + `totalDurationSeconds`

### Real-time Departure Countdown
- `RouteSegment` shows "Prochain départ dans X min" when `nextDeparture` is available
- Live countdown timer updates every second via `useEffect` interval

### Route Sharing & Deep Linking
- Share button in `RouteOptions` generates URL: `/?from=lat,lng,label&to=lat,lng,label`
- `MapContext` parses query params on page load to pre-fill origin/destination
- Uses `navigator.clipboard` with fallback to `navigator.share`

### Favorites (localStorage)
- `useFavorites` hook manages up to 10 saved routes in `localStorage` key `citytracker-favorites`
- Star button in `RouteForm` toggles save/remove
- Favorites displayed above search form when no route is active
- Each favorite stores `{ from: {lat, lng, label}, to: {lat, lng, label}, createdAt }`

## Pipeline Dashboard (Development Tool)

Separate Vite + React app in `dashboard/` for monitoring multi-agent pipeline execution.

### Stack
- **Vite** + **React 19** + **Tailwind CSS v4** + **lucide-react**
- **WebSocket server** (Node.js `ws` + `http`) on port 3002
- No database — state in memory, history persisted to `pipeline-history.json`

### WS Server API (`localhost:3002`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/state` | POST | Update pipeline state (agents, phase, status, request) |
| `/api/log` | POST | Append log entry `{ agent, msg }` |
| `/api/score` | POST | Update agent score `{ agent, score }` (0-100) |
| `/api/feedback` | POST | Post review feedback with optional re-dispatch |
| `/api/reset` | POST | Reset pipeline to idle |
| `/api/health` | GET | Health check + connected client count |
| `/api/history` | GET | All past pipeline runs |

### Agents & Dependencies
- 5 agents: `planner`, `designer`, `backend`, `reviewer`, `tester`
- Dependency graph: `planner → designer + backend (parallel) → reviewer → tester`
- **Auto-progression**: when `autoApprove` is true, agents auto-start when all dependencies are completed
- Phases: 0=idle, 1=planning, 2=executing, 3=reviewing, 4=testing

### Feedback & Re-dispatch
- Reviewer or tester can send feedback targeting other agents
- Feedback payload: `{ from, target, action, severity, message }`
- Actions: `redispatch` (re-runs target agents) or `note` (informational)
- Severities: `info`, `warning`, `blocking`
- Re-dispatch resets target agents + all transitive downstream agents to idle
- Iteration limit: `maxIterations` (default 3), prevents infinite loops
- Pipeline auto-resets 8 seconds after completion

### Status Colors
- **Running/active**: amber (#f59e0b)
- **Completed**: emerald/green (#22c55e)
- **Error**: red (#ef4444)
- **Idle**: slate gray (#64748b)
- **Blocked**: fuchsia (#d946ef)
