#!/bin/bash
# Local OAuth Testing Script
# This script helps test OAuth authentication locally with different configurations

set -e

echo "🚀 Claude Arena - Local OAuth Testing Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the frontend directory"
    exit 1
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $port is already in use"
        return 1
    else
        return 0
    fi
}

# Function to wait for server to start
wait_for_server() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for server to start at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "Server is running at $url"
            return 0
        fi
        
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    print_error "Server did not start within $max_attempts seconds"
    return 1
}

# Main menu
show_menu() {
    echo ""
    echo "Select testing mode:"
    echo "1) Development Mode (with OAuth debug enabled)"
    echo "2) Production Simulation Mode (debug disabled)"
    echo "3) Clean State Test (clear all localStorage/sessionStorage)"
    echo "4) OAuth Diagnostics Only"
    echo "5) Test with Different Browsers"
    echo "6) Exit"
    echo ""
}

# Development mode testing
test_development_mode() {
    print_status "Starting Development Mode OAuth Testing..."
    
    # Ensure .env.local exists and has debug enabled
    if [ ! -f ".env.local" ]; then
        print_error ".env.local file not found! Please create it first."
        return 1
    fi
    
    # Check if debug flags are enabled
    if ! grep -q "VITE_OAUTH_DEBUG=true" .env.local; then
        print_warning "OAuth debug not enabled in .env.local"
        print_status "Adding debug flags..."
        echo "VITE_OAUTH_DEBUG=true" >> .env.local
        echo "VITE_SESSION_DEBUG=true" >> .env.local
    fi
    
    # Check port availability
    if ! check_port 8282; then
        print_error "Port 8282 is already in use. Please stop the existing process."
        return 1
    fi
    
    print_status "Starting Vite development server..."
    npm run dev &
    DEV_PID=$!
    
    # Wait for server to start
    if wait_for_server "http://localhost:8282"; then
        print_success "Development server started successfully!"
        print_status "🌐 Open http://localhost:8282 in your browser"
        print_status "📱 OAuth Diagnostics Panel will be available in development mode"
        print_status "🔍 Check browser console for detailed OAuth debugging info"
        print_status ""
        print_status "Press Enter to stop the server..."
        read
    fi
    
    # Stop the development server
    kill $DEV_PID 2>/dev/null || true
    print_success "Development server stopped"
}

# Production simulation mode
test_production_mode() {
    print_status "Starting Production Simulation Mode..."
    
    # Use production environment
    export VITE_ENV_FILE=".env.production"
    
    print_status "Building application for production simulation..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Build completed successfully!"
        
        print_status "Starting preview server..."
        npm run preview &
        PREVIEW_PID=$!
        
        # Wait for preview server (usually runs on port 4173)
        if wait_for_server "http://localhost:4173"; then
            print_success "Production simulation server started!"
            print_status "🌐 Open http://localhost:4173 in your browser"
            print_status "🔧 This simulates production OAuth behavior"
            print_status ""
            print_status "Press Enter to stop the server..."
            read
        fi
        
        # Stop the preview server
        kill $PREVIEW_PID 2>/dev/null || true
        print_success "Production simulation server stopped"
    else
        print_error "Build failed! Check the error messages above."
    fi
}

# Clean state testing
test_clean_state() {
    print_status "Testing with Clean State..."
    
    cat << 'EOF'
🧹 Clean State Testing Instructions:

1. Open your browser's Developer Tools (F12)
2. Go to Application/Storage tab
3. Clear all data:
   - localStorage: Clear all entries
   - sessionStorage: Clear all entries
   - Cookies: Clear supabase-related cookies
   
4. Or run this in the browser console:
   localStorage.clear();
   sessionStorage.clear();
   
5. Reload the page and test OAuth flow

This helps identify if OAuth issues are related to corrupted browser storage.
EOF
    
    echo ""
    print_status "Would you like to start the development server for clean state testing? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        test_development_mode
    fi
}

# OAuth diagnostics only
test_oauth_diagnostics() {
    print_status "OAuth Diagnostics Information..."
    
    cat << 'EOF'
🔍 OAuth Diagnostics Available:

1. OAuth Diagnostics Panel (Development Mode Only):
   - Automatic detection in the running app
   - Tests token endpoint accessibility
   - Validates request parameters
   - Simulates token exchange

2. Browser Console Commands:
   - Check current session: supabase.auth.getSession()
   - Check localStorage: localStorage.getItem('claude-arena-auth-token')
   - Test Supabase connection: fetch('https://xrkueiadnofgkodbczvg.supabase.co/auth/v1/settings')

3. Manual URL Testing:
   - Test OAuth callback: http://localhost:8282/auth/callback
   - Test login page: http://localhost:8282/login

4. Common Issues to Check:
   - Port mismatch (using 8282 vs 5173)
   - Supabase redirect URL configuration
   - OAuth provider redirect URI settings
   - CORS issues
   - Invalid characters in OAuth parameters
EOF
    
    echo ""
    print_status "Press Enter to continue..."
    read
}

# Browser testing
test_different_browsers() {
    print_status "Multi-Browser OAuth Testing..."
    
    cat << 'EOF'
🌐 Testing OAuth with Different Browsers:

Recommended testing sequence:
1. Chrome (primary development browser)
2. Firefox (different cookie/storage behavior)
3. Safari (strict privacy settings)
4. Chrome Incognito (clean session)
5. Firefox Private Browsing

Common browser-specific issues:
- Safari: Intelligent Tracking Prevention can block OAuth
- Firefox: Enhanced Tracking Protection may interfere
- Chrome: Third-party cookie restrictions

For each browser:
1. Test normal OAuth flow
2. Test with cleared storage
3. Check browser privacy settings
4. Test OAuth callback handling
EOF
    
    echo ""
    print_status "Would you like to start the development server for browser testing? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        test_development_mode
    fi
}

# Main script loop
main() {
    while true; do
        show_menu
        read -p "Choose an option (1-6): " choice
        
        case $choice in
            1)
                test_development_mode
                ;;
            2)
                test_production_mode
                ;;
            3)
                test_clean_state
                ;;
            4)
                test_oauth_diagnostics
                ;;
            5)
                test_different_browsers
                ;;
            6)
                print_success "Exiting OAuth testing script"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please choose 1-6."
                ;;
        esac
    done
}

# Cleanup function
cleanup() {
    print_status "Cleaning up background processes..."
    jobs -p | xargs -r kill
    print_success "Cleanup complete"
}

# Set up cleanup trap
trap cleanup EXIT

# Check dependencies
print_status "Checking dependencies..."

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js and npm first."
    exit 1
fi

if ! command -v curl &> /dev/null; then
    print_error "curl is not installed. Please install curl first."
    exit 1
fi

if ! command -v lsof &> /dev/null; then
    print_warning "lsof is not available. Port checking will be skipped."
fi

print_success "All dependencies are available"

# Start main script
main