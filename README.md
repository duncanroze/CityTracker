# CityTracker

Application de calcul d'itinéraires pour les transports en commun parisiens (Métro, RER, Tramway).

## Fonctionnalités

- **Itinéraire** : recherche d'itinéraire entre deux stations avec plusieurs alternatives triées par durée
- **Lignes** : visualisation de toutes les lignes avec leurs stations sur la carte
- **Infos trafic** : tableau de bord des perturbations en temps réel (via l'API PRIM IDFM)
- **Carte interactive** : carte Leaflet avec affichage des tracés, des arrêts et de leurs noms
- **Dark mode** : thème clair/sombre avec tuiles CartoDB adaptées

## Prérequis

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) >= 9
- [Docker](https://www.docker.com/) et Docker Compose

## Installation

### Option 1 : Docker (recommandé)

Lancer les 3 services (PostgreSQL, serveur, client) en une seule commande :

```bash
docker compose up --build
```

L'application sera accessible sur :
- **Client** : http://localhost:5173
- **Serveur API** : http://localhost:3000

Puis initialiser la base de données (une seule fois) :

```bash
# Dans un autre terminal
docker compose exec server pnpm db:migrate
docker compose exec server pnpm db:seed
```

Pour activer les données temps réel IDFM (optionnel, nécessite une clé API PRIM) :

```bash
# Créer un fichier .env à la racine avec votre clé
echo 'PRIM_API_KEY=votre_cle_ici' > .env

# Relancer les services
docker compose up --build
```

### Option 2 : Installation locale

#### 1. Base de données

Lancer PostgreSQL via Docker :

```bash
docker compose up postgres -d
```

#### 2. Serveur

```bash
# Configurer l'environnement
cp server/.env.example server/.env

# Installer les dépendances
pnpm install

# Générer le client Prisma, migrer et seeder la base
cd server
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Lancer le serveur de développement
pnpm dev
```

Le serveur sera accessible sur http://localhost:3000.

#### 3. Client

```bash
cd client
pnpm dev
```

Le client sera accessible sur http://localhost:5173.

## Variables d'environnement

### Serveur (`server/.env`)

| Variable       | Description                              | Requis | Défaut |
| -------------- | ---------------------------------------- | ------ | ------ |
| `DATABASE_URL` | URL de connexion PostgreSQL              | Oui    | -      |
| `PORT`         | Port du serveur Express                  | Non    | `3000` |
| `PRIM_API_KEY` | Clé API PRIM IDFM (départs temps réel)  | Non    | -      |

## Stack technique

- **Monorepo** pnpm workspaces (`server/` + `client/`)
- **Serveur** : Express 5, Prisma 6, PostgreSQL, Zod, TypeScript
- **Client** : React 19, React Router 7, React Leaflet, Tailwind CSS v4, shadcn/ui, Vite
- **Docker** : Dockerfile multi-stage avec cibles `server` et `client`

## API

| Endpoint                          | Description                        |
| --------------------------------- | ---------------------------------- |
| `GET /api/stations`               | Liste de toutes les stations       |
| `GET /api/route?from=&to=`        | Calcul d'itinéraires               |
| `GET /api/lines`                  | Toutes les lignes avec stations    |
| `GET /api/departures?lineStopId=` | Prochains départs temps réel       |
| `GET /api/disruptions`            | Perturbations en cours par ligne   |

## Linting & Formatting

```bash
pnpm lint
pnpm format
```
