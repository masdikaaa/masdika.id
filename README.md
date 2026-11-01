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

## 🏛️ Arsitektur Infrastruktur (Enterprise Standard)

```mermaid
flowchart TD
    subgraph Edge ["Internet & Edge Layer"]
        User(["Client / Public Traffic"]) --> CF["Cloudflare Zero Trust / Tunnel"]
        CF --> Traefik["Traefik v3 Ingress Controller"]
        Traefik --> MW_H["Middleware: masdika-headers\n(HSTS, CSP, Nosniff, X-Frame)"]
        Traefik --> MW_B["Middleware: masdika-buffering\n(10GB ISO / Media Upload Buffer)"]
        Traefik --> MW_R["Middleware: masdika-ratelimit\n(Token Bucket 150/s, Burst 50)"]
    end

    subgraph AppTier ["Application Tier (Kubernetes Namespace: masdika)"]
        MW_R --> App["masdika-app (Next.js 15 Standalone)\n(preStop: 5s, HPA 1-5, PDB min=1, non-root 1001)"]
        MW_R --> VNC["masdika-vnc-proxy (WebSocket VNC Node.js)"]
        Worker["masdika-worker (Queue & Auto Billing Engine)"]
    end

    subgraph ZeroTrustNetwork ["Data Tier (Isolated by Zero-Trust NetworkPolicy)"]
        App --> DB[("PostgreSQL 18 Alpine\n(Port 5432 - PVC 30GB)")]
        Worker --> DB
        App --> Redis[("Redis 7 In-Memory Cache\n(Port 6379 - PVC 10GB)")]
        Worker --> Redis
        CronBackup["CronJob: masdika-postgres-backup\n(Jadwal: 02:00 UTC | gzip -9 | 7d Pruning)"] -.->|Authorized 5432| DB
        CronBackup --> BackupStorage[("masdika-backup-pvc\n(15GB Backup Storage)")]
    end

    subgraph ObservabilityTier ["Full-Stack Observability Tier"]
        App -.->|APM Node Tracer HTTP 202| APMServer["masdika-apm-server"]
        APMServer --> Elastic[("Elasticsearch 8.11")]
        Elastic --> Kibana["Kibana Dashboard"]
        NodeExporter["Node Exporter"] --> Prom["Prometheus"] --> Grafana["Grafana Dashboard"]
        AppLogs["Container Stdout"] --> Loki["Grafana Loki"]
    end

    subgraph GitOpsCI ["DevSecOps & GitOps Workflow"]
        Developer(["Developer Push master"]) --> GHA["GitHub Actions CI/CD"]
        GHA --> SAST["SAST (Semgrep) & SCA (Trivy Scan)"]
        GHA --> Docker["Build Multi-Stage Image & Trivy Container Scan"]
        GHA --> PushTag["Update Image Tag di k8s/app/deployment.yaml"]
        PushTag --> ArgoCD["ArgoCD Controller (192.168.79.15)"]
        ArgoCD -->|Auto Sync & Reconcile| AppTier
    end
```

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
