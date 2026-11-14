<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Masdika Cloud: Standard Architectural Guidelines & Service Lifecycle

Dokumen ini adalah acuan mutlak (**Single Source of Truth**) untuk seluruh AI Agent dan developer ketika membuat atau memodifikasi layanan apa pun di Masdika Cloud (Cloud VPS, Managed Database, Managed Applications, File CDN, API Hub, dan layanan baru di masa mendatang seperti Object Storage, GPU Cloud, Load Balancer, dll.).

Setiap layanan yang ada atau yang baru dibuat **WAJIB** menerapkan lifecycle, billing, pemantauan PAYG, kontrol fisik infrastruktur, dan notifikasi email yang **100% konsisten**.

---

## 1. Skema Database Standar (`schema.prisma`)

Setiap model layanan baru (misal: `NewService`) **wajib** memiliki kolom-kolom standar berikut:

```prisma
model NewService {
  id              Int       @id @default(autoincrement())
  userId          Int
  name            String
  
  // Resource Specs
  planName        String
  cpuShares       Float     @default(1.0)
  memoryMb        Int       @default(1024)
  storageGb       Int       @default(10)
  
  // Billing Fields
  billingMode     String    @default("PAYG") // "PAYG" | "MONTHLY"
  monthlyPrice    Int       @default(20000)
  hourlyRate      Int       @default(28)
  accumulatedCost Int       @default(0)
  lastBilledAt    DateTime?
  
  // Lifecycle Management
  status          String    @default("PROVISIONING") // "PROVISIONING", "RUNNING", "STOPPED", "SUSPENDED", "TERMINATED"
  suspendReason   String?
  terminationDate DateTime? // Digunakan untuk deadline Grace Period 3 Hari (72 jam)
  
  // Physical / Infrastructure Reference
  // Contoh: Proxmox (vmid, node) atau Kubernetes (k8sNamespace, k8sDeployment, k8sService, k8sPvc, k8sIngress)
  node            String?
  k8sNamespace    String?
  k8sDeployment   String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
}
```

---

## 2. Alur Billing & PAYG Lifecycle (Grace Period 3 Hari & Auto-Terminate)

Semua layanan PAYG maupun Monthly wajib diintegrasikan ke cron job billing yang sama:

### A. Cron Hourly Billing (`apps/web/src/app/api/cron/hourly-billing/route.ts`)
1. **Deduction:** Setiap jam, potong saldo user sesuai `hourlyRate`.
2. **Saldo Kurang (Insufficient Balance) -> Suspend:**
   * Jika saldo tidak cukup, status layanan diubah menjadi `SUSPENDED`.
   * Simpan alasan: `suspendReason: 'Insufficient balance for hourly billing'`.
   * Berikan tenggat waktu terminasi **3 Hari (72 Jam)**: `terminationDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)`.
   * **Kontrol Fisik:** Wajib matikan container/VM di infrastruktur (scale K8s replicas ke 0 atau panggil Proxmox `stopVm`).
   * **Notifikasi:**
     * Kirim email customer: `sendAppSuspendedGracePeriodEmail` atau `sendVpsSuspendedGracePeriodEmail` atau `sendPaygSuspendedEmail`.
     * Kirim email admin: `sendAdminServiceSuspendedEmail`.
3. **Masa Tenggang Habis (Grace Period Expired) -> Auto-Terminate:**
   * Jika status sudah `SUSPENDED` dan `now > terminationDate`:
     * Ubah status menjadi `TERMINATED`.
     * Hapus permanen resource compute/pod dari Kubernetes / Proxmox.
     * Kirim email terminasi: `sendTerminationEmail(user.email, user.name, planName, serviceName)`.

### B. Auto-Unsuspend (Reaktivasi Otomatis Saat Top Up)
File: `apps/web/src/lib/auto-unsuspend.ts`
* Saat user berhasil melakukan Top Up saldo atau saat self-healing dijalankan:
  * Sistem mengecek apakah saldo user sudah cukup untuk komitmen layanan.
  * Jika cukup:
    * **Kontrol Fisik:** Hidupkan kembali container/VM (scale K8s replicas ke 1 atau panggil Proxmox `startVm`).
    * Ubah status kembali menjadi `RUNNING` atau `ACTIVE`.
    * Kosongkan `suspendReason: null` dan `terminationDate: null`.
    * Kirim email customer: `sendReactivatedEmail`.
    * Kirim email admin: `sendAdminServiceReactivatedEmail`.

---

## 3. Monitoring & Low Balance Alert (Peringatan Saldo Menipis)

### A. Low Balance Alert Engine (`apps/web/src/lib/low-balance-alert.ts`)
* Setiap jam, cron menghitung total konsumsi per jam dari seluruh layanan aktif (`Cloud VPS`, `Managed Database`, `Managed Apps`, `Subscriptions`, dan layanan baru).
* `hoursRemaining = currentBalance / totalHourlyBurnRate`.
* Jika sisa saldo `<= 24 jam`:
  * Kirim email peringatan `sendLowBalanceAlertEmail` dengan rincian layanan, badge warna-warni, serta estimasi sisa jam agar user sempat top-up sebelum layanan mati.

### B. Admin Pay-As-You-Go Monitor (`apps/web/src/app/api/admin/payg-monitor/route.ts` & Dashboard)
* Setiap layanan baru **wajib** dimasukkan ke dalam query `payg-monitor` agar admin dapat memantau:
  * Hostname / nama instance.
  * Status (RUNNING, SUSPENDED, dll.).
  * Biaya per jam (`hourlyRate`).
  * Total akumulasi biaya.

---

## 4. Admin Panel & Kontrol Fisik Infrastruktur

Setiap layanan baru **wajib** didaftarkan di halaman profil admin customer (`/admin/customers/[id]`):

### A. Detail Customer Admin (`apps/web/src/app/api/admin/users/[id]/route.ts`)
* Tambahkan relasi layanan baru di `prisma.user.findUnique({ include: { ... } })`.
* Pada fungsi `DELETE` (penghapusan user oleh admin), wajib bersihkan resource fisik di cluster Kubernetes / Proxmox terlebih dahulu sebelum record user dihapus dari database.

### B. Tabel "All Products & Services" (`apps/web/src/app/(admin)/admin/customers/[id]/ClientProfile.tsx`)
* Daftarkan layanan baru ke dalam array `allServices`:
  * `category`: Nama kategori (misal: 'Managed Database', 'Managed App', 'Cloud VPS', 'File CDN', 'API Hub').
  * `type`: Identifier route API (misal: 'database', 'apps', 'vps', 'subscriptions', 'apikeys').
  * `name`, `detail`, `icon`, `status`, `suspendReason`.
* Tombol aksi **Suspend / Unsuspend**, **Terminate**, dan **Delete** akan otomatis menangani layanan ini.

### C. Route Suspend / Unsuspend (`apps/web/src/app/api/admin/services/[type]/[id]/status/route.ts`)
Wajib menambahkan `case '<serviceType>':` dengan perilaku:
* **Suspend:**
  1. Kontrol fisik: Scale pod ke 0 replicas atau matikan VM di Proxmox.
  2. Update database: `status: 'SUSPENDED'`, `suspendReason: reason || 'Suspended by Administrator'`, `terminationDate: now + 3 days`.
  3. Kirim email grace period ke customer dan email suspensi ke admin.
* **Unsuspend:**
  1. Kontrol fisik: Scale pod kembali ke 1 replica atau nyalakan VM di Proxmox.
  2. Update database: `status: 'RUNNING'`, `suspendReason: null`, `terminationDate: null`.
  3. Kirim email reaktivasi ke customer dan email reaktivasi ke admin.

### D. Route Terminate & Delete (`apps/web/src/app/api/admin/services/[type]/[id]/route.ts`)
Wajib menambahkan `case '<serviceType>':` dengan perilaku:
* **Soft Terminate:**
  1. Bersihkan seluruh pod, deployment, ingress, service, dan storage di cluster.
  2. Update status: `status: 'TERMINATED'`, `terminationDate: new Date()`.
  3. Kirim email: `sendTerminationEmail`.
* **Hard Delete:**
  1. Bersihkan fisik di cluster.
  2. Hapus permanen record dari database via Prisma.

### E. Route Edit Admin (`apps/web/src/app/api/admin/services/route.ts`)
* Daftarkan update handler untuk layanan baru jika admin mengedit status atau tanggal berakhir.

---

## 5. Pre-Flight Capacity Check & Rollback Order Safeguard

Sebelum layanan dibuat atau dideploy:
1. **Capacity Pre-Flight Check:**
   * Cek kapasitas CPU, RAM, storage, dan ketersediaan NodePort di cluster Kubernetes atau node Proxmox.
   * Jika kapasitas tidak mencukupi, **TOLAK ORDER SEBELUM MEMBUAT APAPUN DI DATABASE** dengan pesan error yang jelas (misal: *"Cluster capacity full"*).
2. **Provisioning Rollback:**
   * Jika terjadi kegagalan di tengah-tengah provisioning (misal: gagal koneksi API Kubernetes atau timeout deploy), **JANGAN TINGGALKAN RECORD SAMPAH / ORPHAN**.
   * Rollback transaksi database, refund saldo upfront jika ada, dan hapus resource setengah jadi yang sempat terbuat di cluster.

---

## 6. Customer Billing Dashboard (`/dashboard/billing`)

File: `apps/web/src/app/api/user/billing/route.ts` dan `apps/web/src/app/(dashboard)/dashboard/billing/page.tsx`
* Tampilkan layanan baru di tabel layanan aktif.
* Jika layanan dalam kondisi `SUSPENDED`, tampilkan badge **`Suspended (Grace Period 3 Hari)`** lengkap dengan tombol cepat Top Up.
* Sertakan biaya layanan ke dalam kalkulasi *Active Services Commitment*.

---

## 7. Matriks Email Notifikasi Masdika Cloud

File: `apps/web/src/lib/email.ts`

| Kejadian / Event | Fungsi Email Customer | Fungsi Email Admin |
| :--- | :--- | :--- |
| **Saldo Kurang (Suspend)** | `sendPaygSuspendedEmail` / `sendAppSuspendedGracePeriodEmail` / `sendVpsSuspendedGracePeriodEmail` | `sendAdminServiceSuspendedEmail` |
| **Admin Manual Suspend** | `sendAppSuspendedGracePeriodEmail` / `sendVpsSuspendedGracePeriodEmail` | `sendAdminServiceSuspendedEmail` |
| **Top Up / Unsuspend** | `sendReactivatedEmail` | `sendAdminServiceReactivatedEmail` |
| **Grace Period Habis / Terminate** | `sendTerminationEmail` | - |
| **Sisa Saldo <= 24 Jam** | `sendLowBalanceAlertEmail` | - |
| **Order Layanan Baru** | `sendCustomerPaymentSuccessEmail` / `sendCustomerInvoiceEmail` | `sendAdminNewOrderEmail` |

---

## 8. Checklist Verifikasi Saat Membuat Fitur/Layanan Baru

Sebelum menandai pembuatan layanan baru selesai, pastikan checklist ini terpenuhi:
- [ ] Model Prisma memiliki kolom status, billing, suspendReason, dan terminationDate.
- [ ] Deduct saldo di `hourly-billing/route.ts` dan implementasi logic grace period 3 hari.
- [ ] Auto-unsuspend di `auto-unsuspend.ts` saat saldo cukup.
- [ ] Masuk ke perhitungan kalkulasi burn rate di `low-balance-alert.ts`.
- [ ] Masuk ke query dan tampilan `payg-monitor`.
- [ ] Tersedia di profil admin `/admin/customers/[id]` dan tabel `allServices`.
- [ ] Handler `PUT .../status` untuk suspend (scale 0 / stop) & unsuspend (scale 1 / start).
- [ ] Handler `DELETE ...` untuk soft-terminate & hard-delete.
- [ ] Pembersihan resource fisik saat user di-delete oleh admin.
- [ ] Pre-flight capacity check & order rollback error handling.
- [ ] Tampil di customer `/dashboard/billing` dengan badge Grace Period jika suspended.
- [ ] Semua email notifikasi terkirim simetris.
- [ ] `npx tsc --noEmit` lulus tanpa error.
- [ ] Seluruh unit test vitest lulus.
