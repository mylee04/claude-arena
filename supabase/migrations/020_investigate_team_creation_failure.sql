-- Investigation Queries for Team Creation Failure in Migration 019
-- Run these queries in Supabase SQL Editor to diagnose the issue

-- =======================
-- 1. CHECK REPAIR HISTORY FOR SPECIFIC ERRORS
-- =======================

-- Get detailed error messages from the auth repair history
SELECT 
    operation,
    status,
    error_message,
    user_id,
    email,
    created_at
FROM public.auth_repair_history 
WHERE operation = 'CREATE_DEFAULT_TEAM'
ORDER BY created_at DESC;

-- =======================
-- 2. IDENTIFY USERS WITHOUT TEAMS
-- =======================

-- Find users who should have teams but don't
SELECT 
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.created_at,
    COUNT(tm.team_id) as team_count
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
GROUP BY u.id, u.username, u.email, u.full_name, u.created_at
HAVING COUNT(tm.team_id) = 0
ORDER BY u.created_at;

-- =======================
-- 3. CHECK CONSTRAINT VIOLATIONS
-- =======================

-- Check for username length violations (must be 3-30 chars)
SELECT 
    id,
    username,
    LENGTH(username) as username_length,
    CASE 
        WHEN username IS NULL THEN 'NULL username'
        WHEN LENGTH(username) < 3 THEN 'Too short'
        WHEN LENGTH(username) > 30 THEN 'Too long'
        ELSE 'Valid'
    END as username_status
FROM public.users
WHERE username IS NULL 
   OR LENGTH(username) < 3 
   OR LENGTH(username) > 30;

-- Check for username format violations (alphanumeric, underscore, hyphen only)
SELECT 
    id,
    username,
    CASE 
        WHEN username !~ '^[a-zA-Z0-9_-]+$' THEN 'Invalid format'
        ELSE 'Valid format'
    END as format_status
FROM public.users
WHERE username !~ '^[a-zA-Z0-9_-]+$';

-- =======================
-- 4. CHECK TEAM NAME CONSTRAINTS
-- =======================

-- Simulate team name generation and check for potential conflicts
WITH potential_team_names AS (
    SELECT 
        id,
        username,
        full_name,
        email,
        COALESCE(full_name, username) || '''s Team' as potential_team_name,
        LENGTH(COALESCE(full_name, username) || '''s Team') as name_length
    FROM public.users u
    LEFT JOIN public.team_members tm ON u.id = tm.user_id
    WHERE tm.user_id IS NULL
)
SELECT 
    id,
    username,
    potential_team_name,
    name_length,
    CASE 
        WHEN name_length < 3 THEN 'Too short'
        WHEN name_length > 50 THEN 'Too long'
        ELSE 'Valid length'
    END as name_status,
    EXISTS(SELECT 1 FROM public.teams WHERE name = potential_team_name) as name_exists
FROM potential_team_names
ORDER BY name_status DESC, name_length DESC;

-- =======================
-- 5. CHECK RLS POLICIES BLOCKING TEAM CREATION
-- =======================

-- Check if current user context allows team creation
-- (This will show if RLS is blocking the operation)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('teams', 'team_members')
  AND cmd IN ('INSERT', 'ALL')
ORDER BY tablename, cmd;

-- =======================
-- 6. CHECK FOR ORPHANED AUTH USERS
-- =======================

-- Find auth users without corresponding profiles (these might cause team creation to fail)
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created,
    pu.id as profile_exists,
    CASE 
        WHEN pu.id IS NULL THEN 'Missing profile'
        ELSE 'Profile exists'
    END as profile_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at;

-- =======================
-- 7. CHECK TEAM_MEMBERS TABLE STRUCTURE
-- =======================

-- Verify team_members table has the status column (added in migration 014)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'team_members'
ORDER BY ordinal_position;

-- =======================
-- 8. TEST TEAM CREATION MANUALLY (DRY RUN)
-- =======================

-- This query simulates what the migration tried to do without actually creating teams
-- Run this to see what would happen during team creation
WITH users_without_teams AS (
    SELECT u.id, u.username, u.email, u.full_name
    FROM public.users u
    LEFT JOIN public.team_members tm ON u.id = tm.user_id
    WHERE tm.user_id IS NULL
    LIMIT 5  -- Limit to first 5 for testing
)
SELECT 
    id as user_id,
    username,
    email,
    full_name,
    COALESCE(full_name, username) || '''s Team' as proposed_team_name,
    'Personal workspace for ' || email as proposed_description,
    -- Check if this team name would conflict
    EXISTS(SELECT 1 FROM public.teams WHERE name = COALESCE(full_name, username) || '''s Team') as name_conflict,
    -- Check name length constraints
    CASE 
        WHEN LENGTH(COALESCE(full_name, username) || '''s Team') < 3 THEN 'Name too short'
        WHEN LENGTH(COALESCE(full_name, username) || '''s Team') > 50 THEN 'Name too long'
        ELSE 'Name valid'
    END as name_validation
FROM users_without_teams;

-- =======================
-- 9. REPAIR SUMMARY FROM MIGRATION 019
-- =======================

-- Get the repair summary that was generated by migration 019
SELECT * FROM public.show_repair_summary()
ORDER BY operation;

-- =======================
-- 10. CHECK FOR FUNCTION EXISTENCE
-- =======================

-- Verify that the repair_user_profile function exists and is accessible
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'repair_user_profile';

-- =======================
-- SUMMARY QUERY - RUN THIS FIRST
-- =======================

-- This gives you a quick overview of the current state
SELECT 
    'Total Users' as metric,
    COUNT(*)::text as value
FROM public.users

UNION ALL

SELECT 
    'Users Without Teams',
    COUNT(*)::text
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
WHERE tm.user_id IS NULL

UNION ALL

SELECT 
    'Total Teams',
    COUNT(*)::text
FROM public.teams

UNION ALL

SELECT 
    'Team Creation Errors',
    COUNT(*)::text
FROM public.auth_repair_history 
WHERE operation = 'CREATE_DEFAULT_TEAM' AND status = 'ERROR'

UNION ALL

SELECT 
    'Team Creation Successes',
    COUNT(*)::text
FROM public.auth_repair_history 
WHERE operation = 'CREATE_DEFAULT_TEAM' AND status = 'SUCCESS';