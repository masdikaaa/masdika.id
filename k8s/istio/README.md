# Masdika.ID - Istio Service Mesh (Enterprise Zero-Trust)

Manifest dan skrip instalasi **Istio Service Mesh** untuk arsitektur Kubernetes Masdika.ID, dirancang khusus untuk memenuhi standar keamanan industri **ISO 27001** dan **SOC 2 Type II**.

---

## 📁 Struktur Berkas

| Berkas | Deskripsi |
| :--- | :--- |
| [`istio-controlplane.yaml`](file:///c:/laragon/www/masdika/k8s/istio/istio-controlplane.yaml) | Konfigurasi IstioOperator untuk deploy `istiod` dan `istio-ingressgateway` dengan tuning resource optimal. |
| [`peer-authentication.yaml`](file:///c:/laragon/www/masdika/k8s/istio/peer-authentication.yaml) | Mengaktifkan **STRICT Mutual TLS (mTLS)** di seluruh namespace `masdika` dengan auto-rotation sertifikat x509. |
| [`authorization-policies.yaml`](file:///c:/laragon/www/masdika/k8s/istio/authorization-policies.yaml) | Kebijakan Layer 7 Zero-Trust: membatasi akses antar pod (hanya pod berwenang yang bisa mengakses database, redis, kafka). |
| [`gateway-virtualservice.yaml`](file:///c:/laragon/www/masdika/k8s/istio/gateway-virtualservice.yaml) | Ingress Gateway, VirtualService (Canary routing, timeout, retry), and DestinationRule (Circuit Breakers). |
| [`telemetry.yaml`](file:///c:/laragon/www/masdika/k8s/istio/telemetry.yaml) | Konfigurasi JSON access logs dan distributed tracing (OpenTelemetry/Jaeger/APM). |
| [`install-istio.sh`](file:///c:/laragon/www/masdika/k8s/istio/install-istio.sh) | Skrip instalasi otomatis: mengunduh `istioctl`, memasang control plane, menyuntikkan sidecar Envoy, dan me-restart pod. |

---

## 🚀 Cara Instalasi di Server K3s

Jalankan skrip instalasi satu perintah berikut di server master Kubernetes:

```bash
cd /root/masdika/k8s/istio # atau path repository Anda
chmod +x install-istio.sh
./install-istio.sh
```

Atau terapkan secara manual langkah demi langkah:

```bash
# 1. Download & Pasang istioctl
curl -sL https://istio.io/downloadIstio | ISTIO_VERSION=1.24.2 sh -
sudo mv istio-1.24.2/bin/istioctl /usr/local/bin/

# 2. Pasang Control Plane
istioctl install -f k8s/istio/istio-controlplane.yaml -y

# 3. Aktifkan Auto-Injection Envoy Sidecar pada namespace masdika
kubectl label namespace masdika istio-injection=enabled --overwrite

# 4. Terapkan Security, Routing, & Telemetry
kubectl apply -f k8s/istio/peer-authentication.yaml
kubectl apply -f k8s/istio/authorization-policies.yaml
kubectl apply -f k8s/istio/gateway-virtualservice.yaml
kubectl apply -f k8s/istio/telemetry.yaml

# 5. Pasang Add-on Observabilitas (Kiali & Jaeger)
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/kiali.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/jaeger.yaml

# 6. Restart Pod agar Envoy Sidecar aktif (status pod menjadi 2/2)
kubectl rollout restart deployment masdika-app masdika-worker -n masdika
```

---

## 📊 Membuka Dashboard Visual Kiali & Tracing

Setelah terpasang, Anda bisa memantau topologi trafik secara visual:

```bash
# Buka dashboard Kiali (Peta Topologi Layanan Live)
istioctl dashboard kiali

# Buka dashboard Jaeger (Distributed Tracing Latensi Request)
istioctl dashboard jaeger
```

---

## 🔀 Cara Melakukan Canary Deployment (Rilis Bertahap)

Saat Anda merilis versi baru aplikasi, Anda bisa membagi trafik di `gateway-virtualservice.yaml`:

```yaml
    - name: "masdika-web-route"
      route:
        - destination:
            host: masdika-app.masdika.svc.cluster.local
            subset: v1
          weight: 90 # 90% user ke versi stabil
        - destination:
            host: masdika-app.masdika.svc.cluster.local
            subset: v2
          weight: 10 # 10% user ke versi baru (Canary)
```
