<div align="center">
  <h1>🚀 Masdika.ID</h1>
  <p><strong>The Ultimate Cloud, VPS Management & Developer Portfolio Platform</strong></p>
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-18-blue?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Swarm-blue?logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=github-actions" alt="CI/CD" />
</div>

<br>

Welcome to the official repository of **Masdika.ID**. This project is a modern, high-performance web application built with Next.js (App Router), Prisma, and PostgreSQL. It serves as a comprehensive **Cloud Hosting & VPS Provider Platform**, integrated with a personal portfolio, technical blog, and community hub.

## ✨ Core Features

### 💻 Cloud & VPS Provider (Core Business)
- **VPS Provisioning**: Automated deployment of Virtual Private Servers.
- **Client Area & Billing**: Integrated payment gateways, invoice management, and secure client dashboard.
- **Resource Monitoring**: Live tracking of VPS CPU, RAM, and Disk Usage via Grafana & Prometheus.
- **Support Ticketing**: Built-in ticketing system for customer support.

### 🌐 Developer Hub & Portfolio
- **Personal Portfolio & Resume**: Showcase projects, skills, certifications, and experiences with a beautiful, responsive, modern UI.
- **Tech Blog & Series**: A fully functional blog system to share insights on Cloud Infrastructure, DevOps, and Linux.
- **K3s / Kubernetes Automation**: Automated deployment and installation logs for K3s clusters on managed VPS instances.
- **Developer Community**: A directory of WhatsApp IT & Developer groups (with Anti-Spam & SSRF Protection).

### 🛠️ Admin Control Panel
- **Infrastructure Management**: A secure dashboard to manage nodes, monitor system alerts, and handle user submissions.
- **Utility Tools**: Features a built-in URL shortener, object storage manager, and media downloader.

## 🏗️ Technology Stack

Our architecture is built for scale, monitoring, and security:

- **Frontend & Backend**: [Next.js](https://nextjs.org/) (App Router) with Tailwind CSS & Framer Motion.
- **Database**: PostgreSQL 18 (Managed via Prisma ORM)
- **Cache & Queue**: Redis 7
- **Logging & Monitoring**: ELK Stack (Elasticsearch, Logstash, Kibana) & Prometheus + Grafana
- **Deployment**: Docker Compose V2, Nginx, & Automated CI/CD (GitHub Actions)

---

## 🚀 CI/CD & Production Deployment

We use a fully automated, **Zero-Touch Deployment** pipeline powered by **GitHub Actions**.

### How it works:
1. Push your code to the `master` branch.
2. The GitHub Actions runner securely connects to the production VPS via SSH.
3. Code is synchronized instantly using `rsync` (excluding sensitive data like `.env`, `postgres_data`, `grafana_data`).
4. The deployment script triggers `docker compose up -d --build` to automatically rebuild the Next.js app and restart the containers gracefully.

### Manual Setup (If needed)
If you need to deploy manually on a fresh Ubuntu Server:

1. **Clone the repository**
   ```bash
   git clone https://github.com/masdikaaa/masdika.id.git
   cd masdika.id
   ```

2. **Configure `.env`**
   ```env
   # Database
   DATABASE_URL="postgresql://masdika:password@db:5432/masdika?schema=public"
   
   # Redis
   REDIS_PASSWORD="your-redis-password"
   
   # Elastic Stack
   ELASTIC_PASSWORD="your-elastic-password"
   KIBANA_PASSWORD="your-kibana-password"
   ```

3. **Deploy with Docker Compose V2**
   ```bash
   docker compose up -d --build
   ```

---

## 🔒 DevSecOps & Security

- **Strict Data Persistence**: Critical volumes (`postgres_data`, `redis_data`, `grafana_data`, `elasticsearch_data`) are isolated and protected from CI/CD wipes.
- **Non-Root Execution**: Application containers run as secure non-root users (`nextjs`) to prevent privilege escalation.
- **Rate Limiting & Anti-Spam**: Protection against abuse on public endpoints (e.g. community group submissions).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 

---
*Built with ❤️ by [Masdika](https://masdika.id).*
