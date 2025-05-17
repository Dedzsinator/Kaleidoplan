#!/bin/bash
# Kaleidoplan Kubernetes Deployment Script

set -e

# Check for kubectl
if ! command -v kubectl &> /dev/null; then
    echo "kubectl not found. Please install kubectl first."
    exit 1
fi

# Ask for registry info if not provided
if [ -z "$REGISTRY" ]; then
    read -p "Container Registry (default: ghcr.io): " REGISTRY
    REGISTRY=${REGISTRY:-ghcr.io}
fi

if [ -z "$REGISTRY_USER" ]; then
    read -p "Registry Username: " REGISTRY_USER
fi

# Ask for image tags
if [ -z "$FRONTEND_IMAGE" ]; then
    read -p "Frontend Image (default: $REGISTRY_USER/kaleidoplan-frontend:latest): " FRONTEND_IMAGE
    FRONTEND_IMAGE=${FRONTEND_IMAGE:-$REGISTRY_USER/kaleidoplan-frontend:latest}
fi

if [ -z "$BACKEND_IMAGE" ]; then
    read -p "Backend Image (default: $REGISTRY_USER/kaleidoplan-backend:latest): " BACKEND_IMAGE
    BACKEND_IMAGE=${BACKEND_IMAGE:-$REGISTRY_USER/kaleidoplan-backend:latest}
fi

# Create temp directory for rendered manifests
TEMP_DIR=$(mktemp -d)
echo "Creating temporary directory for rendered manifests: $TEMP_DIR"

# Copy all manifest files
cp -r kubernetes/* $TEMP_DIR/

# Update image names in deployment files
sed -i "s|\${REGISTRY}/\${IMAGE_NAME_FRONTEND}|$FRONTEND_IMAGE|g" $TEMP_DIR/frontend-deployment.yaml
sed -i "s|\${REGISTRY}/\${IMAGE_NAME_BACKEND}|$BACKEND_IMAGE|g" $TEMP_DIR/backend-deployment.yaml

# Create namespace
echo "Creating namespace 'kaleidoplan'..."
kubectl apply -f $TEMP_DIR/namespace.yaml

# Ask for Firebase credentials for secret
echo "Creating Firebase credentials secret..."
# Check if you want to input the values or use existing ones
read -p "Do you want to provide Firebase credentials now? (y/n, default: y): " CREATE_FIREBASE_SECRET
CREATE_FIREBASE_SECRET=${CREATE_FIREBASE_SECRET:-y}

if [ "$CREATE_FIREBASE_SECRET" = "y" ]; then
    read -p "Firebase API Key: " FIREBASE_API_KEY
    read -p "Firebase Auth Domain: " FIREBASE_AUTH_DOMAIN
    read -p "Firebase Project ID: " FIREBASE_PROJECT_ID
    read -p "Firebase Storage Bucket: " FIREBASE_STORAGE_BUCKET
    read -p "Firebase Messaging Sender ID: " FIREBASE_MESSAGING_SENDER_ID
    read -p "Firebase App ID: " FIREBASE_APP_ID
    read -p "Firebase Measurement ID: " FIREBASE_MEASUREMENT_ID
    
    cat <<EOF > $TEMP_DIR/firebase-secret-rendered.yaml
apiVersion: v1
kind: Secret
metadata:
  name: firebase-credentials
  namespace: kaleidoplan
type: Opaque
data:
  api-key: $(echo -n "$FIREBASE_API_KEY" | base64)
  auth-domain: $(echo -n "$FIREBASE_AUTH_DOMAIN" | base64)
  project-id: $(echo -n "$FIREBASE_PROJECT_ID" | base64)
  storage-bucket: $(echo -n "$FIREBASE_STORAGE_BUCKET" | base64)
  messaging-sender-id: $(echo -n "$FIREBASE_MESSAGING_SENDER_ID" | base64)
  app-id: $(echo -n "$FIREBASE_APP_ID" | base64)
  measurement-id: $(echo -n "$FIREBASE_MEASUREMENT_ID" | base64)
EOF
    kubectl apply -f $TEMP_DIR/firebase-secret-rendered.yaml
else
    echo "Skipping Firebase secret creation. Make sure to create it manually."
fi

# Create persistent volume claims
echo "Creating persistent volume claims..."
kubectl apply -f $TEMP_DIR/persistent-volumes.yaml

# Deploy MongoDB
echo "Deploying MongoDB..."
kubectl apply -f $TEMP_DIR/mongo-deployment.yaml
kubectl apply -f $TEMP_DIR/mongo-service.yaml

# Deploy Backend
echo "Deploying Backend..."
kubectl apply -f $TEMP_DIR/backend-deployment.yaml
kubectl apply -f $TEMP_DIR/backend-service.yaml

# Deploy Frontend
echo "Deploying Frontend..."
kubectl apply -f $TEMP_DIR/frontend-deployment.yaml
kubectl apply -f $TEMP_DIR/frontend-service.yaml

# Update and deploy ingress
read -p "Enter the hostname for your application (default: kaleidoplan.example.com): " HOSTNAME
HOSTNAME=${HOSTNAME:-kaleidoplan.example.com}
sed -i "s|kaleidoplan.example.com|$HOSTNAME|g" $TEMP_DIR/ingress.yaml

echo "Deploying Ingress with hostname: $HOSTNAME"
kubectl apply -f $TEMP_DIR/ingress.yaml

# Clean up temporary directory
echo "Cleaning up temporary files..."
rm -rf $TEMP_DIR

echo "Deployment completed successfully!"
echo "Run 'kubectl get pods -n kaleidoplan' to check the status of your pods."
echo "Once all pods are running, your application will be available at: http://$HOSTNAME"
