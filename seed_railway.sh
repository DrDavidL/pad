#!/bin/bash

# Seed research IDs on Railway
# Usage: ./seed_railway.sh YOUR_RAILWAY_API_URL [ADMIN_PASSWORD]

RAILWAY_URL="${1:-https://vera-pad.up.railway.app}"
ADMIN_PASSWORD="${2:-}"

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "Error: Admin password required"
  echo "Usage: ./seed_railway.sh [RAILWAY_URL] ADMIN_PASSWORD"
  exit 1
fi

echo "Seeding research IDs on Railway..."
echo "API URL: $RAILWAY_URL"
echo ""

curl -X POST "$RAILWAY_URL/api/v1/admin/seed-research-ids" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"$ADMIN_PASSWORD\"}" \
  | jq .

echo ""
echo "Done!"
