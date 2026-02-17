# CityTracker

Paris public transport routing application (Metro, RER, Tram).

## Architecture

- **Monorepo** with pnpm workspaces: `server/` + `client/`
- **Server**: Express 5 + Prisma 6 + PostgreSQL + Zod + TypeScript
- **Client**: React 19 + React Router 7 + React Leaflet + Tailwind CSS v4 + Vite + shadcn/ui
- **DB**: PostgreSQL via Docker Compose (`docker-compose.yml`)

## Key Commands

```bash
# Root
pnpm install              # install all deps

# Server
cd server
pnpm dev                  # tsx watch src/index.ts
pnpm db:migrate           # prisma migrate dev
pnpm db:seed              # prisma db seed
pnpm db:generate          # prisma generate

# Client
cd client
pnpm dev                  # vite dev server
```

## Project Structure

```
server/
  src/
    index.ts              # Express entry, routes, error handler, graceful shutdown
    env.ts                # Zod env validation (DATABASE_URL, PORT, PRIM_API_KEY)
    lib/
      prisma.ts           # Prisma client singleton
      graph.ts            # Transport graph (adjacency list from DB)
      pathfinder.ts       # Dijkstra routing with transfer penalties
      prim.ts             # PRIM IDFM real-time API client (SIRI Lite)
      departures.ts       # Route enrichment with real-time departures & wait times
      headways.ts         # Per-line headway tracking (from PRIM data, with defaults)
      disruptions.ts      # Line disruption status from PRIM general-message API
    routes/
      stations.ts         # GET /api/stations
      route.ts            # GET /api/route?from=&to=
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
    App.tsx               # Router setup
    lib/
      utils.ts            # cn() utility (clsx + tailwind-merge)
    components/
      ui/                 # shadcn/ui primitives (card, badge, button, input, separator, skeleton)
      Layout.tsx          # App shell with dark mode toggle
      RouteForm.tsx       # Origin/destination form
      StationPicker.tsx   # Station autocomplete input
      RouteOptions.tsx    # Route alternatives list
      RouteOptionCard.tsx # Proportional segment bar card (memo)
      RouteResult.tsx     # Detailed route view
      RouteSummary.tsx    # Duration/stations/transfers grid
      RouteSegment.tsx    # Vertical timeline with stops
      TransferIndicator.tsx # Walking transfer between segments
      LineBadge.tsx       # Line badge with disruption indicator
      RouteMap.tsx        # Leaflet map with dark mode tiles
    pages/
      HomePage.tsx        # Main page with skeleton loading states
    hooks/
      useRoute.ts         # Route search hook
      useStations.ts      # Station list hook
      useDisruptions.ts   # Disruption polling hook
```

## Key Patterns

- ESM throughout (`"type": "module"`, `.js` extensions in imports)
- Prisma singleton in `server/src/lib/prisma.ts`
- Transport graph cached globally in `graph.ts`
- Server types defined in `pathfinder.ts`, mirrored in `client/src/types.ts`
- Env vars validated via Zod in `env.ts`: `DATABASE_URL`, `PORT`, `PRIM_API_KEY` (optional)
- Global error handler middleware in `index.ts`, all routes use try-catch + `next(err)`
- Graceful shutdown on SIGTERM/SIGINT with `prisma.$disconnect()`

## UI Design System

- shadcn/ui components with CSS variables (light + dark mode via `.dark` class)
- Design principle: neutral grayscale shell, transport line colors are the only chromatic elements
- Dark mode persisted in localStorage, toggleable from header
- Tailwind CSS v4 with `@theme inline {}` and `@custom-variant dark`
- Map uses CartoDB Dark Matter tiles in dark mode, OSM in light mode

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
- Client polls via `useDisruptions` hook, displays inline alerts in route segments

## Database Models

- **Line**: Transport lines (M1-M14, RER-A/B/C/D/E, T1-T3A)
- **Station**: Physical stations with coordinates
- **LineStop**: Junction of line + station (position, travelTimeToNext)
- **Connection**: Walking transfers between line stops
- **IdfmStopMapping**: Maps LineStop → IDFM stop ID for real-time API
