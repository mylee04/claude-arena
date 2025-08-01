-- Data Repair Migration for Claude Arena
-- Fixes existing auth users and ensures all profiles are created correctly
-- Version: 1.0
-- Date: 2025-08-01

-- =======================
-- 1. BACKUP EXISTING DATA
-- =======================

-- Create backup tables for rollback if needed
CREATE TABLE IF NOT EXISTS backup_users AS SELECT * FROM public.users;
CREATE TABLE IF NOT EXISTS backup_teams AS SELECT * FROM public.teams;
CREATE TABLE IF NOT EXISTS backup_team_members AS SELECT * FROM public.team_members;

-- Created backup tables for existing data

-- =======================
-- 2. IDENTIFY ORPHANED AUTH USERS
-- =======================

-- Create temporary table to track repair operations
CREATE TEMPORARY TABLE repair_log (
  user_id UUID,
  email TEXT,
  operation TEXT,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Find auth users without profiles
INSERT INTO repair_log (user_id, email, operation, status)
SELECT 
  au.id,
  au.email,
  'IDENTIFY_ORPHANED',
  'FOUND'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Log findings - check count manually:
-- SELECT COUNT(*) FROM repair_log WHERE operation = 'IDENTIFY_ORPHANED';

-- =======================
-- 3. REPAIR ORPHANED PROFILES
-- =======================

-- Repair each orphaned user
DO $$
DECLARE
  repair_record RECORD;
  repair_success BOOLEAN;
BEGIN
  FOR repair_record IN 
    SELECT user_id FROM repair_log WHERE operation = 'IDENTIFY_ORPHANED'
  LOOP
    BEGIN
      -- Use our repair function
      SELECT public.repair_user_profile(repair_record.user_id) INTO repair_success;
      
      IF repair_success THEN
        UPDATE repair_log 
        SET operation = 'REPAIR_PROFILE', status = 'SUCCESS'
        WHERE user_id = repair_record.user_id;
        
        -- Successfully repaired profile for user
      ELSE
        UPDATE repair_log 
        SET operation = 'REPAIR_PROFILE', status = 'FAILED', error_message = 'Repair function returned false'
        WHERE user_id = repair_record.user_id;
        
        RAISE WARNING 'Failed to repair profile for user %', repair_record.user_id;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        UPDATE repair_log 
        SET operation = 'REPAIR_PROFILE', status = 'ERROR', error_message = SQLERRM
        WHERE user_id = repair_record.user_id;
        
        RAISE WARNING 'Error repairing profile for user %: %', repair_record.user_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- =======================
-- 4. FIX USERS WITHOUT TEAMS
-- =======================

-- Find users without teams and create default teams
DO $$
DECLARE
  user_record RECORD;
  new_team_id UUID;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.username, u.email, u.full_name
    FROM public.users u
    LEFT JOIN public.team_members tm ON u.id = tm.user_id
    WHERE tm.user_id IS NULL
  LOOP
    BEGIN
      -- Create default team
      INSERT INTO public.teams (
        name,
        description,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        COALESCE(user_record.full_name, user_record.username) || '''s Team',
        'Personal workspace for ' || user_record.email,
        user_record.id,
        NOW(),
        NOW()
      )
      RETURNING id INTO new_team_id;
      
      -- Add user as team owner
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
      
      INSERT INTO repair_log (user_id, email, operation, status)
      VALUES (user_record.id, user_record.email, 'CREATE_DEFAULT_TEAM', 'SUCCESS');
      
      -- Created default team for user
      
    EXCEPTION
      WHEN OTHERS THEN
        INSERT INTO repair_log (user_id, email, operation, status, error_message)
        VALUES (user_record.id, user_record.email, 'CREATE_DEFAULT_TEAM', 'ERROR', SQLERRM);
        
        RAISE WARNING 'Error creating team for user %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- =======================
-- 5. CLEAN UP INVALID DATA
-- =======================

-- Fix any users with invalid/empty usernames
UPDATE public.users 
SET username = 'user' || SUBSTR(MD5(id::TEXT), 1, 6)
WHERE username IS NULL 
   OR username = '' 
   OR LENGTH(username) < 3;

-- Fix any users with null emails
UPDATE public.users 
SET email = 'unknown@example.com'
WHERE email IS NULL OR email = '';

-- Log cleanup operations
INSERT INTO repair_log (user_id, email, operation, status)
SELECT id, email, 'CLEANUP_INVALID_DATA', 'SUCCESS'
FROM public.users 
WHERE username LIKE 'user%' AND LENGTH(username) = 10;

-- =======================
-- 6. VERIFY DATA INTEGRITY
-- =======================

-- Check for remaining issues
DO $$
DECLARE
  orphaned_users INTEGER;
  users_without_teams INTEGER;
  invalid_usernames INTEGER;
  invalid_emails INTEGER;
BEGIN
  -- Count remaining orphaned users
  SELECT COUNT(*) INTO orphaned_users
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
  
  -- Count users without teams
  SELECT COUNT(*) INTO users_without_teams
  FROM public.users u
  LEFT JOIN public.team_members tm ON u.id = tm.user_id
  WHERE tm.user_id IS NULL;
  
  -- Count invalid usernames
  SELECT COUNT(*) INTO invalid_usernames
  FROM public.users
  WHERE username IS NULL OR username = '' OR LENGTH(username) < 3;
  
  -- Count invalid emails
  SELECT COUNT(*) INTO invalid_emails
  FROM public.users
  WHERE email IS NULL OR email = '';
  
  -- Report results
  -- Data integrity check results:
  -- Remaining orphaned users tracked in repair_log
  -- Users without teams tracked in repair_log
  -- Users with invalid usernames tracked in repair_log
  -- Users with invalid emails tracked in repair_log
  
  -- Insert summary into repair log
  INSERT INTO repair_log (user_id, email, operation, status)
  VALUES (
    gen_random_uuid(),
    'system',
    'INTEGRITY_CHECK',
    FORMAT('orphaned:%s, no_teams:%s, bad_usernames:%s, bad_emails:%s', 
           orphaned_users, users_without_teams, invalid_usernames, invalid_emails)
  );
END $$;

-- =======================
-- 7. CREATE REPAIR SUMMARY FUNCTION
-- =======================

-- Function to show repair summary
CREATE OR REPLACE FUNCTION public.show_repair_summary()
RETURNS TABLE(
  operation TEXT,
  total_count BIGINT,
  success_count BIGINT,
  failed_count BIGINT,
  error_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rl.operation,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE rl.status = 'SUCCESS') as success_count,
    COUNT(*) FILTER (WHERE rl.status = 'FAILED') as failed_count,
    COUNT(*) FILTER (WHERE rl.status = 'ERROR') as error_count
  FROM repair_log rl
  GROUP BY rl.operation
  ORDER BY rl.operation;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- 8. CLEANUP TEMPORARY DATA
-- =======================

-- Store repair log in permanent table for audit
CREATE TABLE IF NOT EXISTS public.auth_repair_history AS 
SELECT * FROM repair_log;

-- Grant access to repair history
GRANT SELECT ON public.auth_repair_history TO authenticated;

-- =======================
-- 9. FINAL VERIFICATION
-- =======================

-- Run final tests manually:
-- SELECT * FROM public.test_rls_policies();
-- SELECT * FROM public.test_auth_trigger();

-- =======================
-- 10. COMPLETION SUMMARY
-- =======================

-- === DATA REPAIR MIGRATION COMPLETED ===
-- Run SELECT * FROM public.show_repair_summary(); to see detailed results
-- Backup tables created: backup_users, backup_teams, backup_team_members
-- Repair history stored in: public.auth_repair_history

-- Show final summary
SELECT * FROM public.show_repair_summary();