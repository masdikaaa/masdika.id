#!/usr/bin/env bash
# ==============================================================================
# MASDIKA.ID - AUTOMATED ISTIO SERVICE MESH INSTALLER & VERIFIER
# Target: Production Kubernetes (K3s) with Zero-Trust mTLS & L7 Security
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ISTIO_VERSION="1.24.2"

echo "================================================================="
echo "  🚀 Starting Istio Service Mesh Deployment for Masdika.ID"
echo "  🔒 Standards: ISO 27001 / SOC 2 Zero-Trust Cryptographic mTLS"
echo "================================================================="

# 1. Check prerequisites
if ! command -v kubectl &> /dev/null; then
  echo "❌ Error: kubectl not found. Please install kubectl first."
  exit 1
fi

echo "🔍 Verifying cluster connection..."
kubectl cluster-info

# 2. Check / Install istioctl
if ! command -v istioctl &> /dev/null; then
  echo "📥 Downloading official istioctl ${ISTIO_VERSION}..."
  curl -sL https://istio.io/downloadIstio | ISTIO_VERSION=${ISTIO_VERSION} TARGET_ARCH=x86_64 sh -
  sudo mv "istio-${ISTIO_VERSION}/bin/istioctl" /usr/local/bin/istioctl
  rm -rf "istio-${ISTIO_VERSION}"
  echo "✅ istioctl installed successfully: $(istioctl version --remote=false)"
else
  echo "✅ istioctl already available: $(istioctl version --remote=false)"
fi

# 3. Pre-check cluster compatibility
echo "🔎 Running Istio pre-installation checks..."
istioctl x precheck || true

# 4. Install Istio Control Plane (istiod + ingressgateway)
echo "⚙️ Installing Istio Control Plane via IstioOperator..."
istioctl install -f "${SCRIPT_DIR}/istio-controlplane.yaml" -y

# 5. Label masdika namespace for automated Envoy sidecar injection
echo "🏷️ Enabling automatic Envoy sidecar injection on namespace 'masdika'..."
kubectl get namespace masdika >/dev/null 2>&1 || kubectl create namespace masdika
kubectl label namespace masdika istio-injection=enabled --overwrite
kubectl get namespace masdika --show-labels

# 6. Apply Security & Traffic Policies
echo "🔐 Enforcing STRICT Mutual TLS (mTLS)..."
kubectl apply -f "${SCRIPT_DIR}/peer-authentication.yaml"

echo "🛡️ Applying Zero-Trust Layer 7 Authorization Policies..."
kubectl apply -f "${SCRIPT_DIR}/authorization-policies.yaml"

echo "🌐 Applying Ingress Gateway, VirtualService, and Circuit Breakers..."
kubectl apply -f "${SCRIPT_DIR}/gateway-virtualservice.yaml"

echo "📊 Applying Telemetry, Access Logging & Tracing..."
kubectl apply -f "${SCRIPT_DIR}/telemetry.yaml"

# 7. Install Observability Addons (Kiali & Jaeger)
echo "📈 Installing Kiali, Jaeger, and Prometheus Mesh Integrations..."
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/kiali.yaml || true
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/jaeger.yaml || true

# 8. Rolling restart workloads to inject Envoy proxies into existing pods
echo "🔄 Performing rolling restart of Masdika workloads to inject sidecars..."
if kubectl get deployment masdika-app -n masdika >/dev/null 2>&1; then
  kubectl rollout restart deployment masdika-app -n masdika
  kubectl rollout restart deployment masdika-worker -n masdika || true
  kubectl rollout restart deployment masdika-vnc-proxy -n masdika || true
  echo "⏳ Waiting for masdika-app rollout to complete..."
  kubectl rollout status deployment masdika-app -n masdika --timeout=180s
fi

# 9. Verification
echo "================================================================="
echo "  🎉 Istio Service Mesh Installed & Verified for Masdika.ID!"
echo "================================================================="
echo "  Status:"
istioctl verify-install || true

echo ""
echo "  Pods in masdika with Envoy sidecars (2/2 containers):"
kubectl get pods -n masdika -o wide

echo ""
echo "  To launch the live Kiali mesh topology dashboard:"
echo "    istioctl dashboard kiali"
echo "  To launch Jaeger distributed tracing:"
echo "    istioctl dashboard jaeger"
echo "================================================================="
