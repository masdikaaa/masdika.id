import * as k8s from '@kubernetes/client-node';
import { prisma } from './prisma';
import { decryptDeterministic } from './encryption';

export interface AppPlatformRecord {
  id: number;
  userId: number;
  name: string;
  gitUrl: string;
  branch: string;
  buildType: string; // DOCKERFILE, NODEJS, PYTHON, GOLANG, PHP, STATIC
  buildMode?: string | null; // DOCKERFILE, AUTO, BUILDPACK
  dockerfilePath?: string | null;
  rootDirectory?: string | null;
  buildCommand?: string | null;
  startCommand?: string | null;
  envVars?: string | null;
  healthCheckPath?: string | null;
  persistentVolumePath?: string | null;
  persistentVolumeGb?: number | null;
  enableBuildCache?: boolean | null;
  prPreviewEnabled?: boolean | null;
  subdomain: string;
  customDomain?: string | null;
  host: string;
  port: number;
  appPort: number;
  lastCommitHash?: string | null;
  lastCommitMessage?: string | null;
  lastBuildLog?: string | null;
  lastBuildStatus?: string | null;
  lastDeployedAt?: Date | null;
  planName: string;
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  billingMode: string;
  monthlyPrice: number;
  hourlyRate: number;
  accumulatedCost: number;
  status: string;
  suspendReason?: string | null;
  terminationDate?: Date | null;
  node?: string | null;
  k8sNamespace?: string | null;
  k8sDeployment?: string | null;
  k8sService?: string | null;
  k8sPvc?: string | null;
  k8sIngress?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AppPlatformClusterConfig {
  authMode: 'KUBECONFIG' | 'TOKEN';
  apiServer: string;
  kubeconfig?: string;
  serviceToken?: string;
  skipTlsVerify: boolean;
  publicDomain: string;
  publicIp: string;
  maxInstances: number;
  maxCpu: number;
  maxRamGb: number;
  maxDiskGb: number;
}

export interface AppPlatformCapacity {
  available: boolean;
  status: 'OPTIMAL' | 'WARNING' | 'FULL' | 'OFFLINE';
  capacityPercent: number;
  activeInstances: number;
  maxInstances: number;
  allocatedCpu: number;
  totalCpu: number;
  cpuPercent: number;
  allocatedMemoryMb: number;
  totalMemoryMb: number;
  memoryPercent: number;
  allocatedStorageGb: number;
  totalStorageGb: number;
  storagePercent: number;
  availablePorts: number;
  totalPorts: number;
  publicDomain?: string;
  publicIp?: string;
  reason?: string;
  userMessage?: string;
}

// In-memory atomic queue for port allocation to prevent race conditions
let portAllocationQueue: Promise<any> = Promise.resolve();
const recentlyReservedPorts = new Map<number, number>();

/**
 * Get App Platform Cluster configuration from database settings
 */
export async function getAppPlatformClusterConfig(): Promise<AppPlatformClusterConfig> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'app_platform_auth_mode',
          'app_platform_api_server',
          'app_platform_kubeconfig',
          'app_platform_service_token',
          'app_platform_skip_tls',
          'app_platform_public_domain',
          'app_platform_public_ip',
          'app_platform_max_instances',
          'app_platform_max_cpu',
          'app_platform_max_ram_gb',
          'app_platform_max_disk_gb',
        ],
      },
    },
  });

  const map = new Map<string, string>();
  for (const s of settings) {
    map.set(s.key, s.value);
  }

  let kubeconfig = map.get('app_platform_kubeconfig');
  if (kubeconfig) {
    try {
      kubeconfig = decryptDeterministic(kubeconfig);
    } catch {
      // Leave as is if not encrypted
    }
  }

  let serviceToken = map.get('app_platform_service_token');
  if (serviceToken) {
    try {
      serviceToken = decryptDeterministic(serviceToken);
    } catch {
      // Leave as is
    }
  }

  return {
    authMode: (map.get('app_platform_auth_mode') as 'KUBECONFIG' | 'TOKEN') || 'KUBECONFIG',
    apiServer: map.get('app_platform_api_server') || 'https://192.168.79.20:6443',
    kubeconfig,
    serviceToken,
    skipTlsVerify: map.get('app_platform_skip_tls') !== 'false',
    publicDomain: map.get('app_platform_public_domain') || 'app.masdikacloud.my.id',
    publicIp: map.get('app_platform_public_ip') || '206.237.98.230',
    maxInstances: parseInt(map.get('app_platform_max_instances') || '50', 10),
    maxCpu: parseFloat(map.get('app_platform_max_cpu') || '8.0'),
    maxRamGb: parseFloat(map.get('app_platform_max_ram_gb') || '16.0'),
    maxDiskGb: parseFloat(map.get('app_platform_max_disk_gb') || '96.0'),
  };
}

/**
 * Build KubeConfig instance for App Platform cluster
 */
export async function getAppPlatformKubeConfig(): Promise<k8s.KubeConfig> {
  const config = await getAppPlatformClusterConfig();
  const kc = new k8s.KubeConfig();

  if (config.authMode === 'KUBECONFIG' && config.kubeconfig && config.kubeconfig.trim().length > 0) {
    kc.loadFromString(config.kubeconfig.trim());
    const cluster = kc.getCurrentCluster();
    if (cluster && config.apiServer) {
      (cluster as any).server = config.apiServer.trim();
      if (config.skipTlsVerify) (cluster as any).skipTLSVerify = true;
    }
  } else if (config.serviceToken && config.apiServer) {
    kc.loadFromClusterAndUser(
      {
        name: 'app-platform-cluster',
        server: config.apiServer.trim(),
        skipTLSVerify: config.skipTlsVerify,
      },
      {
        name: 'app-platform-user',
        token: config.serviceToken.trim(),
      }
    );
  } else {
    throw new Error('Kubernetes API configuration is missing for App Platform.');
  }

  return kc;
}

/**
 * Get native K8s typed API clients
 */
export async function getAppPlatformK8sClients() {
  const kc = await getAppPlatformKubeConfig();
  return {
    kc,
    coreApi: kc.makeApiClient(k8s.CoreV1Api),
    appsApi: kc.makeApiClient(k8s.AppsV1Api),
    batchApi: kc.makeApiClient(k8s.BatchV1Api),
    netApi: kc.makeApiClient(k8s.NetworkingV1Api),
    customApi: kc.makeApiClient(k8s.CustomObjectsApi),
  };
}

/**
 * Check cluster capacity before ordering or deploying
 */
export async function checkAppPlatformCapacity(
  requestedCpu = 0,
  requestedRamMb = 0,
  requestedDiskGb = 0
): Promise<AppPlatformCapacity> {
  const config = await getAppPlatformClusterConfig();

  // Active instances in DB (exclude terminated or error instances)
  const activeApps = await prisma.appPlatformService.findMany({
    where: { status: { notIn: ['TERMINATED', 'ERROR'] } },
    select: { id: true, port: true, cpuShares: true, memoryMb: true, storageGb: true },
  });

  const activeInstances = activeApps.length;
  const allocatedCpu = parseFloat(activeApps.reduce((sum, a) => sum + (a.cpuShares || 0), 0).toFixed(1));
  const allocatedMemoryMb = activeApps.reduce((sum, a) => sum + (a.memoryMb || 0), 0);
  const allocatedStorageGb = activeApps.reduce((sum, a) => sum + (a.storageGb || 5), 0);
  const usedPorts = new Set(activeApps.map((a) => a.port));
  const totalPorts = 2768; // NodePort range 30000 - 32767
  const availablePorts = Math.max(0, totalPorts - usedPorts.size);

  const totalCpu = config.maxCpu > 0 ? config.maxCpu : 8.0;
  const totalMemoryMb = config.maxRamGb > 0 ? config.maxRamGb * 1024 : 16384;
  const totalStorageGb = config.maxDiskGb > 0 ? config.maxDiskGb : 96;
  const maxInstances = config.maxInstances > 0 ? config.maxInstances : 50;

  const cpuPercent = totalCpu > 0 ? Math.min(100, Math.round((allocatedCpu / totalCpu) * 100)) : 100;
  const memoryPercent = totalMemoryMb > 0 ? Math.min(100, Math.round((allocatedMemoryMb / totalMemoryMb) * 100)) : 100;
  const storagePercent = totalStorageGb > 0 ? Math.min(100, Math.round((allocatedStorageGb / totalStorageGb) * 100)) : 100;
  const instancePercent = maxInstances > 0 ? Math.min(100, Math.round((activeInstances / maxInstances) * 100)) : 100;

  const capacityPercent = Math.max(cpuPercent, memoryPercent, storagePercent, instancePercent);

  // Check if requested capacity fits
  const willExceedCpu = allocatedCpu + requestedCpu > totalCpu;
  const willExceedMemory = allocatedMemoryMb + requestedRamMb > totalMemoryMb;
  const willExceedStorage = allocatedStorageGb + requestedDiskGb > totalStorageGb;
  const willExceedInstances = activeInstances + 1 > maxInstances;
  const willExceedPorts = availablePorts < 1;

  const hasCapacity = !willExceedCpu && !willExceedMemory && !willExceedStorage && !willExceedInstances && !willExceedPorts;

  let status: 'OPTIMAL' | 'WARNING' | 'FULL' = 'OPTIMAL';
  if (!hasCapacity || capacityPercent >= 95) {
    status = 'FULL';
  } else if (capacityPercent >= 80) {
    status = 'WARNING';
  }

  let userMessage = 'Cluster capacity is optimal.';
  if (!hasCapacity) {
    if (willExceedInstances) userMessage = 'Cluster has reached maximum instance limit.';
    else if (willExceedCpu) userMessage = 'Cluster CPU capacity is fully allocated.';
    else if (willExceedMemory) userMessage = 'Cluster RAM capacity is fully allocated.';
    else if (willExceedStorage) userMessage = 'Cluster storage capacity is fully allocated.';
    else if (willExceedPorts) userMessage = 'All available NodePorts are currently in use.';
  }

  return {
    available: hasCapacity,
    status,
    capacityPercent,
    activeInstances,
    maxInstances,
    allocatedCpu,
    totalCpu,
    cpuPercent,
    allocatedMemoryMb,
    totalMemoryMb,
    memoryPercent,
    allocatedStorageGb,
    totalStorageGb,
    storagePercent,
    availablePorts,
    totalPorts,
    publicDomain: config.publicDomain,
    publicIp: config.publicIp,
    userMessage,
  };
}

/**
 * Allocate a unique atomic NodePort within range 30000..32767
 */
export async function allocateAppPlatformPort(min = 30000, max = 32767): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    portAllocationQueue = portAllocationQueue
      .then(async () => {
        const now = Date.now();
        for (const [p, exp] of recentlyReservedPorts.entries()) {
          if (exp < now) {
            recentlyReservedPorts.delete(p);
          }
        }

        // Active app records in DB
        const usedApps = await prisma.appPlatformService.findMany({
          where: { status: { not: 'TERMINATED' } },
          select: { port: true },
        });

        // Also check Managed Apps so there are no port clashes across both PaaS products
        const usedManagedApps = await prisma.appService.findMany({
          where: { status: { not: 'TERMINATED' } },
          select: { port: true },
        });

        const usedPorts = new Set<number>();
        usedApps.forEach((a) => usedPorts.add(a.port));
        usedManagedApps.forEach((a) => usedPorts.add(a.port));
        for (const p of recentlyReservedPorts.keys()) {
          usedPorts.add(p);
        }

        // Scan live cluster services
        try {
          const { coreApi } = await getAppPlatformK8sClients();
          const svcRes = await (coreApi as any).listServiceForAllNamespaces();
          const items = svcRes.items || svcRes.body?.items || [];
          for (const svc of items) {
            const ports = svc.spec?.ports || [];
            for (const sp of ports) {
              if (sp.nodePort) {
                usedPorts.add(sp.nodePort);
              }
            }
          }
        } catch (clusterErr) {
          console.warn('[AppPlatform] NodePort live scan warning:', clusterErr);
        }

        for (let port = min; port <= max; port++) {
          if (!usedPorts.has(port)) {
            recentlyReservedPorts.set(port, now + 120_000); // 2 minute reservation
            return port;
          }
        }

        throw new Error('All NodePorts in range 30000..32767 are currently occupied.');
      })
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Release in-memory port reservation
 */
export function releaseReservedAppPlatformPort(port: number): void {
  recentlyReservedPorts.delete(port);
}

/**
 * Generate standard Dockerfile if not supplied by user
 */
export function generateDockerfileForFramework(
  framework: string,
  buildCommand?: string | null,
  startCommand?: string | null,
  appPort = 3000
): string {
  const norm = (framework || 'DOCKERFILE').toUpperCase().trim();
  const phpHardeningLines = `RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" 2>/dev/null || true && \\
    printf "expose_php = Off\\ndisplay_errors = Off\\ndisplay_startup_errors = Off\\nlog_errors = On\\nallow_url_include = Off\\ncgi.fix_pathinfo = 0\\nsession.cookie_httponly = 1\\nsession.use_strict_mode = 1\\nsession.cookie_samesite = Lax\\n" > "$PHP_INI_DIR/conf.d/99-masdika-security.ini"
RUN a2enmod rewrite headers setenvif && \\
    printf '%s\\n' \\
      'SetEnvIf X-Forwarded-Proto "^https$" HTTPS=on' \\
      'SetEnvIf X-Forwarded-Proto "^https$" REQUEST_SCHEME=https' \\
      'ServerTokens Prod' \\
      'ServerSignature Off' \\
      'TraceEnable Off' \\
      'Header always set X-Content-Type-Options "nosniff"' \\
      'Header always set X-Frame-Options "SAMEORIGIN"' \\
      '<DirectoryMatch "/\\.">' \\
      '  Require all denied' \\
      '</DirectoryMatch>' \\
      '<FilesMatch "^\\.">' \\
      '  Require all denied' \\
      '</FilesMatch>' \\
      '<FilesMatch "(^composer\\.(json|lock)$|^package(-lock)?\\.json$|^artisan$|^wp-config\\.php$|\\.(sqlite|sqlite3|log|sql|bak)$)">' \\
      '  Require all denied' \\
      '</FilesMatch>' \\
      '<DirectoryMatch "^/var/www/html/(public/(uploads|storage)|storage|wp-content/uploads)">' \\
      '  php_admin_flag engine off' \\
      '  <FilesMatch "\\.(?i:php|phtml|phar|php[0-9])$">' \\
      '    Require all denied' \\
      '  </FilesMatch>' \\
      '</DirectoryMatch>' \\
      > /etc/apache2/conf-enabled/masdika-security.conf`;

  switch (norm) {
    case 'LARAVEL': {
      return `# Generated by Masdika App Platform (Laravel Multi-Stage Zero-Apt Hardened PHP 8.3 Build)
FROM composer:2 AS vendor
WORKDIR /app
ENV COMPOSER_NO_BLOCKING=1
ENV COMPOSER_NO_SECURITY_BLOCKING=1
COPY . /app
RUN rm -rf .git && if [ -f composer.json ]; then \\
      composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction --no-scripts --ignore-platform-reqs --no-audit || \\
      composer update --no-dev --prefer-dist --optimize-autoloader --no-interaction --no-scripts --ignore-platform-reqs --no-audit; \\
      composer dump-autoload --optimize --no-dev --no-scripts --ignore-platform-reqs; \\
    fi

FROM node:20-alpine AS frontend
WORKDIR /app
COPY --from=vendor /app /app
RUN if [ -f package.json ]; then \\
      (if [ -f package-lock.json ]; then npm ci; else npm install; fi || true) && \\
      (npm run build || true) && \\
      rm -rf node_modules; \\
    fi

FROM php:8.3-apache
WORKDIR /var/www/html
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN docker-php-ext-install pdo pdo_mysql bcmath opcache
COPY --from=frontend /app /var/www/html/
RUN if [ ! -f .env ] && [ -f .env.example ]; then cp .env.example .env; fi && \\
    if [ -f .env ]; then \\
      sed -ri -e 's/^APP_DEBUG=.*/APP_DEBUG=false/g' -e 's/^APP_ENV=.*/APP_ENV=production/g' .env || true; \\
    fi && \\
    php artisan key:generate --force || true && \\
    mkdir -p /var/www/html/database /var/www/html/storage /var/www/html/bootstrap/cache && \\
    touch /var/www/html/database/database.sqlite && \\
    php artisan migrate --force || true && \\
    chown -R root:www-data /var/www/html && \\
    chmod -R u=rwX,go=rX /var/www/html && \\
    (chmod 640 /var/www/html/.env 2>/dev/null || true) && \\
    chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database && \\
    chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database || true
${phpHardeningLines}
RUN sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!/var/www/html/public!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf
RUN sed -ri -e 's!Listen 80!Listen ${appPort}!g' /etc/apache2/ports.conf && \\
    sed -ri -e 's!<VirtualHost \\*:80>!<VirtualHost *:${appPort}>!g' /etc/apache2/sites-available/*.conf
EXPOSE ${appPort}
`;
    }

    case 'PHP': {
      return `# Generated by Masdika App Platform (PHP 8.3 Multi-Stage Zero-Apt Hardened Build)
# Composer via https://getcomposer.org
FROM composer:2 AS vendor
WORKDIR /app
ENV COMPOSER_NO_BLOCKING=1
ENV COMPOSER_NO_SECURITY_BLOCKING=1
COPY . /app
RUN if [ -f composer.json ]; then \\
      composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction --no-scripts --ignore-platform-reqs --no-audit || \\
      composer update --no-dev --prefer-dist --optimize-autoloader --no-interaction --no-scripts --ignore-platform-reqs --no-audit; \\
      composer dump-autoload --optimize --no-dev --no-scripts --ignore-platform-reqs; \\
    fi

FROM php:8.3-apache
WORKDIR /var/www/html
RUN docker-php-ext-install pdo pdo_mysql mysqli opcache
COPY --from=vendor /app /var/www/html/
RUN chown -R root:www-data /var/www/html && \\
    chmod -R u=rwX,go=rX /var/www/html && \\
    for d in storage uploads public/uploads public/storage; do \\
      if [ -d "/var/www/html/$d" ]; then \\
        chown -R www-data:www-data "/var/www/html/$d" && chmod -R 775 "/var/www/html/$d"; \\
      fi; \\
    done && \\
    if [ -f /var/www/html/public/index.php ] && [ ! -f /var/www/html/index.php ]; then \\
      sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/*.conf && \\
      sed -ri -e 's!/var/www/!/var/www/html/public!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf; \\
    fi && \\
    sed -ri -e 's!Listen 80!Listen ${appPort}!g' /etc/apache2/ports.conf && \\
    sed -ri -e 's!<VirtualHost \\*:80>!<VirtualHost *:${appPort}>!g' /etc/apache2/sites-available/*.conf
${phpHardeningLines}
EXPOSE ${appPort}
`;
    }

    case 'WORDPRESS': {
      return `# Generated by Masdika App Platform (WordPress Hardened PHP 8.3)
FROM wordpress:php8.3-apache
WORKDIR /var/www/html
COPY . /var/www/html/
${phpHardeningLines}
RUN chown -R www-data:www-data /var/www/html/wp-content 2>/dev/null || true && \\
    sed -i 's/80/${appPort}/g' /etc/apache2/ports.conf /etc/apache2/sites-available/*.conf
EXPOSE ${appPort}
`;
    }

    case 'NEXTJS':
    case 'NODEJS':
    case 'NESTJS':
    case 'REMIX':
    case 'SVELTE':
    case 'ASTRO': {
      const customBuild = buildCommand?.trim();
      const buildStep = customBuild
        ? `RUN ${customBuild} || true`
        : norm === 'NODEJS'
        ? `RUN if [ -f package.json ] && node -e 'const p=require("./package.json");process.exit(p.scripts&&p.scripts.build?0:1)' 2>/dev/null; then npm run build || true; fi`
        : `RUN npm run build || true`;
      const smartStart = [
        `if [ -f .next/standalone/server.js ]; then HOSTNAME=0.0.0.0 PORT=${appPort} node .next/standalone/server.js`,
        `elif [ -d .next ] && [ -x ./node_modules/.bin/next ]; then ./node_modules/.bin/next start -H 0.0.0.0 -p ${appPort}`,
        `elif [ -f .output/server/index.mjs ]; then NITRO_HOST=0.0.0.0 NITRO_PORT=${appPort} node .output/server/index.mjs`,
        `elif [ -f dist/main.js ]; then node dist/main.js`,
        `elif [ -f dist/server/entry.mjs ]; then HOST=0.0.0.0 PORT=${appPort} node ./dist/server/entry.mjs`,
        `elif [ -f package.json ] && node -e 'const p=require("./package.json");process.exit(p.scripts&&p.scripts.start?0:1)' 2>/dev/null; then npm start`,
        `elif [ -f build/index.js ]; then HOST=0.0.0.0 PORT=${appPort} node build/index.js`,
        `elif [ -f server.js ]; then node server.js`,
        `elif [ -f index.js ]; then node index.js`,
        `elif [ -f app.js ]; then node app.js`,
        `elif [ -f main.js ]; then node main.js`,
        `elif [ -d dist ]; then serve -s dist -l ${appPort} || npx --yes serve -s dist -l ${appPort}`,
        `elif [ -d build ]; then serve -s build -l ${appPort} || npx --yes serve -s build -l ${appPort}`,
        `else npm start; fi`,
      ].join('; ');
      const start = startCommand?.trim() || smartStart;
      const escapedStart = start.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `# Generated by Masdika App Platform (${norm})
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN if [ -f yarn.lock ]; then corepack enable && (yarn install --frozen-lockfile || yarn install); \\
    elif [ -f pnpm-lock.yaml ]; then corepack enable && (pnpm install --frozen-lockfile || pnpm install); \\
    elif [ -f package-lock.json ]; then npm ci || npm install; \\
    elif [ -f package.json ]; then npm install; fi
${buildStep}
RUN if [ -d dist ] || [ -d build ]; then npm install -g serve || true; fi
ENV PORT=${appPort}
ENV HOST=0.0.0.0
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
EXPOSE ${appPort}
CMD ["sh", "-c", "${escapedStart}"]
`;
    }

    case 'FASTAPI':
    case 'DJANGO':
    case 'PYTHON': {
      const smartStart = [
        `if [ -f manage.py ]; then python manage.py migrate --noinput 2>/dev/null || true; WSGI_MOD=$(find . -maxdepth 2 -name wsgi.py | head -n 1 | sed 's,^[.]/,,;s,/,.,g;s,[.]py$,,'); case $WSGI_MOD in "") python manage.py runserver 0.0.0.0:${appPort};; *) gunicorn $WSGI_MOD:application --bind 0.0.0.0:${appPort};; esac`,
        `elif [ -f main.py ] && grep -qiE 'fastapi|uvicorn' main.py 2>/dev/null; then uvicorn main:app --host 0.0.0.0 --port ${appPort}`,
        `elif [ -f app.py ] && grep -qiE 'fastapi|uvicorn' app.py 2>/dev/null; then uvicorn app:app --host 0.0.0.0 --port ${appPort}`,
        `elif [ -f app.py ] && grep -qi 'flask' app.py 2>/dev/null; then gunicorn app:app --bind 0.0.0.0:${appPort} || python app.py`,
        `elif [ -f main.py ] && grep -qi 'flask' main.py 2>/dev/null; then gunicorn main:app --bind 0.0.0.0:${appPort} || python main.py`,
        `else uvicorn main:app --host 0.0.0.0 --port ${appPort} || uvicorn app:app --host 0.0.0.0 --port ${appPort} || gunicorn app:app --bind 0.0.0.0:${appPort} || python main.py || python app.py || python server.py || python run.py || python bot.py; fi`,
      ].join('; ');
      const start = startCommand?.trim() || smartStart;
      const escapedStart = start.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const build = buildCommand?.trim() || (norm === 'DJANGO' ? 'python manage.py collectstatic --noinput' : '');
      return `# Generated by Masdika App Platform (${norm} - Zero-Apt Binary Wheels)
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PIP_NO_CACHE_DIR=1
COPY . .
RUN pip install --no-cache-dir --upgrade pip && \\
    pip install --no-cache-dir --prefer-binary uvicorn gunicorn fastapi django flask || true
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir --prefer-binary -r requirements.txt || true; \\
    elif [ -f pyproject.toml ]; then pip install --no-cache-dir --prefer-binary . || true; \\
    elif [ -f Pipfile ]; then pip install --no-cache-dir --prefer-binary pipenv && pipenv install --system --deploy --ignore-pipfile || true; fi
${build ? `RUN ${build} || true` : ''}
ENV PORT=${appPort}
EXPOSE ${appPort}
CMD ["sh", "-c", "${escapedStart}"]
`;
    }

    case 'GOLANG': {
      const build = buildCommand?.trim() || 'CGO_ENABLED=0 GOOS=linux go build -o /app/server .';
      const start = startCommand?.trim() || './server';
      const escapedStart = start.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `# Generated by Masdika App Platform (Go)
FROM golang:1.22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY . .
RUN if [ -f go.mod ]; then go mod download || true; fi
RUN ${build} || (CGO_ENABLED=0 GOOS=linux go build -o /app/server . || CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/... || CGO_ENABLED=0 GOOS=linux go build -o /app/server main.go)

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/
COPY --from=builder /app/server ./
ENV PORT=${appPort}
ENV HOST=0.0.0.0
EXPOSE ${appPort}
CMD ["${escapedStart}"]
`;
    }

    case 'RUST': {
      const build = buildCommand?.trim() || 'cargo build --release';
      const start = startCommand?.trim() || './server';
      const escapedStart = start.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `# Generated by Masdika App Platform (Rust)
FROM rust:1.75-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev
COPY . .
RUN ${build}
RUN mkdir -p /root_bin && (cp $(find target/release -maxdepth 1 -type f -perm /111 ! -name "*.*" | head -n 1) /root_bin/server 2>/dev/null || touch /root_bin/server)

FROM alpine:latest
WORKDIR /root/
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /root_bin/server /root/server
ENV PORT=${appPort}
ENV HOST=0.0.0.0
EXPOSE ${appPort}
CMD ["${escapedStart}"]
`;
    }

    case 'RUBY':
    case 'RAILS': {
      const build = buildCommand?.trim();
      const smartStart = `bundle exec rails db:prepare 2>/dev/null || true; bundle exec rails server -b 0.0.0.0 -p ${appPort} || bundle exec puma -b tcp://0.0.0.0:${appPort} || bundle exec rackup -o 0.0.0.0 -p ${appPort} || ruby main.rb || ruby app.rb`;
      const start = startCommand?.trim() || smartStart;
      const escapedStart = start.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `# Generated by Masdika App Platform (Ruby on Rails - Alpine Zero-Apt)
FROM ruby:3.2-alpine
WORKDIR /app
RUN apk add --no-cache build-base postgresql-dev sqlite-dev nodejs tzdata git yaml-dev
COPY . .
RUN if [ -f Gemfile ]; then bundle install || true; fi
${build ? `RUN ${build} || true` : 'RUN if [ -f bin/rails ]; then bundle exec rake assets:precompile 2>/dev/null || true; fi'}
ENV PORT=${appPort}
ENV RAILS_ENV=production
EXPOSE ${appPort}
CMD ["sh", "-c", "${escapedStart}"]
`;
    }

    case 'JAVA':
    case 'SPRINGBOOT': {
      const build = buildCommand?.trim();
      const start = startCommand?.trim() || `java -Dserver.port=${appPort} -jar /app/app.jar`;
      const escapedStart = start.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `# Generated by Masdika App Platform (Java / Spring Boot)
FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /app
COPY . .
RUN ${build ? `${build} || true` : 'if [ -f pom.xml ]; then mvn clean package -DskipTests || true; elif [ -f gradlew ]; then chmod +x gradlew && ./gradlew bootJar -x test || ./gradlew build -x test || true; fi'}
RUN mkdir -p /app_out && (cp $(find target build/libs -name "*.jar" ! -name "*-plain.jar" 2>/dev/null | head -n 1) /app_out/app.jar 2>/dev/null || touch /app_out/app.jar)

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app_out/app.jar /app/app.jar
ENV PORT=${appPort}
EXPOSE ${appPort}
CMD ["sh", "-c", "${escapedStart}"]
`;
    }

    case 'VITE': {
      const build = buildCommand?.trim() || 'npm run build';
      return `# Generated by Masdika App Platform (Vite SPA)
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN if [ -f yarn.lock ]; then corepack enable && (yarn install --frozen-lockfile || yarn install); \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && (pnpm install --frozen-lockfile || pnpm install); \
    elif [ -f package-lock.json ]; then npm ci || npm install; \
    elif [ -f package.json ]; then npm install; fi
RUN ${build} || true
RUN mkdir -p /app/public_out && if [ -d /app/dist ]; then cp -r /app/dist/* /app/public_out/; elif [ -d /app/build ]; then cp -r /app/build/* /app/public_out/; else cp -r ./* /app/public_out/ 2>/dev/null || true; fi

FROM nginx:alpine
COPY --from=builder /app/public_out /usr/share/nginx/html/
RUN printf 'server { listen ${appPort}; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE ${appPort}
`;
    }

    case 'STATIC': {
      const build = buildCommand?.trim();
      if (build) {
        return `# Generated by Masdika App Platform (Static Site Builder)
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN if [ -f yarn.lock ]; then corepack enable && (yarn install --frozen-lockfile || yarn install); \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && (pnpm install --frozen-lockfile || pnpm install); \
    elif [ -f package-lock.json ]; then npm ci || npm install; \
    elif [ -f package.json ]; then npm install; fi
RUN ${build} || true
RUN mkdir -p /app/public_out && if [ -d /app/dist ]; then cp -r /app/dist/* /app/public_out/; elif [ -d /app/build ]; then cp -r /app/build/* /app/public_out/; else cp -r ./* /app/public_out/ 2>/dev/null || true; fi

FROM nginx:alpine
COPY --from=builder /app/public_out /usr/share/nginx/html/
RUN printf 'server { listen ${appPort}; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $uri $uri/ =404; } }' > /etc/nginx/conf.d/default.conf
EXPOSE ${appPort}
`;
      }
      return `# Generated by Masdika App Platform (Static HTML)
FROM nginx:alpine
COPY . /usr/share/nginx/html/
RUN printf 'server { listen ${appPort}; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $uri $uri/ =404; } }' > /etc/nginx/conf.d/default.conf
EXPOSE ${appPort}
`;
    }

    default: {
      if (norm === 'DOCKERFILE') return '';
      // Safe fallback for custom/unrecognized runtime
      const build = buildCommand?.trim();
      const start = startCommand?.trim() || 'npm start || node index.js || python app.py || ./server';
      return `# Generated by Masdika App Platform (Universal Fallback: ${norm})
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN if [ -f package-lock.json ]; then npm ci || npm install; elif [ -f package.json ]; then npm install; fi
${build ? `RUN ${build} || true` : ''}
ENV PORT=${appPort}
EXPOSE ${appPort}
CMD ["sh", "-c", "${start}"]
`;
    }
  }
}

/**
 * Parse environment variables string into K8s env array
 */
function parseEnvVarsToK8sEnv(envVarsString?: string | null): Array<{ name: string; value: string }> {
  if (!envVarsString) return [];
  const envs: Array<{ name: string; value: string }> = [];

  // Try parsing as JSON first
  try {
    const parsed = JSON.parse(envVarsString);
    if (typeof parsed === 'object' && parsed !== null) {
      for (const [key, val] of Object.entries(parsed)) {
        if (key && typeof key === 'string') {
          envs.push({ name: key.trim(), value: String(val) });
        }
      }
      return envs;
    }
  } catch {
    // If not JSON, parse line by line (KEY=VALUE)
  }

  const lines = envVarsString.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const name = trimmed.substring(0, idx).trim();
      const value = trimmed.substring(idx + 1).trim();
      if (name) {
        envs.push({ name, value });
      }
    }
  }

  return envs;
}

/**
 * Ensure in-cluster private Docker Registry (registry:2) is deployed and running
 */
export async function ensureAppPlatformRegistry(): Promise<void> {
  const { kc, coreApi, appsApi } = await getAppPlatformK8sClients();
  const namespace = 'app-platform';

  // Ensure namespace exists
  try {
    await (coreApi as any).createNamespace({
      body: { metadata: { name: namespace } },
    });
  } catch (err: any) {
    if (err?.statusCode !== 409 && err?.response?.statusCode !== 409) {
      // ignore
    }
  }

  // Clean up any old broken PVC if it exists to avoid blocking
  try {
    await (coreApi as any).deleteNamespacedPersistentVolumeClaim({
      name: 'app-platform-registry-pvc',
      namespace,
    });
  } catch {}

  // Check if existing deployment is stuck with old PVC and recreate if needed
  try {
    const existingDep = await (appsApi as any).readNamespacedDeployment({
      name: 'app-platform-registry',
      namespace,
    });
    const depObj = existingDep?.body || existingDep;
    const vols = depObj?.spec?.template?.spec?.volumes || [];
    const hasPvc = vols.some((v: any) => v.persistentVolumeClaim);
    if (hasPvc) {
      await (appsApi as any).deleteNamespacedDeployment({
        name: 'app-platform-registry',
        namespace,
      });
      const podsRes: any = await (coreApi as any).listNamespacedPod({
        namespace,
        labelSelector: 'app=app-platform-registry',
      });
      for (const p of podsRes?.items || podsRes?.body?.items || []) {
        if (p?.metadata?.name) {
          await (coreApi as any).deleteNamespacedPod({ name: p.metadata.name, namespace }).catch(() => {});
        }
      }
    }
  } catch {}

  const registryYaml = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-platform-registry
  namespace: ${namespace}
  labels:
    app: app-platform-registry
    app.kubernetes.io/managed-by: masdika-app-platform
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: app-platform-registry
  template:
    metadata:
      labels:
        app: app-platform-registry
    spec:
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: registry
        image: registry:2
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 5000
          hostPort: 5000
        env:
        - name: REGISTRY_HTTP_ADDR
          value: "0.0.0.0:5000"
        - name: REGISTRY_STORAGE_DELETE_ENABLED
          value: "true"
        volumeMounts:
        - name: registry-data
          mountPath: /var/lib/registry
        readinessProbe:
          tcpSocket:
            port: 5000
          initialDelaySeconds: 2
          periodSeconds: 3
          failureThreshold: 20
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
      volumes:
      - name: registry-data
        hostPath:
          path: /var/lib/masdika/registry
          type: DirectoryOrCreate
---
apiVersion: v1
kind: Service
metadata:
  name: registry
  namespace: ${namespace}
  labels:
    app: app-platform-registry
    app.kubernetes.io/managed-by: masdika-app-platform
spec:
  type: ClusterIP
  selector:
    app: app-platform-registry
  ports:
  - port: 5000
    targetPort: 5000
    name: http
`;

  await applyKubernetesManifests(kc, registryYaml);

  // Sweep any lingering completed/failed build pods in background
  cleanOrphanedBuildResources().catch(() => {});
}

/**
 * Wait for the in-cluster Docker registry pod to be Ready before triggering Kaniko build.
 * Polls every 2s for up to 60s. Throws if the registry does not become ready.
 */
async function waitForRegistryReady(coreApi: k8s.CoreV1Api, maxWaitMs = 60000): Promise<void> {
  const namespace = 'app-platform';
  const startTime = Date.now();

  let lastPodState = 'Initializing';
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const podsRes: any = await (coreApi as any).listNamespacedPod({
        namespace,
        labelSelector: 'app=app-platform-registry',
      });
      const pods = podsRes?.items || podsRes?.body?.items || [];
      if (pods.length > 0) {
        const pod = pods[0];
        const phase = pod?.status?.phase || 'Unknown';
        const conditions = pod?.status?.conditions || [];
        const isReady = conditions.some((c: any) => c.type === 'Ready' && c.status === 'True');
        const containerWaiting = pod?.status?.containerStatuses?.[0]?.state?.waiting?.reason;
        lastPodState = `Phase: ${phase}, Ready: ${isReady}, Reason: ${containerWaiting || 'none'}`;

        if (isReady) {
          return; // Registry is ready and accepting traffic
        }
      }
    } catch {
      // ignore transient API errors during polling
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`In-cluster Docker registry did not become ready within ${maxWaitMs / 1000}s. Last state: [${lastPodState}].`);
}

/**
 * Dynamically apply multi-document Kubernetes YAML manifests using native K8s API
 */
export async function applyKubernetesManifests(kc: k8s.KubeConfig, manifestYaml: string): Promise<void> {
  const objApi = k8s.KubernetesObjectApi.makeApiClient(kc);
  const specs = k8s.loadAllYaml(manifestYaml) as k8s.KubernetesObject[];

  for (const spec of specs) {
    if (!spec || !spec.kind || !spec.metadata?.name) continue;

    spec.metadata = spec.metadata || {};
    spec.metadata.annotations = spec.metadata.annotations || {};
    delete (spec.metadata.annotations as any)['kubectl.kubernetes.io/last-applied-configuration'];
    spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] = JSON.stringify(spec);

    const readExisting = async (): Promise<any> => {
      const res = (await objApi.read({
        apiVersion: spec.apiVersion || 'v1',
        kind: spec.kind!,
        metadata: {
          name: spec.metadata!.name!,
          namespace: spec.metadata!.namespace || 'default',
        },
      }).catch(() => null)) as any;
      return res?.body ?? res ?? null;
    };

    const applyUpdate = async (existing: any) => {
      if (existing?.metadata?.resourceVersion) {
        spec.metadata!.resourceVersion = existing.metadata.resourceVersion;
      }
      if (spec.kind === 'Service' && (spec as any).spec) {
        if (existing?.spec?.clusterIP) {
          (spec as any).spec.clusterIP = existing.spec.clusterIP;
        }
        if (Array.isArray(existing?.spec?.clusterIPs)) {
          (spec as any).spec.clusterIPs = existing.spec.clusterIPs;
        }
      }
      try {
        await objApi.replace(spec);
      } catch (replaceErr) {
        try {
          await objApi.patch(spec);
        } catch {
          if (spec.kind === 'Service') {
            const targetPort = (spec as any).spec?.ports?.[0];
            const curPort = existing?.spec?.ports?.[0];
            if (
              targetPort &&
              curPort &&
              curPort.port === targetPort.port &&
              curPort.nodePort === targetPort.nodePort
            ) {
              return;
            }
          }
          throw replaceErr;
        }
      }
    };

    const existing = await readExisting();
    if (existing) {
      await applyUpdate(existing);
    } else {
      try {
        await objApi.create(spec);
      } catch (createErr: any) {
        const status = createErr.statusCode || createErr.code || createErr.response?.statusCode || createErr.body?.code;
        if (status === 409 || status === 422) {
          const retryExisting = await readExisting();
          if (retryExisting) {
            await applyUpdate(retryExisting);
            continue;
          }
        }
        throw createErr;
      }
    }
  }
}

/**
 * Create Kaniko build job in the cluster
 */
export async function triggerAppPlatformBuild(
  app: AppPlatformRecord,
  deploymentId?: number,
  commitHash?: string | null,
  imageTagOverride?: string | null
): Promise<{ jobName: string; imageTag: string; deploymentId?: number }> {
  const { batchApi, coreApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const timestamp = Date.now();
  const imageTag = imageTagOverride || `b${timestamp.toString(36)}`;
  const jobName = `build-${app.subdomain}-${timestamp.toString(36)}`;
  const destinationImage = `127.0.0.1:5000/${app.subdomain}:${imageTag}`;

  // Ensure deployment record exists
  let activeDepId = deploymentId;
  if (!activeDepId && app.id) {
    try {
      const depCount = await prisma.appPlatformDeployment.count({ where: { appId: app.id } });
      const created = await prisma.appPlatformDeployment.create({
        data: {
          appId: app.id,
          deploymentNumber: depCount + 1,
          branch: app.branch || 'main',
          trigger: 'INITIAL',
          status: 'BUILDING',
          imageTag,
        },
      });
      activeDepId = created.id;
    } catch (depErr) {
      console.warn('[AppPlatform] Deployment record creation error:', depErr);
    }
  } else if (activeDepId) {
    try {
      await prisma.appPlatformDeployment.update({
        where: { id: activeDepId },
        data: { status: 'BUILDING', imageTag },
      });
    } catch {}
  }

  // Ensure in-cluster private registry is running and wait for readiness
  await ensureAppPlatformRegistry();
  await waitForRegistryReady(coreApi);

  // Clean up any old completed/failed build jobs and pods for this app to avoid clutter
  try {
    const prevJobsRes: any = await (batchApi as any).listNamespacedJob({
      namespace,
      labelSelector: `build.app-platform/app=${app.subdomain}`,
    });
    const prevJobs = prevJobsRes?.items || prevJobsRes?.body?.items || [];
    for (const j of prevJobs) {
      const jName = j?.metadata?.name;
      if (jName && jName !== jobName) {
        await (batchApi as any).deleteNamespacedJob({
          name: jName,
          namespace,
          propagationPolicy: 'Background',
        }).catch(() => {});
        const oldPods: any = await (coreApi as any).listNamespacedPod({
          namespace,
          labelSelector: `job-name=${jName}`,
        }).catch(() => null);
        for (const op of oldPods?.items || oldPods?.body?.items || []) {
          if (op?.metadata?.name) {
            await (coreApi as any).deleteNamespacedPod({ name: op.metadata.name, namespace }).catch(() => {});
          }
        }
      }
    }
  } catch {}

  // Also clean up any orphaned failed/completed build pods in namespace
  cleanOrphanedBuildResources().catch(() => {});

  const normalizedBuildMode = (app.buildMode || 'DOCKERFILE').toUpperCase().trim();
  const isBuildpack = normalizedBuildMode === 'BUILDPACK';
  const normalizedPreset =
    (app.buildType || 'DOCKERFILE').toUpperCase().replace(/[^A-Z0-9_]/g, '') || 'DOCKERFILE';
  const requestedDockerfilePath = (
    app.dockerfilePath && app.dockerfilePath.trim() ? app.dockerfilePath.trim() : 'Dockerfile'
  ).replace(/['"`$\\;\r\n]/g, '') || 'Dockerfile';

  // Handle custom Dockerfile generation, inline Dockerfile, or preset ConfigMap (never static ConfigMap for BUILDPACK)
  let configMapName: string | undefined = undefined;
  const isInlineDockerfile = Boolean(
    !isBuildpack &&
    app.buildCommand &&
    (app.buildCommand.includes('FROM ') ||
     app.buildCommand.includes('# Dockerfile') ||
     app.buildCommand.includes('ENTRYPOINT') ||
     app.buildCommand.includes('CMD '))
  );

  if (isInlineDockerfile) {
    configMapName = `cm-df-${jobName}`;
    await (coreApi as any).createNamespacedConfigMap({
      namespace,
      body: {
        metadata: {
          name: configMapName,
          labels: {
            'build.app-platform/app': app.subdomain,
            'app.kubernetes.io/managed-by': 'masdika-app-platform',
          },
        },
        data: {
          Dockerfile: app.buildCommand!.trim(),
        },
      },
    });
  } else if (!isBuildpack && app.buildType && app.buildType !== 'DOCKERFILE') {
    const generatedDockerfile = generateDockerfileForFramework(
      app.buildType,
      app.buildCommand,
      app.startCommand,
      app.appPort
    );
    if (generatedDockerfile) {
      configMapName = `cm-df-${jobName}`;
      await (coreApi as any).createNamespacedConfigMap({
        namespace,
        body: {
          metadata: {
            name: configMapName,
            labels: {
              'build.app-platform/app': app.subdomain,
              'app.kubernetes.io/managed-by': 'masdika-app-platform',
            },
          },
          data: {
            Dockerfile: generatedDockerfile,
          },
        },
      });
    }
  }

  const gitUrl = app.gitUrl.trim();
  const branch = (app.branch || 'main').trim();

  const cleanRootDir = app.rootDirectory ? app.rootDirectory.trim().replace(/^\/+|\/+$/g, '') : '';
  const workspaceAppDir = cleanRootDir ? `/workspace/${cleanRootDir}` : '/workspace';

  // Universal Smart Stack Inspector & Self-Healing Hook inside git-clone
  const buildpackPort = app.appPort || 80;
  const dfTpl = (fw: string) => generateDockerfileForFramework(fw, null, null, buildpackPort);
  const smartEngineHook = !isInlineDockerfile
    ? ` && cd /workspace && cat <<'MASDIKA_BP_EOF' > /tmp/autodetect.sh
APP_DIR="${workspaceAppDir}"
OUT_DF="${workspaceAppDir}/.masdika.Dockerfile"
BUILD_MODE="${normalizedBuildMode}"
PRESET="${normalizedPreset}"
REQ_DF="${requestedDockerfilePath}"
HAS_CM="${configMapName ? '1' : '0'}"
NEED_AUTODETECT=0

if [ "$HAS_CM" = "1" ] && [ -f /custom-dockerfile/Dockerfile ]; then
  cp /custom-dockerfile/Dockerfile "$OUT_DF"
  case "$PRESET" in
    LARAVEL|PHP|WORDPRESS)
      if [ ! -f "$APP_DIR/artisan" ] && [ ! -f "$APP_DIR/composer.json" ] && [ ! -f "$APP_DIR/index.php" ] && [ ! -f "$APP_DIR/public/index.php" ] && [ ! -f "$APP_DIR/wp-config.php" ] && [ ! -f "$APP_DIR/wp-config-sample.php" ] && [ ! -d "$APP_DIR/wp-includes" ]; then
        NEED_AUTODETECT=1
      fi
      ;;
    NODEJS|NEXTJS|NESTJS|REMIX|SVELTE|ASTRO|VITE)
      if [ ! -f "$APP_DIR/package.json" ] || [ -f "$APP_DIR/artisan" ]; then
        NEED_AUTODETECT=1
      fi
      ;;
    PYTHON|FASTAPI|DJANGO)
      if [ ! -f "$APP_DIR/manage.py" ] && [ ! -f "$APP_DIR/requirements.txt" ] && [ ! -f "$APP_DIR/pyproject.toml" ] && [ ! -f "$APP_DIR/Pipfile" ] && [ ! -f "$APP_DIR/main.py" ] && [ ! -f "$APP_DIR/app.py" ] && [ ! -f "$APP_DIR/server.py" ] && ! ls "$APP_DIR"/*.py >/dev/null 2>&1; then
        NEED_AUTODETECT=1
      fi
      ;;
    GOLANG)
      if [ ! -f "$APP_DIR/go.mod" ] && [ ! -f "$APP_DIR/main.go" ] && ! ls "$APP_DIR"/*.go >/dev/null 2>&1; then
        NEED_AUTODETECT=1
      fi
      ;;
    RUST)
      if [ ! -f "$APP_DIR/Cargo.toml" ]; then
        NEED_AUTODETECT=1
      fi
      ;;
    RUBY|RAILS)
      if [ ! -f "$APP_DIR/Gemfile" ] && [ ! -f "$APP_DIR/config.ru" ]; then
        NEED_AUTODETECT=1
      fi
      ;;
    JAVA|SPRINGBOOT)
      if [ ! -f "$APP_DIR/pom.xml" ] && [ ! -f "$APP_DIR/build.gradle" ] && [ ! -f "$APP_DIR/build.gradle.kts" ]; then
        NEED_AUTODETECT=1
      fi
      ;;
    STATIC)
      if [ ! -f "$APP_DIR/index.html" ] && [ ! -f "$APP_DIR/package.json" ]; then
        NEED_AUTODETECT=1
      fi
      ;;
  esac
  if [ "$NEED_AUTODETECT" = "1" ]; then
    echo "[Masdika Smart Engine] Detected stack mismatch with preset ($PRESET). Auto-healing Dockerfile for actual repository stack..."
  fi
elif [ "$BUILD_MODE" = "BUILDPACK" ]; then
  echo "[Masdika Smart Engine] Buildpack auto-detection active. Inspecting repository stack..."
  NEED_AUTODETECT=1
else
  case "$REQ_DF" in
    /*) DF_SRC="$REQ_DF" ;;
    *) DF_SRC="$APP_DIR/$REQ_DF" ;;
  esac
  if [ -f "$DF_SRC" ]; then
    echo "[Masdika Smart Engine] Using repository Dockerfile: $REQ_DF"
    cp "$DF_SRC" "$OUT_DF"
  else
    echo "[Masdika Smart Engine] No Dockerfile found at $REQ_DF. Auto-generating Dockerfile from repository stack..."
    NEED_AUTODETECT=1
  fi
fi

if [ "$NEED_AUTODETECT" = "1" ]; then
  if [ -f "$APP_DIR/artisan" ]; then
    echo "[Masdika Smart Engine] Detected Stack: Laravel (PHP 8.3 Hardened)"
    cat <<'MASDIKA_DF_EOF' > "$OUT_DF"
${dfTpl('LARAVEL')}
MASDIKA_DF_EOF
  elif [ -f "$APP_DIR/wp-config.php" ] || [ -f "$APP_DIR/wp-config-sample.php" ] || [ -d "$APP_DIR/wp-includes" ]; then
    echo "[Masdika Smart Engine] Detected Stack: WordPress"
    cat <<'MASDIKA_DF_EOF' > "$OUT_DF"
${dfTpl('WORDPRESS')}
MASDIKA_DF_EOF
  elif [ -f "$APP_DIR/composer.json" ] || [ -f "$APP_DIR/index.php" ] || [ -f "$APP_DIR/public/index.php" ]; then
    echo "[Masdika Smart Engine] Detected Stack: PHP"
    cat <<'MASDIKA_DF_EOF' > "$OUT_DF"
${dfTpl('PHP')}
MASDIKA_DF_EOF
  elif [ -f "$APP_DIR/package.json" ]; then
    if grep -q '"vite"' "$APP_DIR/package.json" && ! grep -qE '"next"|"@nestjs/core"|"express"|"fastify"|"hono"|"koa"|"@sveltejs/kit"|"@remix-run"|"astro"|"nuxt"' "$APP_DIR/package.json" && ! grep -q '"start"' "$APP_DIR/package.json"; then
      echo "[Masdika Smart Engine] Detected Stack: Vite SPA (Nginx)"
      cat <<'MASDIKA_DF_EOF' > "$OUT_DF"
${dfTpl('VITE')}
MASDIKA_DF_EOF
    else
      echo "[Masdika Smart Engine] Detected Stack: Node.js / JS Fullstack"
      cat <<'MASDIKA_DF_EOF' > "$OUT_DF"
${dfTpl('NODEJS')}
MASDIKA_DF_EOF
    fi
  elif [ -f "$APP_DIR/manage.py" ]; then
    echo "[Masdika Smart Engine] Detected Stack: Django (Python 3.11 Zero-Apt)"
    cat <<'MASDIKA_DF_EOF' > "$OUT_DF"
${dfTpl('DJANGO')}
MASDIKA_DF_EOF
  elif [ -f "$APP_DIR/requirements.txt" ] || [ -f "$APP_DIR/pyproject.toml" ] || [ -f "$APP_DIR/Pipfile" ] || [ -f "$APP_DIR/main.py" ] || [ -f "$APP_DIR/app.py" ] || [ -f "$APP_DIR/server.py" ] || ls "$APP_DIR"/*.py >/dev/null 2>&1; then
    echo "[Masdika Smart Engine] Detected Stack: Python (3.11 Zero-Apt)"
    cat <<'MASDIKA_DF_EOF' > "$OUT_DF"
${dfTpl('PYTHON')}
MASDIKA_DF_EOF
  elif [ -f "$APP_DIR/go.mod" ] || [ -f "$APP_DIR/main.go" ] || ls "$APP_DIR"/*.go >/dev/null 2>&1; then
    echo "[Masdika Smart Engine] Detected Stack: Go (Golang 1.22)"
    cat <<'MASDIKA_DF_EOF' > "$OUT_DF"
${dfTpl('GOLANG')}
MASDIKA_DF_EOF
  elif [ -f "$APP_DIR/Cargo.toml" ]; then
    echo "[Masdika Smart Engine] Detected Stack: Rust (1.75)"
    cat <<'MASDIKA_DF_EOF' > "$OUT_DF"
${dfTpl('RUST')}
MASDIKA_DF_EOF
  elif [ -f "$APP_DIR/Gemfile" ] || [ -f "$APP_DIR/config.ru" ]; then
    echo "[Masdika Smart Engine] Detected Stack: Ruby / Rails (Alpine Zero-Apt)"
    cat <<'MASDIKA_DF_EOF' > "$OUT_DF"
${dfTpl('RUBY')}
MASDIKA_DF_EOF
  elif [ -f "$APP_DIR/pom.xml" ] || [ -f "$APP_DIR/build.gradle" ] || [ -f "$APP_DIR/build.gradle.kts" ]; then
    echo "[Masdika Smart Engine] Detected Stack: Java / Spring Boot"
    cat <<'MASDIKA_DF_EOF' > "$OUT_DF"
${dfTpl('JAVA')}
MASDIKA_DF_EOF
  else
    echo "[Masdika Smart Engine] Detected Stack: Static HTML (Nginx)"
    cat <<'MASDIKA_DF_EOF' > "$OUT_DF"
${dfTpl('STATIC')}
MASDIKA_DF_EOF
  fi
fi
MASDIKA_BP_EOF
sh /tmp/autodetect.sh`
    : '';

  // Job Specification: Kaniko Builder (supports DOCKERFILE, AUTO, and Zero-Config BUILDPACK auto-detection)
  const jobManifest: k8s.V1Job = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: jobName,
      namespace,
      labels: {
        'build.app-platform/app': app.subdomain,
        'app.kubernetes.io/managed-by': 'masdika-app-platform',
        'build.app-platform/image-tag': imageTag,
        'build.app-platform/engine': isBuildpack ? 'buildpack-kaniko' : 'kaniko',
      },
    },
    spec: {
      ttlSecondsAfterFinished: 600, // 10m safety net if server restarts; active sync deletes sooner
      backoffLimit: 0, // Fail fast without retrying failed build
      template: {
        metadata: {
          labels: {
            'build.app-platform/app': app.subdomain,
            job: jobName,
          },
        },
        spec: {
          hostNetwork: true,
          dnsPolicy: 'ClusterFirstWithHostNet',
          restartPolicy: 'Never',
          volumes: [
            {
              name: 'workspace',
              emptyDir: {},
            },
            ...(configMapName
              ? [
                  {
                    name: 'custom-dockerfile',
                    configMap: {
                      name: configMapName,
                    },
                  },
                ]
              : []),
          ],
          initContainers: [
            {
              name: 'git-clone',
              image: 'alpine/git:latest',
              imagePullPolicy: 'IfNotPresent',
              command: ['sh', '-c'],
              args: [
                commitHash && /^[a-fA-F0-9]{4,40}$/.test(commitHash.trim())
                  ? `echo "Cloning ${gitUrl} and checking out commit ${commitHash.trim()}..." && git clone ${gitUrl} /workspace/src && cd /workspace/src && git checkout ${commitHash.trim()} && cp -rf /workspace/src/. /workspace/ && cd /workspace && rm -rf /workspace/src${smartEngineHook} && chmod -R 777 /workspace && echo "Commit ${commitHash.trim()} checked out. Handing off to Kaniko..."`
                  : `echo "Cloning ${gitUrl} (branch: ${branch})..." && (git clone --depth=1 --branch ${branch} ${gitUrl} /workspace/src 2>/dev/null || git clone --depth=1 ${gitUrl} /workspace/src) && cp -rf /workspace/src/. /workspace/ && cd /workspace && rm -rf /workspace/src${smartEngineHook} && chmod -R 777 /workspace && echo "Clone completed. Handing off to Kaniko..."`,
              ],
              volumeMounts: [
                {
                  name: 'workspace',
                  mountPath: '/workspace',
                },
                ...(configMapName
                  ? [
                      {
                        name: 'custom-dockerfile',
                        mountPath: '/custom-dockerfile',
                      },
                    ]
                  : []),
              ],
            },
          ],
          containers: [
            {
              name: 'kaniko',
              image: 'gcr.io/kaniko-project/executor:latest',
              imagePullPolicy: 'IfNotPresent',
              securityContext: {
                runAsUser: 0,
                privileged: true,
              },
              args: [
                `--context=dir://${workspaceAppDir}`,
                ...(isInlineDockerfile
                  ? ['--dockerfile=/custom-dockerfile/Dockerfile']
                  : [`--dockerfile=${workspaceAppDir}/.masdika.Dockerfile`]),
                `--destination=${destinationImage}`,
                '--insecure',
                '--skip-tls-verify',
                ...(app.enableBuildCache !== false
                  ? [
                      '--cache=true',
                      `--cache-repo=127.0.0.1:5000/${app.subdomain}-cache`,
                      '--cache-ttl=24h',
                    ]
                  : ['--cache=false']),
              ],
                  volumeMounts: [
                    {
                      name: 'workspace',
                      mountPath: '/workspace',
                    },
                    ...(configMapName
                      ? [
                          {
                            name: 'custom-dockerfile',
                            mountPath: '/custom-dockerfile',
                          },
                        ]
                      : []),
                  ],
                  resources: {
                    requests: {
                      cpu: '500m',
                      memory: '512Mi',
                    },
                    limits: {
                      cpu: '2000m',
                      memory: '2048Mi',
                    },
                  },
                },
              ],
        },
      },
    },
  };

  await (batchApi as any).createNamespacedJob({
    namespace,
    body: jobManifest,
  });

  // Update DB status to BUILDING
  await prisma.appPlatformService.update({
    where: { id: app.id },
    data: {
      status: 'BUILDING',
      lastBuildStatus: 'BUILDING',
      lastBuildLog: `Build job [${jobName}] queued for repository ${app.gitUrl} on branch ${branch}...\n`,
    },
  });

  return { jobName, imageTag, deploymentId: activeDepId };
}

/**
 * Apply or update Kubernetes Deployment, Service, and Ingress for the app
 */
export async function applyAppPlatformResources(
  app: AppPlatformRecord,
  imageTag: string
): Promise<{ ingressUrl: string; nodePortUrl: string }> {
  const { kc } = await getAppPlatformK8sClients();
  const config = await getAppPlatformClusterConfig();
  const namespace = app.k8sNamespace || 'app-platform';
  const name = `app-${app.subdomain}`;
  const clusterImage = `127.0.0.1:5000/${app.subdomain}:${imageTag}`;
  const publicDomain = config.publicDomain || 'app.masdikacloud.my.id';
  const appHost = `${app.subdomain}.${publicDomain}`;

  // Parse user environment variables
  const userEnvs = parseEnvVarsToK8sEnv(app.envVars);
  const defaultEnvs = [
    { name: 'PORT', value: String(app.appPort) },
    { name: 'NODE_ENV', value: 'production' },
    { name: 'APP_SUBDOMAIN', value: app.subdomain },
    { name: 'APP_DOMAIN', value: appHost },
    { name: 'APP_URL', value: `https://${appHost}` },
  ];

  // Merge envs (user envs override defaults)
  const envMap = new Map<string, string>();
  for (const e of defaultEnvs) envMap.set(e.name, e.value);
  for (const e of userEnvs) envMap.set(e.name, e.value);
  const finalEnvs = Array.from(envMap.entries()).map(([k, v]) => ({ name: k, value: v }));

  // 0. Create or verify PersistentVolumeClaim if Persistent Storage is enabled
  const hasPersistentVolume = Boolean(
    app.persistentVolumePath &&
    app.persistentVolumePath.trim().startsWith('/') &&
    app.persistentVolumeGb &&
    app.persistentVolumeGb > 0
  );
  const pvcName = `pvc-${app.subdomain}`;

  if (hasPersistentVolume) {
    const { coreApi } = await getAppPlatformK8sClients();
    try {
      await (coreApi as any).readNamespacedPersistentVolumeClaim({ name: pvcName, namespace });
    } catch {
      await (coreApi as any).createNamespacedPersistentVolumeClaim({
        namespace,
        body: {
          apiVersion: 'v1',
          kind: 'PersistentVolumeClaim',
          metadata: {
            name: pvcName,
            namespace,
            labels: {
              app: app.subdomain,
              'app.kubernetes.io/managed-by': 'masdika-app-platform',
            },
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            storageClassName: 'local-path',
            resources: {
              requests: {
                storage: `${app.persistentVolumeGb}Gi`,
              },
            },
          },
        },
      }).catch((pvcErr: any) => {
        console.warn('[AppPlatform] PVC creation warning:', pvcErr?.message || pvcErr);
      });
    }
  }

  // Health Check Probes for Zero-Downtime Rolling Updates
  const cleanHealthPath = app.healthCheckPath && app.healthCheckPath.trim()
    ? (app.healthCheckPath.trim().startsWith('/') ? app.healthCheckPath.trim() : `/${app.healthCheckPath.trim()}`)
    : null;

  const probes = cleanHealthPath
    ? {
        readinessProbe: {
          httpGet: { path: cleanHealthPath, port: app.appPort || 3000 },
          initialDelaySeconds: 5,
          periodSeconds: 5,
          timeoutSeconds: 3,
          failureThreshold: 6,
        },
        livenessProbe: {
          httpGet: { path: cleanHealthPath, port: app.appPort || 3000 },
          initialDelaySeconds: 25,
          periodSeconds: 15,
          timeoutSeconds: 5,
          failureThreshold: 4,
        },
      }
    : {};

  // 1. Create or Update Deployment
  const replicas = app.status === 'STOPPED' || app.status === 'SUSPENDED' ? 0 : 1;
  const cpuReqM = Math.max(100, Math.round(app.cpuShares * 500));
  const cpuLimM = Math.max(250, Math.round(app.cpuShares * 1000));
  const memReqMi = Math.max(128, Math.round(app.memoryMb * 0.5));
  const memLimMi = Math.max(256, app.memoryMb);

  const deploymentManifest: k8s.V1Deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name,
      namespace,
      labels: {
        app: app.subdomain,
        'app.kubernetes.io/name': name,
        'app.kubernetes.io/managed-by': 'masdika-app-platform',
      },
    },
    spec: {
      replicas,
      strategy: hasPersistentVolume
        ? { type: 'Recreate' }
        : {
            type: 'RollingUpdate',
            rollingUpdate: { maxUnavailable: 0, maxSurge: 1 },
          },
      selector: {
        matchLabels: {
          app: app.subdomain,
        },
      },
      template: {
        metadata: {
          labels: {
            app: app.subdomain,
          },
          annotations: {
            'app-platform/image-tag': imageTag,
            'app-platform/deployed-at': new Date().toISOString(),
          },
        },
        spec: {
          ...(hasPersistentVolume
            ? {
                volumes: [
                  {
                    name: 'app-data',
                    persistentVolumeClaim: { claimName: pvcName },
                  },
                ],
              }
            : {}),
          containers: [
            {
              name: 'app',
              image: clusterImage,
              imagePullPolicy: 'Always',
              ports: [
                {
                  containerPort: app.appPort,
                  name: 'http',
                },
              ],
              env: finalEnvs,
              ...probes,
              ...(hasPersistentVolume
                ? {
                    volumeMounts: [
                      {
                        name: 'app-data',
                        mountPath: app.persistentVolumePath!.trim(),
                      },
                    ],
                  }
                : {}),
              resources: {
                requests: {
                  cpu: `${cpuReqM}m`,
                  memory: `${memReqMi}Mi`,
                },
                limits: {
                  cpu: `${cpuLimM}m`,
                  memory: `${memLimMi}Mi`,
                },
              },
            },
          ],
        },
      },
    },
  };

  // 2. Create or Update Service (NodePort)
  const serviceManifest: k8s.V1Service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name,
      namespace,
      labels: {
        app: app.subdomain,
        'app.kubernetes.io/name': name,
        'app.kubernetes.io/managed-by': 'masdika-app-platform',
      },
    },
    spec: {
      type: 'NodePort',
      selector: {
        app: app.subdomain,
      },
      ports: [
        {
          name: 'http',
          port: app.appPort,
          targetPort: app.appPort as any,
          nodePort: app.port,
          protocol: 'TCP',
        },
      ],
    },
  };

  // 3. Create or Update Ingress (Traefik + cert-manager auto SSL)
  const hosts = [appHost];
  if (app.customDomain && app.customDomain.trim()) {
    hosts.push(app.customDomain.trim());
  }

  const ingressRules = hosts.map((h) => ({
    host: h,
    http: {
      paths: [
        {
          path: '/',
          pathType: 'Prefix',
          backend: {
            service: {
              name,
              port: {
                number: app.appPort,
              },
            },
          },
        },
      ],
    },
  }));

  const redirectMiddlewareManifest = {
    apiVersion: 'traefik.io/v1alpha1',
    kind: 'Middleware',
    metadata: {
      name: 'redirect-https',
      namespace,
      labels: {
        'app.kubernetes.io/managed-by': 'masdika-app-platform',
      },
    },
    spec: {
      redirectScheme: {
        scheme: 'https',
        permanent: true,
      },
    },
  };

  let redirectMiddlewareReady = false;
  try {
    await applyKubernetesManifests(kc, k8s.dumpYaml(redirectMiddlewareManifest));
    redirectMiddlewareReady = true;
  } catch (mwErr: any) {
    console.warn('[AppPlatform] Traefik redirect-https Middleware warning:', mwErr?.body?.message || mwErr?.message || mwErr);
  }

  const ingressManifest: k8s.V1Ingress = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name,
      namespace,
      annotations: {
        'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
        'traefik.ingress.kubernetes.io/router.entrypoints': 'web,websecure',
        ...(redirectMiddlewareReady
          ? { 'traefik.ingress.kubernetes.io/router.middlewares': `${namespace}-redirect-https@kubernetescrd` }
          : { 'traefik.ingress.kubernetes.io/router.tls': 'true' }),
      },
      labels: {
        app: app.subdomain,
        'app.kubernetes.io/name': name,
        'app.kubernetes.io/managed-by': 'masdika-app-platform',
      },
    },
    spec: {
      rules: ingressRules,
      tls: [
        {
          hosts,
          secretName: `tls-${app.subdomain}`,
        },
      ],
    },
  };

  const manifestsYaml = [
    k8s.dumpYaml(deploymentManifest),
    k8s.dumpYaml(serviceManifest),
    k8s.dumpYaml(ingressManifest),
  ].join('\n---\n');

  await applyKubernetesManifests(kc, manifestsYaml);

  const ingressUrl = `https://${appHost}`;
  const nodePortUrl = `http://${config.publicIp}:${app.port}`;

  return { ingressUrl, nodePortUrl };
}

const syncingBuildPromises = new Map<number, Promise<void>>();

/**
 * Self-healing reconciler: pulls live Kubernetes build logs (git-clone + kaniko + Pod init status)
 * and syncs completion/failure state to PostgreSQL. Safe to call both from background watcher and HTTP polls.
 */
export async function syncAppPlatformBuildProgress(appId: number): Promise<void> {
  const existing = syncingBuildPromises.get(appId);
  if (existing) {
    return existing;
  }

  const runPromise = (async () => {
    const app = await prisma.appPlatformService.findUnique({ where: { id: appId } });
    if (!app) return;

    const isStillBuilding =
      app.status === 'BUILDING' ||
      app.status === 'PROVISIONING' ||
      app.lastBuildStatus === 'BUILDING' ||
      app.lastBuildStatus === 'QUEUED';
    if (!isStillBuilding) return;

    const latestDep = await prisma.appPlatformDeployment.findFirst({
      where: { appId },
      orderBy: { createdAt: 'desc' },
    });

    const namespace = app.k8sNamespace || 'app-platform';
    const { batchApi, coreApi } = await getAppPlatformK8sClients();

    const byNewest = (a: any, b: any) =>
      new Date(b?.metadata?.creationTimestamp || 0).getTime() -
      new Date(a?.metadata?.creationTimestamp || 0).getTime();

    const jobsRes: any = await (batchApi as any)
      .listNamespacedJob({ namespace, labelSelector: `build.app-platform/app=${app.subdomain}` })
      .catch(() => null);
    const jobs = ((jobsRes?.items || jobsRes?.body?.items || []) as any[]).sort(byNewest);
    const job = jobs[0];

    const podsRes: any = await (coreApi as any)
      .listNamespacedPod({ namespace, labelSelector: `build.app-platform/app=${app.subdomain}` })
      .catch(() => null);
    const pods = ((podsRes?.items || podsRes?.body?.items || []) as any[])
      .filter((p) => (p?.metadata?.name || '').startsWith('build-'))
      .sort(byNewest);
    const buildPod = pods[0];

    const jobName: string = job?.metadata?.name || buildPod?.metadata?.labels?.['job-name'] || '';
    const resolvedImageTag: string =
      job?.metadata?.labels?.['build.app-platform/image-tag'] ||
      latestDep?.imageTag ||
      'latest';

    const startedAtMs = latestDep?.createdAt
      ? new Date(latestDep.createdAt).getTime()
      : job?.metadata?.creationTimestamp
      ? new Date(job.metadata.creationTimestamp).getTime()
      : Date.now();
    const elapsedSec = Math.max(1, Math.round((Date.now() - startedAtMs) / 1000));

    // Collect live container logs from build pod (initContainer git-clone + kaniko/buildpack)
    let podLogs = '';
    if (buildPod?.metadata?.name) {
      const podName = buildPod.metadata.name;
      const parts: string[] = [];

      const readContainerLog = async (containerName: string): Promise<string> => {
        try {
          const logRes: any = await (coreApi as any).readNamespacedPodLog({
            name: podName,
            namespace,
            container: containerName,
          });
          const txt = typeof logRes === 'string' ? logRes : logRes?.body || '';
          return typeof txt === 'string' ? txt.trim() : '';
        } catch {
          return '';
        }
      };

      const gitTxt = await readContainerLog('git-clone');
      if (gitTxt) parts.push(gitTxt);

      for (const builderName of ['kaniko', 'buildpack']) {
        const bTxt = await readContainerLog(builderName);
        if (bTxt) {
          parts.push(bTxt);
          break;
        }
      }

      if (parts.length > 0) {
        podLogs = parts.join('\n');
      } else {
        // Container still pulling images / initializing: surface live Pod status immediately
        const baseQueueLine =
          (app.lastBuildLog || '').split('\n')[0] ||
          `Build job [${jobName || 'pending'}] queued for repository ${app.gitUrl}...`;
        const phase = buildPod.status?.phase || 'Pending';
        const statusSummary: string[] = [];

        for (const cs of [
          ...(buildPod.status?.initContainerStatuses || []),
          ...(buildPod.status?.containerStatuses || []),
        ]) {
          if (cs?.state?.waiting?.reason) {
            statusSummary.push(
              `${cs.name}: ${cs.state.waiting.reason}${cs.state.waiting.message ? ` (${cs.state.waiting.message})` : ''}`
            );
          } else if (cs?.state?.running) {
            statusSummary.push(`${cs.name}: Running`);
          } else if (cs?.state?.terminated) {
            statusSummary.push(`${cs.name}: ${cs.state.terminated.reason || 'Terminated'}`);
          }
        }

        const podConds = (buildPod.status?.conditions || [])
          .filter((c: any) => c.status === 'False' && c.message)
          .map((c: any) => `${c.type}: ${c.message}`);

        const detailText = statusSummary.join(' | ') || podConds.join(' | ') || 'Preparing container sandbox...';
        podLogs = `${baseQueueLine}\n[Kubernetes Pod: ${podName}] Phase: ${phase} · ${detailText} (${elapsedSec}s)`;
      }
    }

    if (podLogs) {
      await prisma.appPlatformService
        .update({
          where: { id: appId },
          data: { lastBuildLog: podLogs.slice(-25000) },
        })
        .catch(() => {});

      if (latestDep) {
        await prisma.appPlatformDeployment
          .update({
            where: { id: latestDep.id },
            data: {
              buildLogs: podLogs.slice(-50000),
              durationSeconds: elapsedSec,
            },
          })
          .catch(() => {});
      }
    }

    const markSuccess = async (finalTag: string) => {
      await applyAppPlatformResources(app as any, finalTag);

      await prisma.appPlatformService
        .update({
          where: { id: appId },
          data: {
            status: 'RUNNING',
            lastBuildStatus: 'SUCCESS',
            lastDeployedAt: new Date(),
            k8sDeployment: `app-${app.subdomain}`,
            k8sService: `app-${app.subdomain}`,
            k8sIngress: `app-${app.subdomain}`,
          },
        })
        .catch(() => {});

      if (latestDep) {
        await prisma.appPlatformDeployment
          .update({
            where: { id: latestDep.id },
            data: {
              status: 'SUCCESS',
              ...(podLogs ? { buildLogs: podLogs.slice(-50000) } : {}),
              imageTag: finalTag,
              durationSeconds: elapsedSec,
            },
          })
          .catch(() => {});
      }

      if (jobName) {
        await cleanupFinishedBuildJob(namespace, jobName).catch(() => {});
      }
      const successDeps = await prisma.appPlatformDeployment
        .findMany({
          where: { appId, status: 'SUCCESS', imageTag: { not: null } },
          select: { imageTag: true },
        })
        .catch(() => [] as { imageTag: string | null }[]);
      const keepTags = Array.from(
        new Set([finalTag, ...successDeps.map((d) => d.imageTag || '').filter(Boolean)])
      );
      pruneAppPlatformRegistryImages(app.subdomain, keepTags, false).catch(() => {});
    };

    try {
      // Case A: Job Succeeded
      if (job?.status?.succeeded && job.status.succeeded > 0) {
        await markSuccess(resolvedImageTag);
        return;
      }

      // Case B: Job Failed
      if (job?.status?.failed && job.status.failed > 0) {
        await prisma.appPlatformService
          .update({
            where: { id: appId },
            data: {
              status: 'ERROR',
              lastBuildStatus: 'FAILED',
            },
          })
          .catch(() => {});

        if (latestDep) {
          await prisma.appPlatformDeployment
            .update({
              where: { id: latestDep.id },
              data: {
                status: 'FAILED',
                ...(podLogs ? { buildLogs: podLogs.slice(-50000) } : {}),
                durationSeconds: elapsedSec,
              },
            })
            .catch(() => {});
        }

        if (jobName) {
          await cleanupFinishedBuildJob(namespace, jobName).catch(() => {});
        }
        runRegistryGarbageCollect().catch(() => {});
        return;
      }

      // Case C: Job & Pod disappeared (e.g., TTL cleaned up during Next.js restart)
      if (!job && !buildPod) {
        if (latestDep?.imageTag) {
          const tagsRes = await fetch(`http://127.0.0.1:5000/v2/${app.subdomain}/tags/list`).catch(() => null);
          if (tagsRes && tagsRes.ok) {
            const tagData = (await tagsRes.json().catch(() => null)) as { tags?: string[] } | null;
            if (Array.isArray(tagData?.tags) && tagData.tags.includes(latestDep.imageTag)) {
              await markSuccess(latestDep.imageTag);
              return;
            }
          }
        }

        if (elapsedSec > 900) {
          await prisma.appPlatformService
            .update({
              where: { id: appId },
              data: {
                status: 'ERROR',
                lastBuildStatus: 'FAILED',
                lastBuildLog: `${app.lastBuildLog || ''}\n[Build timed out or job removed after 15 minutes]`.slice(-25000),
              },
            })
            .catch(() => {});
          if (latestDep) {
            await prisma.appPlatformDeployment
              .update({
                where: { id: latestDep.id },
                data: { status: 'FAILED', durationSeconds: elapsedSec },
              })
              .catch(() => {});
          }
        }
      }
    } catch (syncErr: any) {
      const errMsg = syncErr?.body?.message || syncErr?.message || String(syncErr);
      await prisma.appPlatformService
        .update({
          where: { id: appId },
          data: {
            status: 'ERROR',
            lastBuildStatus: 'FAILED',
            lastBuildLog: `${podLogs || app.lastBuildLog || ''}\n[Deploy/Tracking Error] ${errMsg}`.slice(-25000),
          },
        })
        .catch(() => {});
      if (latestDep) {
        await prisma.appPlatformDeployment
          .update({
            where: { id: latestDep.id },
            data: { status: 'FAILED', durationSeconds: elapsedSec },
          })
          .catch(() => {});
      }
    }
  })().finally(() => {
    syncingBuildPromises.delete(appId);
  });

  syncingBuildPromises.set(appId, runPromise);
  return runPromise;
}

/**
 * Watch Kaniko build job in the background and update deployment upon completion
 */
export async function trackAppPlatformBuildAsync(
  appId: number,
  jobName: string,
  imageTag: string,
  deploymentId?: number
): Promise<void> {
  const maxWaitMs = 15 * 60 * 1000; // 15 minutes timeout
  const pollIntervalMs = 4000; // poll every 4 seconds
  const startTime = Date.now();
  const namespace = 'app-platform';

  try {
    // Immediate first sync so git-clone / PodInitializing state appears within 2 seconds
    await new Promise((r) => setTimeout(r, 1500));
    await syncAppPlatformBuildProgress(appId);

    while (Date.now() - startTime < maxWaitMs) {
      const cur = await prisma.appPlatformService
        .findUnique({
          where: { id: appId },
          select: { status: true, lastBuildStatus: true },
        })
        .catch(() => null);

      if (
        !cur ||
        (cur.lastBuildStatus !== 'BUILDING' &&
          cur.lastBuildStatus !== 'QUEUED' &&
          cur.status !== 'BUILDING' &&
          cur.status !== 'PROVISIONING')
      ) {
        return;
      }

      await new Promise((r) => setTimeout(r, pollIntervalMs));
      await syncAppPlatformBuildProgress(appId);
    }

    // Timed out after 15 minutes
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    const existingApp = await prisma.appPlatformService
      .findUnique({ where: { id: appId }, select: { lastBuildLog: true } })
      .catch(() => null);

    await prisma.appPlatformService
      .update({
        where: { id: appId },
        data: {
          status: 'ERROR',
          lastBuildStatus: 'FAILED',
          lastBuildLog: `${existingApp?.lastBuildLog || ''}\n[Build timed out after 15 minutes]`.slice(-25000),
        },
      })
      .catch(() => {});

    if (deploymentId) {
      await prisma.appPlatformDeployment
        .update({
          where: { id: deploymentId },
          data: {
            status: 'FAILED',
            durationSeconds: elapsedSec,
          },
        })
        .catch(() => {});
    }

    await cleanupFinishedBuildJob(namespace, jobName).catch(() => {});
    runRegistryGarbageCollect().catch(() => {});
  } catch (err: any) {
    console.error(`[AppPlatform] Build tracking error for ${jobName}:`, err);
    const errMsg = err?.body?.message || err?.message || String(err);
    const existingApp = await prisma.appPlatformService
      .findUnique({
        where: { id: appId },
        select: { lastBuildLog: true },
      })
      .catch(() => null);
    await prisma.appPlatformService
      .update({
        where: { id: appId },
        data: {
          status: 'ERROR',
          lastBuildStatus: 'FAILED',
          lastBuildLog: `${existingApp?.lastBuildLog || ''}\n[Deploy/Tracking Error] ${errMsg}`.slice(-25000),
        },
      })
      .catch(() => {});

    if (deploymentId) {
      await prisma.appPlatformDeployment
        .update({
          where: { id: deploymentId },
          data: {
            status: 'FAILED',
          },
        })
        .catch(() => {});
    }
  }
}

/**
 * Scale deployment (Start: 1, Stop: 0)
 */
export async function scaleAppPlatform(app: AppPlatformRecord, replicas: number): Promise<void> {
  const { appsApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const name = app.k8sDeployment || `app-${app.subdomain}`;

  await (appsApi as any).patchNamespacedDeployment(
    {
      name,
      namespace,
      body: {
        spec: { replicas },
      },
    },
    { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
  );

  await prisma.appPlatformService.update({
    where: { id: app.id },
    data: {
      status: replicas > 0 ? 'RUNNING' : 'STOPPED',
      ...(replicas > 0 ? { suspendReason: null, terminationDate: null } : {}),
    },
  });
}

/**
 * Restart deployment (Rollout restart)
 */
export async function restartAppPlatform(app: AppPlatformRecord): Promise<void> {
  const { appsApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const name = app.k8sDeployment || `app-${app.subdomain}`;

  await (appsApi as any).patchNamespacedDeployment(
    {
      name,
      namespace,
      body: {
        spec: {
          template: {
            metadata: {
              annotations: {
                'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
              },
            },
          },
        },
      },
    },
    { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
  );

  await prisma.appPlatformService.update({
    where: { id: app.id },
    data: {
      status: 'RUNNING',
    },
  });
}

/**
 * Fetch live runtime logs from the active deployment pod
 */
export async function getAppPlatformRuntimeLogs(app: AppPlatformRecord, tailLines = 200): Promise<string> {
  if (app.status === 'PROVISIONING' || app.status === 'BUILDING' || app.status === 'ERROR') {
    if (app.lastBuildStatus === 'BUILDING') {
      return 'Application is currently building. Please check the Build Logs tab.';
    }
    if (app.lastBuildStatus === 'FAILED') {
      return 'Application build failed. Please check the Build Logs tab for build error details.';
    }
  }

  const { coreApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';

  const podsRes: any = await (coreApi as any).listNamespacedPod({
    namespace,
    labelSelector: `app=${app.subdomain}`,
  });
  const allPods = podsRes?.items || podsRes?.body?.items || [];

  // Only select runtime deployment pods that contain container 'app'
  const appPods = allPods.filter((p: any) =>
    p.spec?.containers?.some((c: any) => c.name === 'app')
  );

  if (appPods.length === 0) {
    return 'No active runtime pods found for this application. If you just deployed, please check the Build Logs tab.';
  }

  const runningPod = appPods.find((p: any) => p?.status?.phase === 'Running') || appPods[0];
  const podName = runningPod?.metadata?.name;
  if (!podName) return 'Pod name unavailable.';

  try {
    const logRes: any = await (coreApi as any).readNamespacedPodLog({
      name: podName,
      namespace,
      container: 'app',
      tailLines,
    });
    return typeof logRes === 'string' ? logRes : (logRes?.body || 'No log output produced.');
  } catch (err: any) {
    return `Runtime logs unavailable: ${err?.message || 'Pod is initializing'}`;
  }
}

/**
 * Immediately delete a completed/failed Kaniko build Job, its Pods, and its temporary Dockerfile ConfigMap
 */
export async function cleanupFinishedBuildJob(
  namespace: string,
  jobName: string
): Promise<void> {
  try {
    const { coreApi, batchApi } = await getAppPlatformK8sClients();

    await (coreApi as any).deleteNamespacedConfigMap({
      name: `cm-df-${jobName}`,
      namespace,
    }).catch(() => {});

    await (batchApi as any).deleteNamespacedJob({
      name: jobName,
      namespace,
      propagationPolicy: 'Background',
    }).catch(() => {});

    const podsRes: any = await (coreApi as any).listNamespacedPod({
      namespace,
      labelSelector: `job-name=${jobName}`,
    }).catch(() => null);
    for (const p of podsRes?.items || podsRes?.body?.items || []) {
      if (p?.metadata?.name) {
        await (coreApi as any).deleteNamespacedPod({
          name: p.metadata.name,
          namespace,
        }).catch(() => {});
      }
    }
  } catch {}
}

/**
 * Automatically clean up completed or failed build jobs/pods and stale Dockerfile ConfigMaps
 */
export async function cleanOrphanedBuildResources(): Promise<void> {
  try {
    const { coreApi, batchApi } = await getAppPlatformK8sClients();
    const namespace = 'app-platform';
    const activeJobNames = new Set<string>();

    // 1. Clean completed/failed jobs
    const jobsRes: any = await (batchApi as any).listNamespacedJob({ namespace }).catch(() => null);
    const jobs = jobsRes?.items || jobsRes?.body?.items || [];
    for (const j of jobs) {
      const jName = j?.metadata?.name;
      const isFinished = (j?.status?.succeeded || 0) > 0 || (j?.status?.failed || 0) > 0;
      if (isFinished && jName) {
        await (batchApi as any).deleteNamespacedJob({
          name: jName,
          namespace,
          propagationPolicy: 'Background',
        }).catch(() => {});
      } else if (jName) {
        activeJobNames.add(jName);
      }
    }

    // 2. Clean Error/Completed/Failed pods in app-platform namespace
    const podsRes: any = await (coreApi as any).listNamespacedPod({ namespace }).catch(() => null);
    const pods = podsRes?.items || podsRes?.body?.items || [];
    for (const p of pods) {
      const pName = p?.metadata?.name || '';
      const phase = p?.status?.phase;
      const isTerminated = p?.status?.containerStatuses?.some((c: any) => c?.state?.terminated !== undefined);
      if (pName.startsWith('build-') && (phase === 'Succeeded' || phase === 'Failed' || phase === 'Error' || isTerminated)) {
        await (coreApi as any).deleteNamespacedPod({ name: pName, namespace }).catch(() => {});
      }
    }

    // 3. Clean stale temporary Dockerfile ConfigMaps whose build job is no longer active
    const cmsRes: any = await (coreApi as any).listNamespacedConfigMap({ namespace }).catch(() => null);
    const cms = cmsRes?.items || cmsRes?.body?.items || [];
    for (const cm of cms) {
      const cmName = cm?.metadata?.name || '';
      if (cmName.startsWith('cm-df-build-')) {
        const linkedJobName = cmName.slice('cm-df-'.length);
        if (!activeJobNames.has(linkedJobName)) {
          await (coreApi as any).deleteNamespacedConfigMap({ name: cmName, namespace }).catch(() => {});
        }
      }
    }
  } catch {}
}

/**
 * Run Docker Registry v2 garbage collection to physically free deleted manifests/blobs from disk immediately
 */
export async function runRegistryGarbageCollect(): Promise<void> {
  try {
    const { kc, coreApi } = await getAppPlatformK8sClients();
    const namespace = 'app-platform';
    const podsRes: any = await (coreApi as any).listNamespacedPod({
      namespace,
      labelSelector: 'app=app-platform-registry',
    }).catch(() => null);
    const pods = podsRes?.items || podsRes?.body?.items || [];
    const runningPod = pods.find((p: any) => p?.status?.phase === 'Running') || pods[0];
    const podName = runningPod?.metadata?.name;
    if (!podName) return;

    const exec = new k8s.Exec(kc);
    const { PassThrough } = await import('stream');
    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();
    stdoutStream.resume();
    stderrStream.resume();

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 20000);
      exec
        .exec(
          namespace,
          podName,
          'registry',
          ['/bin/registry', 'garbage-collect', '/etc/docker/registry/config.yml', '--delete-untagged=true'],
          stdoutStream,
          stderrStream,
          null,
          false,
          () => {
            clearTimeout(timer);
            resolve();
          }
        )
        .catch(() => {
          clearTimeout(timer);
          resolve();
        });
    });
  } catch {}
}

/**
 * Immediately prune old/unreferenced image manifests and intermediate Kaniko cache layers for an app,
 * then run Registry GC to reclaim disk space immediately instead of waiting 7 days.
 */
export async function pruneAppPlatformRegistryImages(
  subdomain: string,
  keepImageTags: string[],
  clearBuildCache = true
): Promise<void> {
  try {
    const registryBaseUrl = 'http://127.0.0.1:5000';
    const keepSet = new Set(keepImageTags.filter(Boolean));
    let deletedAny = false;

    const deleteTagManifest = async (repoName: string, tag: string) => {
      const manifestRes = await fetch(`${registryBaseUrl}/v2/${repoName}/manifests/${tag}`, {
        headers: {
          Accept:
            'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json',
        },
      }).catch(() => null);
      const digest = manifestRes?.headers?.get('Docker-Content-Digest');
      if (digest) {
        const delRes = await fetch(`${registryBaseUrl}/v2/${repoName}/manifests/${digest}`, {
          method: 'DELETE',
        }).catch(() => null);
        if (delRes && delRes.ok) deletedAny = true;
      }
    };

    if (clearBuildCache) {
      const cacheRepo = `${subdomain}-cache`;
      const cacheTagsRes = await fetch(`${registryBaseUrl}/v2/${cacheRepo}/tags/list`).catch(() => null);
      if (cacheTagsRes && cacheTagsRes.ok) {
        const cacheTagList = (await cacheTagsRes.json()) as { tags?: string[] };
        for (const tag of cacheTagList.tags || []) {
          await deleteTagManifest(cacheRepo, tag);
        }
      }
    }

    const appTagsRes = await fetch(`${registryBaseUrl}/v2/${subdomain}/tags/list`).catch(() => null);
    if (appTagsRes && appTagsRes.ok) {
      const appTagList = (await appTagsRes.json()) as { tags?: string[] };
      for (const tag of appTagList.tags || []) {
        if (!keepSet.has(tag)) {
          await deleteTagManifest(subdomain, tag);
        }
      }
    }

    if (deletedAny) {
      await runRegistryGarbageCollect();
    }
  } catch {}
}

/**
 * Delete deployment, service, ingress, and clean up resources
 */
export async function deleteAppPlatformResources(app: AppPlatformRecord): Promise<void> {
  const { appsApi, coreApi, netApi, batchApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const name = `app-${app.subdomain}`;
  const subdomain = app.subdomain;

  // 1. Delete Deployment
  try {
    await (appsApi as any).deleteNamespacedDeployment({ name, namespace });
  } catch {}

  // 2. Delete Service
  try {
    await (coreApi as any).deleteNamespacedService({ name, namespace });
  } catch {}

  // 3. Delete Ingress
  try {
    await (netApi as any).deleteNamespacedIngress({ name, namespace });
  } catch {}

  // 4. Delete TLS secret
  try {
    await (coreApi as any).deleteNamespacedSecret({ name: `tls-${subdomain}`, namespace });
  } catch {}

  // 5. Delete all Build Jobs for this app
  try {
    const jobsRes: any = await (batchApi as any).listNamespacedJob({ namespace });
    const jobs = jobsRes?.items || jobsRes?.body?.items || [];
    for (const j of jobs) {
      const jName = j?.metadata?.name || '';
      const isMatch = jName.startsWith(`build-${subdomain}-`) || j?.metadata?.labels?.['build.app-platform/app'] === subdomain;
      if (isMatch) {
        await (batchApi as any).deleteNamespacedJob({
          name: jName,
          namespace,
          propagationPolicy: 'Background',
        }).catch(() => {});
      }
    }
  } catch {}

  // 6. Delete all Pods for this app (both runtime and build pods)
  try {
    const podsRes: any = await (coreApi as any).listNamespacedPod({ namespace });
    const pods = podsRes?.items || podsRes?.body?.items || [];
    for (const p of pods) {
      const pName = p?.metadata?.name || '';
      const labels = p?.metadata?.labels || {};
      const isMatch =
        pName.startsWith(`build-${subdomain}-`) ||
        pName.startsWith(`app-${subdomain}-`) ||
        labels['build.app-platform/app'] === subdomain ||
        labels['app'] === `app-${subdomain}` ||
        labels['app'] === subdomain;
      if (isMatch) {
        await (coreApi as any).deleteNamespacedPod({
          name: pName,
          namespace,
        }).catch(() => {});
      }
    }
  } catch {}

  // 7. Delete all ConfigMaps for this app
  try {
    const cmsRes: any = await (coreApi as any).listNamespacedConfigMap({ namespace });
    const cms = cmsRes?.items || cmsRes?.body?.items || [];
    for (const cm of cms) {
      const cmName = cm?.metadata?.name || '';
      const labels = cm?.metadata?.labels || {};
      const isMatch = cmName.startsWith(`cm-df-build-${subdomain}-`) || labels['build.app-platform/app'] === subdomain;
      if (isMatch) {
        await (coreApi as any).deleteNamespacedConfigMap({
          name: cmName,
          namespace,
        }).catch(() => {});
      }
    }
  } catch {}

  // 8. Clean up built images AND layer cache repos from in-cluster registry and run GC immediately
  await pruneAppPlatformRegistryImages(subdomain, [], true).catch(() => {});

  // 8b. Clean up any lingering PR Preview Environments for this app
  try {
    const prDepsRes: any = await (appsApi as any).listNamespacedDeployment({
      namespace,
      labelSelector: `app-platform/pr-parent=${subdomain}`,
    });
    for (const d of (prDepsRes?.items || prDepsRes?.body?.items || [])) {
      const prDepName = d?.metadata?.name;
      const prSub = d?.metadata?.labels?.app;
      if (prDepName) {
        await (netApi as any).deleteNamespacedIngress({ name: prDepName, namespace }).catch(() => {});
        await (coreApi as any).deleteNamespacedService({ name: prDepName, namespace }).catch(() => {});
        await (appsApi as any).deleteNamespacedDeployment({ name: prDepName, namespace, propagationPolicy: 'Foreground' }).catch(() => {});
        if (prSub) {
          await (coreApi as any).deleteNamespacedSecret({ name: `tls-${prSub}`, namespace }).catch(() => {});
        }
      }
    }
  } catch {}

  // 9. Clean up PersistentVolumeClaim if exists
  await (coreApi as any).deleteNamespacedPersistentVolumeClaim({
    name: `pvc-${subdomain}`,
    namespace,
  }).catch(() => {});

  // 10. Clean up any general orphaned build pods
  cleanOrphanedBuildResources().catch(() => {});

  releaseReservedAppPlatformPort(app.port);
}

/**
 * Execute a shell command inside the running App Platform Pod (Web Terminal)
 */
export async function execAppPlatformCommand(
  app: AppPlatformRecord,
  command: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { kc, coreApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const podsRes: any = await (coreApi as any).listNamespacedPod({
    namespace,
    labelSelector: `app=${app.subdomain}`,
  });
  const pods = podsRes?.items || podsRes?.body?.items || [];
  const runningPod = pods.find((p: any) => p?.status?.phase === 'Running') || pods[0];

  if (!runningPod?.metadata?.name) {
    throw new Error('No running container pod found for this application.');
  }

  const podName = runningPod.metadata.name;
  const containerName = runningPod.spec?.containers?.[0]?.name || 'app';

  const exec = new k8s.Exec(kc);
  const { PassThrough } = await import('stream');

  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();
  let stdout = '';
  let stderr = '';

  stdoutStream.on('data', (chunk: Buffer) => {
    if (stdout.length < 64000) stdout += chunk.toString('utf8');
  });
  stderrStream.on('data', (chunk: Buffer) => {
    if (stderr.length < 32000) stderr += chunk.toString('utf8');
  });

  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve({
        stdout,
        stderr: stderr + '\n[Command timed out after 30s]',
        exitCode: 124,
      });
    }, 30000);

    exec
      .exec(
        namespace,
        podName,
        containerName,
        ['sh', '-c', command],
        stdoutStream,
        stderrStream,
        null,
        false,
        (status: any) => {
          clearTimeout(timer);
          const isSuccess = status?.status === 'Success';
          resolve({
            stdout,
            stderr: isSuccess ? stderr : (stderr || status?.message || ''),
            exitCode: isSuccess ? 0 : 1,
          });
        }
      )
      .catch((err: any) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Deploy an ephemeral PR Preview Environment (pr-<number>-<subdomain>)
 */
export async function applyPrPreviewResources(
  app: AppPlatformRecord,
  prNumber: number,
  imageTag: string
): Promise<{ previewUrl: string }> {
  const { kc } = await getAppPlatformK8sClients();
  const config = await getAppPlatformClusterConfig();
  const namespace = app.k8sNamespace || 'app-platform';
  const previewSubdomain = `pr-${prNumber}-${app.subdomain}`;
  const name = `app-${previewSubdomain}`;
  const clusterImage = `127.0.0.1:5000/${app.subdomain}:${imageTag}`;
  const publicDomain = config.publicDomain || 'app.masdikacloud.my.id';
  const previewHost = `${previewSubdomain}.${publicDomain}`;

  const appsApi = kc.makeApiClient(k8s.AppsV1Api);
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  const networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);

  const userEnvs = parseEnvVarsToK8sEnv(app.envVars);
  const finalEnvs = [
    { name: 'PORT', value: String(app.appPort || 3000) },
    { name: 'NODE_ENV', value: 'production' },
    { name: 'PR_NUMBER', value: String(prNumber) },
    ...userEnvs,
  ];

  const deploymentManifest: k8s.V1Deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name,
      namespace,
      labels: {
        app: previewSubdomain,
        'app-platform/pr-parent': app.subdomain,
        'app-platform/pr-number': String(prNumber),
      },
    },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: previewSubdomain } },
      template: {
        metadata: { labels: { app: previewSubdomain } },
        spec: {
          containers: [
            {
              name: 'app',
              image: clusterImage,
              imagePullPolicy: 'Always',
              ports: [{ containerPort: app.appPort || 3000, name: 'http' }],
              env: finalEnvs,
              resources: {
                requests: { cpu: '100m', memory: '128Mi' },
                limits: { cpu: '500m', memory: '512Mi' },
              },
            },
          ],
        },
      },
    },
  };

  try {
    await (appsApi as any).replaceNamespacedDeployment({ name, namespace, body: deploymentManifest });
  } catch {
    await (appsApi as any).createNamespacedDeployment({ namespace, body: deploymentManifest });
  }

  const serviceManifest: k8s.V1Service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name, namespace, labels: { app: previewSubdomain, 'app-platform/pr-parent': app.subdomain } },
    spec: {
      type: 'ClusterIP',
      selector: { app: previewSubdomain },
      ports: [{ port: app.appPort || 3000, targetPort: app.appPort || 3000, name: 'http' }],
    },
  };

  try {
    await (coreApi as any).replaceNamespacedService({ name, namespace, body: serviceManifest });
  } catch {
    await (coreApi as any).createNamespacedService({ namespace, body: serviceManifest });
  }

  const ingressManifest: k8s.V1Ingress = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name,
      namespace,
      annotations: {
        'cert-manager.io/cluster-issuer': 'letsencrypt-production',
        'traefik.ingress.kubernetes.io/router.entrypoints': 'websecure',
        'traefik.ingress.kubernetes.io/router.tls': 'true',
      },
    },
    spec: {
      ingressClassName: 'traefik',
      rules: [
        {
          host: previewHost,
          http: {
            paths: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: { service: { name, port: { number: app.appPort || 3000 } } },
              },
            ],
          },
        },
      ],
      tls: [{ hosts: [previewHost], secretName: `tls-${previewSubdomain}` }],
    },
  };

  try {
    await (networkingApi as any).replaceNamespacedIngress({ name, namespace, body: ingressManifest });
  } catch {
    await (networkingApi as any).createNamespacedIngress({ namespace, body: ingressManifest });
  }

  return { previewUrl: `https://${previewHost}` };
}

/**
 * Clean up an ephemeral PR Preview Environment when PR is closed or merged
 */
export async function deletePrPreviewResources(
  app: AppPlatformRecord,
  prNumber: number
): Promise<void> {
  const { appsApi, coreApi, netApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const previewSubdomain = `pr-${prNumber}-${app.subdomain}`;
  const name = `app-${previewSubdomain}`;

  await (netApi as any).deleteNamespacedIngress({ name, namespace }).catch(() => {});
  await (coreApi as any).deleteNamespacedService({ name, namespace }).catch(() => {});
  await (appsApi as any).deleteNamespacedDeployment({ name, namespace, propagationPolicy: 'Foreground' }).catch(() => {});
  await (coreApi as any).deleteNamespacedSecret({ name: `tls-${previewSubdomain}`, namespace }).catch(() => {});
}

/**
 * Test Kubernetes connection and fetch cluster nodes for Cloud Apps (App Platform)
 */
export async function testAppPlatformClusterConnection(customConfig?: {
  apiServer?: string;
  kubeconfig?: string;
  serviceToken?: string;
  skipTlsVerify?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  nodes?: string[];
  latencyMs?: number;
}> {
  const startTime = Date.now();
  try {
    const kc = new k8s.KubeConfig();

    let kubeconfig = customConfig?.kubeconfig;
    let apiServer = customConfig?.apiServer;
    let serviceToken = customConfig?.serviceToken;
    let skipTls = customConfig?.skipTlsVerify ?? true;

    const isMaskedKubeconfig = !kubeconfig || kubeconfig === '••••••••' || kubeconfig.trim().length === 0;
    const isMaskedToken = !serviceToken || serviceToken === '••••••••' || serviceToken.trim().length === 0;

    // Fallback to active saved DB configuration if not provided or masked
    if (isMaskedKubeconfig && isMaskedToken) {
      const activeConfig = await getAppPlatformClusterConfig();
      if (apiServer && apiServer.trim() && activeConfig.apiServer && apiServer.trim() !== activeConfig.apiServer.trim()) {
        return {
          success: false,
          message: 'Explicit Kubeconfig YAML or Service Token is required when testing a different API Server URL.',
          latencyMs: Date.now() - startTime,
        };
      }
      kubeconfig = activeConfig.kubeconfig;
      if (!apiServer) apiServer = activeConfig.apiServer;
      if (!serviceToken) serviceToken = activeConfig.serviceToken;
      skipTls = activeConfig.skipTlsVerify;
    }

    if (kubeconfig && kubeconfig !== '••••••••' && kubeconfig.trim().length > 0) {
      kc.loadFromString(kubeconfig.trim());
      if (kc.getUsers().some((u: any) => Boolean(u?.exec))) {
        return {
          success: false,
          message: 'Kubeconfig exec auth plugins are not permitted for security reasons.',
          latencyMs: Date.now() - startTime,
        };
      }
      if (apiServer && apiServer.trim().length > 0) {
        const cluster = kc.getCurrentCluster();
        if (cluster) {
          (cluster as any).server = apiServer.trim();
          if (skipTls) (cluster as any).skipTLSVerify = true;
        }
      }
    } else if (serviceToken && serviceToken !== '••••••••' && apiServer) {
      kc.loadFromClusterAndUser(
        {
          name: 'app-platform-cluster',
          server: apiServer.trim(),
          skipTLSVerify: skipTls,
        },
        {
          name: 'app-platform-user',
          token: serviceToken.trim(),
        }
      );
    } else {
      return {
        success: false,
        message: 'No Kubeconfig YAML or API Server configuration provided for Cloud Apps (App Platform).',
        latencyMs: Date.now() - startTime,
      };
    }

    const targetServer = kc.getCurrentCluster()?.server;
    if (!targetServer) {
      return {
        success: false,
        message: 'No cluster server URL found in Kubeconfig.',
        latencyMs: Date.now() - startTime,
      };
    }
    const { validateClusterOrStorageEndpoint } = await import('@/lib/ssrf');
    await validateClusterOrStorageEndpoint(targetServer, 'Kubernetes API Server');

    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const nodeRes = await coreApi.listNode();
    const items = (nodeRes as any).items || (nodeRes as any).body?.items || [];
    const latencyMs = Date.now() - startTime;
    const nodes = items.map((n: any) => n.metadata?.name || 'unknown');

    // Pre-warm / ensure private registry is running in background
    ensureAppPlatformRegistry().catch(() => {});

    return {
      success: true,
      message: `Connected successfully to Cloud Apps Kubernetes cluster (${latencyMs}ms). Found ${nodes.length} node(s): ${nodes.join(', ')}`,
      nodes,
      latencyMs,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Connection failed: ${error?.message || 'Unable to connect to Cloud Apps Kubernetes API'}`,
      latencyMs: Date.now() - startTime,
    };
  }
}
