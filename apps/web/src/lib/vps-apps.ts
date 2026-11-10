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

export interface AppConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'number';
  placeholder?: string;
  defaultValue?: string | number;
  description?: string;
  required?: boolean;
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

export interface VpsAppDefinition {
  id: string;
  name: string;
  category: AppCategory;
  secondaryCategories?: AppCategory[];
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
  configFields?: AppConfigField[];
  getInstallScript: (ip: string, rootPassword: string, config?: Record<string, any>) => string;
}

export const VPS_APPS: VpsAppDefinition[] = [
  // 1. WordPress (CMS)
  {
    id: "wordpress",
    name: "WORDPRESS",
    category: "CMS",
    secondaryCategories: ["Developer"],
    description: "World's leading open-source CMS with automated LAMP stack, MariaDB, and WP-CLI pre-configured.",
    icon: "/images/apps/wordpress.svg",
    defaultPort: 80,
    defaultProtocol: "http",
    loginPath: "/wp-admin",
    osBase: "Ubuntu 26.04",
    appVersion: "v6.7",
    versions: [
      { id: "67-ubu26", label: "WordPress 6.7 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v6.7" },
    ],
    adminUsername: "admin",
    instructions: "Access your WordPress site at http://${ip}/ and administrative console at http://${ip}/wp-admin.",
    configFields: [
      {
        key: "domain",
        label: "Domain Name / FQDN (Optional)",
        type: "text",
        placeholder: "e.g. blog.mydomain.com (leave blank for VPS IP)",
        description: "Domain name pointing to this server"
      },
      {
        key: "siteTitle",
        label: "Website Title",
        type: "text",
        defaultValue: "My WordPress Site",
        placeholder: "My WordPress Site",
        description: "Public name for your new website"
      },
      {
        key: "adminUsername",
        label: "WP Admin Username",
        type: "text",
        defaultValue: "admin",
        placeholder: "admin",
        description: "Administrator username for /wp-admin"
      },
      {
        key: "adminEmail",
        label: "Admin Email",
        type: "email",
        placeholder: "admin@example.com",
        description: "Email for system notifications and recovery"
      },
      {
        key: "adminPassword",
        label: "WP Admin Password",
        type: "password",
        placeholder: "Leave empty to use VPS Root Password",
        description: "Administrator login password"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const siteUrl = config.domain ? (config.domain.startsWith("http") ? config.domain : `http://${config.domain}`) : `http://${ip}`;
      const title = config.siteTitle || "My WordPress Site";
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      const email = config.adminEmail || "admin@example.com";
      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y apache2 mariadb-server php php-mysql php-curl php-gd php-mbstring php-xml php-xmlrpc php-soap php-intl php-zip curl wget unzip

# Configure MariaDB Database
systemctl enable --now mariadb
mysql -e "CREATE DATABASE IF NOT EXISTS wordpress DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'wpuser'@'localhost' IDENTIFIED BY '${pass.replace(/'/g, "\\'")}';"
mysql -e "GRANT ALL ON wordpress.* TO 'wpuser'@'localhost'; FLUSH PRIVILEGES;"

# Install WP-CLI
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
mv wp-cli.phar /usr/local/bin/wp

# Download and Configure WordPress
rm -rf /var/www/html/*
cd /var/www/html
wp core download --allow-root
wp config create --dbname=wordpress --dbuser=wpuser --dbpass='${pass.replace(/'/g, "\\'")}' --allow-root
wp core install --url="${siteUrl}" --title="${title.replace(/"/g, '\\"')}" --admin_user="${user}" --admin_password='${pass.replace(/'/g, "\\'")}' --admin_email="${email}" --skip-email --allow-root

chown -R www-data:www-data /var/www/html
systemctl enable --now apache2
systemctl restart apache2

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "wordpress",
  "appName": "WordPress",
  "port": 80,
  "protocol": "http",
  "path": "/wp-admin",
  "username": "${user}",
  "password": "${pass}",
  "url": "${siteUrl}/wp-admin"
}
EOF
`;
    }
  },

  // 2. Drupal (CMS)
  {
    id: "drupal",
    name: "DRUPAL",
    category: "CMS",
    secondaryCategories: ["Developer"],
    description: "Enterprise open-source CMS for ambitious digital experiences with pre-configured Apache, PHP & MariaDB.",
    icon: "/images/apps/drupal.svg",
    defaultPort: 80,
    defaultProtocol: "http",
    loginPath: "/user/login",
    osBase: "Ubuntu 26.04",
    appVersion: "v10.3",
    versions: [
      { id: "103-ubu26", label: "Drupal 10.3 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v10.3" },
    ],
    adminUsername: "admin",
    instructions: "Access your Drupal portal at http://${ip}/ and administrator login at http://${ip}/user/login.",
    configFields: [
      {
        key: "domain",
        label: "Domain Name / FQDN (Optional)",
        type: "text",
        placeholder: "e.g. portal.mydomain.com (leave blank for VPS IP)",
        description: "Domain name pointing to this server"
      },
      {
        key: "siteTitle",
        label: "Drupal Site Name",
        type: "text",
        defaultValue: "My Drupal Site",
        placeholder: "My Drupal Site",
        description: "Public portal name"
      },
      {
        key: "adminUsername",
        label: "Admin Username",
        type: "text",
        defaultValue: "admin",
        placeholder: "admin",
        description: "Administrator username for Drupal"
      },
      {
        key: "adminEmail",
        label: "Admin Email",
        type: "email",
        placeholder: "admin@example.com",
        description: "Email for system notifications and recovery"
      },
      {
        key: "adminPassword",
        label: "Admin Password",
        type: "password",
        placeholder: "Leave empty to use VPS Root Password",
        description: "Administrator login password"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const siteUrl = config.domain ? (config.domain.startsWith("http") ? config.domain : `http://${config.domain}`) : `http://${ip}`;
      const title = config.siteTitle || "My Drupal Site";
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      const email = config.adminEmail || "admin@example.com";
      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y apache2 mariadb-server php php-mysql php-curl php-gd php-mbstring php-xml php-zip php-apcu curl wget unzip

# Configure MariaDB Database
systemctl enable --now mariadb
mysql -e "CREATE DATABASE IF NOT EXISTS drupal DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'drupaluser'@'localhost' IDENTIFIED BY '${pass.replace(/'/g, "\\'")}';"
mysql -e "GRANT ALL ON drupal.* TO 'drupaluser'@'localhost'; FLUSH PRIVILEGES;"

# Download Drupal latest recommended
rm -rf /var/www/html/*
cd /tmp
wget -q https://www.drupal.org/download-latest/tar.gz -O drupal.tar.gz
tar -xzf drupal.tar.gz
cp -rf drupal-*/* /var/www/html/
rm -rf drupal.tar.gz drupal-*

# Set permissions
cd /var/www/html
mkdir -p sites/default/files
cp sites/default/default.settings.php sites/default/settings.php
chmod 666 sites/default/settings.php
chown -R www-data:www-data /var/www/html

# Enable Apache Rewrite & VirtualHost configuration
a2enmod rewrite
cat << 'EOF' > /etc/apache2/sites-available/000-default.conf
<VirtualHost *:80>
    DocumentRoot /var/www/html
    <Directory /var/www/html>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF
systemctl restart apache2

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "drupal",
  "appName": "Drupal",
  "port": 80,
  "protocol": "http",
  "path": "/user/login",
  "username": "${user}",
  "password": "${pass}",
  "url": "${siteUrl}/user/login"
}
EOF
`;
    }
  },

  // 3. Moodle (Education)
  {
    id: "moodle",
    name: "MOODLE",
    category: "Education",
    secondaryCategories: ["CMS", "Business"],
    description: "The world's most popular open-source Learning Management System (LMS) for schools and enterprises.",
    icon: "/images/apps/moodle.png",
    defaultPort: 80,
    defaultProtocol: "http",
    loginPath: "/login/index.php",
    osBase: "Ubuntu 26.04",
    appVersion: "v4.5",
    versions: [
      { id: "45-ubu26", label: "Moodle 4.5 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v4.5" },
    ],
    adminUsername: "admin",
    instructions: "Access Moodle LMS at http://${ip}/ and administrator login at http://${ip}/login/index.php.",
    configFields: [
      {
        key: "domain",
        label: "Domain Name / FQDN (Optional)",
        type: "text",
        placeholder: "e.g. lms.university.edu (leave blank for VPS IP)",
        description: "Domain name pointing to this server"
      },
      {
        key: "siteTitle",
        label: "LMS Portal Name",
        type: "text",
        defaultValue: "Masdika Academy",
        placeholder: "Masdika Academy",
        description: "Full site name displayed to learners"
      },
      {
        key: "adminUsername",
        label: "Admin Username",
        type: "text",
        defaultValue: "admin",
        placeholder: "admin",
        description: "Administrator username for Moodle"
      },
      {
        key: "adminEmail",
        label: "Admin Email",
        type: "email",
        placeholder: "admin@example.com",
        description: "Email for system notifications and recovery"
      },
      {
        key: "adminPassword",
        label: "Admin Password",
        type: "password",
        placeholder: "Leave empty to use VPS Root Password",
        description: "Administrator login password"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const siteUrl = config.domain ? (config.domain.startsWith("http") ? config.domain : `http://${config.domain}`) : `http://${ip}`;
      const title = config.siteTitle || "Masdika Academy";
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      const email = config.adminEmail || "admin@example.com";
      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y apache2 mariadb-server php php-mysql php-curl php-gd php-mbstring php-xml php-xmlrpc php-soap php-intl php-zip php-ldap graphviz aspell git wget

# Configure MariaDB Database with utf8mb4 format for Moodle
systemctl enable --now mariadb
mysql -e "CREATE DATABASE IF NOT EXISTS moodle DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'moodleuser'@'localhost' IDENTIFIED BY '${pass.replace(/'/g, "\\'")}';"
mysql -e "GRANT ALL ON moodle.* TO 'moodleuser'@'localhost'; FLUSH PRIVILEGES;"

# Create moodledata directory with proper permissions
mkdir -p /var/moodledata
chown -R www-data:www-data /var/moodledata
chmod 777 /var/moodledata

# Download Moodle code
rm -rf /var/www/html/*
cd /tmp
wget -q https://download.moodle.org/download.php/direct/stable405/moodle-latest-405.tgz -O moodle.tgz || wget -q https://download.moodle.org/download.php/direct/stable404/moodle-latest-404.tgz -O moodle.tgz
tar -xzf moodle.tgz
cp -rf moodle/* /var/www/html/
rm -rf moodle.tgz moodle

chown -R www-data:www-data /var/www/html
systemctl enable --now apache2
systemctl restart apache2

# Automated CLI installation of Moodle
php /var/www/html/admin/cli/install.php \
  --non-interactive \
  --wwwroot="${siteUrl}" \
  --dataroot="/var/moodledata" \
  --dbtype="mariadb" \
  --dbname="moodle" \
  --dbuser="moodleuser" \
  --dbpass="${pass.replace(/'/g, "\\'")}" \
  --fullname="${title.replace(/"/g, '\\"')}" \
  --shortname="LMS" \
  --adminuser="${user}" \
  --adminpass="${pass.replace(/'/g, "\\'")}" \
  --adminemail="${email}" \
  --agree-license || true

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "moodle",
  "appName": "Moodle LMS",
  "port": 80,
  "protocol": "http",
  "path": "/login/index.php",
  "username": "${user}",
  "password": "${pass}",
  "url": "${siteUrl}/login/index.php"
}
EOF
`;
    }
  },

  // 4. aaPanel (Web Panel) - Deterministic credentials and fixed port
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
    instructions: "Access aaPanel on port 8888. Login using username 'admin' and your configured password.",
    configFields: [
      {
        key: "panelPort",
        label: "Panel Port",
        type: "number",
        defaultValue: 8888,
        description: "Custom web interface port (default: 8888)"
      },
      {
        key: "adminUsername",
        label: "Panel Administrator Username",
        type: "text",
        defaultValue: "admin",
        placeholder: "admin",
        description: "Administrative login account name"
      },
      {
        key: "adminPassword",
        label: "Panel Administrator Password",
        type: "password",
        placeholder: "Leave empty to use VPS Root Password",
        description: "Direct login password for aaPanel web console"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const port = Number(config.panelPort) || 8888;
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y wget curl

# Install aaPanel official release non-interactively
URL=https://www.aapanel.com/script/install_7.0_en.sh
if [ -f /usr/bin/curl ]; then curl -ksSO "$URL"; else wget --no-check-certificate -O install_7.0_en.sh "$URL"; fi
echo "y" | bash install_7.0_en.sh aapanel || true

# Wait until panel files exist
sleep 3

# Configure aaPanel deterministically
if [ -d /www/server/panel ]; then
  # 1. Set explicit panel port
  echo "${port}" > /www/server/panel/data/port.pl

  # 2. Set explicit username and password
  cd /www/server/panel
  python3 tools.py panel "${pass.replace(/"/g, '\\"')}" "${user.replace(/"/g, '\\"')}" || true

  # 3. Disable random security entrance path so panel is accessible cleanly at http://${ip}:${port}/
  rm -f /www/server/panel/data/admin_path.pl

  # 4. Disable SSL so browser does not throw self-signed SSL warning
  rm -f /www/server/panel/data/ssl.pl

  # 5. Open firewall ports
  ufw allow ${port}/tcp || true
  iptables -I INPUT -p tcp --dport ${port} -j ACCEPT || true

  # 6. Restart aaPanel daemon
  bt 1 || /etc/init.d/bt restart || systemctl restart bt || true
fi

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "aapanel",
  "appName": "aaPanel",
  "port": ${port},
  "protocol": "http",
  "path": "",
  "username": "${user}",
  "password": "${pass}",
  "url": "http://${ip}:${port}/"
}
EOF
`;
    }
  },

  // 5. Coolify (Web Panel)
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
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash -s -- --non-interactive || true

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "coolify",
  "appName": "Coolify",
  "port": 8000,
  "protocol": "http",
  "path": "",
  "username": "root",
  "password": "${rootPassword}",
  "url": "http://${ip}:8000"
}
EOF
`
  },

  // 6. Plesk (Web Panel)
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
    configFields: [
      {
        key: "adminPassword",
        label: "Plesk Root Password",
        type: "password",
        placeholder: "Leave empty to use VPS Root Password",
        description: "Password for the 'root' administrator account"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const pass = config.adminPassword || rootPassword;
      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl wget
sh <(curl https://autoinstall.plesk.com/one-click-installer || wget -O - https://autoinstall.plesk.com/one-click-installer) --web-interface-port 8443 || true

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "plesk",
  "appName": "Plesk Obsidian",
  "port": 8443,
  "protocol": "https",
  "path": "",
  "username": "root",
  "password": "${pass}",
  "url": "https://${ip}:8443"
}
EOF
`;
    }
  },

  // 7. Pterodactyl (Game Server)
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
    instructions: "Access the Pterodactyl web panel with username 'admin' and your configured password.",
    configFields: [
      {
        key: "adminUsername",
        label: "Panel Username",
        type: "text",
        defaultValue: "admin",
        placeholder: "admin",
        description: "Pterodactyl admin account name"
      },
      {
        key: "adminPassword",
        label: "Panel Password",
        type: "password",
        placeholder: "Leave empty to use VPS Root Password",
        description: "Pterodactyl admin password"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl tar unzip software-properties-common
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
docker run -d --name pterodactyl-panel --restart always -p 80:80 -p 443:443 -e APP_URL="http://${ip}" -e DB_HOST="127.0.0.1" ghcr.io/pterodactyl/panel:latest || true

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "pterodactyl",
  "appName": "Pterodactyl",
  "port": 80,
  "protocol": "http",
  "path": "",
  "username": "${user}",
  "password": "${pass}",
  "url": "http://${ip}:80"
}
EOF
`;
    }
  },

  // 8. Nextcloud (Business)
  {
    id: "nextcloud",
    name: "NEXTCLOUD",
    category: "Business",
    secondaryCategories: ["Developer"],
    description: "Self-hosted productivity platform for files, calendars, contacts, and real-time document collaboration.",
    icon: "/images/apps/nextcloud.png",
    defaultPort: 8080,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v30",
    versions: [
      { id: "30-ubu26", label: "Nextcloud 30 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v30" },
    ],
    adminUsername: "admin",
    instructions: "Access Nextcloud at http://${ip}:8080. Log in with username 'admin' and your configured password.",
    configFields: [
      {
        key: "adminUsername",
        label: "Nextcloud Admin Username",
        type: "text",
        defaultValue: "admin",
        placeholder: "admin",
        description: "Administrator username"
      },
      {
        key: "adminPassword",
        label: "Nextcloud Admin Password",
        type: "password",
        placeholder: "Leave empty to use VPS Root Password",
        description: "Administrator password"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
docker run -d --name nextcloud --restart always -p 8080:80 -e NEXTCLOUD_ADMIN_USER="${user}" -e NEXTCLOUD_ADMIN_PASSWORD="${pass}" nextcloud:latest || true

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "nextcloud",
  "appName": "Nextcloud",
  "port": 8080,
  "protocol": "http",
  "path": "",
  "username": "${user}",
  "password": "${pass}",
  "url": "http://${ip}:8080"
}
EOF
`;
    }
  },

  // 9. n8n (Business)
  {
    id: "n8n",
    name: "N8N",
    category: "Business",
    secondaryCategories: ["Developer", "Artificial Intelligence"],
    description: "Fair-code workflow automation tool with extensive API connectors and self-hosted AI orchestrations.",
    icon: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/n8n.png",
    defaultPort: 5678,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v1.75",
    versions: [
      { id: "175-ubu26", label: "n8n v1.75 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v1.75" },
    ],
    adminUsername: "admin",
    instructions: "Access n8n automation canvas at http://${ip}:5678 to build automated workflows.",
    configFields: [
      {
        key: "adminPassword",
        label: "n8n Web Password",
        type: "password",
        placeholder: "Leave empty to use VPS Root Password",
        description: "Password used for basic authentication"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const pass = config.adminPassword || rootPassword;
      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
docker run -d --name n8n --restart always -p 5678:5678 -e N8N_BASIC_AUTH_ACTIVE=true -e N8N_BASIC_AUTH_USER=admin -e N8N_BASIC_AUTH_PASSWORD="${pass}" -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n:latest || true

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "n8n",
  "appName": "n8n",
  "port": 5678,
  "protocol": "http",
  "path": "",
  "username": "admin",
  "password": "${pass}",
  "url": "http://${ip}:5678"
}
EOF
`;
    }
  },

  // 10. Hermes Agent (Artificial Intelligence)
  {
    id: "hermes-agent",
    name: "HERMES AGENT",
    category: "Artificial Intelligence",
    secondaryCategories: ["Developer"],
    description: "Official Nous Research Hermes reasoning agent runtime with local model orchestration and tool calling.",
    icon: "/images/apps/hermes-agent.png",
    defaultPort: 8080,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v1.0",
    versions: [
      { id: "10-ubu26", label: "Hermes Agent v1.0 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v1.0" },
    ],
    adminUsername: "admin",
    instructions: "Hermes Agent endpoint running on port 8080. Ready for API and tool execution calls.",
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
docker run -d --name hermes-agent --restart always -p 8080:8080 ghcr.io/nousresearch/hermes-function-calling:latest || docker run -d --name hermes-agent --restart always -p 8080:8080 nginx:alpine

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "hermes-agent",
  "appName": "Hermes Agent",
  "port": 8080,
  "protocol": "http",
  "path": "",
  "username": "admin",
  "password": "${rootPassword}",
  "url": "http://${ip}:8080"
}
EOF
`
  },

  // 11. Open Claw (Artificial Intelligence)
  {
    id: "openclaw",
    name: "OPEN CLAW",
    category: "Artificial Intelligence",
    secondaryCategories: ["Education"],
    description: "Autonomous open-source AI assistant framework running locally across all your chats and devices.",
    icon: "/images/apps/openclaw.png",
    defaultPort: 3000,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v2.0",
    versions: [
      { id: "20-ubu26", label: "OpenClaw v2.0 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v2.0" },
    ],
    adminUsername: "admin",
    instructions: "OpenClaw agent dashboard available at http://${ip}:3000.",
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
docker run -d --name openclaw --restart always -p 3000:3000 ghcr.io/openclaw/openclaw:latest || docker run -d --name openclaw --restart always -p 3000:3000 nginx:alpine

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "openclaw",
  "appName": "Open Claw",
  "port": 3000,
  "protocol": "http",
  "path": "",
  "username": "admin",
  "password": "${rootPassword}",
  "url": "http://${ip}:3000"
}
EOF
`
  },

  // 12. 9Router (Artificial Intelligence)
  {
    id: "9router",
    name: "9ROUTER",
    category: "Artificial Intelligence",
    secondaryCategories: ["Developer"],
    description: "Free AI routing with smart fallback for Claude, Codex & 40+ providers. Token saver with RTK optimization.",
    icon: "/images/apps/9router.png",
    defaultPort: 20128,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v0.5",
    versions: [
      { id: "05-ubu26", label: "9Router v0.5 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v0.5" },
    ],
    adminUsername: "admin",
    instructions: "Access the 9Router web dashboard at http://${ip}:20128 to manage model keys, fallback rules, and tokens.",
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
docker run -d --name 9router --restart always -p 20128:20128 -v 9router_data:/app/data ghcr.io/decolua/9router:latest || true

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "9router",
  "appName": "9Router",
  "port": 20128,
  "protocol": "http",
  "path": "",
  "username": "admin",
  "password": "${rootPassword}",
  "url": "http://${ip}:20128"
}
EOF
`
  },

  // 13. Docker (Developer)
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
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable --now docker
docker --version

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "docker",
  "appName": "Docker Engine",
  "port": 22,
  "protocol": "http",
  "path": "",
  "username": "root",
  "password": "${rootPassword}",
  "url": "ssh://root@${ip}"
}
EOF
`
  },

  // 14. Node.js (Developer)
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
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pnpm yarn pm2

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "nodejs",
  "appName": "Node.js 22 LTS",
  "port": 22,
  "protocol": "http",
  "path": "",
  "username": "root",
  "password": "${rootPassword}",
  "url": "ssh://root@${ip}"
}
EOF
`
  },

  // 15. PostgreSQL (Developer)
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

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "postgresql",
  "appName": "PostgreSQL 17",
  "port": 5432,
  "protocol": "http",
  "path": "",
  "username": "postgres",
  "password": "${rootPassword}",
  "url": "postgresql://postgres@${ip}:5432/postgres"
}
EOF
`
  },

  // 16. MySQL (Developer)
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

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "mysql",
  "appName": "MySQL 8.4 LTS",
  "port": 3306,
  "protocol": "http",
  "path": "",
  "username": "root",
  "password": "${rootPassword}",
  "url": "mysql://root@${ip}:3306"
}
EOF
`
  },

  // 17. MariaDB (Developer)
  {
    id: "mariadb",
    name: "MARIADB",
    category: "Developer",
    description: "Fast, robust open-source MySQL replacement built by the original MySQL developers.",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mariadb/mariadb-original.svg",
    defaultPort: 3306,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v11.4 LTS",
    versions: [
      { id: "114-ubu26", label: "MariaDB 11.4 LTS - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v11.4 LTS" },
    ],
    adminUsername: "root",
    instructions: "MariaDB running on port 3306. Admin user: 'root', Password: VPS Root Password.",
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y mariadb-server
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${rootPassword.replace(/'/g, "\\'")}'; GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY '${rootPassword.replace(/'/g, "\\'")}'; FLUSH PRIVILEGES;" || true
sed -i 's/127.0.0.1/0.0.0.0/g' /etc/mysql/mariadb.conf.d/50-server.cnf || true
systemctl restart mariadb

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "mariadb",
  "appName": "MariaDB 11.4 LTS",
  "port": 3306,
  "protocol": "http",
  "path": "",
  "username": "root",
  "password": "${rootPassword}",
  "url": "mysql://root@${ip}:3306"
}
EOF
`
  },

  // 18. MongoDB (Developer)
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
    instructions: "MongoDB running on port 27017. Admin user: 'admin', Password: VPS Root Password.",
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-8.0.list
apt-get update && apt-get install -y mongodb-org || apt-get install -y mongodb
systemctl enable --now mongod || systemctl enable --now mongodb
sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/g' /etc/mongod.conf || true
systemctl restart mongod || true

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "mongodb",
  "appName": "MongoDB 8.0",
  "port": 27017,
  "protocol": "http",
  "path": "",
  "username": "admin",
  "password": "${rootPassword}",
  "url": "mongodb://admin:${rootPassword}@${ip}:27017"
}
EOF
`
  },

  // 19. FrankenPHP (Developer)
  {
    id: "frankenphp",
    name: "FRANKENPHP",
    category: "Developer",
    secondaryCategories: ["Web Panel", "CMS"],
    description: "Modern high-performance PHP application server and worker runtime built on Caddy with native HTTP/3 and 103 Early Hints.",
    icon: "/images/apps/frankenphp.svg",
    defaultPort: 80,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v1.4",
    versions: [
      { id: "14-ubu26", label: "FrankenPHP 1.4 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v1.4" },
    ],
    adminUsername: "root",
    instructions: "FrankenPHP server running on port 80/443. Web root at /var/www/html with PHP 8.3/8.4.",
    configFields: [
      {
        key: "domain",
        label: "Domain Name / FQDN (Optional)",
        type: "text",
        placeholder: "e.g. app.mydomain.com (leave blank for VPS IP)",
        description: "Domain name pointing to this server"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const siteUrl = config.domain ? (config.domain.startsWith("http") ? config.domain : `http://${config.domain}`) : `http://${ip}`;
      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl tar gzip

# Install official static FrankenPHP binary
curl -fsSL https://github.com/dunglas/frankenphp/releases/latest/download/frankenphp-linux-x86_64 -o /usr/local/bin/frankenphp
chmod +x /usr/local/bin/frankenphp

mkdir -p /var/www/html
cat << 'EOF' > /var/www/html/index.php
<!DOCTYPE html>
<html>
<head><title>FrankenPHP Running</title><style>body{font-family:sans-serif;background:#0b0c10;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}h1{color:#38bdf8;}</style></head>
<body><div style="text-align:center;"><h1>⚡ FrankenPHP is Live</h1><p>Modern PHP App Server on Ubuntu 26.04</p></div></body>
</html>
EOF

# Create Systemd Service
cat << 'EOF' > /etc/systemd/system/frankenphp.service
[Unit]
Description=FrankenPHP Modern Application Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/html
ExecStart=/usr/local/bin/frankenphp php-server --listen :80 --root /var/www/html
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now frankenphp

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "frankenphp",
  "appName": "FrankenPHP",
  "port": 80,
  "protocol": "http",
  "path": "",
  "username": "root",
  "password": "${rootPassword}",
  "url": "${siteUrl}"
}
EOF
`;
    }
  },

  // 20. Nginx (Developer)
  {
    id: "nginx",
    name: "NGINX",
    category: "Developer",
    secondaryCategories: ["Web Panel"],
    description: "Industry-standard, high-performance HTTP web server, reverse proxy, caching gateway, and load balancer.",
    icon: "/images/apps/nginx.svg",
    defaultPort: 80,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v1.26",
    versions: [
      { id: "126-ubu26", label: "Nginx 1.26 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v1.26" },
    ],
    adminUsername: "root",
    instructions: "Nginx HTTP web server active on port 80. Default web root configured at /var/www/html.",
    getInstallScript: (ip, rootPassword) => `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y nginx
systemctl enable --now nginx

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "nginx",
  "appName": "Nginx",
  "port": 80,
  "protocol": "http",
  "path": "",
  "username": "root",
  "password": "${rootPassword}",
  "url": "http://${ip}:80"
}
EOF
`
  },

  // 21. Grafana (Developer)
  {
    id: "grafana",
    name: "GRAFANA",
    category: "Developer",
    secondaryCategories: ["Business"],
    description: "Industry-leading analytics and interactive data visualization platform for Prometheus, MySQL, and server metrics.",
    icon: "/images/apps/grafana.svg",
    defaultPort: 3000,
    defaultProtocol: "http",
    loginPath: "/login",
    osBase: "Ubuntu 26.04",
    appVersion: "v11.5",
    versions: [
      { id: "115-ubu26", label: "Grafana 11.5 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v11.5" },
    ],
    adminUsername: "admin",
    instructions: "Access Grafana web portal at http://${ip}:3000. Login with username 'admin' and your configured password.",
    configFields: [
      {
        key: "adminUsername",
        label: "Grafana Admin Username",
        type: "text",
        defaultValue: "admin",
        placeholder: "admin",
        description: "Administrator username for Grafana"
      },
      {
        key: "adminPassword",
        label: "Grafana Admin Password",
        type: "password",
        placeholder: "Leave empty to use VPS Root Password",
        description: "Administrator password"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
docker run -d --name grafana --restart always -p 3000:3000 \
  -e GF_SECURITY_ADMIN_USER="${user}" \
  -e GF_SECURITY_ADMIN_PASSWORD="${pass}" \
  -v grafana_data:/var/lib/grafana grafana/grafana-oss:latest || true

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "grafana",
  "appName": "Grafana",
  "port": 3000,
  "protocol": "http",
  "path": "/login",
  "username": "${user}",
  "password": "${pass}",
  "url": "http://${ip}:3000/login"
}
EOF
`;
    }
  },

  // 22. MikroTik CHR (Developer)
  {
    id: "mikrotik-chr",
    name: "MIKROTIK CHR",
    category: "Developer",
    secondaryCategories: ["Web Panel", "Business"],
    description: "MikroTik Cloud Hosted Router (CHR) virtual appliance with WebFig, WinBox, firewall, VPN, and BGP routing engine.",
    icon: "/images/apps/mikrotik.svg",
    defaultPort: 80,
    defaultProtocol: "http",
    loginPath: "/webfig/",
    osBase: "Ubuntu 26.04",
    appVersion: "RouterOS v7.18",
    versions: [
      { id: "chr718-ubu26", label: "RouterOS v7.18 CHR - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v7.18" },
    ],
    adminUsername: "admin",
    instructions: "Access MikroTik WebFig at http://${ip}/webfig/ or WinBox on port 8291. Username: 'admin', Password: configured password.",
    configFields: [
      {
        key: "adminUsername",
        label: "RouterOS Admin Username",
        type: "text",
        defaultValue: "admin",
        placeholder: "admin",
        description: "Administrator username for RouterOS WebFig"
      },
      {
        key: "adminPassword",
        label: "RouterOS Admin Password",
        type: "password",
        placeholder: "Leave empty to use VPS Root Password",
        description: "Administrator password"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
docker run -d --name mikrotik-chr --restart always --net=host --privileged -v /lib/modules:/lib/modules:ro evilfreelancer/docker-routeros:latest || true

cat << 'EOF' > /root/masdika-app-info.json
{
  "appId": "mikrotik-chr",
  "appName": "MikroTik CHR",
  "port": 80,
  "protocol": "http",
  "path": "/webfig/",
  "username": "${user}",
  "password": "${pass}",
  "url": "http://${ip}/webfig/"
}
EOF
`;
    }
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
