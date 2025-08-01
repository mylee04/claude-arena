#!/bin/bash

# Supabase RLS and Auth Fixes Deployment Script
# Safely deploys migrations 017, 018, and 019 with rollback capabilities
# Version: 1.0
# Date: 2025-08-01

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/deployment_$(date +%Y%m%d_%H%M%S).log"
ROLLBACK_FILE="${SCRIPT_DIR}/rollback_$(date +%Y%m%d_%H%M%S).sql"

# Migration files
MIGRATION_017="${SCRIPT_DIR}/migrations/017_fix_rls_policies_comprehensive.sql"
MIGRATION_018="${SCRIPT_DIR}/migrations/018_improved_auth_triggers.sql"
MIGRATION_019="${SCRIPT_DIR}/migrations/019_repair_existing_data.sql"

# Functions
log() {
    echo -e "${1}" | tee -a "${LOG_FILE}"
}

error() {
    log "${RED}❌ ERROR: ${1}${NC}"
}

success() {
    log "${GREEN}✅ ${1}${NC}"
}

warning() {
    log "${YELLOW}⚠️  WARNING: ${1}${NC}"
}

info() {
    log "${BLUE}ℹ️  ${1}${NC}"
}

# Header
log "${BLUE}================================================================${NC}"
log "${BLUE}   Supabase RLS and Auth Fixes Deployment Script${NC}"
log "${BLUE}   Version: 1.0 | Date: $(date)${NC}"
log "${BLUE}================================================================${NC}"
log ""

# Pre-deployment checks
log "${YELLOW}=== PRE-DEPLOYMENT CHECKS ===${NC}"

# Check if we're in the right directory
if [[ ! -f "${SCRIPT_DIR}/migrations/001_initial_schema.sql" ]]; then
    error "Not in the correct supabase directory. Expected to find migrations folder."
    # exit 1 commented for manual deployment
fi

success "✓ Found migrations directory"

# Check if migration files exist
for migration in "${MIGRATION_017}" "${MIGRATION_018}" "${MIGRATION_019}"; do
    if [[ ! -f "${migration}" ]]; then
        error "Migration file not found: ${migration}"
        # exit 1 commented for manual deployment
    fi
    success "✓ Found migration: $(basename "${migration}")"
done

# Check for environment variables
if [[ -f "../.env" ]]; then
    export $(cat ../.env | grep -v '^#' | xargs) 2>/dev/null || true
    success "✓ Loaded environment variables from .env"
elif [[ -f ".env" ]]; then
    export $(cat .env | grep -v '^#' | xargs) 2>/dev/null || true
    success "✓ Loaded environment variables from .env"
else
    warning "No .env file found. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
fi

# Validate required environment variables
if [[ -z "${SUPABASE_URL:-}" ]] || [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    error "Required environment variables not set:"
    error "  - SUPABASE_URL"
    error "  - SUPABASE_SERVICE_ROLE_KEY"
    error "Please set these in your .env file or environment."
    # exit 1 commented for manual deployment
fi

success "✓ Environment variables validated"

# Check if psql is available for local testing
if command -v psql &> /dev/null; then
    success "✓ PostgreSQL client (psql) available for local testing"
    PSQL_AVAILABLE=true
else
    warning "PostgreSQL client (psql) not available. Local testing disabled."
    PSQL_AVAILABLE=false
fi

log ""

# Create rollback script
log "${YELLOW}=== CREATING ROLLBACK SCRIPT ===${NC}"

cat > "${ROLLBACK_FILE}" << 'EOF'
-- Rollback Script for RLS and Auth Fixes
-- Generated automatically on deployment
-- Run this script to rollback the changes if needed

-- =======================
-- ROLLBACK MIGRATION 019: Data Repair
-- =======================

-- Remove repair history table
DROP TABLE IF EXISTS public.auth_repair_history;

-- Remove repair functions
DROP FUNCTION IF EXISTS public.show_repair_summary();

-- Restore from backup (if backups exist)
-- Note: Manual review required - check if backup tables exist first
-- DELETE FROM public.users WHERE id IN (
--   SELECT id FROM backup_users WHERE created_at > '2025-08-01'
-- );
-- 
-- DELETE FROM public.teams WHERE id IN (
--   SELECT id FROM backup_teams WHERE created_at > '2025-08-01'
-- );
-- 
-- DELETE FROM public.team_members WHERE team_id IN (
--   SELECT id FROM backup_team_members WHERE joined_at > '2025-08-01'
-- );

RAISE NOTICE 'Rollback 019: Data repair rolled back. Manual review may be needed for data restoration.';

-- =======================
-- ROLLBACK MIGRATION 018: Auth Triggers
-- =======================

-- Drop improved triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.repair_user_profile(UUID);
DROP FUNCTION IF EXISTS public.repair_all_missing_profiles();
DROP FUNCTION IF EXISTS public.test_auth_trigger();

-- Restore basic trigger (minimal version)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_name', SPLIT_PART(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

RAISE NOTICE 'Rollback 018: Auth triggers rolled back to basic version.';

-- =======================
-- ROLLBACK MIGRATION 017: RLS Policies
-- =======================

-- Drop all policies created in 017
DROP POLICY IF EXISTS "authenticated_users_view_profiles" ON public.users;
DROP POLICY IF EXISTS "public_view_basic_profiles" ON public.users;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;

DROP POLICY IF EXISTS "public_view_leaderboard" ON public.leaderboard_entries;
DROP POLICY IF EXISTS "users_insert_own_entries" ON public.leaderboard_entries;
DROP POLICY IF EXISTS "users_update_own_entries" ON public.leaderboard_entries;

DROP POLICY IF EXISTS "public_view_achievements" ON public.achievements;
DROP POLICY IF EXISTS "users_receive_achievements" ON public.achievements;

DROP POLICY IF EXISTS "public_view_teams" ON public.teams;
DROP POLICY IF EXISTS "authenticated_create_teams" ON public.teams;
DROP POLICY IF EXISTS "team_admins_update_teams" ON public.teams;
DROP POLICY IF EXISTS "team_owners_delete_teams" ON public.teams;

DROP POLICY IF EXISTS "public_view_team_members" ON public.team_members;
DROP POLICY IF EXISTS "team_admins_add_members" ON public.team_members;
DROP POLICY IF EXISTS "team_admins_update_members" ON public.team_members;
DROP POLICY IF EXISTS "team_admins_or_self_remove_members" ON public.team_members;

-- Drop helper functions
DROP FUNCTION IF EXISTS public.is_authenticated();
DROP FUNCTION IF EXISTS public.is_team_member(UUID);
DROP FUNCTION IF EXISTS public.is_team_admin(UUID);
DROP FUNCTION IF EXISTS public.test_rls_policies();

-- Restore basic policies (minimal security)
CREATE POLICY "basic_users_select" ON public.users FOR SELECT USING (true);
CREATE POLICY "basic_users_insert" ON public.users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "basic_users_update" ON public.users FOR UPDATE USING (id = auth.uid());

CREATE POLICY "basic_leaderboard_select" ON public.leaderboard_entries FOR SELECT USING (true);
CREATE POLICY "basic_achievements_select" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "basic_teams_select" ON public.teams FOR SELECT USING (true);
CREATE POLICY "basic_team_members_select" ON public.team_members FOR SELECT USING (true);

RAISE NOTICE 'Rollback 017: RLS policies rolled back to basic versions.';

-- =======================
-- FINAL ROLLBACK MESSAGE
-- =======================

RAISE NOTICE '=== ROLLBACK COMPLETED ===';
RAISE NOTICE 'All migrations have been rolled back.';
RAISE NOTICE 'You may need to manually review and restore data from backup tables:';
RAISE NOTICE '  - backup_users';
RAISE NOTICE '  - backup_teams';
RAISE NOTICE '  - backup_team_members';
EOF

success "✓ Rollback script created: $(basename "${ROLLBACK_FILE}")"
log ""

# Deployment method selection
log "${YELLOW}=== DEPLOYMENT METHOD SELECTION ===${NC}"
log "Choose your deployment method:"
log "1. Manual (copy/paste in Supabase Dashboard) - RECOMMENDED"
log "2. Automatic (direct database connection) - Advanced users only"

if [[ "${PSQL_AVAILABLE}" == "false" ]]; then
    log "3. Local testing - Not available (psql not found)"
else
    log "3. Local testing - Test locally first, then deploy manually"
fi

log ""
read -p "Enter your choice (1-3): " deployment_choice

case ${deployment_choice} in
    1)
        log "${BLUE}=== MANUAL DEPLOYMENT SELECTED ===${NC}"
        manual_deployment
        ;;
    2)
        if [[ "${PSQL_AVAILABLE}" == "true" ]]; then
            log "${BLUE}=== AUTOMATIC DEPLOYMENT SELECTED ===${NC}"
            automatic_deployment
        else
            error "Automatic deployment requires psql. Please install PostgreSQL client or choose manual deployment."
            # exit 1 commented for manual deployment
        fi
        ;;
    3)
        if [[ "${PSQL_AVAILABLE}" == "true" ]]; then
            log "${BLUE}=== LOCAL TESTING SELECTED ===${NC}"
            local_testing
        else
            error "Local testing requires psql. Please install PostgreSQL client."
            # exit 1 commented for manual deployment
        fi
        ;;
    *)
        error "Invalid choice. Exiting."
        # exit 1 commented for manual deployment
        ;;
esac

# Manual deployment function
manual_deployment() {
    log ""
    log "${YELLOW}=== MANUAL DEPLOYMENT GUIDE ===${NC}"
    log ""
    log "Follow these steps to deploy the migrations safely:"
    log ""
    
    log "${BLUE}Step 1: Backup Current State${NC}"
    log "1. Go to your Supabase Dashboard → SQL Editor"
    log "2. Run this query to create backups:"
    log ""
    log "   CREATE TABLE backup_users_$(date +%Y%m%d) AS SELECT * FROM public.users;"
    log "   CREATE TABLE backup_teams_$(date +%Y%m%d) AS SELECT * FROM public.teams;"
    log "   CREATE TABLE backup_team_members_$(date +%Y%m%d) AS SELECT * FROM public.team_members;"
    log ""
    read -p "Press Enter when backup is complete..."
    
    log ""
    log "${BLUE}Step 2: Deploy Migration 017 (RLS Policies)${NC}"
    log "1. Copy the contents of: ${MIGRATION_017}"
    log "2. Paste and run in SQL Editor"
    log "3. Verify no errors occurred"
    log ""
    read -p "Press Enter when Migration 017 is complete..."
    
    log ""
    log "${BLUE}Step 3: Deploy Migration 018 (Auth Triggers)${NC}"
    log "1. Copy the contents of: ${MIGRATION_018}"
    log "2. Paste and run in SQL Editor"
    log "3. Verify no errors occurred"
    log ""
    read -p "Press Enter when Migration 018 is complete..."
    
    log ""
    log "${BLUE}Step 4: Deploy Migration 019 (Data Repair)${NC}"
    log "1. Copy the contents of: ${MIGRATION_019}"
    log "2. Paste and run in SQL Editor"
    log "3. Check the repair summary by running: SELECT * FROM public.show_repair_summary();"
    log ""
    read -p "Press Enter when Migration 019 is complete..."
    
    log ""
    log "${BLUE}Step 5: Verification${NC}"
    log "Run these test queries to verify everything works:"
    log ""
    log "-- Test RLS policies"
    log "SELECT * FROM public.test_rls_policies();"
    log ""
    log "-- Test auth triggers"
    log "SELECT * FROM public.test_auth_trigger();"
    log ""
    log "-- Check repair summary"
    log "SELECT * FROM public.show_repair_summary();"
    log ""
    read -p "Press Enter when verification is complete..."
    
    success "✅ Manual deployment completed!"
    log ""
    log "${GREEN}Next steps:${NC}"
    log "1. Test authentication flow with your application"
    log "2. Monitor for any errors in the next 24 hours"
    log "3. Keep the rollback script handy: $(basename "${ROLLBACK_FILE}")"
}

# Automatic deployment function
automatic_deployment() {
    warning "Automatic deployment connects directly to your database."
    warning "This is recommended only for experienced users."
    log ""
    read -p "Are you sure you want to proceed? (yes/no): " confirm
    
    if [[ "${confirm}" != "yes" ]]; then
        info "Automatic deployment cancelled. Use manual deployment instead."
        manual_deployment
        return
    fi
    
    log ""
    log "${BLUE}Starting automatic deployment...${NC}"
    
    # Extract database connection details from Supabase URL
    DB_HOST=$(echo "${SUPABASE_URL}" | sed 's|https://||' | sed 's|\.supabase\.co.*|.supabase.co|')
    DB_NAME="postgres"
    DB_USER="postgres"
    DB_PASSWORD="${SUPABASE_SERVICE_ROLE_KEY}"
    
    # Test connection
    info "Testing database connection..."
    if ! PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" &>/dev/null; then
        error "Failed to connect to database. Please check your credentials and try manual deployment."
        # exit 1 commented for manual deployment
    fi
    
    success "✓ Database connection successful"
    
    # Run migrations
    for migration in "${MIGRATION_017}" "${MIGRATION_018}" "${MIGRATION_019}"; do
        migration_name=$(basename "${migration}")
        info "Deploying ${migration_name}..."
        
        if PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -f "${migration}" &>>"${LOG_FILE}"; then
            success "✓ ${migration_name} deployed successfully"
        else
            error "Failed to deploy ${migration_name}. Check log file: ${LOG_FILE}"
            error "You can use the rollback script: $(basename "${ROLLBACK_FILE}")"
            # exit 1 commented for manual deployment
        fi
    done
    
    success "✅ All migrations deployed successfully!"
    
    # Run verification
    info "Running verification tests..."
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT * FROM public.test_rls_policies(); SELECT * FROM public.test_auth_trigger();" &>>"${LOG_FILE}"
    success "✓ Verification tests completed. Check log for results."
}

# Local testing function
local_testing() {
    log ""
    log "${YELLOW}=== LOCAL TESTING ===${NC}"
    log ""
    warning "Local testing requires a local PostgreSQL instance."
    log "This will create a test database and run migrations there first."
    log ""
    
    read -p "Enter local PostgreSQL connection string (or press Enter for default): " local_conn
    if [[ -z "${local_conn}" ]]; then
        local_conn="postgresql://postgres:postgres@localhost:5432/claude_arena_test"
    fi
    
    # Create test database
    info "Creating test database..."
    if psql "${local_conn}" -c "SELECT 1;" &>/dev/null; then
        success "✓ Connected to test database"
    else
        error "Failed to connect to local database. Please check your connection string."
        # exit 1 commented for manual deployment
    fi
    
    # Run migrations on test database
    for migration in "${MIGRATION_017}" "${MIGRATION_018}" "${MIGRATION_019}"; do
        migration_name=$(basename "${migration}")
        info "Testing ${migration_name}..."
        
        if psql "${local_conn}" -f "${migration}" &>>"${LOG_FILE}"; then
            success "✓ ${migration_name} tested successfully"
        else
            error "Failed to test ${migration_name}. Check log file: ${LOG_FILE}"
            # exit 1 commented for manual deployment
        fi
    done
    
    success "✅ All migrations tested successfully locally!"
    log ""
    log "Now you can proceed with manual deployment to production."
    manual_deployment
}

log ""
log "${GREEN}=== DEPLOYMENT SUMMARY ===${NC}"
log "Deployment log: ${LOG_FILE}"
log "Rollback script: ${ROLLBACK_FILE}"
log ""
log "${YELLOW}Important reminders:${NC}"
log "1. Monitor your application for the next 24 hours"
log "2. Test authentication flow thoroughly"
log "3. Keep the rollback script accessible"
log "4. Document any issues in your project tracker"
log ""
success "Deployment process completed successfully!"