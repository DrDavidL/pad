#!/bin/bash

# Seed research IDs on Railway
# Usage: ./seed_railway.sh YOUR_RAILWAY_API_URL

RAILWAY_URL="${1:-https://pad-production.up.railway.app}"
ADMIN_PASSWORD="phPH3sA!"

echo "Seeding research IDs on Railway..."
echo "API URL: $RAILWAY_URL"
echo ""

curl -X POST "$RAILWAY_URL/api/v1/admin/seed-research-ids" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"$ADMIN_PASSWORD\"}" \
  | jq .

echo ""
echo "Done!"
