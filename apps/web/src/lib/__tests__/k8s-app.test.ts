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
        { port: 30001 },
        { port: 30002 },
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
    it('should have all 5 requested apps with official branding and ports', () => {
      expect(MANAGED_APPS_CATALOG).toHaveLength(5);
      const ids = MANAGED_APPS_CATALOG.map((a) => a.id);
      expect(ids).toContain('hermes');
      expect(ids).toContain('ninerouter');
      expect(ids).toContain('n8n');
      expect(ids).toContain('opencode');
      expect(ids).toContain('openclaw');

      const n8n = getAppDefinition('n8n');
      expect(n8n).toBeDefined();
      expect(n8n?.appPort).toBe(5678);
      expect(n8n?.icon).toBe('/images/apps/n8n.png');

      const hermes = getAppDefinition('hermes');
      expect(hermes).toBeDefined();
      expect(hermes?.appPort).toBe(22);
      expect(hermes?.accessProtocol).toBe('SSH');
      expect(hermes?.icon).toBe('/images/apps/hermes-agent.png');

      const router = getAppDefinition('ninerouter');
      expect(router).toBeDefined();
      expect(router?.appPort).toBe(20128);

      const opencode = getAppDefinition('opencode');
      expect(opencode).toBeDefined();
      expect(opencode?.icon).toBe('/images/apps/opencode.png');
      expect(opencode?.accessProtocol).toBe('SSH');
      expect(opencode?.appPort).toBe(22);
      expect(opencode?.dataDir).toBe('/workspace');

      const openclaw = getAppDefinition('openclaw');
      expect(openclaw).toBeDefined();
      expect(openclaw?.icon).toBe('/images/apps/openclaw.png');
      expect(openclaw?.accessProtocol).toBe('WEB');
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

    it('should generate valid Kubernetes manifests for all 5 catalog apps without YAML syntax errors', () => {
      const appTypes = ['hermes', 'n8n', 'ninerouter', 'opencode', 'openclaw'];
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

        const { image, dataMount, envYaml, commandYaml } = buildAppContainerSpec(dummyApp);
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
          containerPort: ${dummyApp.appPort}${commandYaml}${envYaml ? `\n        env:${envYaml}` : ''}
`;

        expect(() => k8s.loadAllYaml(manifestYaml)).not.toThrow();
        const parsed = k8s.loadAllYaml(manifestYaml);
        expect(parsed.length).toBeGreaterThanOrEqual(1);
      }
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
  });
});
