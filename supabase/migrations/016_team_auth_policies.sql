-- Team-based authentication policies
-- This migration adds team-related policies without conflicting with existing ones

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Users see team members" ON public.users;
DROP POLICY IF EXISTS "Users see their teams" ON public.teams;
DROP POLICY IF EXISTS "Users create teams" ON public.teams;
DROP POLICY IF EXISTS "Team admins update teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners delete teams" ON public.teams;
DROP POLICY IF EXISTS "Users see team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins manage members" ON public.team_members;

-- ======================
-- ENHANCED USER POLICIES
-- ======================

-- Users can see other users in their teams (enhanced)
CREATE POLICY "Users see team members"
  ON public.users FOR SELECT
  USING (
    id = auth.uid() OR
    id IN (
      SELECT DISTINCT tm2.user_id 
      FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid() AND tm1.status = 'active' AND tm2.status = 'active'
    )
  );

-- ======================
-- TEAMS TABLE POLICIES
-- ======================

-- Users can see teams they belong to
CREATE POLICY "Users see their teams"
  ON public.teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can create teams
CREATE POLICY "Users create teams"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Team admins can update teams
CREATE POLICY "Team admins update teams"
  ON public.teams FOR UPDATE
  USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Team owners can delete teams
CREATE POLICY "Team owners delete teams"
  ON public.teams FOR DELETE
  USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() 
      AND role = 'owner'
      AND status = 'active'
    )
  );

-- ======================
-- TEAM_MEMBERS POLICIES
-- ======================

-- Users can see members of their teams
CREATE POLICY "Users see team members"
  ON public.team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Team admins can manage members
CREATE POLICY "Team admins manage members"
  ON public.team_members FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- ======================
-- TEAM-AWARE POLICIES FOR AGENT TABLES
-- ======================

-- Drop and recreate policies for team-aware agent tables
DROP POLICY IF EXISTS "Users see team agents" ON public.user_agents;
DROP POLICY IF EXISTS "Users see team agent stats" ON public.agent_stats;
DROP POLICY IF EXISTS "Users see team achievements" ON public.agent_achievements;
DROP POLICY IF EXISTS "Users see team XP events" ON public.xp_events;

-- Users see team agents (if team_id is set)
CREATE POLICY "Users see team agents"
  ON public.user_agents FOR SELECT
  USING (
    team_id IS NULL OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users see team stats
CREATE POLICY "Users see team agent stats"
  ON public.agent_stats FOR SELECT
  USING (
    team_id IS NULL OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users see team achievements
CREATE POLICY "Users see team achievements"
  ON public.agent_achievements FOR SELECT
  USING (
    team_id IS NULL OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users see team XP events
CREATE POLICY "Users see team XP events"
  ON public.xp_events FOR SELECT
  USING (
    team_id IS NULL OR
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can create XP events for their teams
CREATE POLICY "Users create team XP events"
  ON public.xp_events FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (team_id IS NULL OR team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    ))
  );

-- ======================
-- Note: conversation_shares already has appropriate policies
-- No additional team-based policies needed for this table
-- ======================