#!/usr/bin/env bash
set -e

MANIFEST_URL="https://raw.githubusercontent.com/masdikaaa/masdika.id/master/k8s/app/deployment.yaml"
REMOTE_IMAGE=$(curl -sSL "$MANIFEST_URL" | grep -m1 "image: andikaferdialvianto/masdika-id:" | awk '{print $2}')

if [ -z "$REMOTE_IMAGE" ]; then
  exit 0
fi

CURRENT_IMAGE=$(kubectl get deployment masdika-app -n masdika -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "none")

if [ "$REMOTE_IMAGE" != "$CURRENT_IMAGE" ]; then
  echo "$(date): Found new image in GitOps manifest: $REMOTE_IMAGE (current: $CURRENT_IMAGE). Applying update..."
  kubectl apply -f "$MANIFEST_URL" -n masdika
  kubectl rollout status deployment/masdika-app -n masdika --timeout=180s
  echo "$(date): Deployment updated and healthy: $REMOTE_IMAGE"
fi

