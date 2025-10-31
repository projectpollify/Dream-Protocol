#!/bin/bash
# Dream Protocol - Setup Script

set -e

echo "🚀 Dream Protocol - Initial Setup"
echo "=================================="
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed"
    echo "   Install with: npm install -g pnpm"
    exit 1
fi

echo "✅ pnpm found"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found - Install Docker for easy deployment"
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env

    # Generate master encryption key
    MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i.bak "s/generate_your_own_32_byte_hex_key_here/$MASTER_KEY/" .env

    # Generate IP hash salt
    IP_SALT=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
    sed -i.bak "s/your_random_salt_here/$IP_SALT/" .env

    rm -f .env.bak

    echo "✅ .env created with generated secrets"
    echo "   ⚠️  Update DB_PASSWORD before deploying to production!"
else
    echo "✅ .env already exists"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start database: docker-compose up -d postgres"
echo "  2. Run migrations: pnpm db:migrate"
echo "  3. Start Identity module: pnpm identity:dev"
echo "  OR"
echo "  Run everything: docker-compose up"
echo ""
