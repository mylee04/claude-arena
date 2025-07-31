-- Claude Arena Agent Ownership System
-- Version: 2.0.0
-- Description: Enhanced schema for agent ownership, XP tracking, and privacy-controlled data

-- Enable additional extensions for advanced features
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create additional custom types for agent system
CREATE TYPE privacy_level AS ENUM ('public', 'friends', 'private');
CREATE TYPE agent_level AS ENUM ('recruit', 'specialist', 'expert', 'master', 'elite');
CREATE TYPE xp_event_type AS ENUM ('task_completion', 'achievement_unlock', 'streak_bonus', 'collaboration_bonus', 'perfect_score');

-- Enhanced profiles table with privacy settings and agent ownership
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"leaderboard": "public", "achievements": "public", "agents": "public"}'::JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_level agent_level DEFAULT 'recruit';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Create indexes for new user fields
CREATE INDEX IF NOT EXISTS idx_users_total_xp ON users(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_current_level ON users(current_level);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_date DESC);

-- 1. XP Events table - immutable event sourcing for XP tracking
CREATE TABLE public.xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    event_type xp_event_type NOT NULL,
    base_points INTEGER NOT NULL CHECK (base_points >= 0),
    bonus_points INTEGER DEFAULT 0 CHECK (bonus_points >= 0),
    total_points INTEGER GENERATED ALWAYS AS (base_points + bonus_points) STORED,
    metadata JSONB DEFAULT '{}',
    session_id UUID, -- Optional session tracking
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for xp_events
CREATE INDEX idx_xp_events_user_id ON xp_events(user_id);
CREATE INDEX idx_xp_events_agent_name ON xp_events(agent_name);
CREATE INDEX idx_xp_events_event_type ON xp_events(event_type);
CREATE INDEX idx_xp_events_created_at ON xp_events(created_at DESC);
CREATE INDEX idx_xp_events_total_points ON xp_events(total_points DESC);

-- 2. User Agents table - tracks which agents each user owns/uses
CREATE TABLE public.user_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    agent_display_name TEXT,
    agent_description TEXT,
    is_favorite BOOLEAN DEFAULT false,
    total_usage INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    current_level agent_level DEFAULT 'recruit',
    unlock_date TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ,
    privacy_level privacy_level DEFAULT 'public',
    
    -- Constraints
    CONSTRAINT unique_user_agent UNIQUE (user_id, agent_name),
    CONSTRAINT valid_agent_name CHECK (char_length(agent_name) >= 1 AND char_length(agent_name) <= 100)
);

-- Create indexes for user_agents
CREATE INDEX idx_user_agents_user_id ON user_agents(user_id);
CREATE INDEX idx_user_agents_agent_name ON user_agents(agent_name);
CREATE INDEX idx_user_agents_total_xp ON user_agents(total_xp DESC);
CREATE INDEX idx_user_agents_current_level ON user_agents(current_level);
CREATE INDEX idx_user_agents_last_used ON user_agents(last_used DESC);
CREATE INDEX idx_user_agents_is_favorite ON user_agents(is_favorite) WHERE is_favorite = true;

-- 3. Agent Statistics table - detailed performance metrics per agent
CREATE TABLE public.agent_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_agent_id UUID NOT NULL REFERENCES user_agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    
    -- Performance metrics
    success_rate DECIMAL(5,2) DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 100),
    avg_completion_time INTERVAL,
    fastest_completion INTERVAL,
    total_tasks INTEGER DEFAULT 0,
    successful_tasks INTEGER DEFAULT 0,
    failed_tasks INTEGER DEFAULT 0,
    
    -- Activity metrics
    sessions_count INTEGER DEFAULT 0,
    total_time_spent INTERVAL DEFAULT '0 minutes',
    streak_days INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    
    -- Collaboration metrics
    shared_conversations INTEGER DEFAULT 0,
    team_collaborations INTEGER DEFAULT 0,
    
    -- Timestamps
    first_use TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_agent_stats UNIQUE (user_id, agent_name),
    CONSTRAINT valid_success_rate CHECK (successful_tasks <= total_tasks),
    CONSTRAINT valid_failure_rate CHECK (failed_tasks <= total_tasks),
    CONSTRAINT valid_task_totals CHECK (successful_tasks + failed_tasks <= total_tasks)
);

-- Create indexes for agent_stats
CREATE INDEX idx_agent_stats_user_agent_id ON agent_stats(user_agent_id);
CREATE INDEX idx_agent_stats_user_id ON agent_stats(user_id);
CREATE INDEX idx_agent_stats_agent_name ON agent_stats(agent_name);
CREATE INDEX idx_agent_stats_success_rate ON agent_stats(success_rate DESC);
CREATE INDEX idx_agent_stats_total_tasks ON agent_stats(total_tasks DESC);
CREATE INDEX idx_agent_stats_last_updated ON agent_stats(last_updated DESC);

-- 4. Agent Achievements table - specific achievements per agent
CREATE TABLE public.agent_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_agent_id UUID NOT NULL REFERENCES user_agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    achievement_key TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    achievement_description TEXT,
    achievement_tier achievement_tier NOT NULL,
    xp_reward INTEGER DEFAULT 0 CHECK (xp_reward >= 0),
    icon_url TEXT,
    unlock_criteria JSONB DEFAULT '{}',
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_agent_achievement UNIQUE (user_id, agent_name, achievement_key, achievement_tier)
);

-- Create indexes for agent_achievements
CREATE INDEX idx_agent_achievements_user_agent_id ON agent_achievements(user_agent_id);
CREATE INDEX idx_agent_achievements_user_id ON agent_achievements(user_id);
CREATE INDEX idx_agent_achievements_agent_name ON agent_achievements(agent_name);
CREATE INDEX idx_agent_achievements_achievement_key ON agent_achievements(achievement_key);
CREATE INDEX idx_agent_achievements_tier ON agent_achievements(achievement_tier);
CREATE INDEX idx_agent_achievements_unlocked_at ON agent_achievements(unlocked_at DESC);

-- 5. Conversation Shares table - privacy-controlled conversation sharing
CREATE TABLE public.conversation_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    privacy_level privacy_level DEFAULT 'private',
    agents_used TEXT[] NOT NULL DEFAULT '{}',
    xp_earned INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
    CONSTRAINT valid_content_length CHECK (char_length(content) >= 1),
    CONSTRAINT valid_agents_used CHECK (array_length(agents_used, 1) > 0)
);

-- Create indexes for conversation_shares
CREATE INDEX idx_conversation_shares_user_id ON conversation_shares(user_id);
CREATE INDEX idx_conversation_shares_privacy_level ON conversation_shares(privacy_level);
CREATE INDEX idx_conversation_shares_agents_used ON conversation_shares USING GIN(agents_used);
CREATE INDEX idx_conversation_shares_tags ON conversation_shares USING GIN(tags);
CREATE INDEX idx_conversation_shares_created_at ON conversation_shares(created_at DESC);
CREATE INDEX idx_conversation_shares_view_count ON conversation_shares(view_count DESC);
CREATE INDEX idx_conversation_shares_like_count ON conversation_shares(like_count DESC);

-- Enable Row Level Security on new tables
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for xp_events
CREATE POLICY "Users can view own XP events"
    ON xp_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can manage XP events"
    ON xp_events FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for user_agents
CREATE POLICY "Users can view own agents"
    ON user_agents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view public agents"
    ON user_agents FOR SELECT
    USING (privacy_level = 'public');

CREATE POLICY "Users can manage own agents"
    ON user_agents FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for agent_stats
CREATE POLICY "Users can view own agent stats"
    ON agent_stats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view public agent stats"
    ON agent_stats FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_agents ua
            WHERE ua.user_id = agent_stats.user_id
            AND ua.agent_name = agent_stats.agent_name
            AND ua.privacy_level = 'public'
        )
    );

CREATE POLICY "Users can manage own agent stats"
    ON agent_stats FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for agent_achievements
CREATE POLICY "Users can view own agent achievements"
    ON agent_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view public agent achievements"
    ON agent_achievements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_agents ua
            WHERE ua.user_id = agent_achievements.user_id
            AND ua.agent_name = agent_achievements.agent_name
            AND ua.privacy_level = 'public'
        )
    );

CREATE POLICY "Users can manage own agent achievements"
    ON agent_achievements FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for conversation_shares
CREATE POLICY "Users can view own conversations"
    ON conversation_shares FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view public conversations"
    ON conversation_shares FOR SELECT
    USING (privacy_level = 'public');

CREATE POLICY "Users can manage own conversations"
    ON conversation_shares FOR ALL
    USING (auth.uid() = user_id);

-- Update timestamp triggers
CREATE TRIGGER update_user_agents_updated_at
    BEFORE UPDATE ON user_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_stats_updated_at
    BEFORE UPDATE ON agent_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_shares_updated_at
    BEFORE UPDATE ON conversation_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate agent level from XP
CREATE OR REPLACE FUNCTION calculate_agent_level(xp INTEGER)
RETURNS agent_level AS $$
BEGIN
    CASE 
        WHEN xp >= 1000 THEN RETURN 'elite';
        WHEN xp >= 600 THEN RETURN 'master';
        WHEN xp >= 300 THEN RETURN 'expert';
        WHEN xp >= 100 THEN RETURN 'specialist';
        ELSE RETURN 'recruit';
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to award XP and update user/agent levels
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_agent_name TEXT,
    p_event_type xp_event_type,
    p_base_points INTEGER,
    p_bonus_points INTEGER DEFAULT 0,
    p_metadata JSONB DEFAULT '{}',
    p_session_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_user_agent_id UUID;
    v_total_user_xp INTEGER;
    v_total_agent_xp INTEGER;
BEGIN
    -- Create XP event
    INSERT INTO xp_events (user_id, agent_name, event_type, base_points, bonus_points, metadata, session_id)
    VALUES (p_user_id, p_agent_name, p_event_type, p_base_points, p_bonus_points, p_metadata, p_session_id)
    RETURNING id INTO v_event_id;
    
    -- Ensure user_agent record exists
    INSERT INTO user_agents (user_id, agent_name, agent_display_name)
    VALUES (p_user_id, p_agent_name, p_agent_name)
    ON CONFLICT (user_id, agent_name) 
    DO UPDATE SET last_used = NOW()
    RETURNING id INTO v_user_agent_id;
    
    -- Update agent XP and level
    UPDATE user_agents 
    SET 
        total_xp = total_xp + p_base_points + p_bonus_points,
        current_level = calculate_agent_level(total_xp + p_base_points + p_bonus_points),
        last_used = NOW()
    WHERE user_id = p_user_id AND agent_name = p_agent_name;
    
    -- Update user total XP and level
    SELECT SUM(total_xp) INTO v_total_user_xp
    FROM user_agents
    WHERE user_id = p_user_id;
    
    UPDATE users 
    SET 
        total_xp = v_total_user_xp,
        current_level = calculate_agent_level(v_total_user_xp),
        last_active_date = CURRENT_DATE
    WHERE id = p_user_id;
    
    -- Update user streak
    PERFORM update_user_streak(p_user_id);
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_last_active DATE;
    v_current_streak INTEGER;
BEGIN
    SELECT last_active_date INTO v_last_active
    FROM users
    WHERE id = p_user_id;
    
    IF v_last_active = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Continue streak
        UPDATE users 
        SET streak_days = streak_days + 1
        WHERE id = p_user_id;
    ELSIF v_last_active < CURRENT_DATE - INTERVAL '1 day' THEN
        -- Reset streak
        UPDATE users 
        SET streak_days = 1
        WHERE id = p_user_id;
    END IF;
    -- If v_last_active = CURRENT_DATE, streak remains the same (already active today)
END;
$$ LANGUAGE plpgsql;

-- Function to get user's agent portfolio
CREATE OR REPLACE FUNCTION get_user_agent_portfolio(p_user_id UUID)
RETURNS TABLE(
    agent_name TEXT,
    agent_display_name TEXT,
    current_level agent_level,
    total_xp INTEGER,
    total_usage INTEGER,
    success_rate DECIMAL,
    is_favorite BOOLEAN,
    last_used TIMESTAMPTZ,
    achievements_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.agent_name,
        ua.agent_display_name,
        ua.current_level,
        ua.total_xp,
        ua.total_usage,
        COALESCE(ast.success_rate, 0) as success_rate,
        ua.is_favorite,
        ua.last_used,
        COALESCE(ach_count.count, 0)::INTEGER as achievements_count
    FROM user_agents ua
    LEFT JOIN agent_stats ast ON ast.user_agent_id = ua.id
    LEFT JOIN (
        SELECT user_agent_id, COUNT(*) as count
        FROM agent_achievements
        GROUP BY user_agent_id
    ) ach_count ON ach_count.user_agent_id = ua.id
    WHERE ua.user_id = p_user_id
    ORDER BY ua.total_xp DESC, ua.last_used DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent leaderboard across all users
CREATE OR REPLACE FUNCTION get_agent_leaderboard(
    p_agent_name TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    agent_level agent_level,
    total_xp INTEGER,
    success_rate DECIMAL,
    achievements_count INTEGER,
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH agent_rankings AS (
        SELECT 
            ua.user_id,
            u.username,
            u.avatar_url,
            ua.current_level as agent_level,
            ua.total_xp,
            COALESCE(ast.success_rate, 0) as success_rate,
            COALESCE(ach_count.count, 0)::INTEGER as achievements_count,
            RANK() OVER (ORDER BY ua.total_xp DESC, ast.success_rate DESC) as rank
        FROM user_agents ua
        JOIN users u ON u.id = ua.user_id
        LEFT JOIN agent_stats ast ON ast.user_agent_id = ua.id
        LEFT JOIN (
            SELECT user_agent_id, COUNT(*) as count
            FROM agent_achievements
            GROUP BY user_agent_id
        ) ach_count ON ach_count.user_agent_id = ua.id
        WHERE ua.agent_name = p_agent_name
        AND ua.privacy_level = 'public'
    )
    SELECT * FROM agent_rankings
    ORDER BY rank
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to unlock agent achievement
CREATE OR REPLACE FUNCTION unlock_agent_achievement(
    p_user_id UUID,
    p_agent_name TEXT,
    p_achievement_key TEXT,
    p_achievement_name TEXT,
    p_achievement_description TEXT,
    p_achievement_tier achievement_tier,
    p_xp_reward INTEGER DEFAULT 0,
    p_icon_url TEXT DEFAULT NULL,
    p_unlock_criteria JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_user_agent_id UUID;
    v_achievement_id UUID;
BEGIN
    -- Get user_agent_id
    SELECT id INTO v_user_agent_id
    FROM user_agents
    WHERE user_id = p_user_id AND agent_name = p_agent_name;
    
    IF v_user_agent_id IS NULL THEN
        RAISE EXCEPTION 'User does not have agent: %', p_agent_name;
    END IF;
    
    -- Check if achievement already exists
    SELECT id INTO v_achievement_id
    FROM agent_achievements
    WHERE user_id = p_user_id 
    AND agent_name = p_agent_name
    AND achievement_key = p_achievement_key
    AND achievement_tier = p_achievement_tier;
    
    IF v_achievement_id IS NULL THEN
        -- Create new achievement
        INSERT INTO agent_achievements (
            user_agent_id, user_id, agent_name, achievement_key, achievement_name,
            achievement_description, achievement_tier, xp_reward, icon_url, unlock_criteria
        )
        VALUES (
            v_user_agent_id, p_user_id, p_agent_name, p_achievement_key, p_achievement_name,
            p_achievement_description, p_achievement_tier, p_xp_reward, p_icon_url, p_unlock_criteria
        )
        RETURNING id INTO v_achievement_id;
        
        -- Award XP for achievement
        IF p_xp_reward > 0 THEN
            PERFORM award_xp(
                p_user_id, 
                p_agent_name, 
                'achievement_unlock',
                p_xp_reward, 
                0,
                jsonb_build_object('achievement_key', p_achievement_key, 'tier', p_achievement_tier)
            );
        END IF;
    END IF;
    
    RETURN v_achievement_id;
END;
$$ LANGUAGE plpgsql;

-- Enhanced user profile creation function for OAuth providers
CREATE OR REPLACE FUNCTION public.handle_new_user_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    default_username TEXT;
    provider_data JSONB;
BEGIN
    -- Extract provider metadata
    provider_data := NEW.raw_user_meta_data;
    
    -- Generate username with provider-specific logic
    IF provider_data->>'provider' = 'google' THEN
        default_username := LOWER(COALESCE(
            provider_data->>'preferred_username',
            provider_data->>'name',
            SPLIT_PART(NEW.email, '@', 1)
        ));
    ELSIF provider_data->>'provider' = 'github' THEN
        default_username := LOWER(COALESCE(
            provider_data->>'user_name',
            provider_data->>'login',
            SPLIT_PART(NEW.email, '@', 1)
        ));
    ELSE
        default_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
    END IF;
    
    -- Clean username (remove invalid characters)
    default_username := REGEXP_REPLACE(default_username, '[^a-z0-9_-]', '', 'g');
    default_username := SUBSTRING(default_username, 1, 20); -- Limit length
    
    -- Ensure username is unique
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = default_username) LOOP
        default_username := default_username || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4);
    END LOOP;
    
    -- Insert the new user profile with enhanced OAuth support
    INSERT INTO public.users (
        id, username, email, full_name, avatar_url, bio,
        privacy_settings, total_xp, current_level, last_active_date
    )
    VALUES (
        NEW.id,
        default_username,
        NEW.email,
        COALESCE(
            provider_data->>'full_name',
            provider_data->>'name',
            default_username
        ),
        COALESCE(
            provider_data->>'avatar_url',
            provider_data->>'picture',
            ''
        ),
        CASE 
            WHEN provider_data->>'provider' = 'google' THEN 'Gmail user exploring Claude Arena'
            WHEN provider_data->>'provider' = 'github' THEN 'GitHub developer ready to compete'
            ELSE 'New Claude Arena competitor'
        END,
        jsonb_build_object(
            'leaderboard', 'public',
            'achievements', 'public',
            'agents', 'public'
        ),
        0,
        'recruit',
        CURRENT_DATE
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the existing trigger with the enhanced version
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_enhanced();

-- Grant permissions for new tables and functions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE xp_events IS 'Immutable XP event log for audit trails and analytics';
COMMENT ON TABLE user_agents IS 'User-owned agents with privacy controls and usage tracking';
COMMENT ON TABLE agent_stats IS 'Detailed performance metrics for each user-agent combination';
COMMENT ON TABLE agent_achievements IS 'Agent-specific achievements and rewards';
COMMENT ON TABLE conversation_shares IS 'Privacy-controlled conversation sharing system';

COMMENT ON FUNCTION award_xp IS 'Award XP to user and agent, updating levels automatically';
COMMENT ON FUNCTION calculate_agent_level IS 'Calculate agent level based on XP thresholds';
COMMENT ON FUNCTION get_user_agent_portfolio IS 'Get complete agent portfolio for a user';
COMMENT ON FUNCTION get_agent_leaderboard IS 'Get leaderboard for a specific agent across all users';
COMMENT ON FUNCTION unlock_agent_achievement IS 'Unlock achievement for a user-agent combination';
COMMENT ON FUNCTION handle_new_user_enhanced IS 'Enhanced user creation with OAuth provider support';