#!/bin/bash

# WaitLess Deployment Script
# This script deploys the WaitLess application to production

set -e

echo "Starting WaitLess deployment..."

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo "Error: .env.prod file not found!"
    echo "Please copy .env.prod.example to .env.prod and configure your environment variables."
    exit 1
fi

# Load environment variables
source .env.prod

# Check required environment variables
required_vars=("POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB" "JWT_SECRET" "CLIENT_URL" "NEXT_PUBLIC_API_URL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: Environment variable $var is not set!"
        exit 1
    fi
done

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

# Check if SSL certificates exist
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    echo "Warning: SSL certificates not found in nginx/ssl/"
    echo "Please add your SSL certificates or use Let's Encrypt:"
    echo "  certbot certonly --standalone -d yourdomain.com"
    echo "  cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem"
    echo "  cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem"
    echo ""
    echo "For development, you can generate self-signed certificates:"
    echo "  openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem"
    exit 1
fi

# Stop existing containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Pull latest images
echo "Pulling latest images..."
docker-compose -f docker-compose.prod.yml pull

# Build and start containers
echo "Building and starting containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Run database migrations
echo "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Check if services are healthy
echo "Checking service health..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "Deployment successful! Application is running."
else
    echo "Deployment failed! Check logs with: docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi

echo "Deployment completed successfully!"
echo "Frontend: https://yourdomain.com"
echo "Backend API: https://yourdomain.com/api"
echo "Health Check: https://yourdomain.com/health"
