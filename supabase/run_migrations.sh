#!/bin/bash

# Supabase Migration Runner
# This script helps run migrations in the correct order

echo "=== Supabase Migration Runner ==="
echo "This script will guide you through running the migrations"
echo ""

# Check if .env exists
if [ ! -f "../.env" ]; then
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

# Load environment variables
export $(cat ../.env | grep -v '^#' | xargs)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Function to run a migration
run_migration() {
    local migration_file=$1
    local description=$2
    
    echo "📄 Running: $description"
    echo "   File: $migration_file"
    
    if [ ! -f "$migration_file" ]; then
        echo "   ❌ File not found!"
        return 1
    fi
    
    echo ""
    echo "To run this migration:"
    echo "1. Go to your Supabase dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and paste the contents of $migration_file"
    echo "4. Click 'Run'"
    echo ""
    
    read -p "Press Enter when done (or 's' to skip): " response
    
    if [ "$response" = "s" ]; then
        echo "   ⏭️  Skipped"
    else
        echo "   ✅ Completed"
    fi
    
    echo ""
}

# Run migrations in order
echo "Starting migrations..."
echo ""

run_migration "migrations/001_initial_schema.sql" "Initial Schema (users, teams, agents)"
run_migration "migrations/002_auth_trigger.sql" "Authentication Trigger"
run_migration "migrations/003_rls_policies.sql" "Row Level Security Policies"

echo ""
echo "=== Migration Summary ==="
echo ""
echo "✅ All migrations processed!"
echo ""
echo "Next steps:"
echo "1. Enable OAuth providers in Supabase dashboard"
echo "2. Test authentication with: python examples/test_auth.py"
echo "3. Check the API docs at: http://localhost:8000/docs"
echo ""

# Make script executable
chmod +x "$0"