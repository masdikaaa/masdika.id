#!/bin/sh
set -e

# Ensure ephemeral buffer directory exists for temporary chunked upload streaming
mkdir -p /app/apps/web/storage/upload-buffers 2>/dev/null || true

# Apply database migrations before starting the application
echo "Applying database schema changes..."
(cd /app/apps/web && npx prisma db push --accept-data-loss) || echo "Warning: Prisma db push failed, continuing anyway..."

# Run the provided command as the non-root 'nextjs' user
exec "$@"
