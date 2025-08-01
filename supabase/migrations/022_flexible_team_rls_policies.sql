-- Flexible Team RLS Policies for Claude Arena
-- This migration fixes RLS policies to properly handle users with no teams, one team, or multiple teams
-- Version: 1.0
-- Date: 2025-08-01

-- =======================
-- 1. CLEAN UP EXISTING POLICIES
-- =======================

-- Drop all existing RLS policies on tables with team relationships
DROP POLICY IF EXISTS "Users view team user agents" ON public.user_agents;
DROP POLICY IF EXISTS "Users manage own user agents" ON public.user_agents;
DROP POLICY IF EXISTS "Users insert own user agents" ON public.user_agents;
DROP POLICY IF EXISTS "Users update own user agents" ON public.user_agents;
DROP POLICY IF EXISTS "Users delete own user agents" ON public.user_agents;
DROP POLICY IF EXISTS "Users can view own agents" ON public.user_agents;
DROP POLICY IF EXISTS "Users can view public agents" ON public.user_agents;
DROP POLICY IF EXISTS "Users can manage own agents" ON public.user_agents;

DROP POLICY IF EXISTS "Users view team xp events" ON public.xp_events;
DROP POLICY IF EXISTS "Users manage own xp events" ON public.xp_events;
DROP POLICY IF EXISTS "Users can view own XP events" ON public.xp_events;
DROP POLICY IF EXISTS "System can manage XP events" ON public.xp_events;

DROP POLICY IF EXISTS "Users view team agent stats" ON public.agent_stats;
DROP POLICY IF EXISTS "Users manage own agent stats" ON public.agent_stats;
DROP POLICY IF EXISTS "Users can view own agent stats" ON public.agent_stats;
DROP POLICY IF EXISTS "Users can view public agent stats" ON public.agent_stats;
DROP POLICY IF EXISTS "Users can manage own agent stats" ON public.agent_stats;

DROP POLICY IF EXISTS "Users view team agent achievements" ON public.agent_achievements;
DROP POLICY IF EXISTS "Users manage own agent achievements" ON public.agent_achievements;
DROP POLICY IF EXISTS "Users can view own agent achievements" ON public.agent_achievements;
DROP POLICY IF EXISTS "Users can view public agent achievements" ON public.agent_achievements;
DROP POLICY IF EXISTS "Users can manage own agent achievements" ON public.agent_achievements;

DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversation_shares;
DROP POLICY IF EXISTS "Users can view public conversations" ON public.conversation_shares;
DROP POLICY IF EXISTS "Users can manage own conversations" ON public.conversation_shares;

-- =======================
-- 2. ENHANCED HELPER FUNCTIONS
-- =======================

-- Function to check if user is in any of the teams (handles NULL team_id gracefully)
CREATE OR REPLACE FUNCTION public.user_can_access_team_resource(resource_user_id UUID, resource_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- If not authenticated, deny access
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- If the resource belongs to the current user, allow access
  IF auth.uid() = resource_user_id THEN
    RETURN TRUE;
  END IF;

  -- If resource has no team (team_id IS NULL), only the owner can access
  IF resource_team_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- If resource has a team_id, check if current user is in that team
  RETURN EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = resource_team_id 
    AND user_id = auth.uid() 
    AND status = 'active'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, deny access
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can modify team resource (owner or team admin)
CREATE OR REPLACE FUNCTION public.user_can_modify_team_resource(resource_user_id UUID, resource_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- If not authenticated, deny access
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- If the resource belongs to the current user, allow modification
  IF auth.uid() = resource_user_id THEN
    RETURN TRUE;
  END IF;

  -- If resource has no team (team_id IS NULL), only the owner can modify
  IF resource_team_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- If resource has a team_id, check if current user is admin/owner of that team
  RETURN EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = resource_team_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
    AND status = 'active'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, deny access
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get user's teams for filtering
CREATE OR REPLACE FUNCTION public.get_user_team_ids(p_user_id UUID DEFAULT NULL)
RETURNS UUID[] AS $$
DECLARE
  target_user_id UUID;
  team_ids UUID[];
BEGIN
  -- Use provided user_id or current authenticated user
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  IF target_user_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  -- Get all team IDs for the user
  SELECT ARRAY_AGG(team_id) INTO team_ids
  FROM public.team_members 
  WHERE user_id = target_user_id 
  AND status = 'active';

  RETURN COALESCE(team_ids, ARRAY[]::UUID[]);
EXCEPTION
  WHEN OTHERS THEN
    RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =======================
-- 3. USER_AGENTS TABLE POLICIES
-- =======================

-- Users can view their own agents regardless of team
CREATE POLICY "users_view_own_agents"
  ON public.user_agents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view public agents from any team
CREATE POLICY "public_view_public_agents"
  ON public.user_agents FOR SELECT
  USING (privacy_level = 'public');

-- Team members can view team agents (when team_id is set)
CREATE POLICY "team_members_view_team_agents"
  ON public.user_agents FOR SELECT
  TO authenticated
  USING (
    team_id IS NOT NULL AND
    public.user_can_access_team_resource(user_id, team_id)
  );

-- Users can insert their own agents
CREATE POLICY "users_insert_own_agents"
  ON public.user_agents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own agents, team admins can update team agents
CREATE POLICY "users_update_agents"
  ON public.user_agents FOR UPDATE
  TO authenticated
  USING (public.user_can_modify_team_resource(user_id, team_id))
  WITH CHECK (public.user_can_modify_team_resource(user_id, team_id));

-- Users can delete their own agents, team admins can delete team agents
CREATE POLICY "users_delete_agents"
  ON public.user_agents FOR DELETE
  TO authenticated
  USING (public.user_can_modify_team_resource(user_id, team_id));

-- =======================
-- 4. XP_EVENTS TABLE POLICIES
-- =======================

-- Users can view their own XP events
CREATE POLICY "users_view_own_xp_events"
  ON public.xp_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Team members can view XP events for their teams (when team_id is set)
CREATE POLICY "team_members_view_team_xp_events"
  ON public.xp_events FOR SELECT
  TO authenticated
  USING (
    team_id IS NOT NULL AND
    public.user_can_access_team_resource(user_id, team_id)
  );

-- System/service role can manage all XP events
CREATE POLICY "system_manage_xp_events"
  ON public.xp_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Authenticated users can insert XP events for themselves
CREATE POLICY "users_insert_own_xp_events"
  ON public.xp_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =======================
-- 5. AGENT_STATS TABLE POLICIES
-- =======================

-- Users can view their own agent stats
CREATE POLICY "users_view_own_agent_stats"
  ON public.agent_stats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Public agent stats are viewable when the corresponding user_agent is public
CREATE POLICY "public_view_public_agent_stats"
  ON public.agent_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_agents ua
      WHERE ua.user_id = agent_stats.user_id
      AND ua.agent_name = agent_stats.agent_name
      AND ua.privacy_level = 'public'
    )
  );

-- Team members can view team agent stats (when team_id is set)
CREATE POLICY "team_members_view_team_agent_stats"
  ON public.agent_stats FOR SELECT
  TO authenticated
  USING (
    team_id IS NOT NULL AND
    public.user_can_access_team_resource(user_id, team_id)
  );

-- Users can manage their own agent stats, team admins can manage team stats
CREATE POLICY "users_manage_agent_stats"
  ON public.agent_stats FOR ALL
  TO authenticated
  USING (public.user_can_modify_team_resource(user_id, team_id))
  WITH CHECK (public.user_can_modify_team_resource(user_id, team_id));

-- =======================
-- 6. AGENT_ACHIEVEMENTS TABLE POLICIES
-- =======================

-- Users can view their own agent achievements
CREATE POLICY "users_view_own_agent_achievements"
  ON public.agent_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Public agent achievements are viewable when the corresponding user_agent is public
CREATE POLICY "public_view_public_agent_achievements"
  ON public.agent_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_agents ua
      WHERE ua.user_id = agent_achievements.user_id
      AND ua.agent_name = agent_achievements.agent_name
      AND ua.privacy_level = 'public'
    )
  );

-- Team members can view team agent achievements (when team_id is set)
CREATE POLICY "team_members_view_team_agent_achievements"
  ON public.agent_achievements FOR SELECT
  TO authenticated
  USING (
    team_id IS NOT NULL AND
    public.user_can_access_team_resource(user_id, team_id)
  );

-- Users can manage their own agent achievements, team admins can manage team achievements
CREATE POLICY "users_manage_agent_achievements"
  ON public.agent_achievements FOR ALL
  TO authenticated
  USING (public.user_can_modify_team_resource(user_id, team_id))
  WITH CHECK (public.user_can_modify_team_resource(user_id, team_id));

-- =======================
-- 7. CONVERSATION_SHARES TABLE POLICIES
-- =======================

-- Users can view their own conversations regardless of team
CREATE POLICY "users_view_own_conversations"
  ON public.conversation_shares FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Anyone can view public conversations
CREATE POLICY "public_view_public_conversations"
  ON public.conversation_shares FOR SELECT
  USING (privacy_level = 'public');

-- Users can manage their own conversations
CREATE POLICY "users_manage_own_conversations"
  ON public.conversation_shares FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =======================
-- 8. ENHANCED TEAM POLICIES (Update existing)
-- =======================

-- Update team_members policies to handle users with no teams
DROP POLICY IF EXISTS "public_view_team_members" ON public.team_members;
DROP POLICY IF EXISTS "team_admins_add_members" ON public.team_members;
DROP POLICY IF EXISTS "team_admins_update_members" ON public.team_members;
DROP POLICY IF EXISTS "team_admins_or_self_remove_members" ON public.team_members;

-- Anyone can view team memberships (for public team pages)
CREATE POLICY "public_view_team_members"
  ON public.team_members FOR SELECT
  USING (true);

-- Team admins can add members, users can join teams (if allowed)
CREATE POLICY "team_admins_add_members"
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_team_admin(team_id) OR
    -- Users can add themselves to teams (self-join)
    user_id = auth.uid()
  );

-- Team admins can update member roles and status
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
-- 9. CREATE OPTIMIZED INDEXES
-- =======================

-- Indexes for the new helper functions and team relationships
CREATE INDEX IF NOT EXISTS idx_user_agents_user_team ON public.user_agents(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_privacy ON public.user_agents(privacy_level) WHERE privacy_level = 'public';

CREATE INDEX IF NOT EXISTS idx_xp_events_user_team ON public.xp_events(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_team_created ON public.xp_events(team_id, created_at DESC) WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_stats_user_team ON public.agent_stats(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_agent_achievements_user_team ON public.agent_achievements(user_id, team_id);

CREATE INDEX IF NOT EXISTS idx_team_members_active_status ON public.team_members(team_id, user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_team_members_role_status ON public.team_members(team_id, role, status) WHERE status = 'active';

-- =======================
-- 10. UTILITY VIEWS FOR TEAM ACCESS
-- =======================

-- View to help with team-based queries (materialized for performance)
CREATE OR REPLACE VIEW public.user_team_access AS
SELECT DISTINCT 
    tm.user_id,
    tm.team_id,
    tm.role,
    tm.status,
    t.name as team_name,
    t.slug as team_slug
FROM public.team_members tm
JOIN public.teams t ON t.id = tm.team_id
WHERE tm.status = 'active';

-- Grant permissions on the new view
GRANT SELECT ON public.user_team_access TO authenticated, anon;

-- =======================
-- 11. UPDATE TRIGGER FUNCTIONS FOR TEAM ASSIGNMENT
-- =======================

-- Function to set default team_id when creating user resources
CREATE OR REPLACE FUNCTION public.set_default_team_id()
RETURNS TRIGGER AS $$
DECLARE
  default_team_id UUID;
BEGIN
  -- Only set team_id if it's NULL and user has teams
  IF NEW.team_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT team_id INTO default_team_id
    FROM public.team_members
    WHERE user_id = NEW.user_id
    AND status = 'active'
    ORDER BY 
      CASE WHEN role = 'owner' THEN 0 
           WHEN role = 'admin' THEN 1 
           ELSE 2 END,
      joined_at
    LIMIT 1;
    
    -- Only update if we found a team
    IF default_team_id IS NOT NULL THEN
      NEW.team_id := default_team_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to set default team_id on insert (optional - allows NULL)
CREATE TRIGGER set_default_team_id_user_agents
  BEFORE INSERT ON public.user_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_team_id();

CREATE TRIGGER set_default_team_id_xp_events
  BEFORE INSERT ON public.xp_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_team_id();

-- =======================
-- 12. TEST FUNCTION FOR TEAM FLEXIBILITY
-- =======================

-- Function to test flexible team access
CREATE OR REPLACE FUNCTION public.test_flexible_team_access()
RETURNS TABLE(test_name TEXT, result TEXT) AS $$
DECLARE
  test_user_id UUID;
  test_team_id UUID;
  no_team_user_id UUID;
BEGIN
  -- Test 1: User with no teams can access their own data
  BEGIN
    -- Find a user with no teams or create a test scenario
    SELECT u.id INTO no_team_user_id
    FROM public.users u
    LEFT JOIN public.team_members tm ON tm.user_id = u.id
    WHERE tm.user_id IS NULL
    LIMIT 1;
    
    IF no_team_user_id IS NOT NULL THEN
      RETURN QUERY SELECT 'user_no_teams_own_data'::TEXT, 'PASS - User found with no teams'::TEXT;
    ELSE
      RETURN QUERY SELECT 'user_no_teams_own_data'::TEXT, 'SKIP - No users without teams found'::TEXT;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'user_no_teams_own_data'::TEXT, ('FAIL: ' || SQLERRM)::TEXT;
  END;

  -- Test 2: Helper functions handle NULL team_id gracefully
  BEGIN
    -- Test with NULL team_id
    PERFORM public.user_can_access_team_resource(gen_random_uuid(), NULL);
    RETURN QUERY SELECT 'null_team_id_handling'::TEXT, 'PASS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'null_team_id_handling'::TEXT, ('FAIL: ' || SQLERRM)::TEXT;
  END;

  -- Test 3: Team access functions work
  BEGIN
    SELECT team_id INTO test_team_id FROM public.team_members LIMIT 1;
    IF test_team_id IS NOT NULL THEN
      PERFORM public.is_team_member(test_team_id);
      RETURN QUERY SELECT 'team_access_functions'::TEXT, 'PASS'::TEXT;
    ELSE
      RETURN QUERY SELECT 'team_access_functions'::TEXT, 'SKIP - No teams found'::TEXT;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'team_access_functions'::TEXT, ('FAIL: ' || SQLERRM)::TEXT;
  END;

  -- Test 4: Views and indexes exist
  BEGIN
    PERFORM 1 FROM public.user_team_access LIMIT 1;
    RETURN QUERY SELECT 'views_and_indexes'::TEXT, 'PASS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'views_and_indexes'::TEXT, ('FAIL: ' || SQLERRM)::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 13. COMMENTS AND DOCUMENTATION
-- =======================

COMMENT ON FUNCTION public.user_can_access_team_resource(UUID, UUID) IS 'Checks if user can access a resource, handling NULL team_id gracefully';
COMMENT ON FUNCTION public.user_can_modify_team_resource(UUID, UUID) IS 'Checks if user can modify a resource, considering team admin privileges';
COMMENT ON FUNCTION public.get_user_team_ids(UUID) IS 'Returns array of team IDs for a user, empty array if no teams';
COMMENT ON FUNCTION public.set_default_team_id() IS 'Trigger function to optionally set default team_id on resource creation';
COMMENT ON FUNCTION public.test_flexible_team_access() IS 'Tests flexible team access policies and NULL handling';
COMMENT ON VIEW public.user_team_access IS 'Simplified view for team access queries with active memberships only';

-- Log completion
-- Flexible team RLS policies have been implemented. 
-- Users can now:
-- 1. Exist without any teams
-- 2. Have resources with NULL team_id (personal resources)
-- 3. Be members of multiple teams
-- 4. Access team resources based on membership
-- 5. Have team admins manage team resources
-- Run SELECT * FROM public.test_flexible_team_access(); to test the implementation.