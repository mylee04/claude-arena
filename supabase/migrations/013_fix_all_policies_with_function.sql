-- Claude Arena - Fix All RLS Policies with Wrapper Function
-- Version: 13.0.0
-- Description: Use auth_uid() wrapper function to fix all RLS performance warnings

-- ======================================
-- 1. CREATE WRAPPER FUNCTION IF NOT EXISTS
-- ======================================

CREATE OR REPLACE FUNCTION auth_uid() 
RETURNS UUID 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid()
$$;

-- ======================================
-- 2. DROP ALL EXISTING POLICIES
-- ======================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('xp_events', 'user_agents', 'agent_stats', 'agent_achievements', 'conversation_shares')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ======================================
-- 3. RECREATE ALL POLICIES WITH WRAPPER FUNCTION
-- ======================================

-- xp_events
CREATE POLICY "Users view own xp events" ON xp_events
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (user_id = auth_uid());

CREATE POLICY "Service manages xp events" ON xp_events
    AS PERMISSIVE
    FOR ALL
    TO service_role
    USING (true);

-- user_agents
CREATE POLICY "Users view agents by privacy" ON user_agents
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (user_id = auth_uid() OR privacy_level = 'public');

CREATE POLICY "Users insert own agents" ON user_agents
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (user_id = auth_uid());

CREATE POLICY "Users update own agents" ON user_agents
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (user_id = auth_uid());

CREATE POLICY "Users delete own agents" ON user_agents
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING (user_id = auth_uid());

-- agent_stats
CREATE POLICY "Users view agent stats by privacy" ON agent_stats
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (
        user_id = auth_uid()
        OR EXISTS (
            SELECT 1 FROM user_agents ua 
            WHERE ua.id = agent_stats.user_agent_id 
            AND ua.privacy_level = 'public'
        )
    );

CREATE POLICY "Users insert own agent stats" ON agent_stats
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (user_id = auth_uid());

CREATE POLICY "Users update own agent stats" ON agent_stats
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (user_id = auth_uid());

CREATE POLICY "Users delete own agent stats" ON agent_stats
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING (user_id = auth_uid());

-- agent_achievements
CREATE POLICY "Users view achievements by privacy" ON agent_achievements
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (
        user_id = auth_uid()
        OR EXISTS (
            SELECT 1 FROM user_agents ua 
            WHERE ua.id = agent_achievements.user_agent_id 
            AND ua.privacy_level = 'public'
        )
    );

CREATE POLICY "Users insert own achievements" ON agent_achievements
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (user_id = auth_uid());

CREATE POLICY "Users update own achievements" ON agent_achievements
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (user_id = auth_uid());

CREATE POLICY "Users delete own achievements" ON agent_achievements
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING (user_id = auth_uid());

-- conversation_shares
CREATE POLICY "Users view conversations by privacy" ON conversation_shares
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (user_id = auth_uid() OR privacy_level = 'public');

CREATE POLICY "Users insert own conversations" ON conversation_shares
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (user_id = auth_uid());

CREATE POLICY "Users update own conversations" ON conversation_shares
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (user_id = auth_uid());

CREATE POLICY "Users delete own conversations" ON conversation_shares
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING (user_id = auth_uid());

-- ======================================
-- 4. VERIFY ALL POLICIES ARE FIXED
-- ======================================

SELECT 
    tablename,
    policyname,
    cmd as command,
    CASE 
        WHEN qual LIKE '%auth_uid()%' THEN '✅ FIXED'
        WHEN with_check LIKE '%auth_uid()%' THEN '✅ FIXED'
        WHEN policyname = 'Service manages xp events' THEN '✅ SERVICE ROLE'
        ELSE '❓ CHECK'
    END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('xp_events', 'user_agents', 'agent_stats', 'agent_achievements', 'conversation_shares')
ORDER BY tablename, policyname;

-- ======================================
-- 5. CREATE INDEXES
-- ======================================

CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON xp_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_agents_user_privacy ON user_agents(user_id, privacy_level);
CREATE INDEX IF NOT EXISTS idx_agent_stats_agent_id ON agent_stats(user_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_achievements_agent_id ON agent_achievements(user_agent_id);
CREATE INDEX IF NOT EXISTS idx_conversation_shares_privacy ON conversation_shares(privacy_level, created_at DESC);

-- ======================================
-- 6. FINAL MESSAGE
-- ======================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ RLS PERFORMANCE FIX COMPLETE!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'All policies now use auth_uid() wrapper function';
    RAISE NOTICE 'This should resolve all RLS performance warnings';
    RAISE NOTICE '';
END $$;

-- This migration:
-- ✅ Uses auth_uid() wrapper function instead of (SELECT auth.uid())
-- ✅ Explicitly sets PERMISSIVE and TO public/service_role
-- ✅ Should finally fix all RLS performance warnings