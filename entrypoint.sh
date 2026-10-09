#!/bin/sh
set -e

# Fix permissions for the bind-mounted uploads and secure media directories
mkdir -p /app/apps/web/public/uploads /app/apps/web/storage/secure-media /app/apps/web/storage/tickets
mkdir -p /app/prometheus_data /app/grafana_data

# Fix permissions for external services securely without 777.
# Prometheus runs as nobody (65534), Grafana runs as grafana (472).
chown -R 65534:65534 /app/prometheus_data 2>/dev/null || true
chown -R 472:472 /app/grafana_data 2>/dev/null || true

# Set safe permissions: 755 for directories, 644 for files (non-executable)
find /app/apps/web/public/uploads /app/apps/web/storage/secure-media /app/apps/web/storage/tickets -type d -exec chmod 755 {} \; 2>/dev/null || true
find /app/apps/web/public/uploads /app/apps/web/storage/secure-media /app/apps/web/storage/tickets -type f -exec chmod 644 {} \; 2>/dev/null || true
chown -R nextjs:nodejs /app/apps/web/public/uploads /app/apps/web/storage/secure-media /app/apps/web/storage/tickets


# Apply database migrations before starting the application
echo "Applying database schema changes..."
su-exec nextjs sh -c "cd /app/apps/web && npx prisma db push --accept-data-loss" || echo "Warning: Prisma db push failed, continuing anyway..."

# Drop privileges and run the provided command (e.g. node server.js) as the 'nextjs' user
exec su-exec nextjs "$@"

