#!/usr/bin/env node
/**
 * Masdika DevSecOps: Pre-Commit Secret Scanner
 * Automatically checks staged git changes for leaked secrets, API keys, and credentials
 * before allowing git commit.
 */

const { execSync } = require('child_process');
const fs = require('fs');

const SECRET_PATTERNS = [
  { name: 'Private Key', regex: /-----BEGIN (RSA|EC|DSA|OPENSSH|PGP|ENCRYPTED|.*) PRIVATE KEY-----/ },
  { name: 'AWS Access Key', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
  { name: 'GitHub Personal Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,255}/ },
  { name: 'Slack Token', regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/ },
  { name: 'Telegram Bot Token', regex: /(?:^|[^0-9])([0-9]{8,10}:[a-zA-Z0-9_-]{35})/ },
  { name: 'Stripe Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/ },
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z\\-_]{35}/ },
  { name: 'Database Connection String with Credentials', regex: /(?:postgres|postgresql|mysql|mongodb|redis):\/\/[a-zA-Z0-9_\-]+:[^@\s\n]{3,}@[a-zA-Z0-9_\-\.]+/i },
  { name: 'JWT Secret or Token', regex: /eyJ[A-Za-z0-9-_=]{10,}\.eyJ[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_.+/=]{10,}/ },
];

const IGNORED_PATHS = [
  /\.env\.example$/,
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /novnc/,
  /\.gitleaks\.toml$/,
  /dashboards\.yaml$/,
  /pre-commit-secret-scan\.js$/,
];

function checkWithGitleaksCLI() {
  try {
    execSync('gitleaks version', { stdio: 'ignore' });
  } catch {
    // Gitleaks binary not found on system PATH, use internal regex scanner
    return false;
  }

  try {
    execSync('gitleaks protect --staged -v', { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error('\n\x1b[31m[GitLeaks] Blocked: Gitleaks detected secrets in staged files!\x1b[0m\n');
    process.exit(1);
  }
}

function runInternalRegexScanner() {
  let diff = '';
  try {
    diff = execSync('git diff --cached --unified=0', { encoding: 'utf8' });
  } catch (e) {
    return; // No git repo or error getting diff
  }

  if (!diff || diff.trim() === '') {
    return; // Nothing staged
  }

  const lines = diff.split('\n');
  let currentFile = '';
  const violations = [];

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.substring(6).trim();
      continue;
    }

    if (IGNORED_PATHS.some((pattern) => pattern.test(currentFile))) {
      continue;
    }

    // Only scan newly added lines
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const addedContent = line.substring(1);
      
      // Ignore obvious placeholders
      if (/dummy|example|placeholder|REDACTED|process\.env|test-secret/i.test(addedContent)) {
        continue;
      }

      for (const rule of SECRET_PATTERNS) {
        if (rule.regex.test(addedContent)) {
          violations.push({
            file: currentFile,
            rule: rule.name,
            snippet: addedContent.trim().substring(0, 80),
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('\n\x1b[41m\x1b[37m[DEVSECOPS SECURITY ALERT: SECRET DETECTED]\x1b[0m');
    console.error('\x1b[31mCommit has been automatically BLOCKED by Masdika Pre-Commit Hook.\x1b[0m');
    console.error('The following staged changes appear to contain hardcoded credentials or API keys:\n');

    violations.forEach((v, idx) => {
      console.error(`  ${idx + 1}. \x1b[33m${v.file}\x1b[0m`);
      console.error(`     Rule:    \x1b[36m${v.rule}\x1b[0m`);
      console.error(`     Snippet: ${v.snippet}...\n`);
    });

    console.error('\x1b[35mPlease remove credentials, store them in .env or K8s Secret, and restage.\x1b[0m');
    console.error('If this is a false-positive test value, add `// test-secret` or update .gitleaks.toml.\n');
    process.exit(1);
  }

  console.log('\x1b[32m[GitLeaks & DevSecOps] Pre-commit security check passed. No secrets found.\x1b[0m');
}

if (!checkWithGitleaksCLI()) {
  runInternalRegexScanner();
}
