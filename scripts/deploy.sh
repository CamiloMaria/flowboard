#!/bin/bash
set -euo pipefail

# ── FlowBoard Deploy Script ──────────────────────────────────
# Usage: ./scripts/deploy.sh
# Run from the project root on the Oracle Cloud server.
# Or invoke remotely: ssh user@host 'cd ~/flowboard && ./scripts/deploy.sh'

DOMAIN="CHANGE_ME_TO_YOUR_DOMAIN"
COMPOSE_FILE="docker-compose.prod.yml"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building and starting containers..."
docker compose -f "$COMPOSE_FILE" up --build -d

echo "==> Waiting for API to be ready..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:3001/api/health" > /dev/null 2>&1; then
    echo "==> Health check passed!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "==> ERROR: Health check failed after 30 attempts"
    echo "==> Container logs:"
    docker compose -f "$COMPOSE_FILE" logs --tail=50 api
    exit 1
  fi
  sleep 2
done

echo "==> Verifying HTTPS endpoint..."
if curl -sf "https://$DOMAIN/api/health" > /dev/null 2>&1; then
  echo "==> HTTPS health check passed!"
else
  echo "==> WARNING: HTTPS health check failed. Check Nginx config."
fi

echo ""
echo "==> Deploy complete!"
echo "    API: https://$DOMAIN/api"
echo "    Health: https://$DOMAIN/api/health"
