<div align="center">
  <h1>🚀 Masdika.ID</h1>
  <p><strong>Platform Cloud Infrastructure, VPS Provider, dan Developer Hub Skala Enterprise</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-15.3-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Kubernetes-K3s-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white" alt="Kubernetes K3s" />
    <img src="https://img.shields.io/badge/GitOps-ArgoCD-F3702A?style=for-the-badge&logo=argo&logoColor=white" alt="ArgoCD" />
    <img src="https://img.shields.io/badge/DevSecOps-Trivy_%26_Semgrep-00599C?style=for-the-badge&logo=securityscorecard&logoColor=white" alt="DevSecOps" />
    <img src="https://img.shields.io/badge/PostgreSQL-18_Alpine-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 18" />
    <img src="https://img.shields.io/badge/Observability-Elastic_APM-005571?style=for-the-badge&logo=elastic&logoColor=white" alt="Elastic APM" />
    <img src="https://img.shields.io/badge/Monitoring-Prometheus_%26_Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white" alt="Monitoring" />
    <img src="https://img.shields.io/badge/Ingress-Traefik_v3-24A1C1?style=for-the-badge&logo=traefik&logoColor=white" alt="Traefik" />
  </p>
</div>

---

## 📖 Ringkasan Platform

**Masdika.ID** adalah platform web modern berperforma tinggi dan berstandar enterprise yang mengintegrasikan layanan **Cloud & VPS Hosting Provider** dengan ekosistem portofolio developer, blog rekayasa perangkat lunak, dan monitoring infrastruktur terdistribusi.

Platform ini mengadopsi prinsip **Modern GitOps (ArgoCD)** dan **Zero-Trust DevSecOps**, di mana seluruh status infrastruktur, konfigurasi jaringan, hingga deployment aplikasi dikelola secara deklaratif melalui Git (*Single Source of Truth*).

---

## 🏛️ Matriks Arsitektur & Spesifikasi Infrastruktur (Enterprise Standard)

Seluruh arsitektur sistem diklasifikasikan ke dalam 5 lapisan (*tier*) modular dengan konfigurasi keandalan tinggi dan isolasi keamanan Zero-Trust:

| Layer / Tier | Komponen & Service | Port & Routing | High Availability & Scaling | Proteksi Keamanan (DevSecOps) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **🌐 Layer 1: Edge & Ingress Gateway** | **Cloudflare Zero Trust**<br>• Daemon: `cloudflared`<br>• SSL Termination | `443` (HTTPS)<br>`wss` (WebSocket) | Anycast Global Edge Routing<br>SLA 100% Uptime | • L3/L4 DDoS Mitigation Otomatis<br>• Masking IP Asli Server<br>• Web Crypto WAF Rules | `Active` |
| | **Traefik v3 Ingress**<br>• Ingress Controller Native K3s<br>• Dynamic EndpointSlice | Host `80`, `443`<br>Entrypoint: `web`, `websecure` | Dynamic Re-routing tanpa restart<br>Active Health Probing | • **`masdika-headers`**: HSTS, CSP, Nosniff, X-Frame<br>• **`masdika-buffering`**: 10GB Upload Spooling<br>• **`masdika-ratelimit`**: Token Bucket 150 req/s (Burst 50) | `Active` |
| **⚡ Layer 2: Application Tier** | **masdika-app**<br>• Next.js 15 Standalone Web App<br>• Base: Node.js 22 Alpine | Internal `3000`<br>Path: `/` | • **HPA**: 1 – 5 Pods Dinamis (CPU 70%, RAM 80%)<br>• **PDB**: `minAvailable: 1`<br>• **preStop**: `sleep 5` (Zero Packet Drop) | • Non-Root User (`UID 1001`, `GID 1001`)<br>• SecurityContext: `drop: [ALL]`<br>• Seccomp: `RuntimeDefault`<br>• `automountServiceAccountToken: false` | `Active` |
| | **masdika-worker**<br>• BullMQ Queue & Billing Engine<br>• Background Worker | Internal Service<br>Health: `8080` | Strategy: `Recreate`<br>Memory Limit: 1 GiB | • Otomasi isolasi akun & penonaktifan invoice kedaluwarsa<br>• Polling metrik Proxmox VE terenkripsi | `Active` |
| | **masdika-vnc-proxy**<br>• Dedicated WebSocket Console Tunnel<br>• Node.js WS Reverse Proxy | Internal `3001`<br>Path: `/api/ws` | Strategy: `Recreate`<br>WebSocket Keep-Alive Ping | • Dedicated WSS tunneling ke Proxmox VE<br>• Token tiket otentikasi sesi one-time | `Active` |
| **🛡️ Layer 3: Zero-Trust Data Tier** | **PostgreSQL 18**<br>• Database Relasional Utama<br>• PVC: `masdika-db-pvc` (30 GB) | Internal `5432`<br>ClusterIP | Shared Buffers: 512 MB<br>Max Connections: 300<br>Effective Cache: 1.5 GB | • **NetworkPolicy: `masdika-db-isolation`**<br>  Hanya bisa diakses pod `app`, `worker`, `vnc-proxy`, `backup`<br>• Running User: UID `70` (postgres) | `Active` |
| | **Redis 7**<br>• In-Memory Cache & Key-Value<br>• PVC: `masdika-redis-pvc` (10 GB) | Internal `6379`<br>ClusterIP | In-Memory Engine<br>AOF Data Persistence | • **NetworkPolicy: `masdika-redis-isolation`**<br>  Port 6379 diblokir total dari luar pod resmi<br>• Password Authentication & Protected Mode | `Active` |
| | **Automated Disaster Recovery**<br>• CronJob: `masdika-postgres-backup`<br>• PVC: `masdika-backup-pvc` (15 GB) | Batch Task<br>Jadwal: `0 2 * * *` | Concurrency: `Forbid`<br>BackoffLimit: `3`<br>History: 3 Sukses, 5 Gagal | • Harian `pg_dump` terkompresi `gzip -9` (~180 KB)<br>• Auto-Pruning: Hapus otomatis backup > 7 hari<br>• Volume fisik terisolasi di disk server | `Active` |
| **📊 Layer 4: Observability & APM** | **Elastic APM Server**<br>• APM Intake Engine v8.11.0<br>• Agent: `elastic-apm-node` | Internal `8200`<br>Path: `/intake/v2` | Native ClusterIP Service<br>Distributed Trace Intake | • Streaming real-time distributed tracing (HTTP 202)<br>• Transaction profiling & database query timing | `Active` |
| | **Elasticsearch 8.11**<br>• Data Store Log & Trace<br>• PVC: `masdika-es-pvc` (25 GB) | Internal `9200`<br>ClusterIP | JVM Heap: 1 GB<br>Single-Node Optimized | • **NetworkPolicy: `masdika-es-isolation`**<br>  Hanya bisa diakses APM, Kibana, dan Logstash | `Active` |
| | **Prometheus & Grafana**<br>• Metrik K3s & Visualisasi Dashboard<br>• PVC: 10 GB + 5 GB | Host Ingress:<br>`grafana.masdika.id`<br>`prometheus.masdika.id` | Scrape interval: 15s<br>Metrics via Node Exporter | • Multi-Role Access Control (Admin / Viewer)<br>• Alert Manager & Hardware Health Dashboard | `Active` |
| **🚀 Layer 5: DevSecOps & GitOps** | **GitHub Actions**<br>• CI/CD Pipeline (`deploy.yml`)<br>• Runner: Ubuntu 24.04 | Webhook GitHub<br>Push ke `master` | 9 Tahapan Otomatis<br>Sequential & Parallel Gates | • **SAST**: Semgrep static code analysis<br>• **SCA**: Trivy filesystem & npm audit scanner<br>• **Container CVE**: Trivy Docker image scanner<br>• **Concurrency Lock**: Serialized GitOps manifest push | `Active` |
| | **ArgoCD GitOps Engine**<br>• Kontroler: `192.168.79.15`<br>• Target: `https://192.168.79.4:6443` | Web UI & gRPC<br>Path: `k8s/` | Auto-Sync (Prune enabled)<br>Self-Healing Controller | • Git sebagai *Single Source of Truth* mutlak<br>• Audit trail berbasis Git commit SHA tanpa drift | `Active` |

---

## ✨ Fitur-Fitur Utama

### 1. ☁️ Cloud & VPS Hosting Provider
* **Otomasi Provisioning VPS**: Integrasi langsung dengan API Proxmox VE untuk otomatisasi pembuatan VM, OS deployment, dan alokasi resource.
* **Console Server Real-Time**: Akses visual terminal langsung dari browser menggunakan dedicated WebSocket VNC Proxy (`/api/ws`).
* **Sistem Billing Otomatis**: Integrasi payment gateway Duitku, webhook verifikasi pembayaran otomatis, dan auto-suspension/activation via BullMQ background worker.
* **Monitoring Resource Live**: Visualisasi grafik realtime untuk penggunaan CPU, memori, bandwidth, dan disk I/O.

### 2. 🌐 Developer Hub & Technical Blog
* **Arsitektur Next.js 15 App Router**: Server-Side Rendering (SSR) dan Static Site Generation (SSG) dengan performa sub-second LCP.
* **Desain Adaptif & Paritas Tema**: Tampilan Dark & Light mode dengan keselarasan tipografi dan grid layout responsif pada artikel dan portofolio.
* **Manajemen Media Aman**: Buffer upload hingga 10 GB untuk ISO/media dengan proteksi Anti-SSRF dan validasi MIME-type ketat.

### 3. 🛡️ DevSecOps & Keamanan Siber
* **Static Application Security Testing (SAST)**: Scanning kode sumber otomatis via Semgrep pada setiap push.
* **Software Composition Analysis (SCA)**: Audit dependensi via `npm audit` dan Trivy fs scanner untuk mencegah kerentanan CVE pada supply chain.
* **Container Hardening**: Image Docker distroless/alpine, non-root user (UID `1001`), `drop: ALL capabilities`, dan profil seccomp `RuntimeDefault`.
* **Zero-Trust Network Policies**: Database PostgreSQL, Redis, dan Elasticsearch diisolasi secara total di layer K8s CNI sehingga hanya pod yang diizinkan yang dapat melakukan koneksi.

---

## 🗂️ Struktur Direktori Proyek

```text
masdika.id/
├── .github/
│   └── workflows/
│       └── deploy.yml             # Pipeline CI/CD DevSecOps & GitOps Auto-Deploy
├── apps/
│   └── web/                      # Kode sumber utama Next.js 15 (Web & API)
│       ├── src/
│       │   ├── app/              # App Router (Public, Dashboard, Admin, API)
│       │   ├── components/       # UI Components & Atomic Design
│       │   └── lib/              # Database Prisma, Auth, Redis, & Utility
│       ├── worker.js             # Background worker queue & auto billing
│       └── vnc-proxy.js          # Dedicated WebSocket Proxy untuk VNC Console
├── k8s/                          # Manifest Deklaratif Kubernetes (ArgoCD Single Source of Truth)
│   ├── app/
│   │   ├── deployment.yaml       # Deployment masdika-app, worker, & vnc-proxy (preStop 5s)
│   │   ├── hpa.yaml              # Horizontal Pod Autoscaler (1-5 pod dinamis)
│   │   ├── ingress.yaml          # Traefik Ingress, Rate Limiting, & Buffering Middleware
│   │   ├── pdb.yaml              # PodDisruptionBudget (Zero-downtime cluster maintenance)
│   │   ├── pvc.yaml              # Persistent Storage Volume Claims
│   │   └── service.yaml          # K8s Internal Services & ClusterIP
│   ├── base/
│   │   ├── namespace.yaml        # Namespace 'masdika'
│   │   └── configmap.yaml        # Konfigurasi environment terpusat
│   ├── databases/
│   │   ├── postgres.yaml         # PostgreSQL 18 Engine & Performance Tuned Config
│   │   ├── redis.yaml            # Redis 7 In-Memory Cache & Key-Value Store
│   │   ├── elasticsearch.yaml    # Elasticsearch 8.11 Data Node
│   │   └── backup-cronjob.yaml   # Disaster Recovery Backup Otomatis (Daily pg_dump + gzip)
│   ├── monitoring/
│   │   ├── apm.yaml              # Elastic APM Server (Distributed Tracing)
│   │   ├── prometheus.yaml       # Prometheus Server & Metrics Scraper
│   │   ├── grafana.yaml          # Grafana Dashboard & Visualisasi
│   │   ├── kibana.yaml           # Kibana Observability UI
│   │   └── loki.yaml             # Grafana Loki Log Aggregator
│   └── security/
│       └── networkpolicy.yaml    # Zero-Trust Network Isolation Policies
├── Dockerfile                    # Multi-stage production container build
├── package.json                  # Workspace dependensi monorepo
└── README.md                     # Dokumentasi teknis sistem
```

---

## 🚀 Pipeline CI/CD & GitOps Workflow

Pipeline di [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) mengeksekusi 9 tahapan otomatis tanpa intervensi manual:

```text
[Push to master]
       │
       ├──► 1. Code Quality & Linting (ESLint, TypeCheck)
       ├──► 2. SCA - Dependency Audit (npm audit)
       ├──► 3. Unit & Integration Testing
       ├──► 4. SAST - Security Scanner (Semgrep Static Analysis)
       ├──► 5. IaC & Manifest Security Scan (Trivy Config)
       │
       ▼ (Setelah seluruh gate keamanan lolos)
       6. Multi-Stage Docker Build & Push ke Docker Hub
       │
       ▼
       7. Container Vulnerability Scan (Trivy CVE Severity Check)
       │
       ▼
       8. GitOps Manifest Update (Concurrency-Locked Atomic Update Image Tag)
       │
       ▼
[ArgoCD Sync] ──► Rollout Pods di K3s Cluster secara Zero-Downtime
       │
       ▼
       9. Post-Deploy Health Gate (Verifikasi HTTP Status & Endpoint Health)
```

---

## 🛡️ Disaster Recovery (Automated Backup)

Database PostgreSQL dilengkapi dengan automated disaster recovery cronjob di [`k8s/databases/backup-cronjob.yaml`](k8s/databases/backup-cronjob.yaml):

* **Jadwal Eksekusi**: Setiap hari pukul `02:00 UTC` (09:00 WIB).
* **Mekanisme**: Menjalankan `pg_dump` dengan kompresi tingkat tinggi `gzip -9` secara konsisten tanpa mengunci tabel (*non-blocking*).
* **Penyimpanan**: Disimpan di volume terisolasi `masdika-backup-pvc` (15 GB).
* **Siklus Retensi**: Otomatis membersihkan (*auto-prune*) backup yang lebih lama dari 7 hari untuk efisiensi disk.
* **Lokasi Fisik di Node**:
  ```bash
  /var/lib/rancher/k3s/storage/pvc-*_masdika_masdika-backup-pvc/
  ```

---

## 💻 Panduan Pengembangan Lokal (Local Development)

Untuk menjalankan dan mengembangkan aplikasi di lingkungan lokal:

### 1. Prasyarat
* **Node.js**: Versi `22.x` (LTS) atau lebih baru
* **Database**: PostgreSQL 18 & Redis 7 (dapat dijalankan via Docker lokal atau WSL)

### 2. Langkah Setup
```bash
# 1. Clone repositori
git clone https://github.com/masdikaaa/masdika.id.git
cd masdika

# 2. Salin environment template dan sesuaikan isinya
cp .env.example .env

# 3. Install seluruh dependensi monorepo
npm install

# 4. Generate Prisma Client & sinkronisasi skema database
npx prisma generate --schema=apps/web/prisma/schema.prisma

# 5. Jalankan development server Next.js (port 3000)
npm run dev

# 6. (Opsional) Jalankan background worker di terminal terpisah
npm run worker
```

Aplikasi web dapat diakses langsung melalui peramban di `http://localhost:3000`.

---

## 🐳 Panduan Deployment dengan Docker Compose (Standalone Server)

Mode deployment ini cocok untuk server VPS mandiri (*single-node*) tanpa klaster Kubernetes, atau untuk pengujian integrasi staging secara cepat.

### 1. Prasyarat Sistem
* **OS**: Ubuntu 22.04 / 24.04 LTS atau Debian 12
* **Docker Engine**: Versi 24.x ke atas & Docker Compose V2 (`docker compose version`)
* **Spesifikasi Minimum**: 4 GB RAM, 2 vCPU

### 2. Langkah Deployment
```bash
# 1. Clone repositori ke server
git clone https://github.com/masdikaaa/masdika.id.git
cd masdika

# 2. Siapkan file konfigurasi environment .env
cp .env.example .env
nano .env  # Lengkapi kredensial DATABASE_URL, REDIS_PASSWORD, SESSION_SECRET, dsb.

# 3. Build image dan jalankan seluruh container di background
docker compose up -d --build

# 4. Verifikasi status dan healthcheck container
docker compose ps

# 5. Jalankan migrasi skema database Prisma (jika database baru)
docker compose exec app npx prisma migrate deploy --schema=apps/web/prisma/schema.prisma
```

### 3. Manajemen Layanan Docker
```bash
# Melihat log realtime seluruh service
docker compose logs -f --tail=100

# Melihat log khusus web app
docker compose logs -f app

# Melakukan restart layanan tanpa menghapus data volume
docker compose restart app worker

# Menghentikan seluruh container dengan aman
docker compose down
```

---

## ☸️ Panduan Deployment dengan Kubernetes (K3s Production)

Platform ini dirancang secara natif untuk berjalan di atas Kubernetes K3s dengan dukungan penuh **GitOps (ArgoCD)**, **Traefik Ingress Controller**, **Zero-Trust NetworkPolicies**, dan **Zero-Packet-Drop Rolling Updates**.

### 🌟 Metode 1: Otomatis via GitOps ArgoCD (Rekomendasi Resmi Produksi)
Dalam arsitektur resmi produksi, Anda **tidak perlu menjalankan `kubectl apply` manual** saat melakukan rilis baru:
1. Developer melakukan `push` atau merge ke branch `master`.
2. Pipeline GitHub Actions (`deploy.yml`) otomatis menjalankan SAST, SCA, Trivy Container CVE Scan, dan memperbarui tag image pada manifest [`k8s/app/deployment.yaml`](k8s/app/deployment.yaml).
3. **ArgoCD Controller** di `192.168.79.15` secara otomatis mendeteksi perubahan Git dan melakukan rekonsiliasi (*Self-Healing & Auto-Sync*) ke klaster K3s tanpa downtime.
4. Jika ingin memicu sinkronisasi instan via CLI:
   ```bash
   argocd app sync masdika-app
   ```

---

### 🛠️ Metode 2: Deployment Manual via Manifest Deklaratif (`kubectl`)
Jika Anda menyiapkan klaster Kubernetes baru dari nol tanpa kontroler ArgoCD:

#### 1. Buat Namespace & Base Configuration
```bash
# Terapkan namespace masdika
kubectl apply -f k8s/base/namespace.yaml

# Terapkan ConfigMap global
kubectl apply -f k8s/base/configmap.yaml
```

#### 2. Buat Kubernetes Secret Kredensial
Buat Secret `masdika-credentials` yang menampung seluruh variabel sensitif:
```bash
kubectl create secret generic masdika-credentials \
  --namespace=masdika \
  --from-literal=DATABASE_URL="postgresql://masdika:Andikaferdi11@masdika-db:5432/masdika?schema=public" \
  --from-literal=REDIS_URL="redis://:Andikaferdi11@masdika-redis:6379" \
  --from-literal=POSTGRES_USER="masdika" \
  --from-literal=POSTGRES_PASSWORD="Andikaferdi11" \
  --from-literal=POSTGRES_DB="masdika" \
  --from-literal=REDIS_PASSWORD="Andikaferdi11" \
  --from-literal=SESSION_SECRET="kunci-rahasia-sesi-minimal-32-karakter" \
  --from-literal=CRON_SECRET="kunci-rahasia-cron-api" \
  --from-literal=ELASTIC_PASSWORD="Andikaferdi11" \
  --from-literal=GRAFANA_ADMIN_PASSWORD="Andikaferdi11" \
  --from-literal=KIBANA_PASSWORD="Andikaferdi11"
```

#### 3. Terapkan Database, Cache & Storage PVC
```bash
kubectl apply -f k8s/databases/
```
*Manifest ini akan mendirikan PostgreSQL 18, Redis 7, Elasticsearch, serta CronJob backup otomatis.*

#### 4. Terapkan Zero-Trust Network Policies
```bash
kubectl apply -f k8s/security/
```
*Mengaktifkan firewall CNI yang memblokir akses ke database dari luar pod resmi.*

#### 5. Terapkan Monitoring & APM Stack
```bash
kubectl apply -f k8s/monitoring/
```
*Mendeploy Elastic APM Server, Prometheus, Grafana, Kibana, dan Loki.*

#### 6. Terapkan Aplikasi Web, Worker, VNC Proxy & Ingress
```bash
kubectl apply -f k8s/app/
```
*Mendeploy `masdika-app` (didukung HPA 1-5 pod & preStop connection draining), `masdika-worker`, `masdika-vnc-proxy`, dan Traefik Ingress dengan middleware Rate Limiter & Security Headers.*

#### 7. Verifikasi Status Rollout
```bash
kubectl get pods -n masdika -o wide
kubectl get ingress,middleware,cronjob -n masdika
```

---

## 🛠️ Cheatsheet Operasional Kubernetes (K3s)

Berikut perintah penting untuk pemeliharaan dan inspeksi cluster via SSH di node server (`192.168.79.4`):

### 1. Status Pod & Ingress
```bash
# Cek semua pod dan node placement di namespace masdika
kubectl get pods -n masdika -o wide

# Pantau status Ingress dan Traefik Middleware (Headers, Buffering, Rate Limit)
kubectl get ingress,middleware -n masdika

# Pantau Horizontal Pod Autoscaler (HPA)
kubectl get hpa -n masdika
```

### 2. Observability & Log APM
```bash
# Pantau log Elastic APM Server (pastikan intake event HTTP 202)
kubectl logs -n masdika deployment/masdika-apm-server --tail 50 -f

# Pantau log aplikasi utama (Next.js)
kubectl logs -n masdika deployment/masdika-app -c app --tail 100 -f

# Pantau log background worker
kubectl logs -n masdika deployment/masdika-worker --tail 100 -f
```

### 3. Manajemen Backup Database
```bash
# Lihat file backup yang sudah tersedia di storage
sudo ls -lh /var/lib/rancher/k3s/storage/*masdika-backup-pvc/

# Memicu backup database secara instan/manual di luar jadwal
kubectl create job --from=cronjob/masdika-postgres-backup manual-backup-$(date +%s) -n masdika

# Download file backup dari server ke komputer lokal via SCP
scp andika@192.168.79.4:/var/lib/rancher/k3s/storage/*masdika-backup-pvc/masdika_db_*.sql.gz ./
```

### 4. Rolling Restart Aplikasi (Zero-Downtime)
```bash
# Restart pod Next.js dengan aman (didukung preStop 5s graceful shutdown)
kubectl rollout restart deployment masdika-app -n masdika
kubectl rollout status deployment masdika-app -n masdika
```

---

## 🔒 Konfigurasi Environment & Secrets

Environment variables sensitif dikelola melalui Kubernetes Secret `masdika-credentials`:

| Key Secret | Deskripsi |
| :--- | :--- |
| `DATABASE_URL` | URL koneksi internal ke PostgreSQL (`postgresql://masdika:...@masdika-db:5432/masdika`) |
| `REDIS_URL` | URL koneksi internal ke Redis (`redis://:...@masdika-redis:6379`) |
| `POSTGRES_USER` | Username superuser database PostgreSQL |
| `POSTGRES_PASSWORD` | Password otentikasi database PostgreSQL |
| `POSTGRES_DB` | Nama default database (`masdika`) |
| `SESSION_SECRET` | Kunci enkripsi token sesi pengguna |
| `CRON_SECRET` | Token verifikasi API endpoint cron internal |
| `ELASTIC_PASSWORD` | Password otentikasi Elasticsearch & APM Server |

---

## 👨‍💻 Kontribusi & Hak Cipta

Repositori ini dikelola dan dipelihara secara aktif oleh **[Masdika](https://masdika.id)**.  
Lisensi dan kepemilikan kode tunduk pada kebijakan privasi dan hak cipta resmi Masdika.ID.
