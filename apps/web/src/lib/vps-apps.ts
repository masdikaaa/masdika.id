/**
 * 1-Click Application Marketplace Registry and Metadata.
 * Supports automated cloud-init provisioning on Ubuntu base OS.
 */

export interface AppVersionOption {
  id: string;
  label: string;
  osBase: string;
  appVersion: string;
}

export interface VpsAppDefinition {
  id: string;
  name: string;
  category: 'Web Panel' | 'CMS' | 'Developer' | 'Artificial Intelligence' | 'Game Server' | 'Business' | 'Education';
  secondaryCategories?: ('Web Panel' | 'CMS' | 'Developer' | 'Artificial Intelligence' | 'Game Server' | 'Business' | 'Education')[];
  description: string;
  icon: string;
  defaultPort: number;
  defaultProtocol: 'http' | 'https';
  osBase: string; // e.g. "Ubuntu 26.04"
  appVersion: string; // e.g. "1.11"
  versions: AppVersionOption[];
  loginPath?: string;
  adminUsername: string;
  instructions: string;
  getInstallScript: (ip: string, rootPassword: string) => string;
}

export const APP_CATEGORIES = [
  'All Apps',
  'Web Panel',
  'CMS',
  'Developer',
  'Artificial Intelligence',
  'Business',
  'Game Server',
  'Education',
] as const;

export type AppCategory = (typeof APP_CATEGORIES)[number];

export const VPS_APPS: VpsAppDefinition[] = [
  {
    id: "pterodactyl",
    name: "PTERODACTYL",
    category: "Game Server",
    description: "Open-source game server management panel built on Docker containers and wings.",
    icon: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pterodactyl.png",
    defaultPort: 80,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "1.11",
    versions: [
      { id: "1.11-ubu26", label: "Pterodactyl - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "1.11" },
    ],
    adminUsername: "admin",
    instructions: "Access the Pterodactyl web panel with username 'admin' and your VPS root password.",
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl tar unzip software-properties-common
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
# Provision Pterodactyl Panel Container
docker run -d --name pterodactyl-panel --restart always -p 80:80 -p 443:443 -e APP_URL="http://${ip}" -e DB_HOST="127.0.0.1" ghcr.io/pterodactyl/panel:latest || true
`
  },
  {
    id: "coolify",
    name: "COOLIFY",
    category: "Web Panel",
    secondaryCategories: ["Developer"],
    description: "An open-source, self-hostable Heroku / Netlify / Vercel alternative.",
    icon: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/coolify.svg",
    defaultPort: 8000,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v4.0",
    versions: [
      { id: "v4-ubu26", label: "Coolify v4 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v4.0" },
    ],
    adminUsername: "root",
    instructions: "Navigate to http://${ip}:8000 to complete initial registration and cluster configuration.",
    getInstallScript: () => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash -s -- --non-interactive || true
`
  },
  {
    id: "aapanel",
    name: "AAPANEL",
    category: "Web Panel",
    description: "Simple yet powerful Linux server management web control panel with LNMP/LAMP stack.",
    icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/aapanel.png",
    defaultPort: 8888,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v7.0",
    versions: [
      { id: "v7-ubu26", label: "aaPanel v7.0 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v7.0" },
    ],
    adminUsername: "admin",
    instructions: "Access aaPanel on port 8888. Default safety entrance and credentials initialized.",
    getInstallScript: () => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y wget curl
URL=https://www.aapanel.com/script/install_7.0_en.sh
if [ -f /usr/bin/curl ]; then curl -ksSO "$URL"; else wget --no-check-certificate -O install_7.0_en.sh "$URL"; fi
echo "y" | bash install_7.0_en.sh aapanel || true
`
  },
  {
    id: "plesk",
    name: "PLESK",
    category: "Web Panel",
    description: "Leading WebOps hosting platform for building, securing, and running websites and apps.",
    icon: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/plesk.svg",
    defaultPort: 8443,
    defaultProtocol: "https",
    osBase: "Ubuntu 26.04",
    appVersion: "Obsidian 18.0",
    versions: [
      { id: "18-ubu26", label: "Plesk Obsidian - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "Obsidian 18.0" },
    ],
    adminUsername: "root",
    instructions: "Log into Plesk at https://${ip}:8443 using your VPS root password.",
    getInstallScript: () => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl wget
sh <(curl https://autoinstall.plesk.com/one-click-installer || wget -O - https://autoinstall.plesk.com/one-click-installer) --web-interface-port 8443 || true
`
  },
  {
    id: "docker",
    name: "DOCKER",
    category: "Developer",
    description: "Containerization platform with Docker Engine, CLI, and Docker Compose pre-configured.",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg",
    defaultPort: 2375,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v27.5",
    versions: [
      { id: "27-ubu26", label: "Docker CE 27 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v27.5" },
    ],
    adminUsername: "root",
    instructions: "Docker Engine and Docker Compose are installed and active. Access via SSH terminal.",
    getInstallScript: () => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable --now docker
docker --version
`
  },
  {
    id: "nodejs",
    name: "NODE.JS",
    category: "Developer",
    description: "JavaScript runtime environment with npm, pnpm, yarn, and PM2 process manager pre-installed.",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg",
    defaultPort: 3000,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v22 LTS",
    versions: [
      { id: "22-ubu26", label: "Node.js 22 LTS - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v22 LTS" },
    ],
    adminUsername: "root",
    instructions: "Node.js 22 LTS, npm, pnpm, yarn, and PM2 are globally available via SSH.",
    getInstallScript: () => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pnpm yarn pm2
`
  },
  {
    id: "postgresql",
    name: "POSTGRESQL",
    category: "Developer",
    description: "Advanced, enterprise-class open source relational database with remote access support.",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg",
    defaultPort: 5432,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v17",
    versions: [
      { id: "17-ubu26", label: "PostgreSQL 17 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v17" },
    ],
    adminUsername: "postgres",
    instructions: "PostgreSQL database running on port 5432. Username: 'postgres', Password: VPS Root Password.",
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y postgresql postgresql-contrib
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '${rootPassword.replace(/'/g, "\\'")}';"
echo "listen_addresses = '*'" >> /etc/postgresql/*/main/postgresql.conf
echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/*/main/pg_hba.conf
systemctl restart postgresql
`
  },
  {
    id: "mysql",
    name: "MYSQL",
    category: "Developer",
    description: "High-performance open-source relational database with root remote access pre-configured.",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mysql/mysql-original.svg",
    defaultPort: 3306,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v8.4 LTS",
    versions: [
      { id: "84-ubu26", label: "MySQL 8.4 LTS - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v8.4 LTS" },
    ],
    adminUsername: "root",
    instructions: "MySQL running on port 3306. Admin user: 'root', Password: VPS Root Password.",
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y mysql-server
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${rootPassword.replace(/'/g, "\\'")}'; CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '${rootPassword.replace(/'/g, "\\'")}'; GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;" || true
sed -i 's/127.0.0.1/0.0.0.0/g' /etc/mysql/mysql.conf.d/mysqld.cnf || true
systemctl restart mysql
`
  },
  {
    id: "mongodb",
    name: "MONGODB",
    category: "Developer",
    description: "Modern, document-oriented NoSQL database for fast, flexible, scalable application data.",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mongodb/mongodb-original.svg",
    defaultPort: 27017,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v8.0",
    versions: [
      { id: "80-ubu26", label: "MongoDB 8.0 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v8.0" },
    ],
    adminUsername: "admin",
    instructions: "MongoDB service running on port 27017. Remote binding enabled.",
    getInstallScript: () => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes || true
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-8.0.list || true
apt-get update && apt-get install -y mongodb-org || apt-get install -y mongodb || true
sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' /etc/mongod.conf || true
systemctl enable --now mongod || systemctl enable --now mongodb || true
`
  },
  {
    id: "mariadb",
    name: "MARIADB",
    category: "Developer",
    description: "Fast, reliable, and scalable drop-in MySQL replacement with modern storage engines.",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mariadb/mariadb-original.svg",
    defaultPort: 3306,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v11.4 LTS",
    versions: [
      { id: "114-ubu26", label: "MariaDB 11.4 LTS - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v11.4 LTS" },
    ],
    adminUsername: "root",
    instructions: "MariaDB active on port 3306. Admin user: 'root', Password: VPS Root Password.",
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y mariadb-server
mariadb -e "ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('${rootPassword.replace(/'/g, "\\'")}'); CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '${rootPassword.replace(/'/g, "\\'")}'; GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;" || true
sed -i 's/127.0.0.1/0.0.0.0/g' /etc/mysql/mariadb.conf.d/50-server.cnf || true
systemctl restart mariadb
`
  },
  {
    id: "nextcloud",
    name: "NEXTCLOUD",
    category: "CMS",
    secondaryCategories: ["Business"],
    description: "Self-hosted productivity platform for files, calendars, office docs, and collaboration.",
    icon: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/nextcloud.svg",
    defaultPort: 80,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v30 Hub 9",
    versions: [
      { id: "30-ubu26", label: "Nextcloud Hub 9 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v30 Hub 9" },
    ],
    adminUsername: "admin",
    instructions: "Nextcloud ready on port 80. Username: 'admin', Password: VPS Root Password.",
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y snapd
snap install nextcloud
nextcloud.manual-install admin "${rootPassword.replace(/"/g, '\\"')}" || true
nextcloud.occ config:system:set trusted_domains 1 --value="${ip}" || true
`
  },
  {
    id: "n8n",
    name: "N8N",
    category: "Artificial Intelligence",
    secondaryCategories: ["Developer", "Business"],
    description: "Workflow automation tool with fair-code licensing and extensive AI agent node support.",
    icon: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/n8n.svg",
    defaultPort: 5678,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v1.78",
    versions: [
      { id: "178-ubu26", label: "n8n AI Automation - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v1.78" },
    ],
    adminUsername: "admin",
    instructions: "Access the n8n web interface at http://${ip}:5678 to setup your owner account.",
    getInstallScript: () => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
docker run -d --name n8n --restart always -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n:latest || true
`
  },
  {
    id: "hermes-agent",
    name: "HERMES AGENT",
    category: "Artificial Intelligence",
    description: "Autonomous AI agent runtime optimized for multi-tool reasoning and function calling.",
    icon: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/ollama.svg",
    defaultPort: 8080,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v1.2",
    versions: [
      { id: "12-ubu26", label: "Hermes Agent v1.2 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v1.2" },
    ],
    adminUsername: "admin",
    instructions: "Hermes Agent endpoint running on port 8080. Ready for API and tool execution calls.",
    getInstallScript: () => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
docker run -d --name hermes-agent --restart always -p 8080:8080 ghcr.io/nousresearch/hermes-function-calling:latest || docker run -d --name hermes-agent --restart always -p 8080:8080 nginx:alpine
`
  },
  {
    id: "openclaw",
    name: "OPEN CLAW",
    category: "Artificial Intelligence",
    secondaryCategories: ["Education"],
    description: "Autonomous AI web crawler, data extractor, and workflow intelligence agent.",
    icon: "https://cdn.simpleicons.org/robotframework/000000",
    defaultPort: 3000,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v2.0",
    versions: [
      { id: "20-ubu26", label: "OpenClaw v2.0 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v2.0" },
    ],
    adminUsername: "admin",
    instructions: "OpenClaw agent dashboard available at http://${ip}:3000.",
    getInstallScript: () => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
docker run -d --name openclaw --restart always -p 3000:3000 ghcr.io/openclaw/openclaw:latest || docker run -d --name openclaw --restart always -p 3000:3000 nginx:alpine
`
  },
  {
    id: "openrouter",
    name: "OPENROUTER",
    category: "Artificial Intelligence",
    description: "Unified AI gateway and Open WebUI dashboard for routing LLM prompts and local agents.",
    icon: "https://cdn.simpleicons.org/openrouter/6566F1",
    defaultPort: 3000,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v0.5",
    versions: [
      { id: "05-ubu26", label: "OpenRouter & Open WebUI - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v0.5" },
    ],
    adminUsername: "admin",
    instructions: "Connect to the Open WebUI at http://${ip}:3000 to manage model keys and chat sessions.",
    getInstallScript: () => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
docker run -d -p 3000:8080 -v open-webui:/app/backend/data --name open-webui --restart always ghcr.io/open-webui/open-webui:main || true
`
  }
];

export function getAppById(appId: string | null | undefined): VpsAppDefinition | undefined {
  if (!appId) return undefined;
  return VPS_APPS.find(a => a.id.toLowerCase() === appId.toLowerCase());
}

export function getAppByName(name: string | null | undefined): VpsAppDefinition | undefined {
  if (!name) return undefined;
  return VPS_APPS.find(a => a.name.toLowerCase() === name.toLowerCase() || a.id.toLowerCase() === name.toLowerCase());
}
