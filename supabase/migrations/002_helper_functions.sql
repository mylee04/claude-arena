-- Claude Arena Helper Functions and Utilities
-- Version: 1.0.0
-- Description: Additional database functions for Claude Arena

-- Function to upsert leaderboard entry (insert or update)
CREATE OR REPLACE FUNCTION upsert_leaderboard_entry(
    p_user_id UUID,
    p_category leaderboard_category,
    p_period leaderboard_period,
    p_score NUMERIC,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_entry_id UUID;
BEGIN
    -- Insert or update the leaderboard entry
    INSERT INTO leaderboard_entries (user_id, category, period, score, metadata)
    VALUES (p_user_id, p_category, p_period, p_score, p_metadata)
    ON CONFLICT (user_id, category, period)
    DO UPDATE SET 
        score = EXCLUDED.score,
        metadata = EXCLUDED.metadata,
        created_at = NOW()
    RETURNING id INTO v_entry_id;
    
    -- Update ranks for this category and period
    PERFORM update_leaderboard_ranks(p_category, p_period);
    
    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Function to award achievement
CREATE OR REPLACE FUNCTION award_achievement(
    p_user_id UUID,
    p_achievement_type TEXT,
    p_tier achievement_tier,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_achievement_id UUID;
BEGIN
    -- Check if achievement already exists
    SELECT id INTO v_achievement_id
    FROM achievements
    WHERE user_id = p_user_id 
    AND achievement_type = p_achievement_type 
    AND tier = p_tier;
    
    IF v_achievement_id IS NULL THEN
        -- Award new achievement
        INSERT INTO achievements (user_id, achievement_type, tier, metadata)
        VALUES (p_user_id, p_achievement_type, p_tier, p_metadata)
        RETURNING id INTO v_achievement_id;
    END IF;
    
    RETURN v_achievement_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's team statistics
CREATE OR REPLACE FUNCTION get_user_team_stats(p_user_id UUID)
RETURNS TABLE(
    team_id UUID,
    team_name TEXT,
    role team_role,
    team_size INTEGER,
    team_avg_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as team_id,
        t.name as team_name,
        tm.role,
        COUNT(DISTINCT tm2.user_id)::INTEGER as team_size,
        COALESCE(AVG(le.score), 0) as team_avg_score
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = p_user_id
    JOIN team_members tm2 ON tm2.team_id = t.id
    LEFT JOIN leaderboard_entries le ON le.user_id = tm2.user_id
    GROUP BY t.id, t.name, tm.role;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate team leaderboard
CREATE OR REPLACE FUNCTION get_team_leaderboard(
    p_category leaderboard_category,
    p_period leaderboard_period,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    team_id UUID,
    team_name TEXT,
    team_avatar_url TEXT,
    avg_score NUMERIC,
    total_score NUMERIC,
    member_count INTEGER,
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH team_scores AS (
        SELECT 
            t.id,
            t.name,
            t.avatar_url,
            AVG(le.score) as avg_score,
            SUM(le.score) as total_score,
            COUNT(DISTINCT tm.user_id)::INTEGER as member_count
        FROM teams t
        JOIN team_members tm ON tm.team_id = t.id
        JOIN leaderboard_entries le ON le.user_id = tm.user_id
        WHERE le.category = p_category AND le.period = p_period
        GROUP BY t.id, t.name, t.avatar_url
    ),
    ranked_teams AS (
        SELECT 
            *,
            RANK() OVER (ORDER BY avg_score DESC) as rank
        FROM team_scores
    )
    SELECT * FROM ranked_teams
    ORDER BY rank ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's recent activity
CREATE OR REPLACE FUNCTION get_user_recent_activity(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    activity_type TEXT,
    activity_description TEXT,
    activity_timestamp TIMESTAMPTZ,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    -- Get recent leaderboard entries
    SELECT 
        'leaderboard_update' as activity_type,
        FORMAT('Scored %s points in %s (%s)', score, category, period) as activity_description,
        created_at as activity_timestamp,
        metadata
    FROM leaderboard_entries
    WHERE user_id = p_user_id
    
    UNION ALL
    
    -- Get recent achievements
    SELECT 
        'achievement_unlocked' as activity_type,
        FORMAT('Unlocked %s achievement (%s)', achievement_type, tier) as activity_description,
        unlocked_at as activity_timestamp,
        metadata
    FROM achievements
    WHERE user_id = p_user_id
    
    UNION ALL
    
    -- Get recent team joins
    SELECT 
        'team_joined' as activity_type,
        FORMAT('Joined team %s as %s', t.name, tm.role) as activity_description,
        tm.joined_at as activity_timestamp,
        '{}'::JSONB as metadata
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = p_user_id
    
    ORDER BY activity_timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get achievement progress
CREATE OR REPLACE FUNCTION get_achievement_progress(p_user_id UUID)
RETURNS TABLE(
    achievement_type TEXT,
    bronze_unlocked BOOLEAN,
    silver_unlocked BOOLEAN,
    gold_unlocked BOOLEAN,
    platinum_unlocked BOOLEAN,
    next_tier achievement_tier,
    progress_metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH all_achievement_types AS (
        SELECT DISTINCT achievement_type
        FROM achievements
    ),
    user_achievements AS (
        SELECT 
            achievement_type,
            tier,
            metadata
        FROM achievements
        WHERE user_id = p_user_id
    ),
    achievement_status AS (
        SELECT 
            aat.achievement_type,
            BOOL_OR(ua.tier = 'bronze') as bronze_unlocked,
            BOOL_OR(ua.tier = 'silver') as silver_unlocked,
            BOOL_OR(ua.tier = 'gold') as gold_unlocked,
            BOOL_OR(ua.tier = 'platinum') as platinum_unlocked,
            CASE
                WHEN BOOL_OR(ua.tier = 'platinum') THEN NULL
                WHEN BOOL_OR(ua.tier = 'gold') THEN 'platinum'::achievement_tier
                WHEN BOOL_OR(ua.tier = 'silver') THEN 'gold'::achievement_tier
                WHEN BOOL_OR(ua.tier = 'bronze') THEN 'silver'::achievement_tier
                ELSE 'bronze'::achievement_tier
            END as next_tier,
            COALESCE(
                (SELECT metadata FROM user_achievements WHERE achievement_type = aat.achievement_type ORDER BY tier DESC LIMIT 1),
                '{}'::JSONB
            ) as progress_metadata
        FROM all_achievement_types aat
        LEFT JOIN user_achievements ua ON ua.achievement_type = aat.achievement_type
        GROUP BY aat.achievement_type
    )
    SELECT * FROM achievement_status
    ORDER BY achievement_type;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award streak achievements
CREATE OR REPLACE FUNCTION check_streak_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_consecutive_days INTEGER;
    v_last_active DATE;
    v_current_streak INTEGER;
BEGIN
    -- Calculate consecutive days active
    WITH daily_activity AS (
        SELECT DISTINCT DATE(created_at) as activity_date
        FROM leaderboard_entries
        WHERE user_id = p_user_id
        ORDER BY activity_date DESC
    ),
    streak_calc AS (
        SELECT 
            activity_date,
            activity_date - ROW_NUMBER() OVER (ORDER BY activity_date DESC)::INTEGER as streak_group
        FROM daily_activity
    )
    SELECT COUNT(*) INTO v_consecutive_days
    FROM streak_calc
    WHERE streak_group = (SELECT streak_group FROM streak_calc LIMIT 1);
    
    -- Award streak achievements based on consecutive days
    IF v_consecutive_days >= 7 THEN
        PERFORM award_achievement(p_user_id, 'weekly_streak', 'bronze', 
            jsonb_build_object('days', v_consecutive_days));
    END IF;
    
    IF v_consecutive_days >= 30 THEN
        PERFORM award_achievement(p_user_id, 'monthly_streak', 'silver', 
            jsonb_build_object('days', v_consecutive_days));
    END IF;
    
    IF v_consecutive_days >= 100 THEN
        PERFORM award_achievement(p_user_id, 'century_streak', 'gold', 
            jsonb_build_object('days', v_consecutive_days));
    END IF;
    
    IF v_consecutive_days >= 365 THEN
        PERFORM award_achievement(p_user_id, 'annual_streak', 'platinum', 
            jsonb_build_object('days', v_consecutive_days));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to generate leaderboard snapshot
CREATE OR REPLACE FUNCTION generate_leaderboard_snapshot(
    p_category leaderboard_category,
    p_period leaderboard_period
)
RETURNS TABLE(
    snapshot_id UUID,
    snapshot_timestamp TIMESTAMPTZ,
    top_performers JSONB,
    statistics JSONB
) AS $$
DECLARE
    v_snapshot_id UUID;
    v_top_performers JSONB;
    v_statistics JSONB;
BEGIN
    v_snapshot_id := gen_random_uuid();
    
    -- Get top 100 performers
    SELECT jsonb_agg(
        jsonb_build_object(
            'rank', rank,
            'user_id', user_id,
            'username', username,
            'score', score,
            'metadata', metadata
        ) ORDER BY rank
    ) INTO v_top_performers
    FROM (
        SELECT * FROM get_top_performers(p_category, p_period, 100)
    ) top;
    
    -- Calculate statistics
    SELECT jsonb_build_object(
        'total_participants', COUNT(DISTINCT user_id),
        'average_score', AVG(score),
        'median_score', PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score),
        'top_score', MAX(score),
        'standard_deviation', STDDEV(score)
    ) INTO v_statistics
    FROM leaderboard_entries
    WHERE category = p_category AND period = p_period;
    
    RETURN QUERY
    SELECT 
        v_snapshot_id,
        NOW(),
        v_top_performers,
        v_statistics;
END;
$$ LANGUAGE plpgsql;

-- Scheduled function to reset daily leaderboards
CREATE OR REPLACE FUNCTION reset_daily_leaderboards()
RETURNS VOID AS $$
BEGIN
    -- Archive current daily entries
    INSERT INTO leaderboard_entries (user_id, category, period, score, metadata)
    SELECT 
        user_id,
        category,
        'all_time'::leaderboard_period,
        score,
        jsonb_build_object('archived_from', 'daily', 'archived_at', NOW()) || metadata
    FROM leaderboard_entries
    WHERE period = 'daily'
    ON CONFLICT (user_id, category, period) 
    DO UPDATE SET 
        score = leaderboard_entries.score + EXCLUDED.score,
        metadata = leaderboard_entries.metadata || EXCLUDED.metadata;
    
    -- Reset daily scores
    DELETE FROM leaderboard_entries WHERE period = 'daily';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON FUNCTION upsert_leaderboard_entry IS 'Insert or update a leaderboard entry and recalculate ranks';
COMMENT ON FUNCTION award_achievement IS 'Award an achievement to a user if not already earned';
COMMENT ON FUNCTION get_user_team_stats IS 'Get statistics for all teams a user belongs to';
COMMENT ON FUNCTION get_team_leaderboard IS 'Calculate team rankings based on member scores';
COMMENT ON FUNCTION get_user_recent_activity IS 'Get a user''s recent activity across all features';
COMMENT ON FUNCTION get_achievement_progress IS 'Get achievement progress for a user';
COMMENT ON FUNCTION check_streak_achievements IS 'Check and award streak-based achievements';
COMMENT ON FUNCTION generate_leaderboard_snapshot IS 'Generate a snapshot of current leaderboard state';
COMMENT ON FUNCTION reset_daily_leaderboards IS 'Reset daily leaderboards and archive scores';