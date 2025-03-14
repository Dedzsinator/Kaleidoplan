#!/bin/bash

# Configuration
PI_USERNAME="pi"
PI_HOSTNAME="raspberrypi.local"  # Change this to your Raspberry Pi hostname or IP
APP_DIR="/home/pi/kaleidoplan"

# Make sure we're in the project root
cd "$(dirname "$0")/.." || exit

# Check if SSH connection works
echo "Testing connection to Raspberry Pi..."
if ! ssh $PI_USERNAME@$PI_HOSTNAME "echo Connected successfully"; then
  echo "Failed to connect to Raspberry Pi. Please check your SSH configuration."
  exit 1
fi

# Copy project files to Raspberry Pi
echo "Copying project files to Raspberry Pi..."
rsync -av --exclude='node_modules' --exclude='.git' --exclude='.env' . $PI_USERNAME@$PI_HOSTNAME:$APP_DIR

# Copy environment file separately (you should create .env.production with the correct values)
scp .env.production $PI_USERNAME@$PI_HOSTNAME:$APP_DIR/.env

# SSH into the Raspberry Pi and start the application
echo "Starting the application on Raspberry Pi..."
ssh $PI_USERNAME@$PI_HOSTNAME "cd $APP_DIR && docker-compose down && docker-compose build && docker-compose up -d"

echo "Deployment completed successfully!"