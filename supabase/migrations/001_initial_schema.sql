-- Claude Arena Database Schema
-- Version: 1.0.0
-- Description: Initial database schema for Claude Arena gamified leaderboard platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE achievement_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE leaderboard_category AS ENUM ('efficiency', 'speed', 'tool_master', 'night_owl', 'early_bird', 'marathon_coder', 'interrupt_master');
CREATE TYPE leaderboard_period AS ENUM ('daily', 'weekly', 'monthly', 'all_time');

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    github_username TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$'),
    CONSTRAINT bio_length CHECK (char_length(bio) <= 500)
);

-- Create indexes for users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 2. Leaderboard entries table
CREATE TABLE public.leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category leaderboard_category NOT NULL,
    score NUMERIC(10, 2) NOT NULL DEFAULT 0,
    rank INTEGER,
    period leaderboard_period NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one entry per user per category per period
    CONSTRAINT unique_user_category_period UNIQUE (user_id, category, period),
    CONSTRAINT positive_score CHECK (score >= 0),
    CONSTRAINT positive_rank CHECK (rank > 0)
);

-- Create indexes for leaderboard_entries
CREATE INDEX idx_leaderboard_category_period ON leaderboard_entries(category, period);
CREATE INDEX idx_leaderboard_user_id ON leaderboard_entries(user_id);
CREATE INDEX idx_leaderboard_score ON leaderboard_entries(score DESC);
CREATE INDEX idx_leaderboard_rank ON leaderboard_entries(rank);
CREATE INDEX idx_leaderboard_created_at ON leaderboard_entries(created_at DESC);

-- 3. Achievements table
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    tier achievement_tier NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    
    -- Ensure one achievement type per tier per user
    CONSTRAINT unique_user_achievement_tier UNIQUE (user_id, achievement_type, tier)
);

-- Create indexes for achievements
CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_achievements_type ON achievements(achievement_type);
CREATE INDEX idx_achievements_tier ON achievements(tier);
CREATE INDEX idx_achievements_unlocked_at ON achievements(unlocked_at DESC);

-- 4. Teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    avatar_url TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT team_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 50),
    CONSTRAINT team_description_length CHECK (char_length(description) <= 500)
);

-- Create indexes for teams
CREATE INDEX idx_teams_name ON teams(name);
CREATE INDEX idx_teams_created_by ON teams(created_by);
CREATE INDEX idx_teams_created_at ON teams(created_at DESC);

-- 5. Team members table
CREATE TABLE public.team_members (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role team_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (team_id, user_id)
);

-- Create indexes for team_members
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_team_members_joined_at ON team_members(joined_at DESC);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Allow users to view all profiles (public leaderboard)
CREATE POLICY "Users can view all profiles"
    ON users FOR SELECT
    USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- RLS Policies for leaderboard_entries
-- Allow anyone to view leaderboard entries
CREATE POLICY "Leaderboard entries are publicly viewable"
    ON leaderboard_entries FOR SELECT
    USING (true);

-- Only system/admin can insert/update leaderboard entries
-- (This would typically be done via a service role or database function)
CREATE POLICY "System can manage leaderboard entries"
    ON leaderboard_entries FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for achievements
-- Allow users to view all achievements (for profiles)
CREATE POLICY "Achievements are publicly viewable"
    ON achievements FOR SELECT
    USING (true);

-- Only system can manage achievements
CREATE POLICY "System can manage achievements"
    ON achievements FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for teams
-- Allow anyone to view teams
CREATE POLICY "Teams are publicly viewable"
    ON teams FOR SELECT
    USING (true);

-- Allow authenticated users to create teams
CREATE POLICY "Authenticated users can create teams"
    ON teams FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Allow team owners to update their teams
CREATE POLICY "Team owners can update teams"
    ON teams FOR UPDATE
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('owner', 'admin')
        )
    );

-- Allow team owners to delete their teams
CREATE POLICY "Team owners can delete teams"
    ON teams FOR DELETE
    USING (created_by = auth.uid());

-- RLS Policies for team_members
-- Allow anyone to view team members
CREATE POLICY "Team members are publicly viewable"
    ON team_members FOR SELECT
    USING (true);

-- Allow team owners/admins to manage members
CREATE POLICY "Team admins can manage members"
    ON team_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        ) OR
        EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = team_members.team_id
            AND teams.created_by = auth.uid()
        )
    );

CREATE POLICY "Team admins can update members"
    ON team_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Team admins can remove members"
    ON team_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        ) OR
        -- Users can remove themselves from teams
        user_id = auth.uid()
    );

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_username TEXT;
BEGIN
    -- Generate a default username from email
    default_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
    
    -- Ensure username is unique by appending random suffix if needed
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = default_username) LOOP
        default_username := default_username || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4);
    END LOOP;
    
    -- Insert the new user profile
    INSERT INTO public.users (id, username, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        default_username,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Helper function to calculate and update leaderboard ranks
CREATE OR REPLACE FUNCTION update_leaderboard_ranks(
    p_category leaderboard_category,
    p_period leaderboard_period
)
RETURNS VOID AS $$
BEGIN
    -- Update ranks based on scores for the given category and period
    WITH ranked_entries AS (
        SELECT 
            id,
            RANK() OVER (ORDER BY score DESC) as new_rank
        FROM leaderboard_entries
        WHERE category = p_category AND period = p_period
    )
    UPDATE leaderboard_entries
    SET rank = ranked_entries.new_rank
    FROM ranked_entries
    WHERE leaderboard_entries.id = ranked_entries.id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's rank in a specific category
CREATE OR REPLACE FUNCTION get_user_rank(
    p_user_id UUID,
    p_category leaderboard_category,
    p_period leaderboard_period
)
RETURNS TABLE(rank INTEGER, score NUMERIC, total_participants INTEGER) AS $$
BEGIN
    RETURN QUERY
    WITH user_rank AS (
        SELECT 
            le.rank,
            le.score,
            COUNT(*) OVER() as total_participants
        FROM leaderboard_entries le
        WHERE le.category = p_category 
        AND le.period = p_period
        AND le.user_id = p_user_id
    )
    SELECT * FROM user_rank;
END;
$$ LANGUAGE plpgsql;

-- Function to get top performers for a category
CREATE OR REPLACE FUNCTION get_top_performers(
    p_category leaderboard_category,
    p_period leaderboard_period,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    score NUMERIC,
    rank INTEGER,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        le.user_id,
        u.username,
        u.avatar_url,
        le.score,
        le.rank,
        le.metadata
    FROM leaderboard_entries le
    JOIN users u ON u.id = le.user_id
    WHERE le.category = p_category 
    AND le.period = p_period
    ORDER BY le.rank ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for user statistics
CREATE MATERIALIZED VIEW user_statistics AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(DISTINCT le.category) as categories_participated,
    COUNT(DISTINCT a.achievement_type) as achievements_unlocked,
    COALESCE(AVG(le.score), 0) as average_score,
    COALESCE(MIN(le.rank), 0) as best_rank,
    COUNT(DISTINCT tm.team_id) as teams_joined,
    MAX(le.created_at) as last_active
FROM users u
LEFT JOIN leaderboard_entries le ON le.user_id = u.id
LEFT JOIN achievements a ON a.user_id = u.id
LEFT JOIN team_members tm ON tm.user_id = u.id
GROUP BY u.id, u.username;

-- Create index on materialized view
CREATE INDEX idx_user_statistics_user_id ON user_statistics(user_id);

-- Function to refresh user statistics
CREATE OR REPLACE FUNCTION refresh_user_statistics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_statistics;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE leaderboard_entries IS 'Leaderboard scores and rankings by category and time period';
COMMENT ON TABLE achievements IS 'User achievements and badges';
COMMENT ON TABLE teams IS 'Team/organization information';
COMMENT ON TABLE team_members IS 'Team membership and roles';
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates user profile on signup';
COMMENT ON FUNCTION update_leaderboard_ranks(leaderboard_category, leaderboard_period) IS 'Recalculates ranks for a specific category and period';
COMMENT ON FUNCTION get_user_rank(UUID, leaderboard_category, leaderboard_period) IS 'Gets a user''s rank and score for a specific category';
COMMENT ON FUNCTION get_top_performers(leaderboard_category, leaderboard_period, INTEGER) IS 'Gets top performers for a leaderboard category';