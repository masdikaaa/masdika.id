const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch (_) {}

const sshHost = process.env.MANAGED_DB_HOST || process.env.MANAGED_DB_K3S_HOST;
const sshPort = parseInt(process.env.MANAGED_DB_SSH_PORT || process.env.MANAGED_DB_K3S_PORT || '22', 10);
const sshUser = process.env.MANAGED_DB_SSH_USER || process.env.MANAGED_DB_K3S_USER;
const sshPassword = process.env.MANAGED_DB_SSH_PASSWORD || process.env.MANAGED_DB_K3S_PASSWORD;

if (!sshHost || !sshUser || !sshPassword) {
  console.error('Error: Missing required SSH credentials in .env (MANAGED_DB_HOST, MANAGED_DB_SSH_USER, MANAGED_DB_SSH_PASSWORD).');
  process.exit(1);
}

let cmd = process.argv[2];
if (process.argv[2] === '-f' && process.argv[3]) {
  cmd = fs.readFileSync(process.argv[3], 'utf8');
} else if (!cmd) {
  console.error('Usage: node scripts/k8s-ssh.js "<command>" OR -f <script.sh>');
  process.exit(1);
}

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      process.exit(1);
    }
    stream.on('close', (code, signal) => {
      conn.end();
      process.exit(code || 0);
    });
    stream.on('data', (data) => {
      process.stdout.write(data);
    });
    stream.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection error:', err.message);
  process.exit(1);
}).connect({
  host: sshHost,
  port: sshPort,
  username: sshUser,
  password: sshPassword,
  readyTimeout: 10000,
});
