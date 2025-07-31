-- Claude Arena RLS Performance Optimization Migration (FINAL)
-- Version: 5.0.2
-- Description: Fix Row Level Security performance issues - matches your actual schema

-- ==========================================
-- 1. CREATE HELPER FUNCTIONS FOR AUTH OPTIMIZATION
-- ==========================================

-- Create optimized auth helper functions if they don't exist
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.role();
$$;

-- ==========================================
-- 2. FIX EXISTING RLS POLICIES
-- ==========================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Public profiles are viewable" ON users;

-- Recreate users policies with optimized auth calls
CREATE POLICY "Public profiles are viewable" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

-- Fix leaderboard_entries policies
DROP POLICY IF EXISTS "Leaderboard entries are publicly viewable" ON leaderboard_entries;
DROP POLICY IF EXISTS "System can manage leaderboard entries" ON leaderboard_entries;

CREATE POLICY "Leaderboard entries are publicly viewable" ON leaderboard_entries
    FOR SELECT USING (true);

-- Fix achievements policies
DROP POLICY IF EXISTS "Achievements are publicly viewable" ON achievements;
DROP POLICY IF EXISTS "System can manage achievements" ON achievements;

CREATE POLICY "Achievements are publicly viewable" ON achievements
    FOR SELECT USING (true);

-- Fix teams policies (using created_by, not owner_id)
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;
DROP POLICY IF EXISTS "Team owners can update teams" ON teams;
DROP POLICY IF EXISTS "Team owners can delete teams" ON teams;
DROP POLICY IF EXISTS "Teams are publicly viewable" ON teams;

CREATE POLICY "Teams are publicly viewable" ON teams
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create teams" ON teams
    FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Team creators can update teams" ON teams
    FOR UPDATE USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Team creators can delete teams" ON teams
    FOR DELETE USING (created_by = (SELECT auth.uid()));

-- Fix team_members policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
        -- Drop old policies
        DROP POLICY IF EXISTS "Team admins can manage members" ON team_members;
        DROP POLICY IF EXISTS "Team admins can update members" ON team_members;
        DROP POLICY IF EXISTS "Team admins can remove members" ON team_members;
        DROP POLICY IF EXISTS "Team members are publicly viewable" ON team_members;
        DROP POLICY IF EXISTS "Team members can view their teams" ON team_members;
        
        -- Create optimized policies
        CREATE POLICY "Team members are publicly viewable" ON team_members
            FOR SELECT USING (true);
            
        CREATE POLICY "Team members can leave teams" ON team_members
            FOR DELETE USING (user_id = (SELECT auth.uid()));
            
        -- Team admins can manage members (check if user is admin/owner of the team)
        CREATE POLICY "Team admins can manage members" ON team_members
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.team_id = team_members.team_id
                    AND tm.user_id = (SELECT auth.uid())
                    AND tm.role IN ('owner', 'admin')
                )
            );
    END IF;
END $$;

-- ==========================================
-- 3. SET SECURE SEARCH PATH FOR EXISTING FUNCTIONS
-- ==========================================

DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Find and update all functions in public schema
    FOR func_record IN 
        SELECT DISTINCT p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'  -- Only functions, not procedures
    LOOP
        BEGIN
            -- Try to set search_path, ignore if function doesn't exist or has issues
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp', 
                          func_record.proname, func_record.args);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors for functions that don't exist or can't be altered
            NULL;
        END;
    END LOOP;
END $$;

-- ==========================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ==========================================

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Enable RLS on team_members if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
        ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ==========================================
-- 5. CREATE SERVICE ROLE POLICIES
-- ==========================================

-- Allow service role to manage data
CREATE POLICY "Service role can manage users" ON users
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role can manage leaderboard" ON leaderboard_entries
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role can manage achievements" ON achievements
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role can manage teams" ON teams
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ==========================================
-- 6. OPTIMIZE MATERIALIZED VIEW PERMISSIONS
-- ==========================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'user_statistics') THEN
        -- Revoke all and grant appropriate permissions
        REVOKE ALL ON user_statistics FROM PUBLIC;
        GRANT SELECT ON user_statistics TO authenticated;
        GRANT SELECT ON user_statistics TO anon;
    END IF;
END $$;

-- ==========================================
-- 7. CREATE PERFORMANCE INDEXES
-- ==========================================

-- Add indexes for common RLS lookups if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_id_auth ON users(id) WHERE id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_created_by_auth ON teams(created_by) WHERE created_by IS NOT NULL;

-- Add indexes for team_members if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
        CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
        CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
        CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
    END IF;
END $$;

-- ==========================================
-- 8. ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ==========================================

ANALYZE users;
ANALYZE leaderboard_entries;
ANALYZE achievements;
ANALYZE teams;

-- Analyze team_members if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
        ANALYZE team_members;
    END IF;
END $$;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- Performance optimizations applied:
-- 1. All auth function calls wrapped in subselects
-- 2. Duplicate policies removed
-- 3. Service role policies added for backend operations
-- 4. Indexes added for common RLS lookups
-- 5. Tables analyzed for query optimization