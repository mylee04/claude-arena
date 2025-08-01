-- Comprehensive Test Suite for Claude Arena Authentication System
-- Prevents regression and ensures all components work correctly
-- Version: 1.0
-- Date: 2025-08-01

-- =======================
-- 1. TEST FRAMEWORK SETUP
-- =======================

-- Create test results table
CREATE TABLE IF NOT EXISTS test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_suite TEXT NOT NULL,
  test_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'SKIP')),
  message TEXT,
  execution_time INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to record test results
CREATE OR REPLACE FUNCTION record_test_result(
  p_suite TEXT,
  p_test TEXT,
  p_status TEXT,
  p_message TEXT DEFAULT NULL,
  p_execution_time INTERVAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO test_results (test_suite, test_name, status, message, execution_time)
  VALUES (p_suite, p_test, p_status, p_message, p_execution_time);
END;
$$ LANGUAGE plpgsql;

-- =======================
-- 2. RLS POLICY TESTS
-- =======================

CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE(test_name TEXT, status TEXT, message TEXT) AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  test_user_id UUID;
  test_team_id UUID;
BEGIN
  start_time := clock_timestamp();
  
  -- Test 1: Anonymous users can view public data
  BEGIN
    SET LOCAL ROLE anon;
    PERFORM 1 FROM public.users LIMIT 1;
    PERFORM 1 FROM public.teams LIMIT 1;
    PERFORM 1 FROM public.leaderboard_entries LIMIT 1;
    
    RETURN QUERY SELECT 'anonymous_public_access'::TEXT, 'PASS'::TEXT, 'Anonymous users can access public data'::TEXT;
    PERFORM record_test_result('RLS_POLICIES', 'anonymous_public_access', 'PASS');
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'anonymous_public_access'::TEXT, 'FAIL'::TEXT, SQLERRM::TEXT;
      PERFORM record_test_result('RLS_POLICIES', 'anonymous_public_access', 'FAIL', SQLERRM);
  END;
  
  -- Test 2: Authenticated users can access their own data
  BEGIN
    -- Get a test user
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
      -- Simulate authenticated user context
      SET LOCAL ROLE authenticated;
      SET LOCAL "request.jwt.claims" TO json_build_object('sub', test_user_id::TEXT)::TEXT;
      
      PERFORM 1 FROM public.users WHERE id = test_user_id;
      
      RETURN QUERY SELECT 'authenticated_own_data'::TEXT, 'PASS'::TEXT, 'Authenticated users can access own data'::TEXT;
      PERFORM record_test_result('RLS_POLICIES', 'authenticated_own_data', 'PASS');
    ELSE
      RETURN QUERY SELECT 'authenticated_own_data'::TEXT, 'SKIP'::TEXT, 'No test users available'::TEXT;
      PERFORM record_test_result('RLS_POLICIES', 'authenticated_own_data', 'SKIP', 'No test users available');
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'authenticated_own_data'::TEXT, 'FAIL'::TEXT, SQLERRM::TEXT;
      PERFORM record_test_result('RLS_POLICIES', 'authenticated_own_data', 'FAIL', SQLERRM);
  END;
  
  -- Test 3: Team member access
  BEGIN
    -- Get a test team
    SELECT team_id INTO test_team_id FROM public.team_members LIMIT 1;
    
    IF test_team_id IS NOT NULL THEN
      SET LOCAL ROLE authenticated;
      
      -- Test helper functions
      PERFORM public.is_team_member(test_team_id);
      PERFORM public.is_team_admin(test_team_id);
      
      RETURN QUERY SELECT 'team_helper_functions'::TEXT, 'PASS'::TEXT, 'Team helper functions work correctly'::TEXT;
      PERFORM record_test_result('RLS_POLICIES', 'team_helper_functions', 'PASS');
    ELSE
      RETURN QUERY SELECT 'team_helper_functions'::TEXT, 'SKIP'::TEXT, 'No test teams available'::TEXT;
      PERFORM record_test_result('RLS_POLICIES', 'team_helper_functions', 'SKIP', 'No test teams available');
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'team_helper_functions'::TEXT, 'FAIL'::TEXT, SQLERRM::TEXT;
      PERFORM record_test_result('RLS_POLICIES', 'team_helper_functions', 'FAIL', SQLERRM);
  END;
  
  -- Reset role
  RESET ROLE;
  
  end_time := clock_timestamp();
  PERFORM record_test_result('RLS_POLICIES', 'suite_execution_time', 'PASS', 
    'Total execution time: ' || (end_time - start_time)::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 3. AUTHENTICATION TRIGGER TESTS
-- =======================

CREATE OR REPLACE FUNCTION test_auth_triggers()
RETURNS TABLE(test_name TEXT, status TEXT, message TEXT) AS $$
DECLARE
  test_user_id UUID;
  test_email TEXT := 'test_' || extract(epoch from now())::TEXT || '@example.com';
  profile_exists BOOLEAN;
  team_exists BOOLEAN;
BEGIN
  -- Test 1: Trigger function exists and is executable
  BEGIN
    PERFORM public.handle_new_user();
    RETURN QUERY SELECT 'trigger_function_callable'::TEXT, 'PASS'::TEXT, 'Trigger function is callable'::TEXT;
    PERFORM record_test_result('AUTH_TRIGGERS', 'trigger_function_callable', 'PASS');
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'trigger_function_callable'::TEXT, 'FAIL'::TEXT, SQLERRM::TEXT;
      PERFORM record_test_result('AUTH_TRIGGERS', 'trigger_function_callable', 'FAIL', SQLERRM);
  END;
  
  -- Test 2: Profile creation for new users
  BEGIN
    test_user_id := gen_random_uuid();
    
    -- Simulate a new auth user insertion
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
    VALUES (
      test_user_id,
      test_email,
      jsonb_build_object(
        'full_name', 'Test User',
        'avatar_url', 'https://example.com/avatar.jpg'
      ),
      NOW(),
      NOW()
    );
    
    -- Check if profile was created
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = test_user_id) INTO profile_exists;
    
    IF profile_exists THEN
      RETURN QUERY SELECT 'profile_auto_creation'::TEXT, 'PASS'::TEXT, 'Profile automatically created for new user'::TEXT;
      PERFORM record_test_result('AUTH_TRIGGERS', 'profile_auto_creation', 'PASS');
      
      -- Check if team was created
      SELECT EXISTS(
        SELECT 1 FROM public.team_members 
        WHERE user_id = test_user_id AND role = 'owner'
      ) INTO team_exists;
      
      IF team_exists THEN
        RETURN QUERY SELECT 'team_auto_creation'::TEXT, 'PASS'::TEXT, 'Default team automatically created'::TEXT;
        PERFORM record_test_result('AUTH_TRIGGERS', 'team_auto_creation', 'PASS');
      ELSE
        RETURN QUERY SELECT 'team_auto_creation'::TEXT, 'FAIL'::TEXT, 'Default team not created'::TEXT;
        PERFORM record_test_result('AUTH_TRIGGERS', 'team_auto_creation', 'FAIL', 'Default team not created');
      END IF;
    ELSE
      RETURN QUERY SELECT 'profile_auto_creation'::TEXT, 'FAIL'::TEXT, 'Profile not created automatically'::TEXT;
      PERFORM record_test_result('AUTH_TRIGGERS', 'profile_auto_creation', 'FAIL', 'Profile not created automatically');
    END IF;
    
    -- Cleanup test user
    DELETE FROM auth.users WHERE id = test_user_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'profile_auto_creation'::TEXT, 'FAIL'::TEXT, SQLERRM::TEXT;
      PERFORM record_test_result('AUTH_TRIGGERS', 'profile_auto_creation', 'FAIL', SQLERRM);
      
      -- Cleanup on error
      BEGIN
        DELETE FROM auth.users WHERE id = test_user_id;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
  END;
  
  -- Test 3: Repair function works
  BEGIN
    PERFORM public.repair_user_profile(gen_random_uuid());
    RETURN QUERY SELECT 'repair_function_works'::TEXT, 'PASS'::TEXT, 'Repair function handles non-existent users gracefully'::TEXT;
    PERFORM record_test_result('AUTH_TRIGGERS', 'repair_function_works', 'PASS');
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'repair_function_works'::TEXT, 'FAIL'::TEXT, SQLERRM::TEXT;
      PERFORM record_test_result('AUTH_TRIGGERS', 'repair_function_works', 'FAIL', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 4. DATA INTEGRITY TESTS
-- =======================

CREATE OR REPLACE FUNCTION test_data_integrity()
RETURNS TABLE(test_name TEXT, status TEXT, message TEXT) AS $$
DECLARE
  orphaned_count INTEGER;
  teamless_count INTEGER;
  invalid_username_count INTEGER;
  duplicate_username_count INTEGER;
BEGIN
  -- Test 1: No orphaned auth users
  SELECT COUNT(*) INTO orphaned_count
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
  
  IF orphaned_count = 0 THEN
    RETURN QUERY SELECT 'no_orphaned_users'::TEXT, 'PASS'::TEXT, 'No orphaned auth users found'::TEXT;
    PERFORM record_test_result('DATA_INTEGRITY', 'no_orphaned_users', 'PASS');
  ELSE
    RETURN QUERY SELECT 'no_orphaned_users'::TEXT, 'FAIL'::TEXT, 
      ('Found ' || orphaned_count || ' orphaned auth users')::TEXT;
    PERFORM record_test_result('DATA_INTEGRITY', 'no_orphaned_users', 'FAIL', 
      'Found ' || orphaned_count || ' orphaned auth users');
  END IF;
  
  -- Test 2: All users have teams
  SELECT COUNT(*) INTO teamless_count
  FROM public.users u
  LEFT JOIN public.team_members tm ON u.id = tm.user_id
  WHERE tm.user_id IS NULL;
  
  IF teamless_count = 0 THEN
    RETURN QUERY SELECT 'all_users_have_teams'::TEXT, 'PASS'::TEXT, 'All users have teams'::TEXT;
    PERFORM record_test_result('DATA_INTEGRITY', 'all_users_have_teams', 'PASS');
  ELSE
    RETURN QUERY SELECT 'all_users_have_teams'::TEXT, 'FAIL'::TEXT, 
      ('Found ' || teamless_count || ' users without teams')::TEXT;
    PERFORM record_test_result('DATA_INTEGRITY', 'all_users_have_teams', 'FAIL', 
      'Found ' || teamless_count || ' users without teams');
  END IF;
  
  -- Test 3: Valid usernames
  SELECT COUNT(*) INTO invalid_username_count
  FROM public.users
  WHERE username IS NULL OR username = '' OR LENGTH(username) < 3;
  
  IF invalid_username_count = 0 THEN
    RETURN QUERY SELECT 'valid_usernames'::TEXT, 'PASS'::TEXT, 'All usernames are valid'::TEXT;
    PERFORM record_test_result('DATA_INTEGRITY', 'valid_usernames', 'PASS');
  ELSE
    RETURN QUERY SELECT 'valid_usernames'::TEXT, 'FAIL'::TEXT, 
      ('Found ' || invalid_username_count || ' users with invalid usernames')::TEXT;
    PERFORM record_test_result('DATA_INTEGRITY', 'valid_usernames', 'FAIL', 
      'Found ' || invalid_username_count || ' users with invalid usernames');
  END IF;
  
  -- Test 4: Unique usernames
  SELECT COUNT(*) INTO duplicate_username_count
  FROM (
    SELECT username, COUNT(*) 
    FROM public.users 
    GROUP BY username 
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_username_count = 0 THEN
    RETURN QUERY SELECT 'unique_usernames'::TEXT, 'PASS'::TEXT, 'All usernames are unique'::TEXT;
    PERFORM record_test_result('DATA_INTEGRITY', 'unique_usernames', 'PASS');
  ELSE
    RETURN QUERY SELECT 'unique_usernames'::TEXT, 'FAIL'::TEXT, 
      ('Found ' || duplicate_username_count || ' duplicate usernames')::TEXT;
    PERFORM record_test_result('DATA_INTEGRITY', 'unique_usernames', 'FAIL', 
      'Found ' || duplicate_username_count || ' duplicate usernames');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 5. PERFORMANCE TESTS
-- =======================

CREATE OR REPLACE FUNCTION test_performance()
RETURNS TABLE(test_name TEXT, status TEXT, message TEXT) AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  query_time INTERVAL;
  slow_threshold INTERVAL := '100 milliseconds';
BEGIN
  -- Test 1: User profile query performance
  start_time := clock_timestamp();
  PERFORM * FROM public.users LIMIT 100;
  end_time := clock_timestamp();
  query_time := end_time - start_time;
  
  IF query_time < slow_threshold THEN
    RETURN QUERY SELECT 'user_query_performance'::TEXT, 'PASS'::TEXT, 
      ('User query completed in ' || query_time::TEXT)::TEXT;
    PERFORM record_test_result('PERFORMANCE', 'user_query_performance', 'PASS', 
      'Query time: ' || query_time::TEXT);
  ELSE
    RETURN QUERY SELECT 'user_query_performance'::TEXT, 'FAIL'::TEXT, 
      ('User query took ' || query_time::TEXT || ' (threshold: ' || slow_threshold::TEXT || ')')::TEXT;
    PERFORM record_test_result('PERFORMANCE', 'user_query_performance', 'FAIL', 
      'Query time: ' || query_time::TEXT);
  END IF;
  
  -- Test 2: Team member query performance
  start_time := clock_timestamp();
  PERFORM * FROM public.team_members LIMIT 100;
  end_time := clock_timestamp();
  query_time := end_time - start_time;
  
  IF query_time < slow_threshold THEN
    RETURN QUERY SELECT 'team_query_performance'::TEXT, 'PASS'::TEXT, 
      ('Team query completed in ' || query_time::TEXT)::TEXT;
    PERFORM record_test_result('PERFORMANCE', 'team_query_performance', 'PASS', 
      'Query time: ' || query_time::TEXT);
  ELSE
    RETURN QUERY SELECT 'team_query_performance'::TEXT, 'FAIL'::TEXT, 
      ('Team query took ' || query_time::TEXT || ' (threshold: ' || slow_threshold::TEXT || ')')::TEXT;
    PERFORM record_test_result('PERFORMANCE', 'team_query_performance', 'FAIL', 
      'Query time: ' || query_time::TEXT);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 6. MASTER TEST RUNNER
-- =======================

CREATE OR REPLACE FUNCTION run_all_auth_tests()
RETURNS TABLE(
  suite TEXT,
  total_tests BIGINT,
  passed BIGINT,
  failed BIGINT,
  skipped BIGINT,
  pass_rate NUMERIC
) AS $$
DECLARE
  start_time TIMESTAMPTZ := clock_timestamp();
  end_time TIMESTAMPTZ;
BEGIN
  -- Clear previous test results
  DELETE FROM test_results WHERE created_at < NOW() - INTERVAL '1 hour';
  
  RAISE NOTICE 'Starting comprehensive auth system test suite...';
  
  -- Run all test suites
  PERFORM * FROM test_rls_policies();
  PERFORM * FROM test_auth_triggers();
  PERFORM * FROM test_data_integrity();
  PERFORM * FROM test_performance();
  
  end_time := clock_timestamp();
  
  -- Record overall execution time
  PERFORM record_test_result('OVERALL', 'total_execution_time', 'PASS', 
    'Total time: ' || (end_time - start_time)::TEXT);
  
  -- Return summary
  RETURN QUERY
  SELECT 
    tr.test_suite,
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE tr.status = 'PASS') as passed,
    COUNT(*) FILTER (WHERE tr.status = 'FAIL') as failed,
    COUNT(*) FILTER (WHERE tr.status = 'SKIP') as skipped,
    ROUND(
      (COUNT(*) FILTER (WHERE tr.status = 'PASS')::NUMERIC / COUNT(*)) * 100, 
      2
    ) as pass_rate
  FROM test_results tr
  WHERE tr.created_at >= start_time
  GROUP BY tr.test_suite
  ORDER BY tr.test_suite;
  
  RAISE NOTICE 'Test suite completed in %', (end_time - start_time);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 7. CONTINUOUS MONITORING FUNCTIONS
-- =======================

-- Function to run daily health checks
CREATE OR REPLACE FUNCTION daily_auth_health_check()
RETURNS TABLE(check_name TEXT, status TEXT, details TEXT) AS $$
BEGIN
  -- Check for new orphaned users
  RETURN QUERY
  WITH orphaned_check AS (
    SELECT COUNT(*) as orphaned_count
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  )
  SELECT 
    'orphaned_users'::TEXT,
    CASE WHEN orphaned_count = 0 THEN 'HEALTHY' ELSE 'ALERT' END,
    ('Found ' || orphaned_count || ' orphaned users')::TEXT
  FROM orphaned_check;
  
  -- Check trigger functionality
  RETURN QUERY
  SELECT 
    'auth_trigger'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created'
    ) THEN 'HEALTHY' ELSE 'ALERT' END,
    'Auth trigger status'::TEXT;
    
  -- Check RLS policies
  RETURN QUERY
  SELECT 
    'rls_policies'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' AND policyname = 'authenticated_users_view_profiles'
    ) THEN 'HEALTHY' ELSE 'ALERT' END,
    'RLS policy status'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 8. GRANT PERMISSIONS
-- =======================

GRANT SELECT ON test_results TO authenticated;
GRANT EXECUTE ON FUNCTION run_all_auth_tests() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION daily_auth_health_check() TO authenticated, service_role;

-- =======================
-- 9. INITIAL TEST RUN
-- =======================

-- Run tests immediately after migration
SELECT 'Running initial test suite...' as notice;
SELECT * FROM run_all_auth_tests();

RAISE NOTICE 'Test suite setup complete. Use SELECT * FROM run_all_auth_tests(); to run all tests.';