# CityTracker

Paris public transport routing application (Metro, RER, Tram).

## Architecture

- **Monorepo** with pnpm workspaces: `server/` + `client/`
- **Server**: Express 5 + Prisma 6 + PostgreSQL + Zod + TypeScript
- **Client**: React 19 + React Router 7 + React Leaflet + Tailwind CSS + Vite
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
    index.ts              # Express entry point, route registration
    env.ts                # Zod env validation
    lib/
      prisma.ts           # Prisma client singleton
      graph.ts            # Transport graph (adjacency list from DB)
      pathfinder.ts       # Dijkstra routing with transfer penalties
      prim.ts             # PRIM IDFM real-time API client
      departures.ts       # Route enrichment with real-time departures
    routes/
      stations.ts         # GET /api/stations
      route.ts            # GET /api/route?from=&to=
      departures.ts       # GET /api/departures?lineStopId=
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
    components/           # React UI components
    pages/                # Page components
    hooks/                # Custom React hooks (useRoute, useStations)
```

## Key Patterns

- ESM throughout (`"type": "module"`, `.js` extensions in imports)
- Prisma singleton in `server/src/lib/prisma.ts`
- Transport graph cached globally in `graph.ts`
- Server types defined in `pathfinder.ts`, mirrored in `client/src/types.ts`
- Env vars: `DATABASE_URL`, `PORT`, `PRIM_API_KEY`

## Database Models

- **Line**: Transport lines (M1-M14, RER-A/B/C/D/E, T1-T3A)
- **Station**: Physical stations with coordinates
- **LineStop**: Junction of line + station (position, travelTimeToNext)
- **Connection**: Walking transfers between line stops
- **IdfmStopMapping**: Maps LineStop → IDFM stop ID for real-time API
