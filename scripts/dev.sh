#!/bin/bash

set -e

echo "========================================="
echo " PM Platform - Development Environment"
echo "========================================="

echo ""
echo "Starting Docker containers..."

docker compose --env-file .env.local up -d --build

echo ""
echo "Checking container status..."
docker compose ps

echo ""
echo "Frontend : http://localhost:3000"
echo "Backend  : http://localhost:3001"
echo ""
echo "Development environment is ready."
