# 🚀 Masdika.ID - Personal Portfolio, Blog & Developer Community

Welcome to the official repository of **Masdika.ID**. This project is a modern, high-performance web application built with Next.js (App Router), Prisma, and MariaDB. It serves as a personal portfolio, technical blog, community hub, and a comprehensive platform for Cloud & VPS Management services.

## ✨ Features

- **Personal Portfolio & Resume**: Showcase projects, skills, certifications, and experiences with a beautiful, responsive, modern UI.
- **Tech Blog & Series**: A fully functional blog system to share insights on Cloud Infrastructure, DevOps, Linux, and more.
- **Developer Community**: A directory of WhatsApp IT & Developer groups. Users can submit their groups for admin moderation.
- **Cloud & VPS Management**: Built-in dashboard to manage VPS instances, configure firewalls, and monitor system alerts.
- **K3s / Kubernetes Automation**: Automated deployment and installation logs for K3s clusters on managed VPS instances.
- **Client Area & Services**: Integrated support ticketing system, payment gateway handling, and a dedicated user dashboard.
- **Utility Tools**: Features a built-in URL shortener, object storage manager, and media downloader.
- **Admin Dashboard**: A secure control panel to manage blog posts, media, users, tickets, and moderate submissions.
- **Robust Security (DevSecOps)**: Features Anti-Spam (Rate Limiting), SSRF Protection, and runs as a secure non-root user inside Docker.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: Tailwind CSS & Framer Motion (for micro-animations)
- **Database**: MariaDB
- **ORM**: [Prisma](https://www.prisma.io/)
- **Deployment**: Docker, Docker Compose, & Cloudflare Tunnel

---

## 💻 Local Development

### Prerequisites
- Node.js (v18+)
- MariaDB / MySQL installed locally (e.g., via XAMPP)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/masdika.git
   cd masdika
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   # Database (Local)
   DATABASE_URL="mysql://root:@localhost:3306/masdika"
   
   # App Config
   SESSION_SECRET="your-very-long-secret-key-here"
   ENCRYPTION_KEY="your-encryption-key-here"
   DETERMINISTIC_IV="your-deterministic-iv-here"
   ```

4. **Initialize Database**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🐳 Production Deployment (Docker + Cloudflare Tunnel)

This application is fully optimized for production environments using a lightweight, multi-stage Docker build that strictly adheres to **DevSecOps** best practices (running as a non-root user).

### Prerequisites
- Docker & Docker Compose installed on your server.
- Cloudflared (Cloudflare Tunnel) configured on your server.

### Steps to Deploy

1. **Configure Production `.env`**
   Ensure your `.env` file is ready for production. Do NOT use `root` for the database user.
   ```env
   DB_HOST="db"
   DB_USER="masdika"
   DB_PASS="YourStrongPassword123!"
   DB_NAME="masdika"
   DB_PORT="3306"
   
   SESSION_SECRET="your-secure-random-string"
   # ... other variables
   ```

2. **Database Import (Optional)**
   If you have existing data, place your SQL dump inside the root folder and name it `masdika.sql`. The Docker container will automatically import this file upon its first boot.

3. **Deploy with Docker Compose**
   Build and start the containers in detached mode:
   ```bash
   docker-compose up -d --build
   ```

   **Note on Permissions:** 
   The `entrypoint.sh` script will automatically configure the correct directory ownership (`chown`) on startup and then seamlessly drop root privileges using `su-exec` to run the application securely as the `nextjs` user. You will never encounter `Permission Denied` errors when uploading files!

4. **Expose via Cloudflare Tunnel**
   Route your Cloudflare Tunnel directly to the application container's port:
   ```text
   http://localhost:3000
   ```

---

## 🔒 Security Measures Included

- **Non-Root Docker Execution**: The app container drops privileges immediately after setting up upload directories.
- **XSS & SSRF Protection**: All community URL submissions strictly require `https://chat.whatsapp.com/` prefixes.
- **Anti-Spam**: IP-based rate limiting (max 2 community submissions per hour).
- **Manual Moderation**: User-generated content remains `Unpublished` until explicitly approved by an admin.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/masdika/issues).

---
*Built with ❤️ by Masdika.*
