# CityTracker

Application web de navigation pour les transports en commun parisiens (metro, RER, tramway, bus).

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

## Installation

```bash
pnpm install
```

## Development

Start both client and server:

```bash
pnpm dev
```

Or individually:

```bash
pnpm dev:client   # Vite dev server on http://localhost:5173
pnpm dev:server   # Express server on http://localhost:3000
```

## Database

Start PostgreSQL:

```bash
docker compose up -d
```

Run migrations:

```bash
pnpm --filter server db:migrate
```

## Linting & Formatting

```bash
pnpm lint
pnpm format
```
