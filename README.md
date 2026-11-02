<div align="center">
  <h1>🚀 Masdika.ID</h1>
  <p><strong>Platform Cloud Infrastructure, VPS Provider, dan Developer Hub Skala Enterprise</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Kubernetes-K3s-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white" alt="Kubernetes K3s" />
    <img src="https://img.shields.io/badge/GitOps-ArgoCD-F3702A?style=for-the-badge&logo=argo&logoColor=white" alt="ArgoCD" />
    <img src="https://img.shields.io/badge/DevSecOps-Trivy_%26_Semgrep-00599C?style=for-the-badge&logo=securityscorecard&logoColor=white" alt="DevSecOps" />
    <img src="https://img.shields.io/badge/PostgreSQL-18_Alpine-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 18" />
    <img src="https://img.shields.io/badge/Object_Storage-RustFS_S3-E95420?style=for-the-badge&logo=amazons3&logoColor=white" alt="RustFS S3" />
    <img src="https://img.shields.io/badge/Testing-Vitest_39_Tests-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest Testing" />
    <img src="https://img.shields.io/badge/SRE-SLO_99.9%25_%26_Error_Budget-4CAF50?style=for-the-badge&logo=googlecloud&logoColor=white" alt="Google SRE" />
    <img src="https://img.shields.io/badge/Resilience-Circuit_Breaker-FFB300?style=for-the-badge&logo=circuitverse&logoColor=white" alt="Circuit Breaker" />
    <img src="https://img.shields.io/badge/Chaos-Chaos_Monkey_Drills-8E24AA?style=for-the-badge&logo=linux&logoColor=white" alt="Chaos Engineering" />
    <img src="https://img.shields.io/badge/Monitoring-Prometheus_%26_Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white" alt="Monitoring" />
    <img src="https://img.shields.io/badge/Access-Private%20%2F%20Proprietary-e11d48?style=for-the-badge&logo=lock&logoColor=white" alt="Private Repo" />
  </p>
</div>

---

## 📖 Ringkasan Platform

**Masdika.ID** adalah platform web modern berperforma tinggi dan berstandar enterprise yang mengintegrasikan layanan **Cloud & VPS Hosting Provider** dengan ekosistem portofolio developer, blog rekayasa perangkat lunak, dan monitoring infrastruktur terdistribusi.

Platform ini mengadopsi prinsip **Tier-1 Tech Engineering (Gojek / Google SRE / Netflix Standard)**:
* **GitOps Deklaratif (ArgoCD)**: Seluruh status infrastruktur, konfigurasi jaringan, hingga deployment aplikasi dikelola secara deklaratif melalui Git (*Single Source of Truth*).
* **Automated CI/CD DevSecOps**: 9 tahapan pipeline otomatis meliputi SAST (Semgrep), SCA (Trivy), container vulnerability scanning, dan automated unit tests (Vitest).
* **High Availability & Autoscaling**: Horizontal Pod Autoscaler (HPA 1-5 pod dinamis) dan PodDisruptionBudget (PDB).
* **Resilience & Circuit Breaker**: Proteksi kaskade kegagalan database dan fallback degradasi anggun (*graceful degradation*).
* **Enterprise SRE SLI/SLO Cockpit**: Pengukuran kuantitatif ketersediaan *Three-Nines* (99.9%), *Monthly Error Budget*, dan *Release Gate Policy* di Grafana.
* **Chaos Engineering**: Robot Chaos Monkey otomatis untuk menguji ketahanan bencana dan membuktikan *self-healing* tanpa downtime.
* **Military-Grade Disaster Recovery**: Dump database otomatis terenkripsi GPG AES-256 yang disinkronkan offsite ke RustFS Cloud Storage S3 dengan siklus retensi 14 hari.

---

## 🏛️ Matriks Arsitektur & Spesifikasi Infrastruktur (Enterprise Standard)

Seluruh arsitektur sistem diklasifikasikan ke dalam 5 lapisan (*tier*) modular dengan konfigurasi keandalan tinggi dan isolasi keamanan Zero-Trust:

| Layer / Tier | Komponen & Service | Port & Routing | High Availability & Resilience | Proteksi Keamanan (DevSecOps / SRE) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **🌐 Layer 1: Edge & Ingress Gateway** | **Cloudflare Zero Trust**<br>• Daemon: `cloudflared`<br>• SSL Termination | `443` (HTTPS)<br>`wss` (WebSocket) | Anycast Global Edge Routing<br>SLA 100% Uptime | • L3/L4 DDoS Mitigation Otomatis<br>• Masking IP Asli Server<br>• Web Crypto WAF Rules | `Active` |
| | **Traefik v3 Ingress**<br>• Ingress Controller Native K3s<br>• Dynamic EndpointSlice | Host `80`, `443`<br>Entrypoint: `web`, `websecure` | Dynamic Re-routing tanpa restart<br>Active Health Probing | • **`masdika-headers`**: HSTS, CSP, Nosniff, X-Frame<br>• **`masdika-buffering`**: 10GB Upload Spooling<br>• **`masdika-ratelimit`**: Token Bucket 150 req/s (Burst 50) | `Active` |
| **⚡ Layer 2: Application Tier** | **masdika-app**<br>• Next.js 16 Standalone Web App<br>• Base: Node.js 22 Alpine | Internal `3000`<br>Path: `/` | • **HPA**: 1 – 5 Pods Dinamis (Target CPU 75%, RAM 80%)<br>• **PDB**: `minAvailable: 1`<br>• **preStop**: `sleep 5` (Zero Packet Drop) | • Non-Root User (`UID 1001`, `GID 1001`)<br>• SecurityContext: `drop: [ALL]`<br>• Seccomp: `RuntimeDefault`<br>• `automountServiceAccountToken: false` | `Active` |
| | **Circuit Breaker Engine**<br>• Martin Fowler State Machine<br>• Prisma Query Wrapper | In-Process<br>Telemetry: `/api/metrics` | • **State**: `CLOSED`, `OPEN`, `HALF_OPEN`<br>• Timeout: 4.000ms<br>• Trip Threshold: 50% Failures<br>• Reset Window: 10.000ms | • **Graceful Degradation**: Mencegah *cascading failure* saat DB lambat<br>• Menyajikan respons fallback instan agar web tidak hang<br>• Export metrik real-time ke Prometheus | `Active` |
| | **masdika-worker**<br>• BullMQ Queue & Billing Engine<br>• Background Worker | Internal Service<br>Health: `8080` | Strategy: `Recreate`<br>Memory Limit: 1 GiB | • Otomasi isolasi akun & penonaktifan invoice kedaluwarsa<br>• Polling metrik Proxmox VE terenkripsi | `Active` |
| | **masdika-vnc-proxy**<br>• Dedicated WebSocket Console Tunnel<br>• Node.js WS Reverse Proxy | Internal `3001`<br>Path: `/api/ws` | Strategy: `Recreate`<br>WebSocket Keep-Alive Ping | • Dedicated WSS tunneling ke Proxmox VE<br>• Token tiket otentikasi sesi one-time | `Active` |
| **🛡️ Layer 3: Zero-Trust Data Tier** | **PostgreSQL 18**<br>• Database Relasional Utama<br>• PVC: `masdika-db-pvc` (30 GB) | Internal `5432`<br>ClusterIP | Shared Buffers: 512 MB<br>Max Connections: 300<br>Effective Cache: 1.5 GB | • **NetworkPolicy: `masdika-db-isolation`**<br>  Hanya bisa diakses pod `app`, `worker`, `vnc-proxy`, `backup`<br>• Running User: UID `70` (postgres) | `Active` |
| | **Redis 7**<br>• In-Memory Cache & Key-Value<br>• PVC: `masdika-redis-pvc` (10 GB) | Internal `6379`<br>ClusterIP | In-Memory Engine<br>AOF Data Persistence | • **NetworkPolicy: `masdika-redis-isolation`**<br>  Port 6379 diblokir total dari luar pod resmi<br>• Password Authentication & Protected Mode | `Active` |
| | **RustFS Cloud Object Storage**<br>• S3 Compatible Bucket Storage<br>• Endpoint: `192.168.79.10:9000` | Port `9000`<br>S3 REST API | Distributed Bucket Engine<br>• `masdika-database` (Backup DB)<br>• `masdika-media` (Upload User)<br>• `masdika-cdn` (Static Assets)<br>• `masdika-ticket` (Attachments) | • Access Key & Secret Key terenkripsi<br>• Isolasi data offsite independen dari host K3s | `Active` |
| | **Automated Disaster Recovery (DR)**<br>• CronJob: `masdika-postgres-backup`<br>• PVC: `masdika-backup-pvc` (15 GB) | Batch Task<br>Jadwal: `0 2 * * *`<br>(09:00 WIB) | Concurrency: `Forbid`<br>BackoffLimit: `3`<br>Multi-tier Cloud Sync | • **GPG Enkripsi Simetris AES-256** (`.sql.gz.gpg`)<br>• Sinkronisasi otomatis ke RustFS S3 `masdika-database`<br>• **Retensi 14 Hari**: Auto-pruning lokal PVC & offsite RustFS | `Active` |
| **📊 Layer 4: SRE Observability & SOC** | **Enterprise SRE Cockpit**<br>• Dashboard: `masdika-sre-cockpit`<br>• Standar Google SRE / Gojek | Host Ingress:<br>`grafana.masdika.id`<br>Port `3001` | Multiwindow Multi-burn-rate Alerting<br>Auto Health Gating | • **SLO Ketersediaan 99.9% (Three-Nines)**<br>• **Monthly Error Budget Tracking** (Toleransi max 43.2 min/bulan)<br>• **1h Error Budget Burn Rate**<br>• **SRE Release Gate Policy**: `PERMITTED` vs `CODE FREEZE`<br>• **Latency SLI**: % request < 300ms (Target: 95%) | `Active` |
| | **Security Operations Center (SOC)**<br>• Dashboard: `masdika-soc-cockpit`<br>• Threat Cockpit & Audit Stream | Grafana Panel<br>Data Source: Loki & Promtail | Audit Host Real-Time<br>Web Threat Profiling | • Audit Host `/var/log/auth.log`: Deteksi SSH Brute-Force, Login Ilegal, & Sudo Elevation (Whitelisted user: `andika`)<br>• Live Request & Threat Audit Stream (Auto-filter cron noise)<br>• Alerting deteksi probe/scanner bot HTTP 401/403/404 | `Active` |
| | **Elastic Observability Suite (Gojek & Tokopedia Standard)**<br>• Kibana Observability Suite (`kibana.masdika.id`)<br>• Elastic APM, Filebeat, Metricbeat, Heartbeat | Ingress `kibana.masdika.id`<br>Port `5601`<br>ClusterIP Services | Full-Stack Enterprise Observability<br>• Logs rate & explorer<br>• Host inventory & metrics<br>• APM waterfall traces<br>• Synthetic uptime & SSL check | • **ECS Log Streaming (`logs-masdika.app-default`)**: Log JSON terstruktur terpetakan ke Elastic Common Schema dengan korelasi `trace.id` & `transaction.id`<br>• **Cluster Log Harvester (`filebeat-8.15.0`)**: DaemonSet menyerap seluruh stdout/stderr container pod Kubernetes<br>• **Host & K8s Metrics (`metricbeat-8.15.0`)**: DaemonSet memantau CPU %, Memory %, Load 15, dan Network TX/RX node fisik Masdika<br>• **Synthetics & SSL Monitor (`heartbeat-8.15.0`)**: 5 probe otomatis (Web, API Health, PostgreSQL, Redis, Elasticsearch) + pemantau kadaluarsa sertifikat TLS/SSL | `Active` |
| **🚀 Layer 5: DevSecOps, Chaos & GitOps** | **GitHub Actions Pipeline**<br>• Workflow: `.github/workflows/deploy.yml`<br>• Runner: Ubuntu 24.04 | Webhook GitHub<br>Push ke `master` | 9 Tahapan Otomatis<br>Strict Quality Gates | • **Stage 3 Unit Testing**: Wajib lulus 39 test Vitest (tanpa bypass)<br>• **Stage 4 SAST**: Semgrep OWASP scanner<br>• **Stage 5 SCA**: Trivy IaC manifest scan<br>• **Stage 7 Container Scan**: Trivy Docker CVE scanner | `Active` |
| | **Chaos Engineering Controller**<br>• CronJob: `masdika-chaos-drill`<br>• CLI: `scripts/chaos-experiment.sh` | Jadwal: Minggu 03:00 UTC<br>On-Demand CLI | Disaster Resilience Verification<br>Self-Healing Validation | • **Chaos Monkey Pod Kill**: Terminasi pod acak dengan verifikasi uptime kontinu<br>• **CPU Burn Drill**: Uji reaksi autoscaling HPA<br>• **Circuit Breaker Drill**: Uji simulasi kegagalan dependensi | `Active` |
| | **ArgoCD GitOps Engine**<br>• Kontroler: `192.168.79.15`<br>• Target: `https://192.168.79.4:6443` | Web UI & gRPC<br>Path: `k8s/` | Auto-Sync (Prune enabled)<br>Self-Healing Controller | • Git sebagai *Single Source of Truth* mutlak<br>• Rekonsiliasi tanpa drift berbasis Git commit SHA | `Active` |

---

## 📈 SRE SLI, SLO & Error Budgeting (Standar Gojek / Google SRE)

Masdika menerapkan manajemen keandalan sistem berbasis metrik kuantitatif (*Service Level Objectives*):

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   SRE COCKPIT & RELEASE DECISION GATE                  │
├─────────────────────┬────────────────────┬──────────────┬──────────────┤
│  Availability SLI   │    Error Budget    │  Burn Rate   │ Release Gate │
│       100.0%        │    100.0% Sisa     │     0.0x     │  PERMITTED   │
│ (Target Min: 99.9%) │ (Max: 43.2 m/bln)  │ (1x = Norm)  │  (HEALTHY)   │
└─────────────────────┴────────────────────┴──────────────┴──────────────┘
```

1. **Availability SLI (*Service Level Indicator*)**:
   $$\text{SLI} = \left( 1 - \frac{\sum \text{rate}(\text{HTTP 5xx})}{\sum \text{rate}(\text{Total Requests})} \right) \times 100\%$$
2. **Target SLO**: **`99.9%` (Three-Nines)** diukur dalam jendela berjalan 24 jam / 30 hari.
3. **Monthly Error Budget**: Toleransi downtime maksimal adalah $100\% - 99.9\% = 0.1\%$ atau setara **43,2 menit per bulan**.
4. **SRE Release Gate Policy**:
   * **`PERMITTED (HEALTHY)` (Lampu Hijau)**: Sisa Error Budget $> 20\%$. Developer bebas merilis fitur baru secara agresif.
   * **`CODE FREEZE (BLOCKED)` (Lampu Merah)**: Sisa Error Budget $< 20\%$. Seluruh rilis fitur baru diblokir otomatis oleh kebijakan SRE. Tim pengembang wajib 100% fokus memperbaiki bug dan stabilitas sistem.
5. **Multiwindow Burn-Rate Alerting (Prometheus)**:
   * **`SREAvailabilitySLOBreach`**: Alarm kritis jika availability 1 jam $< 99.9\%$.
   * **`SREErrorBudgetRapidBurn`**: Alarm darurat jika laju konsumsi error budget melonjak $> 14.4\times$ (menghabiskan $> 2\%$ budget bulanan dalam 1 jam).

---

## ⚡ Circuit Breaker & Graceful Degradation (Anti-Cascading Failure)

Diimplementasikan melalui modul native TypeScript di [`apps/web/src/lib/circuit-breaker.ts`](apps/web/src/lib/circuit-breaker.ts) dan diintegrasikan ke Prisma Client di [`apps/web/src/lib/prisma.ts`](apps/web/src/lib/prisma.ts):

* **CLOSED (Kondisi Normal)**: Semua query database berjalan normal. Jika terjadi error, kegagalan dicatat ke dalam sliding window.
* **OPEN (Sirkuit Terputus / Tripped)**: Jika query database lambat melebihi batas waktu (4.000ms) atau kegagalan mencapai 50%:
  * Panggilan query langsung dihentikan seketika (*fail-fast* dalam 1ms) tanpa membebani database yang sedang down.
  * **Graceful Degradation**: Query pembacaan data (`findMany`, `findUnique`, `count`) otomatis menyajikan respons fallback aman (array kosong / cache) sehingga halaman web tidak hang dan tidak menampilkan error 500.
* **HALF-OPEN (Uji Pemulihan Otomatis)**: Setelah 10 detik, sirkuit mengizinkan 1 request uji coba. Jika database pulih, sirkuit otomatis menutup kembali (`CLOSED`) tanpa perlu campur tangan admin atau restart pod.
* **Telemetri Real-time**: Status diekspos ke endpoint Prometheus [`/api/metrics`](apps/web/src/app/api/metrics/route.ts) (`circuit_breaker_state`, `circuit_breaker_tripped_total`, `circuit_breaker_fallback_total`).

---

## 🐵 Chaos Engineering & Uji Ketahanan Bencana (Resilience Drills)

Masdika dilengkapi dengan framework uji bencana terotomatisasi untuk membuktikan bahwa arsitektur sistem benar-benar tahan banting:

### 1. Automated Weekly Chaos Monkey ([`k8s/chaos/chaos-cronjob.yaml`](k8s/chaos/chaos-cronjob.yaml))
* Berjalan otomatis di jam tenang (setiap hari Minggu pukul 03:00 UTC).
* Memilih pod aplikasi secara acak dan mematikannya secara paksa (`kubectl delete pod --now`).
* Memvalidasi bahwa **PodDisruptionBudget (`masdika-app-pdb`)** menjaga ketersediaan web, dan ReplicaSet meregenerasi pod pengganti hingga `Ready` dalam waktu $< 60$ detik.

### 2. SRE Chaos Interactive CLI Tool ([`scripts/chaos-experiment.sh`](scripts/chaos-experiment.sh))
Dapat dijalankan langsung di server untuk menguji skenario bencana:

```bash
# 1. Terminasi Pod Acak dengan Pengujian Uptime Kontinu (Sampling 200ms)
./scripts/chaos-experiment.sh pod-kill

# 2. Injeksi Beban CPU Sintetis (Memvalidasi Reaksi Autoscaling HPA)
./scripts/chaos-experiment.sh cpu-burn

# 3. Validasi Telemetri Circuit Breaker State Machine
./scripts/chaos-experiment.sh circuit-breaker

# 4. Full SRE Chaos Game Day (Eksekusi Seluruh Skenario)
./scripts/chaos-experiment.sh full-drill
```

---

## 💾 Disaster Recovery Offsite (RustFS Cloud S3 + GPG AES-256)

Penyelamatan data database PostgreSQL menggunakan arsitektur *Disaster Recovery* bertingkat di [`k8s/databases/backup-cronjob.yaml`](k8s/databases/backup-cronjob.yaml):

1. **Jadwal Eksekusi**: Setiap hari pukul `02:00 UTC` (09:00 WIB).
2. **Dump & Kompresi**: Menjalankan `pg_dump` non-blocking dengan kompresi `gzip -9`.
3. **Enkripsi GPG AES-256**: Hasil dump dienkripsi simetris menggunakan algoritma standar militer AES-256 via GPG (`masdika_db_<TIMESTAMP>.sql.gz.gpg`).
4. **Offsite Cloud Sync**: File terenkripsi otomatis diunggah ke Object Storage **RustFS S3** (`http://192.168.79.10:9000`) pada bucket **`masdika-database`**.
5. **Kebijakan Retensi 14 Hari**:
   * File lokal di storage PVC server yang berumur $> 14$ hari otomatis dibersihkan.
   * File offsite di RustFS S3 yang berumur $> 14$ hari otomatis di-prune oleh Rclone.
   * Menjamin kepatuhan RPO (*Recovery Point Objective*) dan RTO (*Recovery Time Objective*) jika server fisik mengalami kerusakan total.

---

## 🧪 Pengujian Otomatis (Automated Testing Suite)

Sistem dilengkapi dengan **39 unit test otomatis** menggunakan **Vitest**:

```bash
# Menjalankan seluruh test suite lokal
npm run test
```

### Cakupan Pengujian Kritis:
1. **Proteksi Anti-SSRF ([`ssrf.test.ts`](apps/web/src/lib/__tests__/ssrf.test.ts))**:
   * Memvalidasi deteksi seluruh rentang IP privat RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).
   * Memblokir endpoint metadata AWS/Cloud (`169.254.169.254`), loopback (`127.0.0.1`, `::1`), dan port terlarang (SSH 22, MySQL 3306).
   * Memverifikasi pertahanan terhadap serangan **DNS Rebinding** (domain publik yang di-resolve ke IP privat internal).
2. **Kalkulasi Billing & PAYG VPS ([`billing.test.ts`](apps/web/src/lib/__tests__/billing.test.ts))**:
   * Format mata uang Rupiah (`Rp 150.000`) dan format nominal ringkas jutaan/miliaran (`Rp 1,5 jt`, `Rp 2,5 M`).
   * Menguji *storage ceiling rate* untuk VPS dalam status `STOPPED` agar pelanggan tidak tertagih biaya CPU/RAM saat mesin mati.
3. **Keamanan Otentikasi & Kriptografi ([`auth-security.test.ts`](apps/web/src/lib/__tests__/auth-security.test.ts))**:
   * Password hashing aman menggunakan algoritma `scrypt` dengan random salt 16-byte hex.
   * Verifikasi kompatibilitas fallback hash legacy SHA-256 tanpa merusak kredensial pengguna lama.
   * Enkripsi deterministik AES-256 (`enc:<hex>`) untuk data sensitif yang memerlukan indeks pencarian unik (seperti email).
4. **State Machine Circuit Breaker ([`circuit-breaker.test.ts`](apps/web/src/lib/__tests__/circuit-breaker.test.ts))**:
   * Memverifikasi timeout handling, transisi status `CLOSED` $\rightarrow$ `OPEN` $\rightarrow$ `HALF_OPEN`, eksekusi respons fallback, dan pemulihan otomatis.

---

## 🚀 Pipeline CI/CD 9-Tahap (.github/workflows/deploy.yml)

Setiap commit baru ke branch `master` diverifikasi secara ketat melalui 9 gerbang otomatis sebelum dideploy:

```text
[Push / Merge ke master]
       │
       ├──► 1. Code Quality & Linting (ESLint, TypeScript Strict Check)
       ├──► 2. SCA - Dependency Audit (npm audit security scan)
       ├──► 3. Automated Unit Testing (Vitest - Wajib 39 Test Lulus 100%)
       ├──► 4. SAST - Semgrep OWASP Security Scanner
       ├──► 5. IaC - K8s Manifest Security Compliance Scan
       │
       ▼ (Setelah seluruh gate keamanan lulus)
       6. Multi-Stage Docker Container Build & Push ke Docker Hub
       │
       ▼
       7. Container Vulnerability Scan (Trivy Image CVE Severity Check)
       │
       ▼
       8. GitOps Manifest Update (Atomic Concurrency-Locked Image Tag Commit)
       │
       ▼
[ArgoCD Controller Sync] ──► Rolling Update Pods K3s (Zero-Downtime)
       │
       ▼
       9. Post-Deploy Health Gate (Verifikasi HTTP Status & Liveness Probe)
```

---

## 🗂️ Struktur Direktori Proyek

```text
masdika.id/
├── .github/
│   └── workflows/
│       └── deploy.yml             # Pipeline CI/CD 9-Tahap DevSecOps & GitOps
├── apps/
│   └── web/                      # Aplikasi Utama Next.js 16 (Web & API)
│       ├── src/
│       │   ├── app/              # App Router (Public, Dashboard, Admin, API)
│       │   │   └── api/metrics/  # Prometheus Metrics Endpoint (Process, Circuit Breakers)
│       │   ├── components/       # Atomic Design UI Components
│       │   └── lib/
│       │       ├── circuit-breaker.ts # Engine Circuit Breaker & Graceful Degradation
│       │       ├── prisma.ts          # Prisma Client terproteksi Circuit Breaker
│       │       ├── rustfs.ts          # Driver RustFS S3 Object Storage
│       │       ├── ssrf.ts            # Modul Pertahanan Anti-SSRF & DNS Rebinding
│       │       ├── encryption.ts      # Enkripsi AES-256 & Hashing Scrypt
│       │       ├── billing.ts         # Helper Kalkulasi & Formatting Billing
│       │       └── __tests__/         # 39 Unit Tests Vitest
│       ├── vitest.config.mts     # Konfigurasi Vitest Runner
│       ├── worker.js             # BullMQ Background Worker & Auto-Billing
│       └── vnc-proxy.js          # WebSocket Proxy untuk VNC Console
├── k8s/                          # Manifest Kubernetes Deklaratif (ArgoCD Single Source of Truth)
│   ├── app/
│   │   ├── deployment.yaml       # Deployment masdika-app, worker, & vnc-proxy (preStop 5s)
│   │   ├── hpa.yaml              # Horizontal Pod Autoscaler (1-5 pod, CPU 75%, RAM 80%)
│   │   ├── ingress.yaml          # Traefik Ingress Controller, Rate Limiting & Buffering
│   │   ├── pdb.yaml              # PodDisruptionBudget (minAvailable: 1)
│   │   ├── pvc.yaml              # Persistent Storage Volume Claims
│   │   └── service.yaml          # ClusterIP Services
│   ├── base/
│   │   ├── namespace.yaml        # Namespace 'masdika'
│   │   └── configmap.yaml        # Konfigurasi environment terpusat
│   ├── chaos/
│   │   └── chaos-cronjob.yaml    # Automated SRE Chaos Monkey CronJob (Weekly Drill)
│   ├── databases/
│   │   ├── postgres.yaml         # PostgreSQL 18 Production Engine
│   │   ├── redis.yaml            # Redis 7 In-Memory Cache
│   │   ├── elasticsearch.yaml    # Elasticsearch 8.11 Data Node
│   │   └── backup-cronjob.yaml   # Disaster Recovery (GPG AES-256 + RustFS S3 Sync)
│   ├── monitoring/
│   │   ├── alert-rules.yaml      # Aturan Alert Prometheus (SRE SLO, SOC, & Infra)
│   │   ├── alertmanager.yaml     # Alertmanager Webhook & Telegram Dispatcher
│   │   ├── dashboards.yaml       # ConfigMap Dashboard Grafana (SRE Cockpit, SOC, dsb.)
│   │   ├── prometheus.yaml       # Scraper Prometheus (Traefik, Node, Pods, Web Metrics)
│   │   ├── grafana.yaml          # Grafana Visualization Server
│   │   ├── apm.yaml              # Elastic APM Server
│   │   ├── logstash.yaml         # Logstash Log Intake & ECS Pipeline
│   │   ├── filebeat.yaml         # Filebeat DaemonSet (Kubernetes Container Log Harvester)
│   │   ├── metricbeat.yaml       # Metricbeat DaemonSet (Host & Kubernetes Resource Metrics)
│   │   ├── heartbeat.yaml        # Heartbeat Synthetics & TLS Uptime Monitor
│   │   ├── loki.yaml             # Loki Log Aggregator
│   │   └── promtail.yaml         # Promtail Log Agent (Host /var/log/auth.log)
│   └── security/
│       └── networkpolicy.yaml    # Zero-Trust CNI Network Isolation Policies
├── scripts/
│   ├── chaos-experiment.sh       # SRE Chaos Interactive CLI Tool (pod-kill, cpu-burn, full-drill)
│   └── sync-k8s-env.py           # Sinkronisasi K8s secret dari file .env
├── Dockerfile                    # Multi-stage production container build
├── package.json                  # Workspace monorepo root & script runners
└── README.md                     # Dokumentasi teknis sistem
```

---

## 💻 Panduan Pengembangan Lokal (Local Development)

```bash
# 1. Clone repositori
git clone https://github.com/masdikaaa/masdika.id.git
cd masdika

# 2. Siapkan file konfigurasi environment
cp .env.example .env

# 3. Install seluruh dependensi
npm install

# 4. Jalankan pengujian unit otomatis
npm run test

# 5. Generate Prisma Client
npm run postinstall --workspace=@masdika/web

# 6. Jalankan development server
npm run dev
```

---

## 🛠️ Cheatsheet Operasional SRE & DevOps (Server: 192.168.79.4)

### 1. Manajemen SRE & Chaos Drills
```bash
# Menjalankan latihan Chaos Monkey Pod Kill mandiri dengan probe uptime live
./scripts/chaos-experiment.sh pod-kill

# Menjalankan latihan stress CPU untuk menguji autoscaling HPA
./scripts/chaos-experiment.sh cpu-burn

# Menjalankan seluruh rangkaian latihan Game Day SRE
./scripts/chaos-experiment.sh full-drill

# Memicu Chaos Monkey CronJob terjadwal secara manual di Kubernetes
sudo kubectl create job --from=cronjob/masdika-chaos-drill test-chaos-$(date +%s) -n masdika
```

### 2. Status Cluster & Autoscaler
```bash
# Memeriksa status pod di namespace masdika
sudo kubectl get pods -n masdika -o wide

# Memantau metrik HPA (CPU & Memory Utilization)
sudo kubectl get hpa -n masdika

# Memeriksa kepatuhan PodDisruptionBudget
sudo kubectl get pdb -n masdika
```

### 3. Disaster Recovery & RustFS Backup
```bash
# Memicu backup database manual (Dump -> GPG Enkripsi -> Upload RustFS S3)
sudo kubectl create job --from=cronjob/masdika-postgres-backup manual-backup-$(date +%s) -n masdika

# Memeriksa file backup terenkripsi di disk lokal server
sudo ls -lh /var/lib/rancher/k3s/storage/*masdika-backup-pvc/

# Memeriksa file backup di RustFS S3 bucket masdika-database (via rclone)
rclone lsf rustfs:masdika-database
```

### 4. Observability & Log Auditing
```bash
# Memantau log aplikasi web (Next.js)
sudo kubectl logs -n masdika deployment/masdika-app -c app --tail 100 -f

# Memeriksa aturan alert Prometheus yang aktif
curl -s http://10.43.90.61:9090/api/v1/rules | jq '.data.groups[].name'

# Buka Grafana Dashboard di browser
http://192.168.79.4:3001
# -> Masuk ke Dashboards -> Masdika Platform -> SRE Cockpit - SLI, SLO (99.9%) & Error Budget
```

---

## 🔒 Lisensi & Hak Cipta (Private & Proprietary)

Seluruh kode sumber, arsitektur sistem, aset visual, dan konfigurasi infrastruktur dalam repositori ini dilindungi oleh hak cipta dan bersifat **Proprietary & Private** untuk penggunaan personal / internal oleh **[Masdika](https://masdika.id)**.

> [!CAUTION]
> **PEMBERITAHUAN PRIVASI & HAK CIPTA (ALL RIGHTS RESERVED):**  
> Repositori ini bukan proyek *open-source*. Dilarang keras menyalin, membagikan, mendistribusikan ulang, memodifikasi, mempublikasikan, melisensikan ulang (*sub-license*), atau menggunakan sebagian maupun seluruh kode dan aset dalam repositori ini untuk keperluan publik atau komersial pihak ketiga tanpa izin tertulis langsung dari pemilik hak cipta.  
> 
> Hak cipta © 2026 **Masdika.ID**. Seluruh hak dilindungi oleh undang-undang.
