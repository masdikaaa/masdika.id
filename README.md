<div align="center">
  <h1>🚀 Masdika.ID</h1>
  <p><strong>Platform Manajemen Cloud, VPS & Portofolio Developer Modern</strong></p>
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-18-blue?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Swarm-blue?logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/Kubernetes-K3s-326CE5?logo=kubernetes" alt="Kubernetes K3s" />
  <img src="https://img.shields.io/badge/Ingress-Traefik-24A1C1?logo=traefik" alt="Traefik" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=github-actions" alt="CI/CD" />
</div>

<br>

Selamat datang di repositori resmi **Masdika.ID**. Proyek ini adalah aplikasi web modern berperforma tinggi yang dibangun menggunakan Next.js (App Router), Prisma, dan PostgreSQL. Platform ini berfungsi sebagai layanan **Cloud Hosting & VPS Provider**, yang terintegrasi langsung dengan portofolio pribadi, blog teknis, dan pusat komunitas developer.

---

## ✨ Fitur Utama

### 💻 Provider Cloud & VPS (Bisnis Utama)
- **Otomasi Provisioning VPS**: Pembuatan dan deployment instance Virtual Private Server (VPS) secara otomatis via Proxmox API.
- **Area Klien & Sistem Billing**: Integrasi payment gateway (Duitku), manajemen invoice otomatis, saldo akun, dan dasbor klien yang aman.
- **Monitoring Sumber Daya Real-Time**: Pelacakan penggunaan CPU, RAM, dan Disk VPS secara live menggunakan integrasi Prometheus & Grafana.
- **Sistem Tiket Bantuan (Support Ticket)**: Manajemen tiket bantuan pelanggan langsung dari dashboard.

### 🌐 Hub Developer & Portofolio
- **Portofolio Personal & Resume**: Menampilkan proyek, keterampilan, sertifikasi, dan riwayat pengalaman dengan antarmuka yang modern, cepat, dan responsif.
- **Blog Teknis & Artikel Seri**: Sistem blog lengkap untuk membagikan wawasan seputar infrastruktur cloud, DevOps, dan Linux.
- **Otomasi K3s / Kubernetes**: Pembuatan dan pelacakan log instalasi cluster K3s secara otomatis pada instance VPS klien.
- **Komunitas Developer**: Direktori grup WhatsApp IT & developer dengan proteksi Anti-Spam dan Anti-SSRF.

### 🛠️ Panel Kontrol Admin
- **Manajemen Infrastruktur**: Dasbor terpusat untuk mengelola node server, memantau alert sistem, audit resource, dan mengelola pengguna.
- **Alat Utilitas**: Dilengkapi fitur URL shortener, File CDN / secure media manager, dan media review.

---

## 🏗️ Teknologi yang Digunakan (Tech Stack)

Arsitektur aplikasi dirancang untuk skalabilitas, keamanan, dan pemantauan menyeluruh:

- **Frontend & Backend**: [Next.js](https://nextjs.org/) (App Router) dengan Tailwind CSS & Framer Motion.
- **Database**: PostgreSQL 18 (Dikelola menggunakan Prisma ORM).
- **Cache & Antrean (Queue)**: Redis 7.
- **Logging & Monitoring**: ELK Stack (Elasticsearch, Logstash, Kibana) & Prometheus + Grafana.
- **Deployment**: Docker Compose V2, K3s (Kubernetes), Traefik Ingress Controller, Nginx, & GitHub Actions (CI/CD).

---

## 🚀 CI/CD & Deployment Produksi (Docker Compose)

Platform ini mendukung alur **Zero-Touch Deployment** otomatis menggunakan **GitHub Actions**:

1. Lakukan `push` kode ke branch `master`.
2. GitHub Actions runner terhubung secara aman ke server VPS melalui SSH.
3. Sinkronisasi kode berjalan otomatis via `rsync` (mengabaikan data sensitif seperti `.env`, `postgres_data`, dsb).
4. Skrip otomatis memicu `docker compose up -d --build` untuk memperbarui aplikasi tanpa memutus layanan.

### Panduan Setup Manual (Docker Compose)
Jika Anda ingin menjalankan secara manual di server Ubuntu/Debian:

1. **Clone repositori**
   ```bash
   git clone https://github.com/masdikaaa/masdika.id.git
   cd masdika
   ```

2. **Konfigurasi file `.env`**
   Salin atau buat file `.env` di root folder dengan variabel koneksi:
   ```env
   # Database
   DATABASE_URL="postgresql://masdika:password@db:5432/masdika?schema=public"
   
   # Redis
   REDIS_PASSWORD="password-redis-anda"
   
   # Kredensial Keamanan
   SESSION_SECRET="kunci-rahasia-sesi-anda"
   CRON_SECRET="kunci-rahasia-cron-anda"
   ```

3. **Jalankan dengan Docker Compose**
   ```bash
   docker compose up -d --build
   ```

---

## ☸️ Panduan Deployment Kubernetes (K3s)

Aplikasi ini sudah dilengkapi dengan manifest siap pakai di file [`k3s-masdika.yaml`](k3s-masdika.yaml). Konfigurasi ini mendukung **Traefik Ingress Bawaan K3s**, **Penyimpanan Persisten (200 GB)**, **InitContainers Anti-Crash**, dan **Horizontal Pod Autoscaler (HPA)**.

### 1. Prasyarat
- Server VPS dengan **K3s** yang sudah aktif (Traefik Ingress bawaan K3s aktif).
- File konfigurasi `.env` production yang berada di direktori project.

### 2. Langkah Deployment

#### Langkah A: Buat Namespace & Import `.env` ke Secret Kubernetes
Anda **tidak perlu** menyalin variabel satu per satu ke dalam YAML. Cukup import otomatis file `.env` ke dalam Secret Kubernetes:
```bash
# 1. Buat namespace masdika
sudo kubectl create namespace masdika

# 2. Masukkan seluruh konfigurasi .env ke secret masdika-env
sudo kubectl create secret generic masdika-env --from-env-file=.env -n masdika
```

#### Langkah B: Jalankan Manifest All-in-One
Eksekusi manifest Kubernetes:
```bash
sudo kubectl apply -f k3s-masdika.yaml
```

Semua service (PostgreSQL 18, Redis 7, Next.js Web App, Background Worker, VNC Proxy, dan Traefik Ingress) akan berjalan secara teratur dan terlindungi dari *race-condition* saat database booting.

#### Langkah C: Hubungkan ke Cloudflare Tunnel (`cloudflared`)
Karena Traefik bawaan K3s otomatis mendengarkan port `80` di host server:
1. Masuk ke **Cloudflare Zero Trust Dashboard** > **Networks** > **Tunnels** > Pilih Tunnel Anda.
2. Tambahkan **Public Hostname**:
   - **Type**: `HTTP`
   - **URL**: `localhost:80` (atau `127.0.0.1:80`)
3. Buka tab **Additional application settings** > **HTTP Settings** > Aktifkan toggle **WebSockets** ke posisi `ON` (wajib aktif untuk VNC console dan chat).
4. Klik **Save hostname**.

---

### 🔍 Perintah Berguna untuk Monitoring K3s

```bash
# Pantau status seluruh pod yang sedang berjalan
sudo kubectl get pods -n masdika -w

# Pantau status Auto-Scaling HPA (skala pod otomatis 1-5 pod berdasarkan beban CPU/RAM)
sudo kubectl get hpa -n masdika -w

# Cek pemakaian CPU & RAM riil per pod
sudo kubectl top pods -n masdika

# Lihat live logs aplikasi web
sudo kubectl logs -n masdika -l app=masdika-app -f

# Lakukan restart aplikasi web tanpa downtime (Rolling Restart)
sudo kubectl rollout restart deployment masdika-app -n masdika
```

---

## 🔒 Keamanan & DevSecOps

- **Persistensi Data Mutlak**: Seluruh volume database (`postgres_data`), cache (`redis_data`), dan penyimpanan web (`uploads`, `secure-media`, `tickets`, `ssh`) dipisahkan ke Persistent Volume khusus sehingga aman dari risiko terhapus saat update.
- **Eksekusi Non-Root**: Seluruh container aplikasi berjalan menggunakan user non-root (`nextjs`, GID: `1001`) demi mencegah eskalasi hak akses sistem.
- **Rate Limiting & Anti-Spam**: Proteksi otomatis terhadap serangan brute-force dan spam pada endpoint publik.

---

## 🤝 Kontribusi

Kontribusi, laporan bug, dan saran fitur sangat kami hargai! Silakan buat *issue* atau kirimkan *pull request*.

---
*Dikembangkan dengan ❤️ oleh [Masdika](https://masdika.id).*
