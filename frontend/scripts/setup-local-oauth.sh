#!/bin/bash
# Quick Setup Script for Local OAuth Testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 Claude Arena - Local OAuth Setup"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the frontend directory"
    exit 1
fi

# 1. Check if .env.local exists
print_status "Checking environment configuration..."

if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found, creating from example..."
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        print_success "Created .env.local from example"
    else
        print_error ".env.local.example not found!"
        exit 1
    fi
else
    print_success ".env.local found"
fi

# 2. Verify environment variables are set
print_status "Validating environment variables..."

ENV_VALID=true

if ! grep -q "VITE_SUPABASE_URL=" .env.local || grep -q "VITE_SUPABASE_URL=https://YOUR_PROJECT_ID" .env.local; then
    print_error "VITE_SUPABASE_URL not properly configured in .env.local"
    ENV_VALID=false
fi

if ! grep -q "VITE_SUPABASE_ANON_KEY=" .env.local || grep -q "VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY" .env.local; then
    print_error "VITE_SUPABASE_ANON_KEY not properly configured in .env.local"
    ENV_VALID=false
fi

if [ "$ENV_VALID" = false ]; then
    print_error "Please configure your Supabase credentials in .env.local"
    print_status "Edit .env.local and set:"
    echo "  VITE_SUPABASE_URL=https://your-project.supabase.co"
    echo "  VITE_SUPABASE_ANON_KEY=your-anon-key"
    exit 1
fi

# 3. Extract Supabase project ID for redirect URL
SUPABASE_URL=$(grep "VITE_SUPABASE_URL=" .env.local | cut -d'=' -f2)
PROJECT_ID=$(echo "$SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co||')

print_success "Environment configuration is valid"
print_status "Supabase Project ID: $PROJECT_ID"

# 4. Display configuration checklist
echo ""
print_status "📋 REQUIRED SUPABASE CONFIGURATION:"
echo "========================================"
echo ""
echo "1. 🌐 In Supabase Dashboard → Authentication → URL Configuration:"
echo "   Site URL: http://localhost:8282"
echo ""
echo "   Redirect URLs:"
echo "   - http://localhost:8282/"
echo "   - http://localhost:8282/dashboard"
echo "   - http://localhost:8282/auth/callback"
echo "   - http://localhost:8282/login"
echo "   - $SUPABASE_URL/auth/v1/callback"
echo ""
echo "2. 🔑 In Google Cloud Console (for Google OAuth):"
echo "   Authorized JavaScript Origins:"
echo "   - http://localhost:8282"
echo "   - $SUPABASE_URL"
echo ""
echo "   Authorized Redirect URIs:"
echo "   - $SUPABASE_URL/auth/v1/callback"
echo "   - http://localhost:8282/auth/callback"
echo ""
echo "3. 🐱 In GitHub OAuth App (for GitHub OAuth):"
echo "   Authorization callback URL:"
echo "   - $SUPABASE_URL/auth/v1/callback"
echo ""

# 5. Check if dependencies are installed
print_status "Checking dependencies..."

if [ ! -d "node_modules" ]; then
    print_warning "Dependencies not installed, installing..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# 6. Check port availability
if command -v lsof >/dev/null 2>&1; then
    if lsof -Pi :8282 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 8282 is already in use"
        print_status "You may need to stop the existing process before testing"
    else
        print_success "Port 8282 is available"
    fi
fi

# 7. Create scripts directory if it doesn't exist
if [ ! -d "scripts" ]; then
    mkdir scripts
    print_success "Created scripts directory"
fi

echo ""
print_success "✅ Local OAuth setup complete!"
echo ""
print_status "Next steps:"
echo "1. Configure Supabase URLs as shown above"
echo "2. Configure OAuth providers as shown above"
echo "3. Run: ./scripts/test-oauth-local.sh"
echo ""
print_status "Quick start:"
echo "  npm run dev"
echo "  # Then open http://localhost:8282 in your browser"
echo ""

# 8. Ask if user wants to start the development server
echo ""
read -p "🚀 Would you like to start the development server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Starting development server..."
    npm run dev
fi