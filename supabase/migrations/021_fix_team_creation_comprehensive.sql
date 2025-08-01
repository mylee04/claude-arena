-- Comprehensive Fix for Team Creation Issues
-- This script repairs the failures from migration 019 and ensures all users have teams
-- Run this in Supabase SQL Editor after investigating with 020_investigate_team_creation_failure.sql

-- =======================
-- 1. TEMPORARY DISABLE RLS FOR REPAIRS
-- =======================

-- Temporarily disable RLS on teams and team_members to allow system-level repairs
-- We'll re-enable it at the end
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;

-- =======================
-- 2. CREATE ENHANCED REPAIR LOG
-- =======================

-- Create a new repair log for this specific fix
CREATE TEMPORARY TABLE team_creation_repair_log (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT,
    operation TEXT,
    status TEXT,
    error_message TEXT,
    team_id UUID,
    team_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- 3. CLEAN UP INVALID USER DATA FIRST
-- =======================

-- Fix users with invalid usernames that would cause team name generation to fail
UPDATE public.users 
SET username = 'user' || SUBSTR(MD5(id::TEXT), 1, 6)
WHERE username IS NULL 
   OR username = '' 
   OR LENGTH(username) < 3
   OR LENGTH(username) > 30
   OR username !~ '^[a-zA-Z0-9_-]+$';

-- Log username fixes
INSERT INTO team_creation_repair_log (user_id, email, operation, status)
SELECT 
    id, 
    email, 
    'FIX_USERNAME', 
    'SUCCESS'
FROM public.users 
WHERE username LIKE 'user%' AND LENGTH(username) = 10;

-- Fix users with null/empty emails
UPDATE public.users 
SET email = COALESCE(email, 'user' || SUBSTR(MD5(id::TEXT), 1, 8) || '@temp.local')
WHERE email IS NULL OR email = '';

-- Fix users with null full_name that could cause issues
UPDATE public.users 
SET full_name = username
WHERE full_name IS NULL OR full_name = '';

-- =======================
-- 4. HANDLE TEAM NAME CONFLICTS PROACTIVELY
-- =======================

-- Create a function to generate unique team names
CREATE OR REPLACE FUNCTION generate_unique_team_name(base_name TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
    candidate_name TEXT;
    counter INTEGER := 0;
BEGIN
    -- Start with the base name
    candidate_name := base_name;
    
    -- Keep trying until we find a unique name
    WHILE EXISTS (SELECT 1 FROM public.teams WHERE name = candidate_name) LOOP
        counter := counter + 1;
        candidate_name := base_name || ' ' || counter;
        
        -- Fallback: if name gets too long, use user ID suffix
        IF LENGTH(candidate_name) > 50 THEN
            candidate_name := SUBSTR(base_name, 1, 40) || '-' || SUBSTR(user_id::TEXT, 1, 6);
            EXIT;
        END IF;
        
        -- Safety valve: prevent infinite loops
        IF counter > 100 THEN
            candidate_name := 'Team-' || SUBSTR(user_id::TEXT, 1, 8);
            EXIT;
        END IF;
    END LOOP;
    
    RETURN candidate_name;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- 5. CREATE TEAMS FOR USERS WITHOUT TEAMS
-- =======================

-- Main repair operation: create teams for users who don't have any
DO $$
DECLARE
    user_record RECORD;
    new_team_id UUID;
    base_team_name TEXT;
    final_team_name TEXT;
    team_description TEXT;
BEGIN
    -- Process each user without a team
    FOR user_record IN 
        SELECT DISTINCT u.id, u.username, u.email, u.full_name, u.created_at
        FROM public.users u
        LEFT JOIN public.team_members tm ON u.id = tm.user_id
        WHERE tm.user_id IS NULL
        AND u.username IS NOT NULL 
        AND u.email IS NOT NULL
        ORDER BY u.created_at
    LOOP
        BEGIN
            -- Generate base team name
            base_team_name := TRIM(COALESCE(user_record.full_name, user_record.username)) || '''s Team';
            
            -- Ensure team name meets length constraints
            IF LENGTH(base_team_name) < 3 THEN
                base_team_name := user_record.username || '''s Team';
            END IF;
            
            IF LENGTH(base_team_name) > 50 THEN
                base_team_name := SUBSTR(TRIM(COALESCE(user_record.full_name, user_record.username)), 1, 43) || '''s Team';
            END IF;
            
            -- Generate unique team name
            final_team_name := generate_unique_team_name(base_team_name, user_record.id);
            
            -- Generate team description
            team_description := 'Personal workspace for ' || user_record.email;
            IF LENGTH(team_description) > 500 THEN
                team_description := 'Personal workspace';
            END IF;
            
            -- Create the team
            INSERT INTO public.teams (
                name,
                description,
                created_by,
                created_at,
                updated_at
            ) VALUES (
                final_team_name,
                team_description,
                user_record.id,
                NOW(),
                NOW()
            )
            RETURNING id INTO new_team_id;
            
            -- Add user as team owner with status
            INSERT INTO public.team_members (
                team_id,
                user_id,
                role,
                status,
                joined_at
            ) VALUES (
                new_team_id,
                user_record.id,
                'owner',
                'active',
                NOW()
            );
            
            -- Log success
            INSERT INTO team_creation_repair_log (
                user_id, 
                email, 
                operation, 
                status, 
                team_id, 
                team_name
            ) VALUES (
                user_record.id, 
                user_record.email, 
                'CREATE_TEAM_SUCCESS', 
                'SUCCESS',
                new_team_id,
                final_team_name
            );
            
            RAISE NOTICE 'Created team % for user %', final_team_name, user_record.email;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error and continue with next user
                INSERT INTO team_creation_repair_log (
                    user_id, 
                    email, 
                    operation, 
                    status, 
                    error_message,
                    team_name
                ) VALUES (
                    user_record.id, 
                    user_record.email, 
                    'CREATE_TEAM_ERROR', 
                    'ERROR',
                    SQLERRM,
                    final_team_name
                );
                
                RAISE WARNING 'Error creating team for user %: %', user_record.email, SQLERRM;
        END;
    END LOOP;
END $$;

-- =======================
-- 6. RE-ENABLE ROW LEVEL SECURITY
-- =======================

-- Re-enable RLS on the tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- =======================
-- 7. VERIFY REPAIRS AND UPDATE MAIN REPAIR LOG
-- =======================

-- Count successful and failed operations
DO $$
DECLARE
    success_count INTEGER;
    error_count INTEGER;
    total_users_without_teams INTEGER;
BEGIN
    -- Count repair results
    SELECT COUNT(*) INTO success_count
    FROM team_creation_repair_log 
    WHERE operation = 'CREATE_TEAM_SUCCESS';
    
    SELECT COUNT(*) INTO error_count
    FROM team_creation_repair_log 
    WHERE operation = 'CREATE_TEAM_ERROR';
    
    -- Count remaining users without teams
    SELECT COUNT(*) INTO total_users_without_teams
    FROM public.users u
    LEFT JOIN public.team_members tm ON u.id = tm.user_id
    WHERE tm.user_id IS NULL;
    
    -- Insert summary into main repair history
    INSERT INTO public.auth_repair_history (
        user_id, 
        email, 
        operation, 
        status, 
        error_message,
        created_at
    ) VALUES (
        gen_random_uuid(),
        'system@repair',
        'TEAM_CREATION_FIX',
        CASE 
            WHEN total_users_without_teams = 0 THEN 'SUCCESS'
            WHEN success_count > 0 THEN 'PARTIAL_SUCCESS'
            ELSE 'FAILED'
        END,
        FORMAT('Fixed: %s teams created, %s errors, %s users still without teams', 
               success_count, error_count, total_users_without_teams),
        NOW()
    );
    
    RAISE NOTICE 'Team creation fix completed: % successes, % errors, % users still without teams', 
                 success_count, error_count, total_users_without_teams;
END $$;

-- =======================
-- 8. STORE DETAILED REPAIR LOG
-- =======================

-- Store the detailed repair log in a permanent table for audit
CREATE TABLE IF NOT EXISTS public.team_creation_repair_history AS 
SELECT * FROM team_creation_repair_log;

-- Grant access to repair history
GRANT SELECT ON public.team_creation_repair_history TO authenticated;

-- =======================
-- 9. CREATE REPAIR SUMMARY FUNCTION
-- =======================

-- Function to show team creation repair summary
CREATE OR REPLACE FUNCTION public.show_team_repair_summary()
RETURNS TABLE(
    metric TEXT,
    value TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Total Users'::TEXT as metric, COUNT(*)::TEXT as value
    FROM public.users
    
    UNION ALL
    
    SELECT 'Users With Teams', COUNT(DISTINCT tm.user_id)::TEXT
    FROM public.team_members tm
    
    UNION ALL
    
    SELECT 'Users Without Teams', COUNT(*)::TEXT
    FROM public.users u
    LEFT JOIN public.team_members tm ON u.id = tm.user_id
    WHERE tm.user_id IS NULL
    
    UNION ALL
    
    SELECT 'Total Teams', COUNT(*)::TEXT
    FROM public.teams
    
    UNION ALL
    
    SELECT 'Teams Created in This Fix', COUNT(*)::TEXT
    FROM public.team_creation_repair_history
    WHERE operation = 'CREATE_TEAM_SUCCESS'
    
    UNION ALL
    
    SELECT 'Team Creation Errors in This Fix', COUNT(*)::TEXT
    FROM public.team_creation_repair_history
    WHERE operation = 'CREATE_TEAM_ERROR'
    
    ORDER BY metric;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- 10. CLEANUP HELPER FUNCTION
-- =======================

-- Drop the temporary function
DROP FUNCTION IF EXISTS generate_unique_team_name(TEXT, UUID);

-- =======================
-- 11. FINAL VERIFICATION
-- =======================

-- Show summary of the repair operation
SELECT * FROM public.show_team_repair_summary();

-- Show any remaining issues
SELECT 
    'REMAINING_USERS_WITHOUT_TEAMS' as issue_type,
    u.id,
    u.username,
    u.email
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
WHERE tm.user_id IS NULL
LIMIT 10;

-- =======================
-- 12. SUCCESS MESSAGE
-- =======================

-- Final success indicator
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS: All users now have teams!'
        ELSE 'PARTIAL: ' || COUNT(*) || ' users still need teams. Check error log.'
    END as repair_status
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
WHERE tm.user_id IS NULL;

-- === REPAIR COMPLETED ===
-- To view detailed results: SELECT * FROM public.team_creation_repair_history;
-- To view summary: SELECT * FROM public.show_team_repair_summary();