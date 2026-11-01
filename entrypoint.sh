#!/bin/sh
set -e

# Ensure ephemeral buffer directory exists for temporary chunked upload streaming
mkdir -p /app/apps/web/storage/upload-buffers
chown -R nextjs:nodejs /app/apps/web/storage/upload-buffers 2>/dev/null || true

# Apply database migrations before starting the application
echo "Applying database schema changes..."
su-exec nextjs sh -c "cd /app/apps/web && npx prisma db push --accept-data-loss" || echo "Warning: Prisma db push failed, continuing anyway..."

# Drop privileges and run the provided command (e.g. node custom-server.js) as the 'nextjs' user
exec su-exec nextjs "$@"
