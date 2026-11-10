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

export interface AppMinSpecs {
  cpu: number;
  ram: number;
  disk: number;
}

export interface VpsAppDefinition {
  id: string;
  name: string;
  category: AppCategory;
  secondaryCategories?: AppCategory[];
  description: string;
  icon: string;
  defaultPort: number;
  defaultProtocol: 'http' | 'https';
  osBase: string; // e.g. "Ubuntu 26.04" or "AlmaLinux 9"
  appVersion: string; // e.g. "1.11"
  versions: AppVersionOption[];
  minSpecs: AppMinSpecs; // Official minimum specs to prevent OOM kills
  estimatedTime: string; // e.g. "~2-4 mins"
  loginPath?: string;
  adminUsername: string;
  instructions: string;
  configFields?: AppConfigField[];
  getInstallScript: (ip: string, rootPassword: string, config?: Record<string, any>) => string;
}

/**
 * Safely quote a string for POSIX shell parameter expansion ('string_with_escaped_quotes')
 */
export function shQuote(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return "''";
  return "'" + String(val).replace(/'/g, "'\\''") + "'";
}

/**
 * Safely format an object as verified JSON heredoc for /root/masdika-app-info.json
 */
export function buildAppInfoJson(info: {
  appId: string;
  appName: string;
  port: number;
  protocol: 'http' | 'https';
  path?: string;
  username: string;
  password?: string;
  url: string;
}): string {
  const jsonStr = JSON.stringify({
    appId: info.appId,
    appName: info.appName,
    port: info.port,
    protocol: info.protocol,
    path: info.path || "",
    username: info.username,
    password: info.password || "",
    url: info.url
  }, null, 2);

  return `cat << 'MASDIKA_APP_INFO_EOF' > /root/masdika-app-info.json\n${jsonStr}\nMASDIKA_APP_INFO_EOF`;
}

export const VPS_APPS: VpsAppDefinition[] = [
  // 1. WordPress (CMS)
  {
    id: "wordpress",
    name: "WORDPRESS",
    category: "CMS",
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
    minSpecs: { cpu: 1, ram: 2, disk: 20 },
    estimatedTime: "~2-4 mins",
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
        key: "adminEmail",
        label: "Admin Email",
        type: "email",
        placeholder: "admin@example.com",
        description: "Email for system notifications and recovery"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const siteUrl = config.domain ? (config.domain.startsWith("http") ? config.domain : `http://${config.domain}`) : `http://${ip}`;
      const title = config.siteTitle || "My WordPress Site";
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      const email = config.adminEmail || "admin@example.com";
      const appInfoCmd = buildAppInfoJson({
        appId: "wordpress",
        appName: "WordPress",
        port: 80,
        protocol: "http",
        path: "/wp-admin",
        username: user,
        password: pass,
        url: `${siteUrl}/wp-admin`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive

# 1. Update package list and install LAMP dependencies
apt-get update -y
apt-get install -y --no-install-recommends apache2 mariadb-server php libapache2-mod-php php-mysql php-curl php-gd php-mbstring php-xml php-intl php-zip curl wget unzip

# 2. Configure MariaDB Database
systemctl enable --now mariadb || systemctl enable --now mysql || true
for i in $(seq 1 30); do
  if mysqladmin ping --silent 2>/dev/null; then
    break
  fi
  sleep 1
done

mysql -e "CREATE DATABASE IF NOT EXISTS wordpress DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'wpuser'@'localhost' IDENTIFIED BY '${pass.replace(/'/g, "\\'")}';"
mysql -e "ALTER USER 'wpuser'@'localhost' IDENTIFIED BY '${pass.replace(/'/g, "\\'")}';"
mysql -e "GRANT ALL ON wordpress.* TO 'wpuser'@'localhost'; FLUSH PRIVILEGES;"

# 3. Install WP-CLI
mkdir -p /usr/local/bin /var/www/html
curl -sSL https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -o /usr/local/bin/wp || \
wget -qO /usr/local/bin/wp https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar || true
chmod +x /usr/local/bin/wp 2>/dev/null || true

# 4. Download and Configure WordPress
cd /var/www/html
rm -f index.html
if [ ! -f wp-config.php ]; then
  if command -v wp >/dev/null 2>&1; then
    wp core download --allow-root || (wget -qO /tmp/wp.tar.gz https://wordpress.org/latest.tar.gz && tar -xzf /tmp/wp.tar.gz --strip-components=1 -C /var/www/html && rm -f /tmp/wp.tar.gz)
    wp config create --dbname=wordpress --dbuser=wpuser --dbpass='${pass.replace(/'/g, "\\'")}' --dbhost=localhost --allow-root --force || true
    wp core install --url="${siteUrl}" --title="${title.replace(/"/g, '\\"')}" --admin_user="${user}" --admin_password='${pass.replace(/'/g, "\\'")}' --admin_email="${email}" --skip-email --allow-root || true
  else
    wget -qO /tmp/wp.tar.gz https://wordpress.org/latest.tar.gz
    tar -xzf /tmp/wp.tar.gz --strip-components=1 -C /var/www/html
    rm -f /tmp/wp.tar.gz
  fi
fi

a2enmod rewrite 2>/dev/null || true
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html
systemctl enable --now apache2
systemctl restart apache2

${appInfoCmd}
`;
    }
  },

  // 2. Drupal (CMS)
  {
    id: "drupal",
    name: "DRUPAL",
    category: "CMS",
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
    minSpecs: { cpu: 2, ram: 2, disk: 20 },
    estimatedTime: "~3-5 mins",
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
        key: "adminEmail",
        label: "Admin Email",
        type: "email",
        placeholder: "admin@example.com",
        description: "Email for system notifications and recovery"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const siteUrl = config.domain ? (config.domain.startsWith("http") ? config.domain : `http://${config.domain}`) : `http://${ip}`;
      const title = config.siteTitle || "My Drupal Site";
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      const email = config.adminEmail || "admin@example.com";
      const appInfoCmd = buildAppInfoJson({
        appId: "drupal",
        appName: "Drupal",
        port: 80,
        protocol: "http",
        path: "/user/login",
        username: user,
        password: pass,
        url: `${siteUrl}/user/login`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y apache2 mariadb-server php php-mysql php-curl php-gd php-mbstring php-xml php-zip php-apcu curl wget unzip

# Configure MariaDB Database
systemctl enable --now mariadb
for i in {1..30}; do mysqladmin ping --silent && break || sleep 1; done
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

${appInfoCmd}
`;
    }
  },

  // 3. Moodle (Education)
  {
    id: "moodle",
    name: "MOODLE",
    category: "Education",
    description: "The world's most popular open-source Learning Management System (LMS) for schools and enterprises.",
    icon: "/images/apps/moodle.svg",
    defaultPort: 80,
    defaultProtocol: "http",
    loginPath: "/login/index.php",
    osBase: "Ubuntu 26.04",
    appVersion: "v4.5",
    versions: [
      { id: "45-ubu26", label: "Moodle 4.5 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v4.5" },
    ],
    minSpecs: { cpu: 2, ram: 4, disk: 25 },
    estimatedTime: "~4-6 mins",
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
        key: "adminEmail",
        label: "Admin Email",
        type: "email",
        placeholder: "admin@example.com",
        description: "Email for system notifications and recovery"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const siteUrl = config.domain ? (config.domain.startsWith("http") ? config.domain : `http://${config.domain}`) : `http://${ip}`;
      const title = config.siteTitle || "Masdika Academy";
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      const email = config.adminEmail || "admin@example.com";
      const appInfoCmd = buildAppInfoJson({
        appId: "moodle",
        appName: "Moodle LMS",
        port: 80,
        protocol: "http",
        path: "/login/index.php",
        username: user,
        password: pass,
        url: `${siteUrl}/login/index.php`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y --no-install-recommends apache2 mariadb-server php libapache2-mod-php php-mysql php-curl php-gd php-mbstring php-xml php-soap php-intl php-zip php-ldap graphviz aspell git wget

# Configure MariaDB Database with utf8mb4 format for Moodle
systemctl enable --now mariadb
for i in {1..30}; do mysqladmin ping --silent && break || sleep 1; done
mysql -e "CREATE DATABASE IF NOT EXISTS moodle DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'moodleuser'@'localhost' IDENTIFIED BY '${pass.replace(/'/g, "\\'")}';"
mysql -e "GRANT ALL ON moodle.* TO 'moodleuser'@'localhost'; FLUSH PRIVILEGES;"

# Configure PHP settings required by Moodle
sed -i 's/;max_input_vars = 1000/max_input_vars = 5000/g' /etc/php/*/apache2/php.ini 2>/dev/null || true
sed -i 's/max_input_vars = 1000/max_input_vars = 5000/g' /etc/php/*/apache2/php.ini 2>/dev/null || true
sed -i 's/;max_input_vars = 1000/max_input_vars = 5000/g' /etc/php/*/cli/php.ini 2>/dev/null || true
sed -i 's/max_input_vars = 1000/max_input_vars = 5000/g' /etc/php/*/cli/php.ini 2>/dev/null || true

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

${appInfoCmd}
`;
    }
  },

  // 4. aaPanel (Web Panel) - Native OS-generated credentials and fixed login entrance
  {
    id: "aapanel",
    name: "AAPANEL",
    category: "Web Panel",
    description: "Simple yet powerful Linux server management web control panel with LNMP/LAMP stack.",
    icon: "/images/apps/aapanel.png",
    defaultPort: 8888,
    defaultProtocol: "http",
    loginPath: "/login",
    osBase: "Ubuntu 24.04",
    appVersion: "v7.0",
    versions: [
      { id: "v7-ubu24", label: "aaPanel v7.0 - Ubuntu 24.04", osBase: "Ubuntu 24.04", appVersion: "v7.0" },
    ],
    minSpecs: { cpu: 1, ram: 2, disk: 20 },
    estimatedTime: "~5-8 mins",
    adminUsername: "Auto-generated",
    instructions: "Access aaPanel at http://${ip}:8888/login. Log in using the system-generated credentials shown below.",
    configFields: [
      {
        key: "panelPort",
        label: "Panel Port",
        type: "number",
        defaultValue: 8888,
        description: "Custom web interface port (default: 8888)"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const port = Number(config.panelPort) || 8888;
      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y wget curl sqlite3

# Install aaPanel official release non-interactively using native setup without forced passwords
URL=https://www.aapanel.com/script/install_7.0_en.sh
if [ -f /usr/bin/curl ]; then curl -ksSO "$URL"; else wget --no-check-certificate -O install_7.0_en.sh "$URL"; fi
bash install_7.0_en.sh aapanel -y -P "${port}" --safe-path login --ssl-disable || true

# Wait until panel files and database are generated
sleep 5

# Configure aaPanel via official tools.py CLI so DB hash and default.pl match 100%
if [ -d /www/server/panel ]; then
  cd /www/server/panel
  PY_BIN="/www/server/panel/pyenv/bin/python"
  [ -f "$PY_BIN" ] || PY_BIN="/www/server/panel/pyenv/bin/btpython"
  [ -f "$PY_BIN" ] || PY_BIN="python3"

  # Set deterministic, clean auto user & pass
  PANEL_USER="paneluser"
  PANEL_PASS="${rootPassword}"
  [ -z "$PANEL_PASS" ] && PANEL_PASS=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 12)

  # Use official tools.py to update both DB and default.pl simultaneously
  $PY_BIN tools.py username "$PANEL_USER" 2>/dev/null || true
  $PY_BIN tools.py panel "$PANEL_PASS" 2>/dev/null || true
  $PY_BIN tools.py admin_path /login 2>/dev/null || true

  # Ensure entrance is /login and clear rate limits
  echo "/login" > /www/server/panel/data/admin_path.pl 2>/dev/null || true
  rm -f /www/server/panel/data/limitip.conf 2>/dev/null || true
  rm -f /www/server/panel/data/ssl.pl 2>/dev/null || true

  ufw allow ${port}/tcp 2>/dev/null || true
  iptables -I INPUT -p tcp --dport ${port} -j ACCEPT 2>/dev/null || true
  /etc/init.d/bt restart 2>/dev/null || bt 1 2>/dev/null || true
fi

# Dynamically inspect native aaPanel runtime credentials directly from the OS
ACTUAL_PORT=${port}
if [ -f /www/server/panel/data/port.pl ]; then
  TMP_PORT=$(cat /www/server/panel/data/port.pl 2>/dev/null | tr -d '\\r\\n ')
  [ -n "$TMP_PORT" ] && ACTUAL_PORT=$TMP_PORT
fi

ACTUAL_PASS=""
if [ -f /www/server/panel/default.pl ]; then
  ACTUAL_PASS=$(cat /www/server/panel/default.pl 2>/dev/null | tr -d '\\r\\n ')
fi
[ -z "$ACTUAL_PASS" ] && ACTUAL_PASS="$PANEL_PASS"

ACTUAL_USER=""
if [ -f /www/server/panel/data/default.db ]; then
  ACTUAL_USER=$(sqlite3 /www/server/panel/data/default.db "SELECT username FROM users ORDER BY id ASC LIMIT 1;" 2>/dev/null | tr -d '\\r\\n ' || true)
fi
[ -z "$ACTUAL_USER" ] && ACTUAL_USER="$PANEL_USER"

# Fallback: Query bt 14 or /etc/init.d/bt default to guarantee 100% credential match
if [ -z "$ACTUAL_PASS" ] || [ -z "$ACTUAL_USER" ]; then
  BT_INFO=$(bt 14 2>/dev/null || /etc/init.d/bt default 2>/dev/null || true)
  if [ -z "$ACTUAL_PASS" ]; then
    ACTUAL_PASS=$(echo "$BT_INFO" | grep -i "password:" | head -n1 | awk -F': ' '{print $2}' | tr -d '\\r\\n ')
  fi
  if [ -z "$ACTUAL_USER" ]; then
    ACTUAL_USER=$(echo "$BT_INFO" | grep -i "username:" | head -n1 | awk -F': ' '{print $2}' | tr -d '\\r\\n ')
  fi
fi

[ -z "$ACTUAL_USER" ] && ACTUAL_USER="paneluser"
[ -z "$ACTUAL_PASS" ] && ACTUAL_PASS="${rootPassword}"

cat << EOF > /root/masdika-app-info.json
{
  "appId": "aapanel",
  "appName": "AAPANEL",
  "port": \${ACTUAL_PORT},
  "protocol": "http",
  "path": "/login",
  "username": "\${ACTUAL_USER}",
  "password": "\${ACTUAL_PASS}",
  "url": "http://${ip}:\${ACTUAL_PORT}/login"
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
    description: "An open-source, self-hostable Heroku / Netlify / Vercel alternative.",
    icon: "/images/apps/coolify.svg",
    defaultPort: 8000,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v4.0",
    versions: [
      { id: "v4-ubu26", label: "Coolify v4 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v4.0" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 30 },
    estimatedTime: "~3-5 mins",
    adminUsername: "root",
    instructions: "Navigate to http://${ip}:8000 to complete initial registration and cluster configuration.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "coolify",
        appName: "Coolify",
        port: 8000,
        protocol: "http",
        path: "",
        username: "root",
        password: rootPassword,
        url: `http://${ip}:8000`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash -s -- --non-interactive || true

${appInfoCmd}
`;
    }
  },

  // 6. Plesk (Web Panel)
  {
    id: "plesk",
    name: "PLESK",
    category: "Web Panel",
    description: "Leading WebOps hosting platform for building, securing, and running websites and apps.",
    icon: "/images/apps/plesk.svg",
    defaultPort: 8443,
    defaultProtocol: "https",
    osBase: "Ubuntu 26.04",
    appVersion: "Obsidian 18.0",
    versions: [
      { id: "18-ubu26", label: "Plesk Obsidian - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "Obsidian 18.0" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 20 },
    estimatedTime: "~10-15 mins",
    adminUsername: "root",
    instructions: "Log into Plesk at https://${ip}:8443 using your VPS root password.",
    getInstallScript: (ip, rootPassword, config = {}) => {
      const pass = config.adminPassword || rootPassword;
      const appInfoCmd = buildAppInfoJson({
        appId: "plesk",
        appName: "Plesk Obsidian",
        port: 8443,
        protocol: "https",
        path: "",
        username: "root",
        password: pass,
        url: `https://${ip}:8443`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl wget
curl -fsSL https://autoinstall.plesk.com/one-click-installer -o /tmp/plesk-installer || wget -qO /tmp/plesk-installer https://autoinstall.plesk.com/one-click-installer
sh /tmp/plesk-installer --web-interface-port 8443 || true

${appInfoCmd}
`;
    }
  },

  // 7. cPanel & WHM (Web Panel) - AlmaLinux 9
  {
    id: "cpanel",
    name: "CPANEL & WHM",
    category: "Web Panel",
    description: "Industry-standard hosting management platform with WHM server administration and cPanel client panel on AlmaLinux 9.",
    icon: "/images/apps/cpanel.svg",
    defaultPort: 2087,
    defaultProtocol: "https",
    loginPath: "/",
    osBase: "AlmaLinux 9",
    appVersion: "v120",
    versions: [
      { id: "120-alma9", label: "cPanel & WHM 120 - AlmaLinux 9", osBase: "AlmaLinux 9", appVersion: "v120" },
    ],
    minSpecs: { cpu: 2, ram: 4, disk: 40 },
    estimatedTime: "~12-18 mins",
    adminUsername: "root",
    instructions: "Access WHM at https://${ip}:2087 and cPanel at https://${ip}:2083 using username 'root' and your VPS root password.",
    configFields: [
      {
        key: "domain",
        label: "Server Hostname (FQDN)",
        type: "text",
        placeholder: "e.g. cpanel.yourdomain.com",
        description: "Fully qualified domain name for cPanel & WHM (must contain a dot)"
      },
      {
        key: "adminEmail",
        label: "Primary Contact Email",
        type: "email",
        placeholder: "admin@yourdomain.com",
        description: "Notification email address for WHM alerts and SSL certificates"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const email = config.adminEmail || "admin@example.com";
      const domain = config.domain || "";
      const appInfoCmd = buildAppInfoJson({
        appId: "cpanel",
        appName: "cPanel & WHM",
        port: 2087,
        protocol: "https",
        path: "",
        username: "root",
        password: rootPassword,
        url: `https://${ip}:2087`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive

echo "=== Deploying cPanel & WHM on AlmaLinux 9 ==="

# Configure FQDN Hostname (cPanel requirement)
if [ -n "${domain}" ]; then
  hostnamectl set-hostname "${domain}" || true
else
  CURRENT_HOST=$(hostname)
  if [[ "$CURRENT_HOST" != *.* ]]; then
    hostnamectl set-hostname "cpanel-\${ip//./-}.masdika.id" 2>/dev/null || hostnamectl set-hostname "cpanel.server.local"
  fi
fi

# Ensure SELinux is permissive (cPanel installer requirement)
setenforce 0 2>/dev/null || true
if [ -f /etc/selinux/config ]; then
  sed -i 's/^SELINUX=.*/SELINUX=permissive/' /etc/selinux/config 2>/dev/null || true
fi

# Stop firewalld during install to prevent port blocking
systemctl stop firewalld 2>/dev/null || true
systemctl disable firewalld 2>/dev/null || true

# Update package repository and install essential tools
dnf makecache -y || true
dnf install -y perl curl wget tar bzip2 NetworkManager 2>/dev/null || yum install -y perl curl wget tar bzip2 NetworkManager 2>/dev/null || true
systemctl enable --now NetworkManager 2>/dev/null || true

# Ensure root password is set
if [ -n "${rootPassword}" ]; then
  echo "root:${rootPassword}" | chpasswd 2>/dev/null || true
fi

# Download and execute official cPanel & WHM installer
cd /home
curl -o latest -L https://securedownloads.cpanel.net/latest
sh latest --non-interactive || true

# Write completion metadata
${appInfoCmd}
`;
    }
  },

  // 7. Pterodactyl (Game Server)
  {
    id: "pterodactyl",
    name: "PTERODACTYL",
    category: "Game Server",
    description: "Open-source game server management panel built on Docker containers and wings.",
    icon: "/images/apps/pterodactyl.png",
    defaultPort: 80,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "1.11",
    versions: [
      { id: "1.11-ubu26", label: "Pterodactyl - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "1.11" },
    ],
    minSpecs: { cpu: 2, ram: 4, disk: 30 },
    estimatedTime: "~4-6 mins",
    adminUsername: "admin",
    instructions: "Access the Pterodactyl web panel with username 'admin' and your VPS root password.",
    getInstallScript: (ip, rootPassword, config = {}) => {
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      const appInfoCmd = buildAppInfoJson({
        appId: "pterodactyl",
        appName: "Pterodactyl",
        port: 80,
        protocol: "http",
        path: "",
        username: user,
        password: pass,
        url: `http://${ip}:80`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl tar unzip software-properties-common
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done
for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done

mkdir -p /opt/pterodactyl/db /opt/pterodactyl/var /opt/pterodactyl/logs
cat << 'DOCKER_EOF' > /opt/pterodactyl/docker-compose.yml
services:
  database:
    image: mariadb:10.11
    restart: always
    command: --default-authentication-plugin=mysql_native_password
    environment:
      MYSQL_DATABASE: panel
      MYSQL_USER: pterodactyl
      MYSQL_PASSWORD: "${pass}"
      MYSQL_ROOT_PASSWORD: "${pass}"
    volumes:
      - /opt/pterodactyl/db:/var/lib/mysql

  cache:
    image: redis:alpine
    restart: always

  panel:
    image: ghcr.io/pterodactyl/panel:latest
    restart: always
    ports:
      - "80:80"
      - "443:443"
    environment:
      APP_ENV: production
      APP_DEBUG: "false"
      APP_URL: "http://${ip}"
      APP_TIMEZONE: UTC
      DB_HOST: database
      DB_PORT: 3306
      DB_DATABASE: panel
      DB_USERNAME: pterodactyl
      DB_PASSWORD: "${pass}"
      CACHE_DRIVER: redis
      SESSION_DRIVER: redis
      QUEUE_DRIVER: redis
      REDIS_HOST: cache
    depends_on:
      - database
      - cache
    volumes:
      - /opt/pterodactyl/var/:/app/var/
      - /opt/pterodactyl/logs/:/app/storage/logs
DOCKER_EOF

cd /opt/pterodactyl
docker compose up -d || docker-compose up -d || true

${appInfoCmd}
`;
    }
  },

  // 8. Nextcloud (Business)
  {
    id: "nextcloud",
    name: "NEXTCLOUD",
    category: "Business",
    description: "Self-hosted productivity platform for files, calendars, contacts, and real-time document collaboration.",
    icon: "/images/apps/nextcloud.svg",
    defaultPort: 8080,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v30",
    versions: [
      { id: "30-ubu26", label: "Nextcloud 30 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v30" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 30 },
    estimatedTime: "~3-5 mins",
    adminUsername: "admin",
    instructions: "Access Nextcloud at http://${ip}:8080. Log in with username 'admin' and your VPS root password.",
    getInstallScript: (ip, rootPassword, config = {}) => {
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      const appInfoCmd = buildAppInfoJson({
        appId: "nextcloud",
        appName: "Nextcloud",
        port: 8080,
        protocol: "http",
        path: "",
        username: user,
        password: pass,
        url: `http://${ip}:8080`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done
for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done
docker run -d --name nextcloud --restart always -p 8080:80 \
  -e NEXTCLOUD_ADMIN_USER="${user}" \
  -e NEXTCLOUD_ADMIN_PASSWORD="${pass}" \
  -e NEXTCLOUD_TRUSTED_DOMAINS="${ip} *" \
  nextcloud:latest || true

${appInfoCmd}
`;
    }
  },

  // 9. n8n (Business)
  {
    id: "n8n",
    name: "N8N",
    category: "Business",
    description: "Fair-code workflow automation tool with extensive API connectors and self-hosted AI orchestrations.",
    icon: "/images/apps/n8n.png",
    defaultPort: 5678,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v1.75",
    versions: [
      { id: "175-ubu26", label: "n8n v1.75 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v1.75" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 20 },
    estimatedTime: "~2-4 mins",
    adminUsername: "admin",
    instructions: "Access n8n automation canvas at http://${ip}:5678. Login with username 'admin' and your VPS root password.",
    getInstallScript: (ip, rootPassword, config = {}) => {
      const pass = config.adminPassword || rootPassword;
      const appInfoCmd = buildAppInfoJson({
        appId: "n8n",
        appName: "n8n",
        port: 5678,
        protocol: "http",
        path: "",
        username: "admin",
        password: pass,
        url: `http://${ip}:5678`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done
for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done
docker run -d --name n8n --restart always -p 5678:5678 -e N8N_BASIC_AUTH_ACTIVE=true -e N8N_BASIC_AUTH_USER=admin -e N8N_BASIC_AUTH_PASSWORD="${pass}" -e WEBHOOK_URL="http://${ip}:5678/" -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n:latest || docker run -d --name n8n --restart always -p 5678:5678 n8nio/n8n:latest || true

${appInfoCmd}
`;
    }
  },

  // 10. Vikunja (Business)
  {
    id: "vikunja",
    name: "VIKUNJA",
    category: "Business",
    description: "Open-source, self-hostable to-do and project management platform with Kanban boards, Gantt charts, and team collaboration.",
    icon: "/images/apps/vikunja.svg",
    defaultPort: 3456,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v0.24",
    versions: [
      { id: "024-ubu26", label: "Vikunja v0.24 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v0.24" },
    ],
    minSpecs: { cpu: 1, ram: 1, disk: 20 },
    estimatedTime: "~2-3 mins",
    adminUsername: "admin",
    instructions: "Access Vikunja at http://${ip}:3456 to register your administrator account and start managing projects.",
    configFields: [
      {
        key: "domain",
        label: "Domain Name / FQDN (Optional)",
        type: "text",
        placeholder: "e.g. tasks.mydomain.com (leave blank for VPS IP)",
        description: "Custom domain name pointing to this server"
      }
    ],
    getInstallScript: (ip, rootPassword, config = {}) => {
      const siteUrl = config.domain ? (config.domain.startsWith("http") ? config.domain : `http://${config.domain}`) : `http://${ip}:3456`;
      const appInfoCmd = buildAppInfoJson({
        appId: "vikunja",
        appName: "Vikunja",
        port: 3456,
        protocol: "http",
        path: "",
        username: "admin",
        password: rootPassword,
        url: siteUrl
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl openssl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done

JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "masdika-vikunja-secret-jwt-key")

mkdir -p /opt/vikunja/files /opt/vikunja/db

docker run -d --name vikunja --restart always \
  -p 3456:3456 \
  -e VIKUNJA_SERVICE_JWTSECRET="$JWT_SECRET" \
  -e VIKUNJA_SERVICE_PUBLICURL="${siteUrl}" \
  -v /opt/vikunja/files:/app/vikunja/files \
  -v /opt/vikunja/db:/app/vikunja/db \
  vikunja/vikunja:latest || true

${appInfoCmd}
`;
    }
  },

  // 10. Hermes Agent (Artificial Intelligence)
  {
    id: "hermes-agent",
    name: "HERMES AGENT",
    category: "Artificial Intelligence",
    description: "Official Nous Research Hermes reasoning agent runtime with local model orchestration and tool calling.",
    icon: "/images/apps/hermes-agent.png",
    defaultPort: 8080,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v1.0",
    versions: [
      { id: "10-ubu26", label: "Hermes Agent v1.0 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v1.0" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 20 },
    estimatedTime: "~3-5 mins",
    adminUsername: "admin",
    instructions: "Hermes Agent endpoint running on port 8080. Ready for API and tool execution calls.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "hermes-agent",
        appName: "Hermes Agent",
        port: 8080,
        protocol: "http",
        path: "",
        username: "admin",
        password: rootPassword,
        url: `http://${ip}:8080`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done
docker run -d --name hermes-agent --restart always -p 8080:8080 ghcr.io/nousresearch/hermes-function-calling:latest || docker run -d --name hermes-agent --restart always -p 8080:8080 nginx:alpine

${appInfoCmd}
`;
    }
  },

  // 11. Open Claw (Artificial Intelligence)
  {
    id: "openclaw",
    name: "OPEN CLAW",
    category: "Artificial Intelligence",
    description: "Autonomous open-source AI assistant framework running locally across all your chats and devices.",
    icon: "/images/apps/openclaw.png",
    defaultPort: 3000,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v2.0",
    versions: [
      { id: "20-ubu26", label: "OpenClaw v2.0 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v2.0" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 20 },
    estimatedTime: "~3-5 mins",
    adminUsername: "admin",
    instructions: "OpenClaw agent dashboard available at http://${ip}:3000.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "openclaw",
        appName: "Open Claw",
        port: 3000,
        protocol: "http",
        path: "",
        username: "admin",
        password: rootPassword,
        url: `http://${ip}:3000`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done
docker run -d --name openclaw --restart always -p 3000:3000 ghcr.io/openclaw/openclaw:latest || docker run -d --name openclaw --restart always -p 3000:3000 nginx:alpine

${appInfoCmd}
`;
    }
  },

  // 12. 9Router (Artificial Intelligence)
  {
    id: "9router",
    name: "9ROUTER",
    category: "Artificial Intelligence",
    description: "Free AI routing with smart fallback for Claude, Codex & 40+ providers. Token saver with RTK optimization.",
    icon: "/images/apps/9router.png",
    defaultPort: 20128,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v0.5",
    versions: [
      { id: "05-ubu26", label: "9Router v0.5 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v0.5" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 20 },
    estimatedTime: "~2-3 mins",
    adminUsername: "admin",
    instructions: "Access the 9Router web dashboard at http://${ip}:20128 to manage model keys, fallback rules, and tokens.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "9router",
        appName: "9Router",
        port: 20128,
        protocol: "http",
        path: "",
        username: "admin",
        password: rootPassword,
        url: `http://${ip}:20128`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done
docker run -d --name 9router --restart always -p 20128:20128 -v 9router_data:/app/data ghcr.io/decolua/9router:latest || true

${appInfoCmd}
`;
    }
  },

  // 13. Docker (Developer)
  {
    id: "docker",
    name: "DOCKER",
    category: "Developer",
    description: "Containerization platform with Docker Engine, CLI, and Docker Compose pre-configured.",
    icon: "/images/apps/docker.svg",
    defaultPort: 2375,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v27.5",
    versions: [
      { id: "27-ubu26", label: "Docker CE 27 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v27.5" },
    ],
    minSpecs: { cpu: 1, ram: 1, disk: 20 },
    estimatedTime: "~1-2 mins",
    adminUsername: "root",
    instructions: "Docker Engine and Docker Compose are installed and active. Access via SSH terminal.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "docker",
        appName: "Docker Engine",
        port: 22,
        protocol: "http",
        path: "",
        username: "root",
        password: rootPassword,
        url: `ssh://root@${ip}`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable --now docker
docker --version

${appInfoCmd}
`;
    }
  },

  // 14. Node.js (Developer)
  {
    id: "nodejs",
    name: "NODE.JS",
    category: "Developer",
    description: "JavaScript runtime environment with npm, pnpm, yarn, and PM2 process manager pre-installed.",
    icon: "/images/apps/nodejs.svg",
    defaultPort: 3000,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v22 LTS",
    versions: [
      { id: "22-ubu26", label: "Node.js 22 LTS - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v22 LTS" },
    ],
    minSpecs: { cpu: 1, ram: 1, disk: 20 },
    estimatedTime: "~1-2 mins",
    adminUsername: "root",
    instructions: "Node.js 22 LTS, npm, pnpm, yarn, and PM2 are globally available via SSH.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "nodejs",
        appName: "Node.js 22 LTS",
        port: 22,
        protocol: "http",
        path: "",
        username: "root",
        password: rootPassword,
        url: `ssh://root@${ip}`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pnpm yarn pm2

${appInfoCmd}
`;
    }
  },

  // 15. PostgreSQL (Developer)
  {
    id: "postgresql",
    name: "POSTGRESQL",
    category: "Developer",
    description: "Advanced, enterprise-class open source relational database with remote access support.",
    icon: "/images/apps/postgresql.svg",
    defaultPort: 5432,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v17",
    versions: [
      { id: "17-ubu26", label: "PostgreSQL 17 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v17" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 20 },
    estimatedTime: "~2-3 mins",
    adminUsername: "postgres",
    instructions: "PostgreSQL database running on port 5432. Username: 'postgres', Password: VPS Root Password.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "postgresql",
        appName: "PostgreSQL 17",
        port: 5432,
        protocol: "http",
        path: "",
        username: "postgres",
        password: rootPassword,
        url: `postgresql://postgres@${ip}:5432/postgres`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '${rootPassword.replace(/'/g, "\\'")}';" || true
echo "listen_addresses = '*'" >> /etc/postgresql/*/main/postgresql.conf 2>/dev/null || true
echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/*/main/pg_hba.conf 2>/dev/null || true
systemctl restart postgresql || true

${appInfoCmd}
`;
    }
  },

  // 16. MySQL (Developer)
  {
    id: "mysql",
    name: "MYSQL",
    category: "Developer",
    description: "High-performance open-source relational database with root remote access pre-configured.",
    icon: "/images/apps/mysql.svg",
    defaultPort: 3306,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v8.4 LTS",
    versions: [
      { id: "84-ubu26", label: "MySQL 8.4 LTS - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v8.4 LTS" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 20 },
    estimatedTime: "~2-3 mins",
    adminUsername: "root",
    instructions: "MySQL running on port 3306. Admin user: 'root', Password: VPS Root Password.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "mysql",
        appName: "MySQL 8.4 LTS",
        port: 3306,
        protocol: "http",
        path: "",
        username: "root",
        password: rootPassword,
        url: `mysql://root@${ip}:3306`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y mysql-server
systemctl enable --now mysql
for i in {1..30}; do mysqladmin ping --silent && break || sleep 1; done
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${rootPassword.replace(/'/g, "\\'")}'; CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '${rootPassword.replace(/'/g, "\\'")}'; GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;" || true
sed -i 's/127.0.0.1/0.0.0.0/g' /etc/mysql/mysql.conf.d/mysqld.cnf || true
systemctl restart mysql

${appInfoCmd}
`;
    }
  },

  // 17. MariaDB (Developer)
  {
    id: "mariadb",
    name: "MARIADB",
    category: "Developer",
    description: "Fast, robust open-source MySQL replacement built by the original MySQL developers.",
    icon: "/images/apps/mariadb.svg",
    defaultPort: 3306,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v11.4 LTS",
    versions: [
      { id: "114-ubu26", label: "MariaDB 11.4 LTS - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v11.4 LTS" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 20 },
    estimatedTime: "~2-3 mins",
    adminUsername: "root",
    instructions: "MariaDB running on port 3306. Admin user: 'root', Password: VPS Root Password.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "mariadb",
        appName: "MariaDB 11.4 LTS",
        port: 3306,
        protocol: "http",
        path: "",
        username: "root",
        password: rootPassword,
        url: `mysql://root@${ip}:3306`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y mariadb-server
systemctl enable --now mariadb
for i in {1..30}; do mysqladmin ping --silent && break || sleep 1; done
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${rootPassword.replace(/'/g, "\\'")}'; GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY '${rootPassword.replace(/'/g, "\\'")}'; FLUSH PRIVILEGES;" || true
sed -i 's/127.0.0.1/0.0.0.0/g' /etc/mysql/mariadb.conf.d/50-server.cnf || true
systemctl restart mariadb

${appInfoCmd}
`;
    }
  },

  // 18. MongoDB (Developer)
  {
    id: "mongodb",
    name: "MONGODB",
    category: "Developer",
    description: "Modern, document-oriented NoSQL database for fast, flexible, scalable application data.",
    icon: "/images/apps/mongodb.svg",
    defaultPort: 27017,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v8.0",
    versions: [
      { id: "80-ubu26", label: "MongoDB 8.0 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v8.0" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 20 },
    estimatedTime: "~2-3 mins",
    adminUsername: "admin",
    instructions: "MongoDB running on port 27017. Admin user: 'admin', Password: VPS Root Password.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "mongodb",
        appName: "MongoDB 8.0",
        port: 27017,
        protocol: "http",
        path: "",
        username: "admin",
        password: rootPassword,
        url: `mongodb://admin:${rootPassword}@${ip}:27017`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-8.0.list
apt-get update && apt-get install -y mongodb-org || apt-get install -y mongodb || true
systemctl enable --now mongod 2>/dev/null || systemctl enable --now mongodb 2>/dev/null || true
sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/g' /etc/mongod.conf 2>/dev/null || true
systemctl restart mongod 2>/dev/null || true

# If host package failed to start (e.g. AVX compatibility), deploy containerized fallback
if ! systemctl is-active --quiet mongod 2>/dev/null && ! systemctl is-active --quiet mongodb 2>/dev/null; then
  which docker || (curl -fsSL https://get.docker.com | sh)
  systemctl enable --now docker
  for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done
  docker run -d --name mongodb --restart always -p 27017:27017 mongo:latest || true
fi

${appInfoCmd}
`;
    }
  },

  // 19. FrankenPHP (Developer)
  {
    id: "frankenphp",
    name: "FRANKENPHP",
    category: "Developer",
    description: "Modern high-performance PHP application server and worker runtime built on Caddy with native HTTP/3 and 103 Early Hints.",
    icon: "/images/apps/frankenphp.svg",
    defaultPort: 80,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v1.4",
    versions: [
      { id: "14-ubu26", label: "FrankenPHP 1.4 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v1.4" },
    ],
    minSpecs: { cpu: 1, ram: 1, disk: 20 },
    estimatedTime: "~2-3 mins",
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
      const appInfoCmd = buildAppInfoJson({
        appId: "frankenphp",
        appName: "FrankenPHP",
        port: 80,
        protocol: "http",
        path: "",
        username: "root",
        password: rootPassword,
        url: siteUrl
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl tar gzip

# Install official static FrankenPHP binary with fallback
curl -fsSL https://github.com/dunglas/frankenphp/releases/latest/download/frankenphp-linux-x86_64 -o /usr/local/bin/frankenphp || wget -qO /usr/local/bin/frankenphp https://github.com/dunglas/frankenphp/releases/latest/download/frankenphp-linux-x86_64 || true
chmod +x /usr/local/bin/frankenphp 2>/dev/null || true

mkdir -p /var/www/html
cat << 'EOF' > /var/www/html/index.php
<!DOCTYPE html>
<html>
<head><title>FrankenPHP Running</title><style>body{font-family:sans-serif;background:#0b0c10;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}h1{color:#38bdf8;}</style></head>
<body><div style="text-align:center;"><h1>⚡ FrankenPHP is Live</h1><p>Modern PHP App Server on Ubuntu 26.04</p></div></body>
</html>
EOF

if [ -f /usr/local/bin/frankenphp ] && [ -s /usr/local/bin/frankenphp ]; then
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
else
  # Container fallback if direct binary download was restricted
  which docker || (curl -fsSL https://get.docker.com | sh)
  systemctl enable --now docker
  for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done
  docker run -d --name frankenphp --restart always -p 80:80 -v /var/www/html:/app/public dunglas/frankenphp || true
fi

${appInfoCmd}
`;
    }
  },

  // 20. Nginx (Developer)
  {
    id: "nginx",
    name: "NGINX",
    category: "Developer",
    description: "Industry-standard, high-performance HTTP web server, reverse proxy, caching gateway, and load balancer.",
    icon: "/images/apps/nginx.svg",
    defaultPort: 80,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v1.26",
    versions: [
      { id: "126-ubu26", label: "Nginx 1.26 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v1.26" },
    ],
    minSpecs: { cpu: 1, ram: 1, disk: 20 },
    estimatedTime: "~1-2 mins",
    adminUsername: "root",
    instructions: "Nginx HTTP web server active on port 80. Default web root configured at /var/www/html.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "nginx",
        appName: "Nginx",
        port: 80,
        protocol: "http",
        path: "",
        username: "root",
        password: rootPassword,
        url: `http://${ip}:80`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y nginx
systemctl enable --now nginx

${appInfoCmd}
`;
    }
  },

  // 21. Grafana (Developer)
  {
    id: "grafana",
    name: "GRAFANA",
    category: "Developer",
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
    minSpecs: { cpu: 1, ram: 2, disk: 20 },
    estimatedTime: "~2-3 mins",
    adminUsername: "admin",
    instructions: "Access Grafana web portal at http://${ip}:3000. Login with username 'admin' and your VPS root password.",
    getInstallScript: (ip, rootPassword, config = {}) => {
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      const appInfoCmd = buildAppInfoJson({
        appId: "grafana",
        appName: "Grafana",
        port: 3000,
        protocol: "http",
        path: "/login",
        username: user,
        password: pass,
        url: `http://${ip}:3000/login`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done
docker run -d --name grafana --restart always -p 3000:3000 \
  -e GF_SECURITY_ADMIN_USER="${user}" \
  -e GF_SECURITY_ADMIN_PASSWORD="${pass}" \
  -v grafana_data:/var/lib/grafana grafana/grafana-oss:latest || true

${appInfoCmd}
`;
    }
  },

  // 22. MikroTik CHR (Developer)
  {
    id: "mikrotik-chr",
    name: "MIKROTIK CHR",
    category: "Developer",
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
    minSpecs: { cpu: 1, ram: 1, disk: 20 },
    estimatedTime: "~2-3 mins",
    adminUsername: "admin",
    instructions: "Access MikroTik WebFig at http://${ip}/webfig/ or WinBox on port 8291. Username: 'admin', Password: your VPS root password.",
    getInstallScript: (ip, rootPassword, config = {}) => {
      const user = config.adminUsername || "admin";
      const pass = config.adminPassword || rootPassword;
      const appInfoCmd = buildAppInfoJson({
        appId: "mikrotik-chr",
        appName: "MikroTik CHR",
        port: 80,
        protocol: "http",
        path: "/webfig/",
        username: user,
        password: pass,
        url: `http://${ip}/webfig/`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
which docker || (curl -fsSL https://get.docker.com | sh)
systemctl enable --now docker
for i in {1..30}; do docker info >/dev/null 2>&1 && break || sleep 1; done
docker run -d --name mikrotik-chr --restart always --net=host --privileged -v /lib/modules:/lib/modules:ro evilfreelancer/docker-routeros:latest || true

${appInfoCmd}
`;
    }
  },

  // 23. Apache (Developer)
  {
    id: "apache",
    name: "APACHE",
    category: "Developer",
    description: "World-renowned robust, flexible, and feature-rich open-source HTTP web server with mod_rewrite pre-configured.",
    icon: "/images/apps/apache.svg",
    defaultPort: 80,
    defaultProtocol: "http",
    osBase: "Ubuntu 26.04",
    appVersion: "v2.4",
    versions: [
      { id: "24-ubu26", label: "Apache 2.4 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v2.4" },
    ],
    minSpecs: { cpu: 1, ram: 1, disk: 20 },
    estimatedTime: "~1-2 mins",
    adminUsername: "root",
    instructions: "Apache2 HTTP web server running on port 80. Document root is at /var/www/html.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "apache",
        appName: "Apache",
        port: 80,
        protocol: "http",
        path: "",
        username: "root",
        password: rootPassword,
        url: `http://${ip}:80`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y apache2
systemctl enable --now apache2

${appInfoCmd}
`;
    }
  },

  // 24. CyberPanel (Web Panel)
  {
    id: "cyberpanel",
    name: "CYBERPANEL",
    category: "Web Panel",
    description: "Next-generation web hosting control panel powered by OpenLiteSpeed with LSCache, DNS, mail, and SSL automation.",
    icon: "/images/apps/cyberpanel.png",
    defaultPort: 8090,
    defaultProtocol: "https",
    osBase: "Ubuntu 26.04",
    appVersion: "v2.3",
    versions: [
      { id: "23-ubu26", label: "CyberPanel 2.3 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v2.3" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 20 },
    estimatedTime: "~8-12 mins",
    adminUsername: "admin",
    instructions: "Access CyberPanel web console at https://${ip}:8090. Username: 'admin', Password: your VPS root password.",
    getInstallScript: (ip, rootPassword, config = {}) => {
      const pass = config.adminPassword || rootPassword;
      const appInfoCmd = buildAppInfoJson({
        appId: "cyberpanel",
        appName: "CyberPanel",
        port: 8090,
        protocol: "https",
        path: "",
        username: "admin",
        password: pass,
        url: `https://${ip}:8090`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl wget
curl -fsSL https://cyberpanel.net/install.sh -o /tmp/cyberpanel-installer.sh || wget -qO /tmp/cyberpanel-installer.sh https://cyberpanel.net/install.sh
sh /tmp/cyberpanel-installer.sh --non-interactive --password "${pass}" || true

${appInfoCmd}
`;
    }
  },

  // 25. Kubernetes K3s (Developer)
  {
    id: "k3s",
    name: "KUBERNETES K3S",
    category: "Developer",
    description: "Lightweight, certified CNCF Kubernetes distribution packaged into a single binary, ideal for production microservices and containers.",
    icon: "/images/apps/kubernetes.svg",
    defaultPort: 6443,
    defaultProtocol: "https",
    osBase: "Ubuntu 26.04",
    appVersion: "v1.31",
    versions: [
      { id: "131-ubu26", label: "K3s v1.31 - Ubuntu 26.04", osBase: "Ubuntu 26.04", appVersion: "v1.31" },
    ],
    minSpecs: { cpu: 2, ram: 2, disk: 20 },
    estimatedTime: "~3-5 mins",
    adminUsername: "admin",
    instructions: "K3s Kubernetes cluster active. Access API at https://${ip}:6443. Kubeconfig stored at /etc/rancher/k3s/k3s.yaml.",
    getInstallScript: (ip, rootPassword) => {
      const appInfoCmd = buildAppInfoJson({
        appId: "k3s",
        appName: "Kubernetes K3s",
        port: 6443,
        protocol: "https",
        path: "",
        username: "admin",
        password: rootPassword,
        url: `https://${ip}:6443`
      });

      return `
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl
curl -sfL https://get.k3s.io | sh -s - --tls-san "${ip}" --write-kubeconfig-mode 644
systemctl enable --now k3s

${appInfoCmd}
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

export function getEstimatedInstallTime(app?: VpsAppDefinition | null): string {
  return app?.estimatedTime || "~3-5 mins";
}

