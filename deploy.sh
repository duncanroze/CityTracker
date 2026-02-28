#!/usr/bin/env bash
set -euo pipefail

# CityTracker deploy script
# Usage: ./deploy.sh [--seed] [--preview]

SEED=false
PROD=true

for arg in "$@"; do
  case $arg in
    --seed)    SEED=true ;;
    --preview) PROD=false ;;
    --help|-h)
      echo "Usage: ./deploy.sh [--seed] [--preview]"
      echo "  --seed     Run DB migration + seed after deploy"
      echo "  --preview  Deploy to preview instead of production"
      exit 0 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

echo "==> Building locally to check for errors..."
pnpm build

echo ""
if [ "$PROD" = true ]; then
  echo "==> Deploying to production..."
  vercel --prod --yes
else
  echo "==> Deploying to preview..."
  vercel --yes
fi

if [ "$SEED" = true ]; then
  echo ""
  echo "==> Running database migration..."
  npx prisma migrate deploy

  echo ""
  echo "==> Seeding database..."
  npx prisma db seed

  echo ""
  echo "==> Seeding IDFM mappings..."
  npx tsx prisma/seed-idfm.ts
fi

echo ""
echo "Deploy complete!"
