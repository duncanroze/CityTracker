# CityTracker

Paris public transport routing application (Metro, RER, Tram).

## Architecture

- **Monorepo** with pnpm workspaces: `server/` + `client/`
- **Server**: Express 5 + Prisma 6 + PostgreSQL + Zod + TypeScript
- **Client**: React 19 + React Router 7 + React Leaflet + Tailwind CSS v4 + Vite + shadcn/ui
- **DB**: PostgreSQL via Docker Compose (`docker-compose.yml`)
- **Docker**: Multi-stage `Dockerfile` at root with `server` and `client` targets

## Key Commands

```bash
# Root
pnpm install              # install all deps
pnpm dev                  # run client + server in parallel

# Server
cd server
pnpm dev                  # tsx watch src/index.ts
pnpm db:migrate           # prisma migrate dev
pnpm db:seed              # prisma db seed
pnpm db:generate          # prisma generate

# Client
cd client
pnpm dev                  # vite dev server

# Docker (runs all 3 services: postgres, server, client)
docker compose up --build
```

## Project Structure

```
server/
  src/
    index.ts              # Express entry, routes, error handler, graceful shutdown
    env.ts                # Zod env validation (DATABASE_URL, PORT, PRIM_API_KEY)
    lib/
      prisma.ts           # Prisma client singleton
      graph.ts            # Transport graph (adjacency list from DB) + line termini
      pathfinder.ts       # Dijkstra routing with transfer penalties + direction info
      prim.ts             # PRIM IDFM real-time API client (SIRI Lite)
      departures.ts       # Route enrichment with real-time departures & wait times
      headways.ts         # Per-line headway tracking (from PRIM data, with defaults)
      disruptions.ts      # Line disruption status from PRIM general-message API
    routes/
      stations.ts         # GET /api/stations
      route.ts            # GET /api/route?from=&to=
      lines.ts            # GET /api/lines (all lines with ordered stations)
      departures.ts       # GET /api/departures?lineStopId=
      disruptions.ts      # GET /api/disruptions
  prisma/
    schema.prisma         # DB schema
    seed.ts               # Main seed script
    seed-idfm.ts          # IDFM stop mapping seed
    data/
      paris-transport.ts  # Static transport data (lines, stations, stops)
      idfm-mapping.ts     # Line code → IDFM ID mapping

client/
  src/
    types.ts              # Shared TypeScript interfaces
    App.tsx               # Router setup (nested routes under Layout)
    lib/
      utils.ts            # cn() utility (clsx + tailwind-merge)
    contexts/
      MapContext.tsx       # Persistent map state (overlay + dark mode) via React Context
    components/
      ui/                 # shadcn/ui primitives (card, badge, button, input, scroll-area, separator, skeleton, tooltip)
      Layout.tsx          # App shell: sidebar + map split, dark mode toggle, nav
      AppMap.tsx           # Persistent Leaflet map with overlays + station labels
      AppNav.tsx           # Tab navigation (Itinéraire, Lignes, Infos trafic)
      RouteForm.tsx        # Origin/destination form
      StationPicker.tsx    # Station autocomplete input
      RouteOptions.tsx     # Route alternatives list
      RouteOptionBubbles.tsx # Metro-style circle bubble cards for route options
      RouteResult.tsx      # Detailed route view
      RouteSummary.tsx     # Duration/stations/transfers grid
      RouteSegment.tsx     # Vertical timeline with stops + direction
      TransferIndicator.tsx # Walking transfer between segments
      LineBadge.tsx        # Line badge with disruption indicator
    pages/
      ItinerairePage.tsx   # Route planning (form + results in sidebar, map overlay)
      LignesPage.tsx       # All lines grid with station counts + disruption dots
      LigneDetailPage.tsx  # Single line detail with station timeline + map overlay
      TraficPage.tsx       # Disruption dashboard for all lines
    hooks/
      useRoute.ts          # Route search hook
      useStations.ts       # Station list hook
      useLines.ts          # Lines list hook
      useDisruptions.ts    # Disruption polling hook
```

## Key Patterns

- ESM throughout (`"type": "module"`, `.js` extensions in imports)
- Prisma singleton in `server/src/lib/prisma.ts`
- Transport graph cached globally in `graph.ts`, includes `lineTermini` for direction info
- Server types defined in `pathfinder.ts`, mirrored in `client/src/types.ts`
- Env vars validated via Zod in `env.ts`: `DATABASE_URL`, `PORT`, `PRIM_API_KEY` (optional)
- Global error handler middleware in `index.ts`, all routes use try-catch + `next(err)`
- Graceful shutdown on SIGTERM/SIGINT with `prisma.$disconnect()`

## UI Layout

- **Sidebar + Map split**: 380px fixed sidebar on the left, persistent Leaflet map fills the rest
- **Tab navigation**: 3 tabs in header (Itinéraire, Lignes, Infos trafic) via React Router nested routes
- **MapContext**: React Context manages map overlay state and dark mode; pages push overlays, map consumes them
- **Layout pattern**: `Layout` renders `MapProvider`, `LayoutInner` consumes context (split needed because provider and consumer can't be the same component)

## UI Design System

- shadcn/ui components with CSS variables (light + dark mode via `.dark` class)
- Design principle: neutral grayscale shell, transport line colors are the only chromatic elements
- Dark mode state managed in MapContext, persisted in localStorage, toggleable from header
- Tailwind CSS v4 with `@theme inline {}` and `@custom-variant dark`
- Map uses CartoDB Light/Dark tiles, TileLayer keyed by theme to force remount on toggle
- Station name labels: permanent at zoom >= 13, hover-only below; styled with transparent Leaflet tooltip overrides
- Route option cards: metro-style circle bubbles (rounded-full for metro, rounded-md for RER) with line colors
- Line codes stripped of transport prefix in bubbles: M1→1, RER-A→A, T1 kept as-is

## Real-time Departures & Wait Times

- PRIM (IDFM SIRI Lite) provides real-time next departures per stop
- `departures.ts` enriches routes sequentially: arrival time propagates through segments
- Wait time per segment = time between arrival at station and next real-time departure
- Fallback: when PRIM has no future departures for the estimated arrival time, uses `headway/2` from `headways.ts`
- `totalDurationSeconds` includes travel + walking transfers + wait times at each boarding
- Enrichment failures are handled per-route (individual failures fall back to un-enriched route)

## Disruptions

- `lib/disruptions.ts` fetches line disruption status from PRIM general-message API
- Severity levels: `ok`, `disrupted`, `interrupted`
- Results cached for 1 minute
- Client polls via `useDisruptions` hook, displays inline alerts in route segments and on Lignes/Trafic pages

## Database Models

- **Line**: Transport lines (M1-M14, RER-A/B/C/D/E, T1-T3A)
- **Station**: Physical stations with coordinates
- **LineStop**: Junction of line + station (position, travelTimeToNext)
- **Connection**: Walking transfers between line stops
- **IdfmStopMapping**: Maps LineStop → IDFM stop ID for real-time API

## Docker

- Single multi-stage `Dockerfile` at root: `base` → `server` / `client` targets
- `docker-compose.yml` runs 3 services: `postgres`, `server`, `client`
- Volume mounts for hot-reload: `./server/src`, `./client/src`
- Client Vite proxy target configured via `VITE_API_URL` env var
- Server depends on postgres healthcheck, client depends on server
