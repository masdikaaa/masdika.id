const { Client } = require('ssh2');
const fs = require('fs');

try {
  require('dotenv').config();
} catch (_) {}

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
  host: process.env.MANAGED_DB_K3S_HOST || '192.168.79.16',
  port: parseInt(process.env.MANAGED_DB_K3S_PORT || '22', 10),
  username: process.env.MANAGED_DB_K3S_USER || 'andika',
  password: process.env.MANAGED_DB_K3S_PASSWORD || 'Andikaferdi11',
  readyTimeout: 10000,
});
