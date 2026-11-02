/**
 * Masdika GitOps Sealed Secret Helper
 * Encrypts a Kubernetes Secret YAML into a Git-safe SealedSecret resource
 * using Bitnami Sealed Secrets Controller public key.
 *
 * Usage:
 *   node scripts/seal-secret.js <secret.yaml> [output-sealed.yaml]
 */

const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const secretPath = process.argv[2];
const outputPath = process.argv[3];

if (!secretPath) {
  console.log(`
Usage:
  node scripts/seal-secret.js <secret.yaml> [output-sealed.yaml]

Example:
  node scripts/seal-secret.js my-secret.yaml k8s/security/my-sealed-secret.yaml
`);
  process.exit(1);
}

if (!fs.existsSync(secretPath)) {
  console.error(`Error: File '${secretPath}' not found.`);
  process.exit(1);
}

const secretContent = fs.readFileSync(secretPath, 'utf8');

console.log(`Sealing secret from '${secretPath}' via cluster controller...`);

const p = spawnSync('C:\\Program Files\\PuTTY\\plink.exe', [
  '-batch',
  '-pw', 'Andikaferdi11',
  'andika@192.168.79.4',
  'KUBECONFIG=~/.kube/config kubeseal --controller-name=sealed-secrets-controller --controller-namespace=kube-system --format=yaml'
], {
  input: secretContent,
  maxBuffer: 10 * 1024 * 1024
});

if (p.status !== 0) {
  console.error('kubeseal encryption failed:');
  console.error(p.stderr.toString());
  process.exit(1);
}

const sealedYaml = p.stdout.toString();

if (outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, sealedYaml, 'utf8');
  console.log(`Successfully generated SealedSecret: ${outputPath}`);
} else {
  console.log('\n--- SealedSecret YAML ---');
  console.log(sealedYaml);
}

