import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MANAGED_APPS_CATALOG,
  MANAGED_APP_PLANS,
  getAppDefinition,
  getAppPlan,
  formatRupiah,
} from '../app-catalog';
import {
  deployAppService,
  scaleAppService,
  stopAppService,
  startAppService,
  deleteAppService,
  allocateAppPort,
  buildAppContainerSpec,
  checkAppClusterCapacity,
} from '../k8s-app';
import * as k8s from '@kubernetes/client-node';

vi.mock('../prisma', () => ({
  prisma: {
    setting: {
      findMany: vi.fn().mockResolvedValue([
        { key: 'managed_app_auth_mode', value: 'KUBECONFIG' },
        { key: 'managed_app_api_server', value: 'https://192.168.79.17:6443' },
        { key: 'managed_app_kubeconfig', value: 'apiVersion: v1\nclusters: []\ncontexts: []\ncurrent-context: ""' },
        { key: 'managed_app_skip_tls', value: 'true' },
        { key: 'managed_app_public_domain', value: 'app.masdika.id' },
        { key: 'managed_app_public_ip', value: '103.247.10.61' },
      ]),
    },
    appService: {
      findMany: vi.fn().mockResolvedValue([
        { port: 30000 },
        { port: 30001 },
        { port: 30002 },
        { port: 30003 },
      ]),
    },
    databaseService: {
      findMany: vi.fn().mockResolvedValue([
        { port: 30000 },
        { port: 30003 },
      ]),
    },
  },
}));

describe('Managed Apps Catalog & Engine', () => {
  describe('App Catalog & Flavors', () => {
    it('should have all 6 requested apps with official branding and ports', () => {
      expect(MANAGED_APPS_CATALOG).toHaveLength(6);
      const ids = MANAGED_APPS_CATALOG.map((a) => a.id);
      expect(ids).toContain('hermes');
      expect(ids).toContain('ninerouter');
      expect(ids).toContain('n8n');
      expect(ids).toContain('opencode');
      expect(ids).toContain('openclaw');
      expect(ids).toContain('omniroute');

      const n8n = getAppDefinition('n8n');
      expect(n8n).toBeDefined();
      expect(n8n?.appPort).toBe(5678);
      expect(n8n?.icon).toBe('/images/apps/n8n.png');

      const hermes = getAppDefinition('hermes');
      expect(hermes).toBeDefined();
      expect(hermes?.appPort).toBe(9119);
      expect(hermes?.accessProtocol).toBe('BOTH');
      expect(hermes?.icon).toBe('/images/apps/hermes-agent.png');

      const router = getAppDefinition('ninerouter');
      expect(router).toBeDefined();
      expect(router?.appPort).toBe(20128);

      const omniroute = getAppDefinition('omniroute');
      expect(omniroute).toBeDefined();
      expect(omniroute?.appPort).toBe(20128);
      expect(omniroute?.accessProtocol).toBe('WEB');
      expect(omniroute?.dataDir).toBe('/app/data');
      expect(omniroute?.defaultImage).toBe('docker.io/diegosouzapw/omniroute:latest');

      const opencode = getAppDefinition('opencode');
      expect(opencode).toBeDefined();
      expect(opencode?.icon).toBe('/images/apps/opencode.png');
      expect(opencode?.accessProtocol).toBe('BOTH');
      expect(opencode?.appPort).toBe(4096);
      expect(opencode?.dataDir).toBe('/workspace');

      const openclaw = getAppDefinition('openclaw');
      expect(openclaw).toBeDefined();
      expect(openclaw?.icon).toBe('/images/apps/openclaw.png');
      expect(openclaw?.accessProtocol).toBe('BOTH');
      expect(openclaw?.appPort).toBe(18789);
      expect(openclaw?.minMemoryMb).toBe(2048);
      expect(openclaw?.dataDir).toBe('/home/node/.openclaw');
      expect(router?.accessProtocol).toBe('WEB');
      expect(n8n?.accessProtocol).toBe('WEB');
    });

    it('should have all 7 compute plans matching user requirements', () => {
      expect(MANAGED_APP_PLANS).toHaveLength(7);

      const plan1c1g = getAppPlan('1C1G');
      expect(plan1c1g).toBeDefined();
      expect(plan1c1g?.cpuShares).toBe(1.0);
      expect(plan1c1g?.memoryMb).toBe(1024);
      expect(plan1c1g?.monthlyPrice).toBe(20000);
      expect(plan1c1g?.remainingStock).toBe(23);

      const plan1c2g = getAppPlan('1C2G');
      expect(plan1c2g).toBeDefined();
      expect(plan1c2g?.cpuShares).toBe(1.0);
      expect(plan1c2g?.memoryMb).toBe(2048);
      expect(plan1c2g?.monthlyPrice).toBe(30000);
      expect(plan1c2g?.remainingStock).toBe(35);

      const plan2c2g = getAppPlan('2C2G');
      expect(plan2c2g?.monthlyPrice).toBe(40000);

      const plan2c4g = getAppPlan('2C4G');
      expect(plan2c4g?.monthlyPrice).toBe(75000);

      const plan4c4g = getAppPlan('4C4G');
      expect(plan4c4g?.monthlyPrice).toBe(135000);

      const plan4c8g = getAppPlan('4C8G');
      expect(plan4c8g?.monthlyPrice).toBe(225000);

      const plan4c16g = getAppPlan('4C16G');
      expect(plan4c16g?.monthlyPrice).toBe(375000);
      expect(plan4c16g?.memoryMb).toBe(16384);
    });

    it('should format currency correctly in Indonesian Rupiah', () => {
      expect(formatRupiah(20000)).toBe('Rp 20.000');
      expect(formatRupiah(375000)).toBe('Rp 375.000');
    });

    it('should generate valid Kubernetes manifests for all 6 catalog apps without YAML syntax errors', () => {
      const appTypes = ['hermes', 'n8n', 'ninerouter', 'opencode', 'openclaw', 'omniroute'];
      for (const appType of appTypes) {
        const dummyApp: any = {
          id: 42,
          userId: 1,
          name: `test-${appType}`,
          appType,
          templateName: 'Standard',
          planName: '1C1G',
          region: 'SDA',
          node: 'node1',
          subdomain: `test-${appType}`,
          host: '103.247.10.61',
          port: 30100,
          appPort: 3000,
          cpuShares: 1,
          memoryMb: 1024,
          storageGb: 10,
          billingMode: 'monthly',
          monthlyPrice: 20000,
          hourlyRate: 30,
          accumulatedCost: 0,
          status: 'active',
          password: 'TestPassword123!',
        };

        const { image, envYaml, commandYaml, securityContextYaml } = buildAppContainerSpec(dummyApp);
        expect(image).toBeDefined();

        const manifestYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: deploy-app-${dummyApp.id}
  namespace: managed-apps
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - name: test
        image: ${image}
        ports:
        - name: app-port
          containerPort: ${dummyApp.appPort}${securityContextYaml}${commandYaml}${envYaml ? `\n        env:${envYaml}` : ''}
`;

        expect(() => k8s.loadAllYaml(manifestYaml)).not.toThrow();
        const parsed = k8s.loadAllYaml(manifestYaml);
        expect(parsed.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should configure OpenCode with authenticated browser Web UI on port 4096 and SSH on port 22 without port collision', () => {
      const legacyPortSpec = buildAppContainerSpec({
        id: 11,
        userId: 1,
        name: 'opencode-dual',
        appType: 'opencode',
        templateName: 'Standard',
        planName: '1C1G',
        region: 'SDA',
        node: 'node1',
        subdomain: 'opencode-dual',
        host: '103.247.10.61',
        port: 30775,
        appPort: 22,
        cpuShares: 1,
        memoryMb: 1024,
        storageGb: 10,
        billingMode: 'monthly',
        monthlyPrice: 20000,
        hourlyRate: 30,
        accumulatedCost: 0,
        status: 'RUNNING',
        username: 'root',
        password: 'MkApp_SecurePassword99',
      } as any);

      expect(legacyPortSpec.envYaml).toContain('OPENCODE_SERVER_USERNAME');
      expect(legacyPortSpec.envYaml).toContain('value: "root"');
      expect(legacyPortSpec.envYaml).toContain('OPENCODE_SERVER_PASSWORD');
      expect(legacyPortSpec.envYaml).toContain('value: "MkApp_SecurePassword99"');
      expect(legacyPortSpec.commandYaml).toContain('/usr/sbin/sshd -p 22');
      expect(legacyPortSpec.commandYaml).toContain('/sbin/apk');
      expect(legacyPortSpec.commandYaml).toContain('AllowTcpForwarding no');
      expect(legacyPortSpec.commandYaml).toContain('opencode serve --hostname 0.0.0.0 --port 4096 --cors "https://opencode-dual.app.masdika.id"');
    });

    it('should configure OpenClaw with official gateway Control UI on port 18789, gateway token, memory cap, and SSH on port 22', () => {
      const openclawSpec = buildAppContainerSpec({
        id: 12,
        userId: 1,
        name: 'openclaw-gw',
        appType: 'openclaw',
        templateName: 'Standard',
        planName: '1C2G',
        region: 'SDA',
        node: 'node1',
        subdomain: 'openclaw-gw',
        host: '103.247.10.61',
        port: 30888,
        appPort: 3000,
        cpuShares: 1,
        memoryMb: 2048,
        storageGb: 10,
        billingMode: 'monthly',
        monthlyPrice: 30000,
        hourlyRate: 42,
        accumulatedCost: 0,
        status: 'RUNNING',
        username: 'root',
        password: 'MkApp_OpenClawToken88',
      } as any);

      expect(openclawSpec.image).toBe('ghcr.io/openclaw/openclaw:latest');
      expect(openclawSpec.envYaml).toContain('OPENCLAW_GATEWAY_TOKEN');
      expect(openclawSpec.envYaml).toContain('value: "MkApp_OpenClawToken88"');
      expect(openclawSpec.envYaml).toContain('value: "18789"');
      expect(openclawSpec.envYaml).toContain('OPENCLAW_TRUSTED_PROXIES');
      expect(openclawSpec.envYaml).toContain('value: "10.42.0.9"');
      expect(openclawSpec.envYaml).toContain('--max-old-space-size=');
      expect(openclawSpec.securityContextYaml).toContain('runAsUser: 0');
      expect(openclawSpec.securityContextYaml).toContain('- NET_ADMIN');
      expect(openclawSpec.securityContextYaml).toContain('- NET_RAW');
      expect(openclawSpec.commandYaml).toContain('/usr/sbin/sshd -p 22');
      expect(openclawSpec.commandYaml).toContain('AllowTcpForwarding no');
      expect(openclawSpec.commandYaml).toContain('PermitTunnel no');
      expect(openclawSpec.commandYaml).toContain('/usr/bin/apt-get');
      expect(openclawSpec.commandYaml).toContain('/usr/bin/dpkg');
      expect(openclawSpec.commandYaml).toContain('node /app/openclaw.mjs gateway --port 18789 --bind lan');

      // Verify config-init script configures gateway.trustedProxies from OPENCLAW_TRUSTED_PROXIES
      const configInitMatch = openclawSpec.commandYaml.match(/echo "([^"]+)" \| base64 -d \| node -/);
      expect(configInitMatch).not.toBeNull();
      const decodedConfigInit = Buffer.from(configInitMatch![1], 'base64').toString('utf8');
      expect(decodedConfigInit).toContain('OPENCLAW_TRUSTED_PROXIES');
      expect(decodedConfigInit).toContain('cfg.gateway.trustedProxies');

      // Verify custom cluster Traefik pod IPs override default trusted proxies
      const customProxySpec = buildAppContainerSpec(
        {
          id: 12,
          userId: 1,
          name: 'openclaw-custom-proxy',
          appType: 'openclaw',
          subdomain: 'openclaw-custom-proxy',
          appPort: 18789,
          cpuShares: 1,
          memoryMb: 2048,
          storageGb: 10,
          billingMode: 'monthly',
          monthlyPrice: 30000,
          hourlyRate: 42,
          accumulatedCost: 0,
          status: 'RUNNING',
          username: 'root',
          password: 'MkApp_OpenClawToken88',
        } as any,
        'app.masdika.id',
        { trustedProxies: ['10.42.0.15', '10.42.0.16'] }
      );
      expect(customProxySpec.envYaml).toContain('value: "10.42.0.15,10.42.0.16"');

      const hermesSpec = buildAppContainerSpec({
        id: 13,
        userId: 1,
        name: 'hermes-sec',
        appType: 'hermes',
        subdomain: 'hermes-sec',
        appPort: 9119,
        password: 'TestPass',
      } as any);
      expect(hermesSpec.securityContextYaml).toContain('- NET_ADMIN');
      expect(hermesSpec.commandYaml).toContain('/usr/bin/apt-get');
      expect(hermesSpec.commandYaml).toContain('PermitTunnel no');

      const omnirouteSpec = buildAppContainerSpec({
        id: 77,
        userId: 1,
        name: 'my-omniroute',
        appType: 'omniroute',
        subdomain: 'my-omniroute',
        appPort: 20128,
        password: 'OmniPassword123!',
      } as any);
      expect(omnirouteSpec.image).toBe('docker.io/diegosouzapw/omniroute:latest');
      expect(omnirouteSpec.envYaml).toContain('INITIAL_PASSWORD');
      expect(omnirouteSpec.envYaml).toContain('value: "OmniPassword123!"');
      expect(omnirouteSpec.envYaml).toContain('DASHBOARD_PASSWORD');
      expect(omnirouteSpec.envYaml).toContain('PORT');
      expect(omnirouteSpec.envYaml).toContain('value: "20128"');
      expect(omnirouteSpec.dataMount).toBe('/app/data');
    });
  });

  describe('NodePort Allocation', () => {
    it('should allocate a collision-free random available port within agreed range', async () => {
      // 30000, 30001, 30002, 30003 are taken in mock
      const port = await allocateAppPort(30000, 30010);
      expect(port).toBeGreaterThanOrEqual(30000);
      expect(port).toBeLessThanOrEqual(30010);
      expect([30000, 30001, 30002, 30003]).not.toContain(port);
    });

    it('should allocate distinct ports under rapid concurrent requests without collisions', async () => {
      const ports = await Promise.all([
        allocateAppPort(30100, 30120),
        allocateAppPort(30100, 30120),
        allocateAppPort(30100, 30120),
        allocateAppPort(30100, 30120),
      ]);
      const uniquePorts = new Set(ports);
      expect(uniquePorts.size).toBe(4);
    });
  });

  describe('Cluster Resource Capacity Check', () => {
    it('should permit ordering when requested within 8 CPU, 16 GB RAM, 60 GB Disk', async () => {
      const cap = await checkAppClusterCapacity(1.0, 2048, 10);
      expect(cap.available).toBe(true);
      expect(cap.totalCpu).toBe(8.0);
      expect(cap.totalMemoryMb).toBe(16384);
      expect(cap.totalStorageGb).toBe(60);
    });

    it('should reject ordering when requested exceeds hardware capacity limits', async () => {
      const capCpu = await checkAppClusterCapacity(16.0, 1024, 10);
      expect(capCpu.available).toBe(false);
      expect(capCpu.status).toBe('FULL');

      const capRam = await checkAppClusterCapacity(1.0, 32768, 10);
      expect(capRam.available).toBe(false);
      expect(capRam.status).toBe('FULL');

      const capStorage = await checkAppClusterCapacity(1.0, 1024, 100);
      expect(capStorage.available).toBe(false);
      expect(capStorage.status).toBe('FULL');
    });
  });
});
