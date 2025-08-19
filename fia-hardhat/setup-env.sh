#!/bin/bash
# Environment Setup Script for FIACoin Development

set -e

ENV_TYPE=${1:-local}

echo "🚀 Setting up environment: $ENV_TYPE"

# Validate environment type
if [[ "$ENV_TYPE" != "local" && "$ENV_TYPE" != "staging" && "$ENV_TYPE" != "production" ]]; then
    echo "❌ Invalid environment type. Use: local, staging, or production"
    exit 1
fi

# Create symlink to appropriate .env file
cd "$(dirname "$0")"

if [ -L .env ]; then
    rm .env
fi

if [ -f ".env.$ENV_TYPE" ]; then
    ln -s ".env.$ENV_TYPE" .env
    echo "✅ Environment configured for: $ENV_TYPE"
    echo "📝 Using config file: .env.$ENV_TYPE"
else
    echo "❌ Environment file not found: .env.$ENV_TYPE"
    echo "📋 Please copy .env.example to .env.$ENV_TYPE and fill in your values"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🎉 Environment setup complete!"
echo ""
echo "📚 Available commands:"
echo "  npm run compile    - Compile contracts"
echo "  npm run test       - Run tests"
echo "  npm run coverage   - Run coverage analysis"
echo "  npm run deploy     - Deploy to current network"
echo ""
echo "🔧 Current environment: $ENV_TYPE"
echo "🌐 Check your .env file for network configuration"
