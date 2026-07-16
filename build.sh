#!/bin/bash
# Exit on any error
set -e

echo "🚀 Starting Deployment Build Process..."

echo "📦 1. Building Frontend..."
cd frontend
npm install
npm run build
cd ..

echo "🐍 2. Installing Backend Dependencies..."
cd backend
pip install -r requirements.txt
cd ..

echo "✅ Build Complete! You can now start the server using the Procfile command."
