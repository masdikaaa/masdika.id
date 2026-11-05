<div align="center">
  <h1>🚀 Masdika.ID</h1>
  <p><strong>Platform Cloud Infrastructure, VPS Provider, dan Developer Hub Skala Enterprise</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Kubernetes-K3s-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white" alt="Kubernetes K3s" />
    <img src="https://img.shields.io/badge/GitOps-ArgoCD-F3702A?style=for-the-badge&logo=argo&logoColor=white" alt="ArgoCD" />
    <img src="https://img.shields.io/badge/Security-Bitnami_Sealed_Secrets-009688?style=for-the-badge&logo=bitnami&logoColor=white" alt="Sealed Secrets" />
    <img src="https://img.shields.io/badge/Policy-Kyverno_Admission-00ADD8?style=for-the-badge&logo=kubernetes&logoColor=white" alt="Kyverno" />
    <img src="https://img.shields.io/badge/Runtime_Sec-Falco_eBPF-002F40?style=for-the-badge&logo=falco&logoColor=white" alt="Falco eBPF" />
    <img src="https://img.shields.io/badge/DevSecOps-GitLeaks_%26_Trivy_%26_Semgrep-00599C?style=for-the-badge&logo=securityscorecard&logoColor=white" alt="DevSecOps" />
    <img src="https://img.shields.io/badge/PostgreSQL-CNPG_HA_Cluster-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL CNPG HA" />
    <img src="https://img.shields.io/badge/PgBouncer-Transaction_Pooler-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PgBouncer Pooler" />
    <img src="https://img.shields.io/badge/mTLS-Cloudflare_Origin_Pull-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare mTLS" />
    <img src="https://img.shields.io/badge/Vector.dev-Rust_Pipeline-FF5B35?style=for-the-badge&logo=vector&logoColor=white" alt="Vector.dev" />
    <img src="https://img.shields.io/badge/Trivy_Operator-Continuous_CVE_Scan-00599C?style=for-the-badge&logo=securityscorecard&logoColor=white" alt="Trivy Operator" />
    <img src="https://img.shields.io/badge/Elastic_Stack-8.11_Observability-005571?style=for-the-badge&logo=elastic&logoColor=white" alt="Elastic Stack" />
    <img src="https://img.shields.io/badge/Object_Storage-RustFS_S3-E95420?style=for-the-badge&logo=amazons3&logoColor=white" alt="RustFS S3" />
    <img src="https://img.shields.io/badge/Testing-Vitest_47_Tests-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest Testing" />
    <img src="https://img.shields.io/badge/SRE-SLO_99.9%25_%26_Error_Budget-4CAF50?style=for-the-badge&logo=googlecloud&logoColor=white" alt="Google SRE" />
    <img src="https://img.shields.io/badge/Resilience-Circuit_Breaker-FFB300?style=for-the-badge&logo=circuitverse&logoColor=white" alt="Circuit Breaker" />
    <img src="https://img.shields.io/badge/Chaos-Chaos_Monkey_Drills-8E24AA?style=for-the-badge&logo=linux&logoColor=white" alt="Chaos Engineering" />
    <img src="https://img.shields.io/badge/Storage_Guard-Auto_GC_60%25-green?style=for-the-badge&logo=linux&logoColor=white" alt="Storage Guard" />
    <img src="https://img.shields.io/badge/Access-Private%20%2F%20Proprietary-e11d48?style=for-the-badge&logo=lock&logoColor=white" alt="Private Repo" />
  </p>
</div>

---

## 📖 Ringkasan Platform

**Masdika.ID** adalah platform cloud infrastructure, VPS provider, dan developer portal berstandar enterprise yang mengintegrasikan layanan komputasi terdistribusi, API hub berlatensi rendah, serta observabilitas infrastruktur modern.

Platform ini mengadopsi standar **Tier-1 Tech Engineering (Gojek / Tokopedia / Google SRE / Netflix Standard)**:
* **Zero-Trust GitOps Deklaratif**: Seluruh status infrastruktur dikelola via Git sebagai *Single Source of Truth* melalui ArgoCD, dipadukan dengan **Bitnami Sealed Secrets** untuk enkripsi rahasia asimetris yang aman di-commit ke Git.
* **Shift-Left DevSecOps Pipeline**: Proteksi kebocoran kredensial sejak laptop developer menggunakan **GitLeaks pre-commit hook**, verifikasi integritas kode di CI/CD dengan **Semgrep (SAST)**, audit dependensi **Trivy (SCA)**, dan Docker container vulnerability scanner.
* **Kubernetes Admission Control (Kyverno)**: Kebijakan kepatuhan klaster otomatis yang menolak pod *privileged*, mewajibkan non-root user, membatasi hak akses kernel (drop all capabilities), dan mewajibkan batas alokasi memori (*memory limits*).
* **eBPF Runtime Threat Detection (Falco)**: Pemantauan syscall Linux di level kernel secara real-time untuk mendeteksi eksekusi shell mencurigakan (`/bin/sh`, `/bin/bash`) atau manipulasi file biner sistem di dalam kontainer.
* **High Availability & Autoscaling**: Horizontal Pod Autoscaler (**HPA minReplicas: 2**, maxReplicas: 5) untuk mencegah degradasi 502 saat rolling deploy dan chaos testing, dipadu PodDisruptionBudget (PDB).
* **Ultra-Lightweight Log Pipeline (Vector.dev)**: Penggantian pipeline JVM Logstash dengan Vector berbasis bahasa Rust berkinerja tinggi; memangkas konsumsi RAM sebesar **85%+ (~50 MB vs 1,5 GB)**, menghilangkan jeda *garbage collection*, serta mendukung *dual-sink* paralel langsung ke Elasticsearch ECS data stream dan Grafana Loki.
* **Continuous Vulnerability & CVE Scanning (Trivy Operator)**: Audit keamanan dan pemindaian kerentanan CVE kontainer secara kontinu 24/7 di dalam klaster Kubernetes, verifikasi kepatuhan NSA/CIS, audit RBAC, dan deteksi kredensial terbuka (*exposed secrets*).
* **Cloudflare Authenticated Origin Pulls (mTLS)**: Verifikasi kriptografis mTLS dua arah di Traefik Ingress (`TLSOption RequireAndVerifyClientCert`) menggunakan sertifikat CA resmi Cloudflare; menolak secara absolut seluruh scanner atau penyerang yang mencoba mengakses IP asli origin port 443 secara langsung.
* **Enterprise Connection Pooling (PgBouncer & CNPG Pooler)**: Manajemen koneksi database mode transaksi (*transaction pooling*) 1000:25 untuk mencegah *connection starvation* dan lonjakan memori PostgreSQL saat traffic burst.
* **High Availability Data Tier (CloudNativePG Ready)**: Arsitektur replikasi database PostgreSQL streaming primary-replica dengan automated sub-second failover.
* **Resilience & Circuit Breaker**: Proteksi kaskade kegagalan database dengan Martin Fowler state machine (*fail-fast & graceful degradation*).
* **Enterprise SRE Cockpit & SLO 99.9%**: Pengukuran kuantitatif ketersediaan *Three-Nines*, pelacakan *Monthly Error Budget*, multi-window burn-rate alerts, dan *Release Gate Policy* di Grafana.
* **Full-Stack Elastic Observability**: Elastic Stack 8.11 (Elasticsearch, Kibana, APM, Filebeat, Metricbeat, Heartbeat Synthetics) dengan indeks teroptimasi metadata host fisik dan **Index Lifecycle Management (ILM)** retensi otomatis 14 hari.
* **Automated Disaster Recovery**: Backup terjadwal terenkripsi simetris GPG AES-256 yang disinkronkan offsite ke RustFS Cloud Storage S3 dengan retensi rotasi 14 hari.
* **Host Storage Safeguard & Kubelet Image GC**: Proteksi 3-lapis anti-kehabisan disk di host produksi (`192.168.79.4`); Kubelet auto-pruning terpicu saat disk mencapai 60% dan membersihkan hingga 45%, hard-cap log Linux `systemd-journald` 500 MB, serta cron maintenance harian.

---

## 🏛️ Matriks Arsitektur & Spesifikasi Infrastruktur (Enterprise Standard)

Seluruh arsitektur sistem diklasifikasikan ke dalam 6 lapisan (*tier*) modular dengan konfigurasi keandalan tinggi dan isolasi keamanan Zero-Trust:

| Layer / Tier | Komponen & Service | Port & Routing | High Availability & Resilience | Proteksi Keamanan (DevSecOps / SRE) | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **🌐 Layer 1: Edge & Ingress Gateway** | **Cloudflare Zero Trust**<br>• Daemon: `cloudflared`<br>• SSL Termination | `443` (HTTPS)<br>`wss` (WebSocket) | Anycast Global Edge Routing<br>SLA 100% Uptime | • L3/L4 DDoS Mitigation Otomatis<br>• Masking IP Asli Server<br>• Web Crypto WAF Rules & Bot Fight | `Active` |
| | **Cloudflare Authenticated Origin Pulls (mTLS)**<br>• CA Secret: `cloudflare-origin-pull-ca`<br>• Traefik `TLSOption` | Port `443` (TLS)<br>Entrypoint: `websecure` | Strict Client Certificate Verification<br>Mutual TLS (mTLS) | • **Anti-Bypass Shield**: Seluruh koneksi HTTPS langsung ke IP fisik server tanpa sertifikat klien resmi Cloudflare ditolak seketika (*TLS Handshake Rejected*)<br>• **`clientAuthType: RequireAndVerifyClientCert`**<br>• Mengunci origin hanya melayani traffic sah dari Cloudflare Edge | `Active` |
| | **Traefik v3 Ingress**<br>• Ingress Controller Native K3s<br>• Dynamic EndpointSlice | Host `80`, `443`<br>Entrypoint: `web`, `websecure` | Dynamic Re-routing tanpa restart<br>Active Health Probing | • **`masdika-headers`**: HSTS, CSP, Nosniff, X-Frame<br>• **`masdika-buffering`**: 10GB Upload Spooling<br>• **`masdika-ratelimit`**: Token Bucket 150 req/s (Burst 50)<br>• **mTLS Binding**: `traefik.ingress.kubernetes.io/router.tls.options: masdika-cloudflare-origin-pull@kubernetescrd`<br>• **Internal Cluster Only**: Ingress Prometheus publik dinonaktifkan (akses via Grafana/ClusterIP) | `Active` |
| **⚡ Layer 2: Application Tier** | **masdika-app**<br>• Next.js 16 Standalone Web App<br>• Base: Node.js 22 Alpine | Internal `3000`<br>Path: `/` | • **HPA**: 2 – 5 Pods Dinamis (Target CPU 75%, RAM 80%)<br>• **PDB**: `minAvailable: 1`<br>• **preStop**: `sleep 5` (Zero Packet Drop) | • Non-Root User (`UID 1001`, `GID 1001`)<br>• SecurityContext: `drop: [ALL]`<br>• Seccomp: `RuntimeDefault`<br>• `automountServiceAccountToken: false` | `Active` |
| | **Circuit Breaker Engine**<br>• Martin Fowler State Machine<br>• Prisma Query Wrapper | In-Process<br>Telemetry: `/api/metrics` | • **State**: `CLOSED`, `OPEN`, `HALF_OPEN`<br>• Timeout: 4.000ms<br>• Trip Threshold: 50% Failures<br>• Reset Window: 10.000ms | • **Graceful Degradation**: Mencegah *cascading failure* saat DB lambat<br>• Menyajikan respons fallback instan agar web tidak hang<br>• Export metrik real-time ke Prometheus | `Active` |
| | **masdika-worker**<br>• BullMQ Queue & Billing Engine<br>• Background Worker | Internal Service<br>Health: `8080` | Strategy: `Recreate`<br>Memory Limit: 1 GiB | • Otomasi isolasi akun & penonaktifan invoice kedaluwarsa<br>• Polling metrik Proxmox VE terenkripsi | `Active` |
| | **masdika-vnc-proxy**<br>• Dedicated WebSocket Console Tunnel<br>• Node.js WS Reverse Proxy | Internal `3001`<br>Path: `/api/ws` | Strategy: `Recreate`<br>WebSocket Keep-Alive Ping | • Dedicated WSS tunneling ke Proxmox VE<br>• Token tiket otentikasi sesi one-time | `Active` |
| **🛡️ Layer 3: Zero-Trust Data Tier** | **PostgreSQL 18 & CNPG HA**<br>• Database Relasional Utama<br>• CloudNativePG (CNPG) Ready | Internal `5432`<br>ClusterIP | Shared Buffers: 512 MB<br>Streaming Replication (Standby)<br>Sub-second Failover | • **NetworkPolicy: `masdika-db-isolation`**<br>  Hanya bisa diakses pod `app`, `worker`, `vnc-proxy`, `backup`, `pgbouncer`, `masdika-pg-pooler`<br>• Running User: UID `70` (postgres) | `Active` |
| | **PgBouncer & CNPG Pooler**<br>• Enterprise Connection Pooling<br>• Service: `masdika-pg-pooler` & `masdika-pgbouncer` | Internal `5432`<br>ClusterIP | • **Transaction Pooling Mode** (`poolMode: transaction`)<br>• 2 Replicas High Availability<br>• Scaling 1000 Klien $\rightarrow$ 25 DB Koneksi | • **Zero Connection Starvation**: Mencegah lonjakan proses server PostgreSQL & OOM saat lonjakan request Next.js/BullMQ<br>• **NetworkPolicy**: `masdika-pooler-isolation` & `masdika-cnpg-pooler-isolation` mengunci akses hanya dari pod resmi aplikasi<br>• **Prisma Client Ready**: Kompatibel dengan `@prisma/adapter-pg` & parameter `?pgbouncer=true` | `Active` |
| | **Redis 7**<br>• In-Memory Cache & Key-Value<br>• PVC: `masdika-redis-pvc` (10 GB) | Internal `6379`<br>ClusterIP | In-Memory Engine<br>AOF Data Persistence | • **NetworkPolicy: `masdika-redis-isolation`**<br>  Port 6379 diblokir total dari luar pod resmi<br>• Password Authentication & Protected Mode | `Active` |
| | **RustFS Cloud Object Storage**<br>• S3 Compatible Bucket Storage<br>• Endpoint: `192.168.79.10:9000` | Port `9000`<br>S3 REST API | Distributed Bucket Engine<br>• `masdika-database` (Backup DB)<br>• `masdika-media` (Upload User)<br>• `masdika-cdn` (Static Assets)<br>• `masdika-ticket` (Attachments) | • Access Key & Secret Key terenkripsi<br>• Isolasi data offsite independen dari host K3s | `Active` |
| | **Automated Disaster Recovery (DR)**<br>• CronJob: `masdika-postgres-backup`<br>• PVC: `masdika-backup-pvc` (15 GB) | Batch Task<br>Jadwal: `0 2 * * *`<br>(09:00 WIB) | Concurrency: `Forbid`<br>BackoffLimit: `3`<br>Multi-tier Cloud Sync | • **GPG Enkripsi Simetris AES-256** (`.sql.gz.gpg`)<br>• Sinkronisasi otomatis ke RustFS S3 `masdika-database`<br>• **Retensi 14 Hari**: Auto-pruning lokal PVC & offsite RustFS | `Active` |
| | **Host Storage Guard & Kubelet Image GC**<br>• Node: `192.168.79.4`<br>• K3s Image Garbage Collection | Host Root `/`<br>290 GB SSD | Auto-GC Trigger: 60%<br>Auto-GC Target: 45%<br>Systemd Journal Cap: 500M | • **Anti-Disk Full SRE**: Kubelet otomatis menghapus image tak terpakai saat disk mencapai 60%<br>• **Container Log Cap**: Maksimal 10Mi (rotasi 3 file)<br>• **Daily Prune Cron**: Pembersihan berkala otomatis containerd, docker, & journal | `Active` |
| **📊 Layer 4: SRE Observability & SOC** | **Enterprise SRE Cockpit**<br>• Dashboard: `masdika-sre-cockpit`<br>• Standar Google SRE / Gojek | Host Ingress:<br>`grafana.masdika.id`<br>Port `3001` | Multiwindow Multi-burn-rate Alerting<br>Auto Health Gating | • **SLO Ketersediaan 99.9% (Three-Nines)**<br>• **Monthly Error Budget Tracking** (Toleransi max 43.2 min/bulan)<br>• **1h Error Budget Burn Rate**<br>• **SRE Release Gate Policy**: `PERMITTED` vs `CODE FREEZE`<br>• **Latency SLI**: % request < 300ms (Target: 95%) | `Active` |
| | **Vector.dev Ultra-Lightweight Pipeline**<br>• Engine: Rust Native Log Pipeline<br>• Service: `vector:5044` & `logstash:5044` | Ingest: `5044`<br>Metrics: `9090`<br>Health API: `8686` | Dual-Sink Parallel Delivery<br>Zero GC Pause<br>Memory Request: 64Mi (Hemat 1.2 GB) | • **ECS Normalization via VRL**: Pemetaan otomatis log Next.js ke Elastic Common Schema & trace ID<br>• **Dual-Sink**: Mengirim log simultan ke Elasticsearch (`logs-masdika.app-default`) & Loki (`masdika-loki:3100`)<br>• **Backward Compatibility**: Alias service `logstash:5044` aktif | `Active` |
| | **Elastic Observability Suite**<br>• Kibana (`kibana.masdika.id`)<br>• APM, Filebeat, Metricbeat, Heartbeat | Ingress `kibana.masdika.id`<br>Port `5601`<br>ClusterIP Services | Full-Stack Enterprise Observability<br>• Logs rate & explorer<br>• Host inventory & metrics<br>• APM waterfall traces<br>• Synthetic uptime & SSL check | • **ECS Log Streaming (`logs-masdika.app-default`)**: Terpetakan ke Elastic Common Schema dengan trace ID<br>• **Filebeat 8.15**: DaemonSet log harvester container K8s<br>• **Metricbeat 8.15**: Memantau Host Physical OS metadata (Ubuntu 26.04), CPU, Memory, Network TX/RX<br>• **ILM Retention Policy**: 14 hari retensi otomatis indeks Elasticsearch | `Active` |
| | **Security Operations Center (SOC)**<br>• Dashboard: `masdika-soc-cockpit`<br>• Threat Cockpit & Audit Stream | Grafana Panel<br>Data Source: Loki & Promtail | Audit Host Real-Time<br>Web Threat Profiling | • Audit Host `/var/log/auth.log`: Deteksi SSH Brute-Force, Login Ilegal, & Sudo Elevation<br>• Live Request & Threat Audit Stream (Auto-filter cron noise)<br>• Alerting deteksi probe/scanner bot HTTP 401/403/404 | `Active` |
| **🛡️ Layer 5: Policy Engine & Runtime Security** | **Kyverno Policy Engine**<br>• Admission Controller Webhook<br>• Namespace: `kyverno` (4 Pods) | Dynamic Webhook<br>Port `9443` | Mutating & Validating Webhook<br>High Availability Architecture | • **`disallow-privileged-containers`**: Blokir kontainer dengan hak root kernel<br>• **`require-run-as-non-root`**: Cegah pod berjalan sebagai user UID 0<br>• **`drop-all-capabilities`**: Hapus seluruh Linux capabilities berbahaya<br>• **`require-memory-limits`**: Mencegah serangan OOM exhaustion pada node | `Active` |
| | **Falco eBPF Threat Engine**<br>• Runtime Security Agent<br>• Namespace: `falco` (DaemonSet) | Kernel Probe<br>eBPF Ring Buffer | Non-invasive Kernel Tracing<br>Real-Time Event Processing | • **Terminal Shell Spawn Detection**: Peringatan seketika saat `/bin/bash` atau `/bin/sh` dieksekusi di kontainer<br>• **Sensitive File Access**: Deteksi pembacaan `/etc/shadow` atau modifikasi binary sistem<br>• Integrasi notifikasi langsung ke syslog / event stream | `Active` |
| | **Aqua Trivy Operator**<br>• Continuous CVE & Compliance Scanner<br>• Namespace: `trivy-system` | Metrics: `8080`<br>Probes: `9090`<br>ClusterIP | Continuous Event-Driven Scanning<br>Automated CRD Generation | • **`VulnerabilityReport`**: Pemindaian CVE live pada seluruh container image yang berjalan di klaster<br>• **`ConfigAuditReport`**: Audit kepatuhan konfigurasi beban kerja Kubernetes terhadap standar NSA/CISA<br>• **`ExposedSecretReport`**: Deteksi kebocoran token & private key pada env pod<br>• **`RbacAssessmentReport`**: Evaluasi hak istimewa Role & ClusterRole | `Active` |
| **🚀 Layer 6: DevSecOps, Chaos & GitOps** | **Bitnami Sealed Secrets**<br>• Controller: `kube-system`<br>• Public Key Cryptography | Asymmetric Encryption<br>RSA 4096-bit | GitOps Native Secret Management | • Enkripsi kredensial di lokal menggunakan public cert klaster<br>• File `*.sealed.yaml` aman disimpan secara terbuka di Git<br>• Dekripsi otomatis oleh controller di dalam klaster | `Active` |
| | **GitLeaks Pre-Commit Hooks**<br>• Runner: Local Node.js<br>• Config: `.gitleaks.toml` | Git Hook Trigger<br>`pre-commit` | Shift-Left Secret Leak Prevention | • Mencegah commit jika terdapat token API, private key, atau database password di kode sumber | `Active` |
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

## 🔒 Bitnami Sealed Secrets & GitOps Workflow

Untuk menjamin prinsip Zero-Trust dan GitOps *Single Source of Truth*, Masdika menggunakan **Bitnami Sealed Secrets**:

```text
[ Developer Local ]
   │  .env / Plain Secret
   │
   ▼  kubeseal (atau node scripts/seal-secret.js)
   │  (Dienkripsi asimetris dengan Public Certificate K3s)
   │
[ SealedSecret YAML (*.sealed.yaml) ] ──► Aman di-commit ke GitHub Repo
                                                  │
                                                  ▼ (ArgoCD Sync ke K3s)
                                      [ Sealed Secrets Controller ]
                                                  │  (Mendekripsi menggunakan Private Key internal)
                                                  ▼
                                      [ Native Kubernetes Secret ]
```

### Cara Menghasilkan Sealed Secret Baru:
```bash
# Menggunakan utility helper Masdika
node scripts/seal-secret.js --name masdika-secret --namespace masdika --from-env .env --out k8s/base/masdika-secret.sealed.yaml

# Atau menggunakan kubeseal CLI langsung
kubeseal --cert scripts/sealed-secrets-cert.pem --format yaml < k8s/base/secret.yaml > k8s/base/secret.sealed.yaml
```

---

## 🛡️ Kyverno Admission Controller & Falco Runtime Security

### 1. Kyverno Policy Engine ([`k8s/security/kyverno-policies.yaml`](k8s/security/kyverno-policies.yaml))
Kyverno bertindak sebagai satpam gerbang admission di K3s cluster:
* **`disallow-privileged-containers`**: Menolak pod yang mencoba meminta flag `privileged: true`.
* **`require-run-as-non-root`**: Memaksa setiap container menyertakan `runAsNonRoot: true` dan melarang UID 0.
* **`drop-all-capabilities`**: Memastikan container membuang hak akses Linux kernel (`capabilities: drop: [ALL]`).
* **`require-memory-limits`**: Mencegah kebocoran memori pod yang dapat mengganggu kestabilan node fisik.

### 2. Falco eBPF Runtime Threat Detection ([`k8s/security/falco.yaml`](k8s/security/falco.yaml))
Falco beroperasi menggunakan eBPF probe di level kernel Linux node host:
* Mendeteksi secara instan jika penyerang membobol kontainer dan memicu shell terlarang (`Notice: A shell was spawned in a container with an attached terminal`).
* Mengaudit perubahan pada direktori biner sistem (`/bin`, `/sbin`, `/usr/bin`).
* Melaporkan insiden keamanan secara langsung untuk aksi isolasi pod otomatis.

---

## 🔐 Cloudflare Authenticated Origin Pulls (mTLS) di Traefik Ingress

Secara default, Cloudflare menyembunyikan alamat IP asli server origin. Namun, jika penyerang melakukan *port scanning* langsung ke blok IP VPS (port 443), mereka berpotensi membypass proteksi WAF, DDoS mitigation, dan rate limiting Cloudflare.

Untuk menutup celah ini secara absolut, Masdika mengaktifkan **Cloudflare Authenticated Origin Pulls (Mutual TLS / mTLS)** di Traefik Ingress:

```text
┌──────────────────┐               ┌────────────────────────────────────────────────────────┐
│  Client Browser  │ ──HTTPS──►    │                 Cloudflare Global Edge                 │
└──────────────────┘               │ (WAF Rules, L3/L4 DDoS Mitigation, Bot Fight Mode)     │
                                   └───────────────────────────┬────────────────────────────┘
                                                               │ mTLS Handshake (Client Cert)
                                                               │ [CN: origin-pull.cloudflare.net]
                                                               ▼
                                   ┌────────────────────────────────────────────────────────┐
                                   │                    K3s Host Node                       │
                                   │                                                        │
┌──────────────────┐               │  ┌──────────────────────────────────────────────────┐  │
│ Penyerang / Bot  │ ──Direct IP───┼─►│ Traefik v3 (TLSOption: RequireAndVerifyClientCert)│  │
│ (Port 443 Scan)  │   (No Cert)   │  │ ❌ DITOLAK: SSL Handshake Failed (Bad Cert Alert)│  │
└──────────────────┘               │  └────────────────────────┬─────────────────────────┘  │
                                   │                           │ ✅ Lolos mTLS Handshake     │
                                   │                           ▼                            │
                                   │  ┌──────────────────────────────────────────────────┐  │
                                   │  │ masdika-app (Next.js) / masdika-vnc-proxy Pods   │  │
                                   │  └──────────────────────────────────────────────────┘  │
                                   └────────────────────────────────────────────────────────┘
```

### 1. Komponen Kriptografi & Deklaratif (`k8s/security/cloudflare-origin-pull.yaml`)
* **Sertifikat CA Resmi Cloudflare (`cloudflare-origin-pull-ca`)**:
  Kubernetes Secret berisi Root CA publik Cloudflare Authenticated Origin Pull (`origin-pull.cloudflare.net`, serial `57:91:ba:95:56:c2:2e:61`, berlaku hingga November 2029).
* **Traefik TLSOption (`cloudflare-origin-pull`)**:
```yaml
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: cloudflare-origin-pull
  namespace: masdika
spec:
  minVersion: VersionTLS12
  clientAuth:
    secretNames:
      - cloudflare-origin-pull-ca
    clientAuthType: RequireAndVerifyClientCert
```
* **Penerapan pada Ingress Router (`k8s/app/ingress.yaml` & `k8s/monitoring/ingress.yaml`)**:
```yaml
annotations:
  traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
  traefik.ingress.kubernetes.io/router.tls: "true"
  traefik.ingress.kubernetes.io/router.tls.options: masdika-cloudflare-origin-pull@kubernetescrd
```

---

## 🚰 PgBouncer & CNPG Enterprise Connection Pooling (High Scalability Data Tier)

Di PostgreSQL standar, setiap koneksi klien memerlukan 1 proses dedicated OS (*fork process*) yang mengonsumsi ~10–20 MB memori per koneksi dan memicu *CPU context switching*. Ketika puluhan pod Next.js dan BullMQ worker melakukan query bersamaan, batas `max_connections` cepat tercapai (*connection starvation*) dan memicu latensi tinggi.

Masdika menerapkan **PgBouncer Connection Pooling** dengan mode transaksi (*Transaction Pooling*):

```text
┌─────────────────────────────────┐
│     Next.js Application Pods    │  (100 - 1.000 Koneksi Klien Ringan)
│   (HPA: 2 - 5 Pods) + Workers   │
└────────────────┬────────────────┘
                 │ TCP :5432
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PgBouncer Pooler (2 Replicas / High Availability)          │
│          • CNPG Native Pooler: masdika-pg-pooler:5432                   │
│          • Standalone PgBouncer: masdika-pgbouncer:5432                 │
│          • Pool Mode: TRANSACTION (poolMode: transaction)               │
│          • max_client_conn: 1000 | default_pool_size: 25                │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ Dikelola Rapi & Sangat Hemat
                                 │ (Hanya 25 Koneksi Server Aktif)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database Backend                        │
│   (Shared Buffers: 512MB, CPU Tetap Rendah, Zero Connection Exhaustion) │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1. Keunggulan Mode Transaksi (Transaction Pooling)
* **Koneksi Server Hanya Dipinjam Saat SQL Berjalan**: Begitu transaksi (`BEGIN ... COMMIT`) selesai dalam hitungan milidetik, koneksi backend langsung dilepaskan kembali ke pool untuk melayani request klien berikutnya.
* **Rasio Efisiensi 40:1**: Mampu menangani hingga **1.000 koneksi concurrent** dari sisi aplikasi hanya dengan **25 koneksi nyata** ke server PostgreSQL.
* **Pembersihan State Otomatis**: Dilengkapi parameter `SERVER_RESET_QUERY: "DISCARD ALL"` dan `IGNORE_STARTUP_PARAMETERS: "extra_float_digits"` untuk mencegah *leakage session state*.

### 2. Standalone PgBouncer Deployment:
1. **Enterprise PgBouncer Deployment** ([k8s/databases/pgbouncer.yaml](file:///c:/laragon/www/masdika/k8s/databases/pgbouncer.yaml)):
   * Didedikasikan untuk engine produksi (masdika-db:5432).
   * Multi-replica (2 pods) dengan non-root user (UID 70), liveness/readiness probe TCP 5432.
   * *Service Endpoints*: masdika-pgbouncer:5432 dan masdika-pg-pooler:5432.

### 3. Integrasi Prisma ORM
Prisma Client di [prisma.ts](file:///c:/laragon/www/masdika/apps/web/src/lib/prisma.ts) menggunakan adapter `@prisma/adapter-pg` dengan *connection pooler flag*:
```env
# Format Connection String untuk PgBouncer
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@masdika-pg-pooler:5432/${DB_NAME}?pgbouncer=true"
```

### 4. Zero-Trust Network Policy Isolation
Akses ke PgBouncer dan CNPG Pooler dilindungi secara ketat di [networkpolicy.yaml](file:///c:/laragon/www/masdika/k8s/security/networkpolicy.yaml):
* Kebijakan **`masdika-pooler-isolation`** dan **`masdika-cnpg-pooler-isolation`** hanya mengizinkan ingress TCP port 5432 dari pod `masdika-app`, `masdika-worker`, `masdika-vnc-proxy`, dan probe `masdika-heartbeat`.
* Database backend (`masdika-db-isolation`) mengizinkan koneksi dari PgBouncer dan CNPG Pooler, serta pod `masdika-backup` untuk proses `pg_dump` terjadwal.

---

## 🚀 Vector.dev Ultra-Lightweight Log Pipeline (Hemat RAM 85%+)

Sebelumnya, log pipeline diproses oleh Logstash berbasis Java Virtual Machine (JVM) yang memerlukan alokasi memori besar (512 MiB request, 1,5 GiB limit) serta rentan terhadap *Garbage Collection pause*. 

Masdika memigrasikan log pipeline secara penuh ke **[Vector.dev](https://vector.dev)** ([k8s/monitoring/vector.yaml](file:///c:/laragon/www/masdika/k8s/monitoring/vector.yaml)) yang ditulis menggunakan bahasa **Rust** berkinerja tinggi:

```text
┌─────────────────────────────────┐
│     Next.js Application Pods    │  (Kirim JSON via HTTP POST :5044)
│  (VECTOR_URL / LOGSTASH_URL)    │
└────────────────┬────────────────┘
                 │ HTTP JSON :5044
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Vector.dev Pipeline Engine (Rust Native)               │
│          • Memory Limit: 256Mi | Request: 64Mi (Hemat ~1,2 GB RAM)      │
│          • Zero GC Pauses & Sub-millisecond Event Processing            │
│          • VRL (Vector Remap Language) ECS Normalization Engine         │
└────────────────┬───────────────────────────────────────┬────────────────┘
                 │                                       │
                 ▼ (Data Stream: logs-masdika.app)       ▼ (JSON Stream + Labels)
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│       Elasticsearch 8.11        │     │       Grafana Loki 3.x          │
│   (ILM 14 Hari & APM Waterfall) │     │   (SOC Cockpit & Live Explorer) │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

### 1. Keunggulan Arsitektur Vector.dev
* **Efisiensi Memori Ekstrem**: Konsumsi RAM berkurang dari ~1,5 GB (Logstash) menjadi hanya **~40–60 MB (Vector)**. Ini menghemat lebih dari **1,2 GB RAM** untuk alokasi beban kerja komputasi aplikasi.
* **Dual-Sink Paralel**: Vector secara bersamaan (*fan-out*) menyalurkan data log yang sama ke:
  1. **Elasticsearch 8.11**: Data stream `logs-masdika.app-default` untuk observabilitas APM waterfall dan Index Lifecycle Management (ILM) 14 hari.
  2. **Grafana Loki**: Disertai label dinamis (`app`, `env`, `level`) untuk analisis cepat dan visualisasi di SOC Cockpit Grafana.
* **Normalisasi ECS via VRL (Vector Remap Language)**: Memetakan struktur JSON Next.js menjadi standar industri *Elastic Common Schema* (`log.level`, `service.name`, `service.environment`, `trace.id`, `transaction.id`, `client.ip`, `http.request.method`, `url.path`).
* **Kompatibilitas Penuh (Zero-Downtime)**: Menyediakan service alias `logstash:5044` dan `masdika-logstash:5044` sehingga modul logger aplikasi tetap berjalan mulus tanpa perubahan konfigurasi mendesak.
* **Metrik Prometheus Native**: Menyediakan endpoint `:9090` yang memantau `vector_events_in_total`, `vector_events_out_total`, dan `vector_buffer_byte_size`.

---

## 🛡️ Continuous Vulnerability & Compliance Scanning (Aqua Trivy Operator)

Trivy Operator ([k8s/security/trivy-operator.yaml](file:///c:/laragon/www/masdika/k8s/security/trivy-operator.yaml)) berjalan secara kontinu 24/7 di namespace `trivy-system` untuk memantau keamanan klaster secara *event-driven* dan terjadwal:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Kubernetes Workloads                            │
│           (Deployments, Pods, StatefulSets, CronJobs, Secrets)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Event Trigger & Periodic Audit
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Aqua Trivy Operator (trivy-system)                   │
│          • Scanner: Container Vulnerabilities (CVE)                    │
│          • Scanner: Workload Misconfigurations (NSA / CIS)             │
│          • Scanner: Exposed Secrets & Token Leak Detection             │
│          • Scanner: RBAC Role & ClusterRole Privilege Audits           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Menghasilkan Kubernetes Native CRD
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Security Custom Resources                         │
│  • VulnerabilityReport        • ConfigAuditReport                      │
│  • ExposedSecretReport        • RbacAssessmentReport                   │
│  • ClusterComplianceReport    • Metrics Endpoint (:8080)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Scrape :8080
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│            Prometheus Alerting: TrivyCriticalVulnerabilityFound        │
│                    (Notifikasi Instan ke SRE & Telegram)               │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Laporan Keamanan Deklaratif (Custom Resource Definitions)
* **`VulnerabilityReport`**: Menempel pada setiap Pod/Deployment, mengidentifikasi paket OS biner atau dependensi bahasa (Node.js/Go/Python) yang memiliki nomor CVE terdaftar di database kerentanan Aqua Security.
* **`ConfigAuditReport`**: Mengaudit konfigurasi pod terhadap aturan kepatuhan keamanan (*pod security standards*), seperti deteksi kontainer *read-only filesystem*, *privilege escalation*, dan ketiadaan *resource limits*.
* **`ExposedSecretReport`**: Mendeteksi jika terdapat password database, API key, atau private key yang tidak sengaja tertulis secara eksplisit (*hardcoded*) di dalam ConfigMap atau manifest pod.
* **`RbacAssessmentReport`**: Mendeteksi ServiceAccount atau RoleBinding yang memiliki hak akses berlebih (*over-privileged RBAC*) seperti wildcard verb `*` pada secret atau resource cluster-scoped.

### 2. Aturan Alerting Prometheus (`k8s/monitoring/alert-rules.yaml`)
* **`TrivyCriticalVulnerabilityFound`**: Membunyikan alarm kritis seketika jika terdeteksi kerentanan dengan tingkat keparahan `Critical` pada kontainer yang sedang aktif di klaster.
* **`TrivyExposedSecretDetected`**: Membunyikan alarm darurat jika ditemukan token atau kredensial rahasia yang terekspos tanpa enkripsi.

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
* Memvalidasi bahwa **PodDisruptionBudget (`masdika-app-pdb`)** dan **HPA (`minReplicas: 2`)** menjaga ketersediaan web tanpa 502 Bad Gateway.

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

## 🧹 Arsitektur & Otomasi Proteksi Storage (Anti-Disk Full SRE Standard)

Untuk menjamin ketersediaan sistem (*High Availability*) dan mencegah kegagalan fatal akibat *Disk Full (Out of Disk Space)* pada node host produksi (`192.168.79.4`), Masdika mengimplementasikan arsitektur proteksi penyimpanan berlapis (*Multi-Tier Automated Storage Safeguard*).

### ⚠️ Latar Belakang Masalah (Root Cause Disk Penuh di Kubernetes / K3s)
Pada klaster Kubernetes atau K3s standar tanpa kustomisasi, server produksi sangat rentan mengalami kehabisan ruang penyimpanan (*disk exhaustion*):
1. **Ambang Batas Default Kubelet Image GC adalah 85%**:
   Secara default, parameter `imageGCHighThresholdPercent` pada Kubernetes Kubelet disetel pada **85%**. Artinya, Kubelet secara sengaja **TIDAK AKAN** menghapus layer image lama sebelum kapasitas disk mencapai 85%. Pada drive 290 GB, sistem membiarkan image menumpuk hingga ~246 GB sebelum memulai proses *pruning*.
2. **Akumulasi Image CI/CD GitOps**:
   Setiap commit Git memicu pipeline CI/CD yang membangun container image baru dengan tag commit SHA unik (`ghcr.io/masdika/masdika-app:<sha>`). Image lama yang sudah tidak aktif tetap tersimpan sebagai cache di containerd (`/var/lib/rancher/k3s/agent/containerd`).
3. **Log Sistem Linux (`systemd-journald`) Tanpa Batas Kuota**:
   Layanan `journald` bawaan mengizinkan file log bertambah hingga 10% dari kapasitas disk (hingga ~29 GB).
4. **Cache Docker Standalone & Anonymous Volumes**:
   Sisa image atau layer build Docker standalone di luar containerd K3s tetap mengonsumsi ruang di `/var/lib/docker`.

---

### 🛡️ 3 Lapis Proteksi Penyimpanan Terotomatisasi (Active Safeguard)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│             MULTI-TIER STORAGE PROTECTION ARCHITECTURE (SRE)                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 1: K3s Kubelet Image GC & Log Limits (/etc/rancher/k3s/config.yaml)  │
│  • image-gc-high-threshold: 60% (Auto-trigger cleanup saat disk capai 60%)  │
│  • image-gc-low-threshold: 45% (Hapus unused images hingga disk turun 45%) │
│  • container-log-max-size: 10Mi & container-log-max-files: 3 (Max 30MB/pod) │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 2: Systemd Journald Hard-Cap (/etc/systemd/journald.conf.d/00-limits) │
│  • SystemMaxUse: 500M (Batas absolut kuota log Linux di disk)               │
│  • RuntimeMaxUse: 100M (Batas kuota log di RAM /run)                        │
│  • MaxRetentionSec: 7day (Auto-purge log lebih dari 7 hari)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 3: Daily Automated Maintenance Daemon (/etc/cron.daily/masdika-clean)│
│  • k3s crictl rmi --prune (Bersihkan dangling containerd images)            │
│  • docker system prune -af (Bersihkan unused docker cache & volumes)        │
│  • journalctl --vacuum-time=7d (Vacuum arsip journal sistem)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Lapis 1: K3s Kubelet Image Garbage Collection & Container Log Cap
Dikonfigurasi langsung pada file konfigurasi K3s di `/etc/rancher/k3s/config.yaml`:
```yaml
# /etc/rancher/k3s/config.yaml
kubelet-arg:
  - image-gc-high-threshold=60
  - image-gc-low-threshold=45
  - container-log-max-size=10Mi
  - container-log-max-files=3
```
* **Fungsi Parameter**:
  * `image-gc-high-threshold=60`: Begitu kapasitas disk image mencapai 60%, Kubelet seketika mengaktifkan penghapusan image kontainer lama (*Least Recently Used*) yang tidak terpasang pada pod aktif.
  * `image-gc-low-threshold=45`: Pembersihan dilakukan sampai penggunaan disk turun ke 45%.
  * `container-log-max-size=10Mi` & `container-log-max-files=3`: Membatasi ukuran log kontainer maksimum 10 MB dengan rotasi 3 file per pod (maksimal 30 MB), mencegah pod dengan output verbose menghabiskan storage.
* **Cara Penerapan Manual**:
  ```bash
  cat << 'EOF' > /etc/rancher/k3s/config.yaml
  kubelet-arg:
    - image-gc-high-threshold=60
    - image-gc-low-threshold=45
    - container-log-max-size=10Mi
    - container-log-max-files=3
  EOF
  systemctl restart k3s
  ```
* **Verifikasi Runtime**:
  ```bash
  journalctl -u k3s -b --no-pager | grep -i "image-gc"
  ```
  *Output verifikasi:*
  `Running kubelet ... --image-gc-high-threshold=60 --image-gc-low-threshold=45 --container-log-max-size=10Mi --container-log-max-files=3`

#### Lapis 2: Hard-Cap Kuota Systemd Journald Logs
Mencegah log sistem Linux membengkak tanpa batas melalui drop-in konfigurasi di `/etc/systemd/journald.conf.d/00-limits.conf`:
```ini
[Journal]
SystemMaxUse=500M
RuntimeMaxUse=100M
MaxRetentionSec=7day
```
* **Fungsi**:
  * `SystemMaxUse=500M`: Membatasi total penyimpanan log persisten di disk fisik maksimal 500 MB.
  * `RuntimeMaxUse=100M`: Membatasi log runtime di memori `/run` maksimal 100 MB.
  * `MaxRetentionSec=7day`: Menghapus otomatis file log yang berusia lebih dari 7 hari.
* **Cara Penerapan Manual**:
  ```bash
  mkdir -p /etc/systemd/journald.conf.d
  cat << 'EOF' > /etc/systemd/journald.conf.d/00-limits.conf
  [Journal]
  SystemMaxUse=500M
  RuntimeMaxUse=100M
  MaxRetentionSec=7day
  EOF
  systemctl restart systemd-journald
  ```
* **Verifikasi**:
  ```bash
  systemd-analyze cat-config systemd/journald.conf | grep -E '^(SystemMaxUse|RuntimeMaxUse|MaxRetentionSec)'
  ```

#### Lapis 3: Daily Automated Maintenance Daemon (Cron Harian)
Daemon terotomatisasi di `/etc/cron.daily/masdika-cleanup` (izin eksekusi `755`) yang dieksekusi secara terjadwal setiap hari oleh sistem:
```bash
#!/bin/bash
# 1. Bersihkan unused K3s containerd images bekas deployment GitOps
if command -v k3s >/dev/null 2>&1; then
    k3s crictl rmi --prune >/dev/null 2>&1 || true
fi

# 2. Bersihkan unused Docker standalone images & build layers
if command -v docker >/dev/null 2>&1; then
    docker system prune -af >/dev/null 2>&1 || true
fi

# 3. Vacuum log journald lebih tua dari 7 hari
if command -v journalctl >/dev/null 2>&1; then
    journalctl --vacuum-time=7d >/dev/null 2>&1 || true
fi
```
* **Pemberian Izin Eksekusi**:
  ```bash
  chmod 755 /etc/cron.daily/masdika-cleanup
  ```

#### 🚀 Otomasi Satu Perintah (One-Click Setup Script)
Seluruh konfigurasi proteksi storage di atas dapat diterapkan secara otomatis menggunakan skrip yang telah disediakan di repositori:
```bash
sudo ./scripts/setup-storage-guard.sh
```

---

## 🧪 Pengujian Otomatis (Automated Testing Suite)

Sistem dilengkapi dengan **47 unit test otomatis** menggunakan **Vitest**:

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
       ├──► 3. Automated Unit Testing (Vitest - Wajib 47 Test Lulus 100%)
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
├── .gitleaks.toml                 # Konfigurasi Deteksi Kebocoran Secret GitLeaks
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
│       │       └── __tests__/         # 47 Unit Tests Vitest
│       ├── vitest.config.mts     # Konfigurasi Vitest Runner
│       ├── worker.js             # BullMQ Background Worker & Auto-Billing
│       └── vnc-proxy.js          # WebSocket Proxy untuk VNC Console
├── k8s/                          # Manifest Kubernetes Deklaratif (ArgoCD Single Source of Truth)
│   ├── app/
│   │   ├── deployment.yaml       # Deployment masdika-app, worker, & vnc-proxy (preStop 5s)
│   │   ├── hpa.yaml              # Horizontal Pod Autoscaler (min: 2, max: 5 pod, CPU 75%, RAM 80%)
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
│   │   ├── pgbouncer.yaml        # Standalone PgBouncer Deployment (2 Replicas, Transaction Mode)
│   │   ├── redis.yaml            # Redis 7 In-Memory Cache
│   │   ├── elasticsearch.yaml    # Elasticsearch 8.11 Data Node
│   │   └── backup-cronjob.yaml   # Disaster Recovery (GPG AES-256 + RustFS S3 Sync)
│   ├── monitoring/
│   │   ├── alert-rules.yaml      # Aturan Alert Prometheus (SRE SLO, SOC, CVE, & Infra)
│   │   ├── alertmanager.yaml     # Alertmanager Webhook & Telegram Dispatcher
│   │   ├── dashboards.yaml       # ConfigMap Dashboard Grafana (SRE Cockpit, SOC, dsb.)
│   │   ├── prometheus.yaml       # Scraper Prometheus (Traefik, Vector, Trivy, Node, Pods)
│   │   ├── grafana.yaml          # Grafana Visualization Server
│   │   ├── apm.yaml              # Elastic APM Server
│   │   ├── vector.yaml           # Vector.dev Ultra-Lightweight Rust Log Pipeline (Dual-Sink)
│   │   ├── filebeat.yaml         # Filebeat DaemonSet (Kubernetes Container Log Harvester)
│   │   ├── metricbeat.yaml       # Metricbeat DaemonSet (Host & Kubernetes Resource Metrics)
│   │   ├── heartbeat.yaml        # Heartbeat Synthetics & TLS Uptime Monitor
│   │   ├── loki.yaml             # Loki Log Aggregator
│   │   └── promtail.yaml         # Promtail Log Agent (Host /var/log/auth.log)
│   └── security/
│       ├── cloudflare-origin-pull.yaml # Cloudflare Authenticated Origin Pull CA & Traefik TLSOption (mTLS)
│       ├── trivy-operator.yaml   # Aqua Trivy Operator (Continuous CVE, Secrets, & RBAC Audit)
│       ├── networkpolicy.yaml    # Zero-Trust CNI Network Isolation Policies (DB, Vector, & Pooler)
│       ├── kyverno-policies.yaml # Kyverno Admission Controller Policies
│       └── falco.yaml            # Falco eBPF Runtime Threat Detection DaemonSet
├── scripts/
│   ├── chaos-experiment.sh       # SRE Chaos Interactive CLI Tool (pod-kill, cpu-burn, full-drill)
│   ├── pre-commit-secret-scan.js # GitLeaks Pre-Commit Validation Hook
│   ├── seal-secret.js            # Generator Bitnami Sealed Secrets
│   └── setup-storage-guard.sh    # Otomasi Proteksi Storage (K3s GC 60%, Journald Cap, Cron)
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

# 3. Install seluruh dependensi & pre-commit hooks
npm install

# 4. Jalankan pengujian unit otomatis
npm run test

# 5. Generate Prisma Client
npm run postinstall --workspace=@masdika/web

# 6. Jalankan development server
npm run dev
```

---

## 🚀 Panduan Deployment Server Baru dari Nol (Fresh OS to 100% Production Runbook)

Panduan ini dirancang untuk tim DevOps / SRE jika server fisik / VPS (`192.168.79.4`) mengalami bencana, dilakukan *reinstall OS* (misal: Ubuntu 24.04 / 26.04 LTS), atau saat menyiapkan server produksi baru dari titik 0 hingga seluruh ekosistem Masdika berjalan 100% di produksi.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│               RUNBOOK DEPLOYMENT SERVER BARU DARI NOL (0 -> 100)            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Langkah 1: Inisialisasi OS Host & Dependensi Dasar                          │
│  Langkah 2: Proteksi Storage Host Sejak Awal (setup-storage-guard.sh)       │
│  Langkah 3: Instalasi K3s Lightweight Kubernetes                             │
│  Langkah 4: Setup Kredensial Kubeconfig & Akses Non-Root                    │
│  Langkah 5: Deployment Fondasi Klaster (Namespace, ConfigMap & Secret)       │
│  Langkah 6: Deployment Keamanan & Policy Zero-Trust (mTLS, Kyverno, CNI)    │
│  Langkah 7: Deployment Data Tier (PostgreSQL, Redis, PgBouncer, Backup DR)  │
│  Langkah 8: Migrasi Database Prisma / Restore Data Disaster Recovery        │
│  Langkah 9: Deployment Observabilitas & Monitoring (Elastic, Vector, Loki)  │
│  Langkah 10: Deployment Workload Aplikasi (App, Worker, VNC-Proxy, Ingress) │
│  Langkah 11: Verifikasi Menyeluruh & Smoke Test (100% Production Ready)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Langkah 1: Inisialisasi OS Host & Dependensi Dasar
Login sebagai root ke server baru (`ssh root@192.168.79.4`):
```bash
# 1. Update repositori paket & upgrade kernel/distro
apt update && apt upgrade -y

# 2. Pasang perkakas esensial sistem
apt install -y curl wget git jq unzip htop net-tools ca-certificates gnupg lsb-release
```

---

### Langkah 2: Proteksi Storage Host Sejak Detik Pertama (`setup-storage-guard.sh`)
> [!IMPORTANT]
> **Krusial (Standard SRE)**: Langkah ini dilakukan **SEBELUM atau SESAAT SETELAH** K3s diinstal. Tujuannya agar K3s langsung berjalan dengan batas *Garbage Collection* aman (High: 60% / Low: 45%) sejak detik pertama dan tidak pernah membiarkan image menumpuk hingga 85%.

```bash
# 1. Clone repositori Masdika ke direktori kerja
git clone https://github.com/masdikaaa/masdika.id.git /home/andika/masdika.id
cd /home/andika/masdika.id

# 2. Beri izin eksekusi dan jalankan skrip storage guard
chmod +x scripts/setup-storage-guard.sh
sudo ./scripts/setup-storage-guard.sh
```
*Skrip ini secara otomatis:*
* Membuat `/etc/rancher/k3s/config.yaml` dengan parameter `image-gc-high-threshold=60`, `image-gc-low-threshold=45`, dan limit log container 10MB/3 rotasi.
* Membuat `/etc/systemd/journald.conf.d/00-limits.conf` (hard-cap log sistem 500 MB & auto-vacuum 7 hari).
* Memasang cron harian otomatis di `/etc/cron.daily/masdika-cleanup`.

---

### Langkah 3: Instalasi K3s Lightweight Kubernetes
Jalankan installer resmi K3s (K3s akan secara otomatis membaca konfigurasi `/etc/rancher/k3s/config.yaml` yang telah dipasang di Langkah 2):
```bash
curl -sfL https://get.k3s.io | sh -

# Verifikasi service k3s aktif dan sehat
systemctl status k3s --no-pager
```

---

### Langkah 4: Setup Kubeconfig & Akses Non-Root
Agar perintah `kubectl` dapat dijalankan oleh user biasa tanpa harus menggunakan `sudo`:
```bash
mkdir -p /home/andika/.kube
sudo cp /etc/rancher/k3s/k3s.yaml /home/andika/.kube/config
sudo chown -R andika:andika /home/andika/.kube
chmod 600 /home/andika/.kube/config

# Tambahkan KUBECONFIG ke environment user
echo "export KUBECONFIG=/home/andika/.kube/config" >> /home/andika/.bashrc
source /home/andika/.bashrc

# Verifikasi node klaster aktif
kubectl get nodes -o wide
```

---

### Langkah 5: Deployment Fondasi Klaster (Namespace, ConfigMap & Secret)
```bash
cd /home/andika/masdika.id

# 1. Terapkan Namespace terisolasi 'masdika'
kubectl apply -f k8s/base/namespace.yaml

# 2. Terapkan ConfigMap variabel lingkungan global
kubectl apply -f k8s/base/configmap.yaml

# 3. Terapkan Secret Kredensial Produksi:
# Opsi A (GitOps Sealed Secret jika Bitnami Controller aktif):
# kubectl apply -f k8s/base/masdika-secret.sealed.yaml

# Opsi B (Manual dari file .env produksi di server):
kubectl create secret generic masdika-secret \
  -n masdika \
  --from-env-file=.env
```

---

### Langkah 6: Deployment Keamanan & Policy Zero-Trust
```bash
# 1. Terapkan sertifikat CA Cloudflare Origin Pull (mTLS) di Traefik Ingress
kubectl apply -f k8s/security/cloudflare-origin-pull.yaml

# 2. Terapkan isolasi jaringan CNI Zero-Trust (NetworkPolicy database & pooler)
kubectl apply -f k8s/security/networkpolicy.yaml

# 3. Terapkan Admission Controller Kyverno, Falco runtime sensor, dan Trivy Operator
kubectl apply -f k8s/security/kyverno-policies.yaml
kubectl apply -f k8s/security/falco.yaml
kubectl apply -f k8s/security/trivy-operator.yaml
```

---

### Langkah 7: Deployment Data Tier (Database, Cache & Connection Pooling)
```bash
# 1. Terapkan PersistentVolumeClaim (PVC)
kubectl apply -f k8s/app/pvc.yaml

# 2. Deploy PostgreSQL Database Relasional Utama
kubectl apply -f k8s/databases/postgres.yaml

# 3. Deploy Redis In-Memory Cache
kubectl apply -f k8s/databases/redis.yaml

# 4. Deploy PgBouncer Connection Pooler (Mode Transaksi)
kubectl apply -f k8s/databases/pgbouncer.yaml

# 5. Deploy CronJob Otomatis Backup DR ke RustFS S3
kubectl apply -f k8s/databases/backup-cronjob.yaml

# Tunggu hingga database pod Ready
kubectl rollout status deployment/masdika-db -n masdika --timeout=120s
kubectl rollout status deployment/masdika-redis -n masdika --timeout=60s
kubectl rollout status deployment/masdika-pgbouncer -n masdika --timeout=60s
```

---

### Langkah 8: Migrasi Database Prisma / Restore Data (Disaster Recovery)
```bash
# Skenario A: Inisialisasi Skema Baru (Fresh Deployment)
npx prisma migrate deploy

# Skenario B: Pemulihan Bencana dari Backup Terenkripsi RustFS S3 (Disaster Recovery)
# 1. Unduh file dump terenkripsi terbaru dari bucket S3 masdika-database:
# rclone copy rustfs:masdika-database/backup/latest.sql.gz.gpg /tmp/
# 2. Dekripsi GPG AES-256 dan stream langsung ke database pod:
# gpg --batch --yes --decrypt --passphrase "$GPG_BACKUP_PASSPHRASE" /tmp/latest.sql.gz.gpg | gunzip | kubectl exec -i -n masdika deployment/masdika-db -- psql -U masdika -d masdika
```

---

### Langkah 9: Deployment Observabilitas & Monitoring Stack
```bash
# Terapkan seluruh komponen monitoring (Prometheus, Grafana, Vector, Loki, Beats)
kubectl apply -f k8s/monitoring/pvc.yaml
kubectl apply -f k8s/monitoring/alertmanager.yaml
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/alert-rules.yaml
kubectl apply -f k8s/monitoring/dashboards.yaml
kubectl apply -f k8s/monitoring/grafana.yaml
kubectl apply -f k8s/monitoring/vector.yaml
kubectl apply -f k8s/monitoring/loki.yaml
kubectl apply -f k8s/monitoring/promtail.yaml
kubectl apply -f k8s/monitoring/filebeat.yaml
kubectl apply -f k8s/monitoring/metricbeat.yaml
kubectl apply -f k8s/monitoring/node-exporter.yaml
kubectl apply -f k8s/monitoring/heartbeat.yaml
kubectl apply -f k8s/monitoring/ingress.yaml
```

---

### Langkah 10: Deployment Workload Aplikasi Masdika
```bash
# 1. Terapkan Service & Ingress Routing
kubectl apply -f k8s/app/service.yaml
kubectl apply -f k8s/app/ingress.yaml

# 2. Terapkan PodDisruptionBudget & Autoscaling HPA
kubectl apply -f k8s/app/pdb.yaml
kubectl apply -f k8s/app/hpa.yaml

# 3. Terapkan Deployment Aplikasi (Next.js 16 Web, Worker, VNC-Proxy)
kubectl apply -f k8s/app/deployment.yaml

# Tunggu hingga seluruh pod aplikasi ter-rollout sempurna
kubectl rollout status deployment/masdika-app -n masdika --timeout=180s
kubectl rollout status deployment/masdika-worker -n masdika --timeout=120s
kubectl rollout status deployment/masdika-vnc-proxy -n masdika --timeout=120s
```

---

### Langkah 11: Verifikasi Menyeluruh & Smoke Test (100% Production Ready)
```bash
# 1. Periksa seluruh status pod di namespace 'masdika' (harus Running / Completed)
kubectl get pods -n masdika -o wide

# 2. Periksa status routing Ingress Traefik
kubectl get ingress -n masdika

# 3. Verifikasi proteksi storage Kubelet GC aktif di log K3s
journalctl -u k3s -b --no-pager | grep -i "image-gc"

# 4. Periksa kapasitas penyimpanan host
df -h /

# 5. Uji respons endpoint HTTPS publik melalui Cloudflare
curl -I -k https://masdika.id/
```

Platform Masdika kini telah **100% beroperasi penuh** dari kondisi bare metal / fresh OS dengan seluruh fondasi SRE, keamanan mTLS, dan proteksi storage anti-penuh aktif!

---

## 🛠️ Cheatsheet Operasional SRE & DevOps (Server: 192.168.79.4)

### 1. Manajemen Secret & GitOps (Bitnami Sealed Secrets)
```bash
# Enkripsi secret lokal menjadi SealedSecret yang aman di-commit
node scripts/seal-secret.js --name masdika-secret --namespace masdika --from-env .env --out k8s/base/masdika-secret.sealed.yaml

# Memeriksa status dekripsi SealedSecret oleh controller
sudo kubectl get sealedsecrets -n masdika
```

### 2. Keamanan Edge & Ingress (Cloudflare Origin Pull mTLS)
```bash
# Memeriksa status TLSOption mTLS Cloudflare di Traefik
sudo kubectl get tlsoption -n masdika

# Memeriksa Secret CA Origin Pull
sudo kubectl get secret cloudflare-origin-pull-ca -n masdika

# Uji coba verifikasi penolakan mTLS (koneksi langsung tanpa cert harus ditolak)
curl -k -v https://192.168.79.4/ 2>&1 | grep -i "bad certificate\|tls"
```

### 3. Operasional Database & PgBouncer Connection Pooling
```bash
# Memeriksa status CNPG Pooler (CloudNativePG PgBouncer)
sudo kubectl get pooler -n masdika

# Memeriksa pod & service PgBouncer
sudo kubectl get pods -n masdika -l app=masdika-pgbouncer
sudo kubectl get svc -n masdika -l app.kubernetes.io/name=masdika-pgbouncer

# Memeriksa statistik pool koneksi PgBouncer langsung via psql console
sudo kubectl exec -it -n masdika deployment/masdika-pgbouncer -- psql -h 127.0.0.1 -p 5432 -U masdika -d pgbouncer -c "SHOW POOLS;"
sudo kubectl exec -it -n masdika deployment/masdika-pgbouncer -- psql -h 127.0.0.1 -p 5432 -U masdika -d pgbouncer -c "SHOW CLIENTS;"
```

### 4. Keamanan & Continuous CVE Scanning (Trivy Operator)
```bash
# Memeriksa laporan kerentanan CVE pada seluruh pod yang sedang berjalan
sudo kubectl get vulnerabilityreports -A

# Melihat ringkasan kerentanan kritis (Critical CVE) pada aplikasi
sudo kubectl get vulnerabilityreports -n masdika -o wide

# Memeriksa audit kepatuhan konfigurasi beban kerja Kubernetes (NSA / CIS)
sudo kubectl get configauditreports -A

# Memeriksa deteksi exposed secret di lingkungan klaster
sudo kubectl get exposedsecretreports -A

# Memantau log proses pemindaian kontainer Trivy Operator
sudo kubectl logs -n trivy-system deployment/trivy-operator -c trivy-operator --tail=50 -f
```

### 5. Telemetri & Log Pipeline (Vector.dev)
```bash
# Memeriksa status pod Vector.dev
sudo kubectl get pods -n masdika -l app=masdika-vector

# Memeriksa healthcheck Vector API
sudo kubectl exec -it -n masdika deployment/masdika-vector -c vector -- wget -qO- http://localhost:8686/health

# Memeriksa metrik internal Vector (events in/out, error rate)
curl -s http://masdika-vector:9090/metrics | grep -E "vector_events_in_total|vector_events_out_total"
```

### 6. Kebijakan Keamanan Runtime (Kyverno & Falco)
```bash
# Memeriksa kebijakan cluster Kyverno yang aktif
sudo kubectl get clusterpolicy

# Melihat laporan kepatuhan pod terhadap kebijakan Kyverno
sudo kubectl get polr -A

# Memantau log deteksi ancaman kernel real-time dari Falco
sudo kubectl logs -n falco daemonset/falco -c falco -f --tail=50
```

### 7. Manajemen SRE, HPA & Chaos Drills
```bash
# Menjalankan latihan Chaos Monkey Pod Kill mandiri dengan probe uptime live
./scripts/chaos-experiment.sh pod-kill

# Menjalankan latihan stress CPU untuk menguji autoscaling HPA
./scripts/chaos-experiment.sh cpu-burn

# Menjalankan seluruh rangkaian latihan Game Day SRE
./scripts/chaos-experiment.sh full-drill

# Memeriksa status HPA (minReplicas 2, maxReplicas 5)
sudo kubectl get hpa -n masdika
```

### 8. Observability & Elastic ILM Retention
```bash
# Memeriksa status ILM Policy 14 hari di Elasticsearch
curl -s -u elastic:PASSWORD http://10.43.100.120:9200/_ilm/policy/masdika-ilm-14days | jq .

# Memeriksa indeks data dan sisa disk node Elasticsearch
curl -s -u elastic:PASSWORD http://10.43.100.120:9200/_cat/indices?v
curl -s -u elastic:PASSWORD http://10.43.100.120:9200/_cat/allocation?v

# Memantau log aplikasi web (Next.js)
sudo kubectl logs -n masdika deployment/masdika-app -c app --tail 100 -f
```

### 9. Manajemen & Pembersihan Storage Server (Anti-Disk Full)
```bash
# Memeriksa kapasitas storage disk root
df -h /

# Memeriksa folder konsumen storage terbesar di sistem
sudo du -sh /var/lib/rancher /var/lib/docker /var/lib/kubelet /var/log/journal

# Menjalankan pembersihan manual darurat (instant emergency prune)
sudo k3s crictl rmi --prune
sudo docker system prune -af --volumes
sudo journalctl --vacuum-time=3d

# Memeriksa konfigurasi batas Image GC K3s
cat /etc/rancher/k3s/config.yaml

# Menjalankan skrip setup storage guard mandiri
sudo ./scripts/setup-storage-guard.sh

# Memeriksa status kesehatan seluruh pod aplikasi pasca pembersihan
sudo kubectl get pods -n masdika
```

---

## 🔒 Lisensi & Hak Cipta (Private & Proprietary)

Seluruh kode sumber, arsitektur sistem, aset visual, dan konfigurasi infrastruktur dalam repositori ini dilindungi oleh hak cipta dan bersifat **Proprietary & Private** untuk penggunaan personal / internal oleh **[Masdika](https://masdika.id)**.

> [!CAUTION]
> **PEMBERITAHUAN PRIVASI & HAK CIPTA (ALL RIGHTS RESERVED):**  
> Repositori ini bukan proyek *open-source*. Dilarang keras menyalin, membagikan, mendistribusikan ulang, memodifikasi, mempublikasikan, melisensikan ulang (*sub-license*), atau menggunakan sebagian maupun seluruh kode dan aset dalam repositori ini untuk keperluan publik atau komersial pihak ketiga tanpa izin tertulis langsung dari pemilik hak cipta.  
> 
> Hak cipta © 2026 **Masdika.ID**. Seluruh hak dilindungi oleh undang-undang.


