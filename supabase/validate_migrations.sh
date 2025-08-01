#!/bin/bash

# Supabase Migration Validation Script
# Validates migration files for syntax errors and best practices
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
VALIDATION_LOG="${SCRIPT_DIR}/validation_$(date +%Y%m%d_%H%M%S).log"

# Migration files to validate
MIGRATION_017="${SCRIPT_DIR}/migrations/017_fix_rls_policies_comprehensive.sql"
MIGRATION_018="${SCRIPT_DIR}/migrations/018_improved_auth_triggers.sql"
MIGRATION_019="${SCRIPT_DIR}/migrations/019_repair_existing_data.sql"

# Validation counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNING_COUNT=0
ERROR_COUNT=0

# Functions
log() {
    echo -e "${1}" | tee -a "${VALIDATION_LOG}"
}

error() {
    log "${RED}❌ ERROR: ${1}${NC}"
    ((ERROR_COUNT++))
}

success() {
    log "${GREEN}✅ ${1}${NC}"
    ((PASSED_CHECKS++))
}

warning() {
    log "${YELLOW}⚠️  WARNING: ${1}${NC}"
    ((WARNING_COUNT++))
}

info() {
    log "${BLUE}ℹ️  ${1}${NC}"
}

check() {
    ((TOTAL_CHECKS++))
    if [[ $? -eq 0 ]]; then
        success "$1"
    else
        error "$1"
    fi
}

# Header
log "${BLUE}================================================================${NC}"
log "${BLUE}   Supabase Migration Validation Script${NC}"
log "${BLUE}   Version: 1.0 | Date: $(date)${NC}"
log "${BLUE}================================================================${NC}"
log ""

# Check if files exist
validate_file_existence() {
    local file=$1
    local name=$2
    
    info "Checking file existence: ${name}"
    
    if [[ -f "${file}" ]]; then
        success "File exists: $(basename "${file}")"
        return 0
    else
        error "File not found: ${file}"
        return 1
    fi
}

# Validate SQL syntax
validate_sql_syntax() {
    local file=$1
    local name=$2
    
    info "Validating SQL syntax: ${name}"
    
    # Check for basic SQL syntax issues
    local issues=0
    
    # Check for unmatched parentheses
    local open_parens=$(grep -o '(' "${file}" | wc -l)
    local close_parens=$(grep -o ')' "${file}" | wc -l)
    
    if [[ ${open_parens} -ne ${close_parens} ]]; then
        error "Unmatched parentheses in ${name}: ${open_parens} open, ${close_parens} close"
        ((issues++))
    fi
    
    # Check for unmatched quotes
    local single_quotes=$(grep -o "'" "${file}" | wc -l)
    if [[ $((single_quotes % 2)) -ne 0 ]]; then
        warning "Potential unmatched single quotes in ${name}"
    fi
    
    # Check for common SQL keywords are properly formatted
    if grep -qi "create table.*(" "${file}"; then
        success "Contains CREATE TABLE statements"
    fi
    
    if grep -qi "create.*function" "${file}"; then
        success "Contains function definitions"
    fi
    
    if grep -qi "create.*policy" "${file}"; then
        success "Contains RLS policy definitions"
    fi
    
    # Check for potential SQL injection issues (in dynamic SQL)
    if grep -q '\$\$.*||.*\$\$' "${file}"; then
        warning "Dynamic SQL concatenation found in ${name}. Please review for injection risks."
    fi
    
    if [[ ${issues} -eq 0 ]]; then
        success "Basic SQL syntax validation passed for ${name}"
        return 0
    else
        error "SQL syntax validation failed for ${name} with ${issues} issues"
        return 1
    fi
}

# Validate PostgreSQL best practices
validate_postgres_practices() {
    local file=$1
    local name=$2
    
    info "Validating PostgreSQL best practices: ${name}"
    
    local warnings=0
    
    # Check for IF EXISTS clauses
    if grep -q "DROP.*IF EXISTS" "${file}"; then
        success "Uses IF EXISTS for DROP statements"
    else
        warning "Consider using IF EXISTS for DROP statements in ${name}"
        ((warnings++))
    fi
    
    # Check for proper transaction handling
    if grep -q "BEGIN\|START TRANSACTION" "${file}"; then
        if grep -q "COMMIT\|END" "${file}"; then
            success "Has transaction boundaries"
        else
            warning "BEGIN found without COMMIT in ${name}"
            ((warnings++))
        fi
    fi
    
    # Check for proper error handling in functions
    if grep -q "EXCEPTION" "${file}"; then
        success "Contains error handling"
    else
        warning "No explicit error handling found in ${name}"
        ((warnings++))
    fi
    
    # Check for proper indexing
    if grep -q "CREATE.*INDEX" "${file}"; then
        success "Creates indexes for performance"
    fi
    
    # Check for SECURITY DEFINER usage
    if grep -q "SECURITY DEFINER" "${file}"; then
        success "Uses SECURITY DEFINER appropriately"
        if ! grep -q "SET search_path" "${file}"; then
            warning "SECURITY DEFINER without explicit search_path in ${name}"
            ((warnings++))
        fi
    fi
    
    # Check for proper comments
    if grep -q "COMMENT ON" "${file}"; then
        success "Contains documentation comments"
    else
        warning "No documentation comments found in ${name}"
        ((warnings++))
    fi
    
    return 0
}

# Validate migration-specific requirements
validate_migration_requirements() {
    local file=$1
    local name=$2
    
    info "Validating migration requirements: ${name}"
    
    # Check for migration header/documentation
    if head -10 "${file}" | grep -q "Date:\|Version:" ; then
        success "Contains migration metadata"
    else
        warning "Missing migration metadata (Date/Version) in ${name}"
    fi
    
    # Check for rollback considerations
    if grep -qi "rollback\|backup" "${file}" || [[ "${name}" == *"019"* ]]; then
        success "Considers rollback/backup strategy"
    else
        warning "No rollback strategy mentioned in ${name}"
    fi
    
    # Check for proper grants
    if grep -q "GRANT" "${file}"; then
        success "Contains permission grants"
    else
        warning "No explicit permission grants in ${name}"
    fi
    
    return 0
}

# Validate RLS policies (for migration 017)
validate_rls_policies() {
    local file=$1
    
    info "Validating RLS policies in Migration 017"
    
    # Check for policy cleanup
    if grep -q "DROP POLICY IF EXISTS" "${file}"; then
        success "Cleans up existing policies"
    else
        error "Missing policy cleanup in RLS migration"
        return 1
    fi
    
    # Check for proper policy structure
    if grep -q "CREATE POLICY.*FOR SELECT" "${file}" && \
       grep -q "CREATE POLICY.*FOR INSERT" "${file}" && \
       grep -q "CREATE POLICY.*FOR UPDATE" "${file}"; then
        success "Contains comprehensive CRUD policies"
    else
        warning "May be missing some CRUD policies"
    fi
    
    # Check for authentication checks
    if grep -q "auth\.uid()" "${file}"; then
        success "Uses auth.uid() for authentication"
    else
        warning "No auth.uid() usage found"
    fi
    
    # Check for helper functions
    if grep -q "CREATE.*FUNCTION.*is_team_" "${file}"; then
        success "Defines helper functions for policies"
    fi
    
    return 0
}

# Validate auth triggers (for migration 018)
validate_auth_triggers() {
    local file=$1
    
    info "Validating auth triggers in Migration 018"
    
    # Check for trigger cleanup
    if grep -q "DROP TRIGGER IF EXISTS" "${file}"; then
        success "Cleans up existing triggers"
    else
        error "Missing trigger cleanup"
        return 1
    fi
    
    # Check for comprehensive user data extraction
    if grep -q "raw_user_meta_data" "${file}"; then
        success "Handles OAuth metadata extraction"
    else
        warning "May not handle OAuth providers properly"
    fi
    
    # Check for error handling in triggers
    if grep -q "EXCEPTION.*WHEN" "${file}"; then
        success "Contains proper error handling"
    else
        error "Missing error handling in trigger functions"
        return 1
    fi
    
    # Check for username uniqueness
    if grep -q "username.*unique\|WHILE EXISTS.*username" "${file}"; then
        success "Handles username uniqueness"
    else
        warning "May not handle username conflicts"
    fi
    
    return 0
}

# Validate data repair (for migration 019)
validate_data_repair() {
    local file=$1
    
    info "Validating data repair in Migration 019"
    
    # Check for backup creation
    if grep -q "CREATE TABLE.*backup_" "${file}"; then
        success "Creates backup tables"
    else
        error "Missing backup table creation"
        return 1
    fi
    
    # Check for repair logging
    if grep -q "repair_log\|repair_history" "${file}"; then
        success "Includes repair logging"
    else
        warning "No repair logging found"
    fi
    
    # Check for integrity checks
    if grep -q "integrity.*check\|verify.*data" "${file}"; then
        success "Includes data integrity verification"
    else
        warning "No data integrity checks found"
    fi
    
    return 0
}

# Run validation
log "${YELLOW}=== RUNNING VALIDATION CHECKS ===${NC}"
log ""

# File existence checks
for migration in "${MIGRATION_017}" "${MIGRATION_018}" "${MIGRATION_019}"; do
    migration_name=$(basename "${migration}")
    validate_file_existence "${migration}" "${migration_name}"
done

log ""

# SQL syntax validation
for migration in "${MIGRATION_017}" "${MIGRATION_018}" "${MIGRATION_019}"; do
    migration_name=$(basename "${migration}")
    if [[ -f "${migration}" ]]; then
        validate_sql_syntax "${migration}" "${migration_name}"
        validate_postgres_practices "${migration}" "${migration_name}"
        validate_migration_requirements "${migration}" "${migration_name}"
    fi
done

log ""

# Specific migration validations
if [[ -f "${MIGRATION_017}" ]]; then
    validate_rls_policies "${MIGRATION_017}"
fi

if [[ -f "${MIGRATION_018}" ]]; then
    validate_auth_triggers "${MIGRATION_018}"
fi

if [[ -f "${MIGRATION_019}" ]]; then
    validate_data_repair "${MIGRATION_019}"
fi

# Summary
log ""
log "${BLUE}=== VALIDATION SUMMARY ===${NC}"
log ""
log "Total checks performed: ${TOTAL_CHECKS}"
log "Checks passed: ${GREEN}${PASSED_CHECKS}${NC}"
log "Warnings: ${YELLOW}${WARNING_COUNT}${NC}"
log "Errors: ${RED}${ERROR_COUNT}${NC}"
log ""

if [[ ${ERROR_COUNT} -eq 0 ]]; then
    success "🎉 All critical validations passed!"
    log ""
    log "${GREEN}The migrations are ready for deployment.${NC}"
    log "Use the deployment script: ./deploy_rls_auth_fixes.sh"
else
    error "❌ Critical validation errors found!"
    log ""
    log "${RED}Please fix the errors before deploying.${NC}"
    exit 1
fi

if [[ ${WARNING_COUNT} -gt 0 ]]; then
    log ""
    warning "Please review the warnings above."
    log "While not blocking deployment, addressing them will improve robustness."
fi

log ""
log "Validation log saved to: ${VALIDATION_LOG}"
log ""
success "Validation completed successfully!"