#!/bin/bash

set -e

echo "========================================="
echo " PM Platform - UAT Deployment"
echo "========================================="

echo ""
echo "Current directory:"
pwd

echo ""
echo "Current Git branch:"
git branch --show-current

echo ""
echo "Git status:"
git status --short

echo ""
echo "Ready to deploy."
