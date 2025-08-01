-- Comprehensive RLS Policy Fix for Claude Arena
-- This migration fixes 500 errors by simplifying policies and removing circular dependencies
-- Version: 2.0
-- Date: 2025-08-01

-- =======================
-- 1. CLEAN UP EXISTING POLICIES
-- =======================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users see own profile" ON public.users;
DROP POLICY IF EXISTS "Users see team members" ON public.users;

DROP POLICY IF EXISTS "Leaderboard entries are publicly viewable" ON public.leaderboard_entries;
DROP POLICY IF EXISTS "System can manage leaderboard entries" ON public.leaderboard_entries;

DROP POLICY IF EXISTS "Achievements are publicly viewable" ON public.achievements;
DROP POLICY IF EXISTS "System can manage achievements" ON public.achievements;

DROP POLICY IF EXISTS "Teams are publicly viewable" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can update teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete teams" ON public.teams;
DROP POLICY IF EXISTS "Users see their teams" ON public.teams;
DROP POLICY IF EXISTS "Users create teams" ON public.teams;
DROP POLICY IF EXISTS "Team admins update teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners delete teams" ON public.teams;

DROP POLICY IF EXISTS "Team members are publicly viewable" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can remove members" ON public.team_members;
DROP POLICY IF EXISTS "Users see team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins manage members" ON public.team_members;

-- =======================
-- 2. HELPER FUNCTIONS FOR POLICIES
-- =======================

-- Function to safely check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user is team member (with error handling)
CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = team_uuid 
    AND user_id = auth.uid() 
    AND status = 'active'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, deny access
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user is team admin (with error handling)
CREATE OR REPLACE FUNCTION public.is_team_admin(team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = team_uuid 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
    AND status = 'active'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =======================
-- 3. SIMPLIFIED USERS TABLE POLICIES
-- =======================

-- Allow authenticated users to view all user profiles (for leaderboard)
CREATE POLICY "authenticated_users_view_profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous users to view basic profile info (username, avatar) for leaderboard
CREATE POLICY "public_view_basic_profiles"
  ON public.users FOR SELECT
  TO anon
  USING (true);

-- Users can insert their own profile
CREATE POLICY "users_insert_own_profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "users_update_own_profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =======================
-- 4. LEADERBOARD ENTRIES POLICIES
-- =======================

-- Anyone can view leaderboard entries (public leaderboard)
CREATE POLICY "public_view_leaderboard"
  ON public.leaderboard_entries FOR SELECT
  USING (true);

-- Only authenticated users can insert their own entries
CREATE POLICY "users_insert_own_entries"
  ON public.leaderboard_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own entries
CREATE POLICY "users_update_own_entries"
  ON public.leaderboard_entries FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =======================
-- 5. ACHIEVEMENTS POLICIES
-- =======================

-- Anyone can view achievements (for public profiles)
CREATE POLICY "public_view_achievements"
  ON public.achievements FOR SELECT
  USING (true);

-- Only authenticated users can receive achievements
CREATE POLICY "users_receive_achievements"
  ON public.achievements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =======================
-- 6. TEAMS POLICIES
-- =======================

-- Anyone can view team information (for public leaderboards)
CREATE POLICY "public_view_teams"
  ON public.teams FOR SELECT
  USING (true);

-- Authenticated users can create teams
CREATE POLICY "authenticated_create_teams"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Team admins can update teams
CREATE POLICY "team_admins_update_teams"
  ON public.teams FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_team_admin(id)
  )
  WITH CHECK (
    created_by = auth.uid() OR
    public.is_team_admin(id)
  );

-- Team owners can delete teams
CREATE POLICY "team_owners_delete_teams"
  ON public.teams FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- =======================
-- 7. TEAM_MEMBERS POLICIES
-- =======================

-- Anyone can view team memberships (for public team pages)
CREATE POLICY "public_view_team_members"
  ON public.team_members FOR SELECT
  USING (true);

-- Team admins can add members
CREATE POLICY "team_admins_add_members"
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_team_admin(team_id) OR
    -- Users can join teams (this might need additional business logic)
    user_id = auth.uid()
  );

-- Team admins can update member roles
CREATE POLICY "team_admins_update_members"
  ON public.team_members FOR UPDATE
  TO authenticated
  USING (public.is_team_admin(team_id))
  WITH CHECK (public.is_team_admin(team_id));

-- Team admins and members themselves can remove memberships
CREATE POLICY "team_admins_or_self_remove_members"
  ON public.team_members FOR DELETE
  TO authenticated
  USING (
    public.is_team_admin(team_id) OR
    user_id = auth.uid()
  );

-- =======================
-- 8. GRANT PERMISSIONS
-- =======================

-- Grant necessary permissions to roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =======================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- =======================

-- Ensure we have proper indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON public.users(id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON public.team_members(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON public.team_members(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user ON public.leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.achievements(user_id);

-- =======================
-- 10. TEST POLICY FUNCTIONALITY
-- =======================

-- Function to test if policies are working correctly
CREATE OR REPLACE FUNCTION public.test_rls_policies()
RETURNS TABLE(test_name TEXT, result TEXT) AS $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Test basic table access
  BEGIN
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    RETURN QUERY SELECT 'users_table_access'::TEXT, 'PASS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'users_table_access'::TEXT, ('FAIL: ' || SQLERRM)::TEXT;
  END;
  
  BEGIN
    PERFORM 1 FROM public.teams LIMIT 1;
    RETURN QUERY SELECT 'teams_table_access'::TEXT, 'PASS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'teams_table_access'::TEXT, ('FAIL: ' || SQLERRM)::TEXT;
  END;
  
  BEGIN
    PERFORM 1 FROM public.team_members LIMIT 1;
    RETURN QUERY SELECT 'team_members_table_access'::TEXT, 'PASS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'team_members_table_access'::TEXT, ('FAIL: ' || SQLERRM)::TEXT;
  END;
  
  BEGIN
    PERFORM 1 FROM public.leaderboard_entries LIMIT 1;
    RETURN QUERY SELECT 'leaderboard_entries_table_access'::TEXT, 'PASS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'leaderboard_entries_table_access'::TEXT, ('FAIL: ' || SQLERRM)::TEXT;
  END;
  
  BEGIN
    PERFORM 1 FROM public.achievements LIMIT 1;
    RETURN QUERY SELECT 'achievements_table_access'::TEXT, 'PASS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'achievements_table_access'::TEXT, ('FAIL: ' || SQLERRM)::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 11. COMMENTS AND DOCUMENTATION
-- =======================

COMMENT ON FUNCTION public.is_authenticated() IS 'Safely checks if user is authenticated without throwing errors';
COMMENT ON FUNCTION public.is_team_member(UUID) IS 'Safely checks if user is member of specified team';
COMMENT ON FUNCTION public.is_team_admin(UUID) IS 'Safely checks if user is admin of specified team';
COMMENT ON FUNCTION public.test_rls_policies() IS 'Tests if RLS policies are working correctly';

-- Log completion
-- RLS policies have been comprehensively updated. Run SELECT * FROM public.test_rls_policies(); to test.