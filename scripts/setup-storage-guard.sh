#!/bin/bash
# ==============================================================================
# Masdika.ID - Automated Server Storage Guard Setup Script
# Target: Ubuntu 24.04 / 26.04 LTS with K3s (Server: 192.168.79.4)
# ==============================================================================
# Fungsi: Menerapkan 3 lapis proteksi penyimpanan agar disk tidak pernah penuh:
#   1. K3s Kubelet Image Garbage Collection (Threshold 60% / 45%) + Log Limit
#   2. Systemd Journald Hard-Cap (Max 500MB, Retention 7 Hari)
#   3. Daily Maintenance Cron Daemon (Prune containerd, docker, & journalctl)
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Skrip ini harus dijalankan sebagai root (gunakan sudo)."
    exit 1
fi

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}    Masdika.ID - Server Storage Guard Configuration   ${NC}"
echo -e "${BLUE}======================================================${NC}"

# ------------------------------------------------------------------------------
# 1. K3s Kubelet Image GC & Container Log Limit
# ------------------------------------------------------------------------------
log_info "1/3 Mengonfigurasi K3s Kubelet Image GC & Log Limits..."
mkdir -p /etc/rancher/k3s

cat << 'EOF' > /etc/rancher/k3s/config.yaml
# Auto Garbage Collection & Container Log Control
kubelet-arg:
  - image-gc-high-threshold=60
  - image-gc-low-threshold=45
  - container-log-max-size=10Mi
  - container-log-max-files=3
EOF

log_info "Memeriksa status layanan k3s..."
if systemctl is-active --quiet k3s; then
    log_info "Me-restart k3s untuk mengaktifkan konfigurasi baru..."
    systemctl restart k3s
    sleep 3
    if systemctl is-active --quiet k3s; then
        log_success "K3s berhasil di-restart dengan Kubelet GC (High: 60%, Low: 45%)."
    else
        log_warn "K3s restart membutuhkan waktu lebih lama. Silakan periksa 'systemctl status k3s'."
    fi
else
    log_warn "Layanan k3s tidak sedang aktif, konfigurasi telah disimpan di /etc/rancher/k3s/config.yaml."
fi

# ------------------------------------------------------------------------------
# 2. Systemd Journald Storage Hard-Cap
# ------------------------------------------------------------------------------
log_info "2/3 Mengonfigurasi Systemd Journald Storage Limit (Max 500M, Retensi 7 Hari)..."
mkdir -p /etc/systemd/journald.conf.d

cat << 'EOF' > /etc/systemd/journald.conf.d/00-limits.conf
[Journal]
SystemMaxUse=500M
RuntimeMaxUse=100M
MaxRetentionSec=7day
EOF

systemctl restart systemd-journald
log_success "Systemd Journald berhasil di-restart dengan batas maksimal 500M."

# ------------------------------------------------------------------------------
# 3. Daily Automated Cleanup Daemon (Cron)
# ------------------------------------------------------------------------------
log_info "3/3 Memasang skrip pembersihan otomatis harian di /etc/cron.daily/masdika-cleanup..."

cat << 'EOF' > /etc/cron.daily/masdika-cleanup
#!/bin/bash
# Clean unused K3s containerd images from past GitOps deployments
if command -v k3s >/dev/null 2>&1; then
    k3s crictl rmi --prune >/dev/null 2>&1 || true
fi

# Clean unused standalone Docker images/volumes
if command -v docker >/dev/null 2>&1; then
    docker system prune -af >/dev/null 2>&1 || true
fi

# Keep systemd journals to 7 days max
if command -v journalctl >/dev/null 2>&1; then
    journalctl --vacuum-time=7d >/dev/null 2>&1 || true
fi
EOF

chmod 755 /etc/cron.daily/masdika-cleanup
log_success "Cron harian /etc/cron.daily/masdika-cleanup aktif dengan izin eksekusi 755."

# ------------------------------------------------------------------------------
# 4. Ringkasan Status Storage Saat Ini
# ------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  Semua Lapis Proteksi Storage Berhasil Diterapkan!   ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo ""
df -h /
echo ""
log_info "Pemeriksaan Kubelet arguments di K3s:"
if command -v journalctl >/dev/null 2>&1; then
    journalctl -u k3s -b --no-pager | grep -i "image-gc" | tail -n 1 || true
fi

