#!/bin/bash

# Converge Setup Script
# This script helps you set up the Converge project quickly

set -e

echo "🚀 Converge Setup Script"
echo "========================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found. Please install PostgreSQL 14+ to continue."
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt install postgresql"
    exit 1
fi

echo "✅ PostgreSQL detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and add your:"
    echo "   - Database connection URL"
    echo "   - Exchange API keys (at least one)"
    echo ""
    read -p "Press Enter after you've configured your .env file..."
else
    echo "✅ .env file already exists"
fi

# Database setup
echo ""
echo "🗄️  Setting up database..."
read -p "Have you created the PostgreSQL database? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running Prisma migrations..."
    npx prisma migrate dev --name init
    npx prisma generate
    echo "✅ Database setup complete"
else
    echo ""
    echo "Please create the database first:"
    echo "  createdb converge"
    echo ""
    echo "Then run this script again or manually run:"
    echo "  npx prisma migrate dev --name init"
    echo "  npx prisma generate"
    exit 1
fi

# Success message
echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 You're ready to go! Run the following to start:"
echo ""
echo "   npm run dev"
echo ""
echo "Then visit: http://localhost:3000"
echo ""
echo "📚 For more info, check:"
echo "   - README.md for full documentation"
echo "   - SETUP_GUIDE.md for quick reference"
echo ""
