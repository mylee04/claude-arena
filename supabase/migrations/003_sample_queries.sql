-- Claude Arena Sample Queries and Usage Examples
-- Version: 1.0.0
-- Description: Example queries for common operations

-- ============================================
-- USER OPERATIONS
-- ============================================

-- Get user profile with statistics
SELECT 
    u.*,
    us.categories_participated,
    us.achievements_unlocked,
    us.average_score,
    us.best_rank,
    us.teams_joined,
    us.last_active
FROM users u
LEFT JOIN user_statistics us ON us.user_id = u.id
WHERE u.username = 'example_user';

-- Update user profile
UPDATE users 
SET 
    bio = 'Passionate about efficient coding and learning from the best!',
    github_username = 'myusername',
    linkedin_url = 'https://linkedin.com/in/myusername'
WHERE id = auth.uid();

-- ============================================
-- LEADERBOARD OPERATIONS
-- ============================================

-- Get top 10 efficiency leaders for this week
SELECT * FROM get_top_performers('efficiency'::leaderboard_category, 'weekly'::leaderboard_period, 10);

-- Get my rank in speed category
SELECT * FROM get_user_rank(auth.uid(), 'speed'::leaderboard_category, 'monthly'::leaderboard_period);

-- Update a user's score (typically done by backend service)
SELECT upsert_leaderboard_entry(
    'user-uuid-here'::UUID,
    'efficiency'::leaderboard_category,
    'daily'::leaderboard_period,
    95.5,
    '{"lines_of_code": 500, "time_spent_minutes": 45}'::JSONB
);

-- Get leaderboard with user details
SELECT 
    le.rank,
    u.username,
    u.avatar_url,
    le.score,
    le.metadata->>'lines_of_code' as lines_of_code,
    le.metadata->>'time_spent_minutes' as time_spent
FROM leaderboard_entries le
JOIN users u ON u.id = le.user_id
WHERE le.category = 'efficiency' 
AND le.period = 'weekly'
ORDER BY le.rank
LIMIT 20;

-- ============================================
-- ACHIEVEMENT OPERATIONS
-- ============================================

-- View all achievements for a user
SELECT 
    a.achievement_type,
    a.tier,
    a.unlocked_at,
    a.metadata
FROM achievements a
WHERE a.user_id = 'user-uuid-here'
ORDER BY a.unlocked_at DESC;

-- Award an achievement (backend service)
SELECT award_achievement(
    'user-uuid-here'::UUID,
    'speed_demon',
    'gold'::achievement_tier,
    '{"tasks_completed": 100, "avg_completion_time": 5.2}'::JSONB
);

-- Get achievement progress for current user
SELECT * FROM get_achievement_progress(auth.uid());

-- Check users eligible for new achievements
WITH eligible_users AS (
    SELECT 
        user_id,
        COUNT(*) as perfect_days
    FROM leaderboard_entries
    WHERE score = 100
    AND period = 'daily'
    GROUP BY user_id
    HAVING COUNT(*) >= 10
)
SELECT 
    eu.user_id,
    u.username,
    eu.perfect_days
FROM eligible_users eu
JOIN users u ON u.id = eu.user_id
LEFT JOIN achievements a ON a.user_id = eu.user_id 
    AND a.achievement_type = 'perfectionist'
    AND a.tier = 'silver'
WHERE a.id IS NULL;

-- ============================================
-- TEAM OPERATIONS
-- ============================================

-- Create a new team
INSERT INTO teams (name, description, created_by)
VALUES (
    'Code Ninjas',
    'Elite developers focused on clean, efficient code',
    auth.uid()
)
RETURNING *;

-- Add a member to a team
INSERT INTO team_members (team_id, user_id, role)
VALUES (
    'team-uuid-here'::UUID,
    'user-uuid-here'::UUID,
    'member'::team_role
);

-- Get team leaderboard
SELECT * FROM get_team_leaderboard(
    'efficiency'::leaderboard_category,
    'monthly'::leaderboard_period,
    20
);

-- Get all members of a team with their stats
SELECT 
    u.username,
    u.avatar_url,
    tm.role,
    tm.joined_at,
    COALESCE(us.average_score, 0) as avg_score,
    COALESCE(us.best_rank, 0) as best_rank
FROM team_members tm
JOIN users u ON u.id = tm.user_id
LEFT JOIN user_statistics us ON us.user_id = u.id
WHERE tm.team_id = 'team-uuid-here'
ORDER BY tm.role, us.average_score DESC;

-- ============================================
-- ACTIVITY FEED
-- ============================================

-- Get recent activity for a user
SELECT * FROM get_user_recent_activity('user-uuid-here'::UUID, 20);

-- Get global activity feed
WITH recent_activity AS (
    -- Recent high scores
    SELECT 
        'high_score' as type,
        le.created_at,
        jsonb_build_object(
            'user_id', u.id,
            'username', u.username,
            'avatar_url', u.avatar_url,
            'category', le.category,
            'score', le.score,
            'rank', le.rank
        ) as data
    FROM leaderboard_entries le
    JOIN users u ON u.id = le.user_id
    WHERE le.created_at > NOW() - INTERVAL '24 hours'
    AND le.rank <= 10
    
    UNION ALL
    
    -- Recent achievements
    SELECT 
        'achievement' as type,
        a.unlocked_at as created_at,
        jsonb_build_object(
            'user_id', u.id,
            'username', u.username,
            'avatar_url', u.avatar_url,
            'achievement_type', a.achievement_type,
            'tier', a.tier
        ) as data
    FROM achievements a
    JOIN users u ON u.id = a.user_id
    WHERE a.unlocked_at > NOW() - INTERVAL '24 hours'
    
    UNION ALL
    
    -- New teams created
    SELECT 
        'new_team' as type,
        t.created_at,
        jsonb_build_object(
            'team_id', t.id,
            'team_name', t.name,
            'created_by_username', u.username,
            'description', t.description
        ) as data
    FROM teams t
    JOIN users u ON u.id = t.created_by
    WHERE t.created_at > NOW() - INTERVAL '24 hours'
)
SELECT * FROM recent_activity
ORDER BY created_at DESC
LIMIT 50;

-- ============================================
-- ANALYTICS QUERIES
-- ============================================

-- Category popularity
SELECT 
    category,
    COUNT(DISTINCT user_id) as participants,
    AVG(score) as avg_score,
    MAX(score) as top_score
FROM leaderboard_entries
WHERE period = 'weekly'
GROUP BY category
ORDER BY participants DESC;

-- User engagement by day of week
SELECT 
    EXTRACT(DOW FROM created_at) as day_of_week,
    TO_CHAR(created_at, 'Day') as day_name,
    COUNT(*) as entries,
    COUNT(DISTINCT user_id) as unique_users
FROM leaderboard_entries
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY day_of_week, day_name
ORDER BY day_of_week;

-- Achievement distribution
SELECT 
    achievement_type,
    tier,
    COUNT(*) as users_earned,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 2) as percentage_of_users
FROM achievements
GROUP BY achievement_type, tier
ORDER BY achievement_type, 
    CASE tier 
        WHEN 'bronze' THEN 1 
        WHEN 'silver' THEN 2 
        WHEN 'gold' THEN 3 
        WHEN 'platinum' THEN 4 
    END;

-- ============================================
-- MAINTENANCE QUERIES
-- ============================================

-- Refresh materialized view
SELECT refresh_user_statistics();

-- Clean up old daily entries (run daily)
DELETE FROM leaderboard_entries 
WHERE period = 'daily' 
AND created_at < NOW() - INTERVAL '7 days';

-- Update all leaderboard ranks
DO $$
DECLARE
    cat leaderboard_category;
    per leaderboard_period;
BEGIN
    FOR cat IN SELECT unnest(enum_range(NULL::leaderboard_category))
    LOOP
        FOR per IN SELECT unnest(enum_range(NULL::leaderboard_period))
        LOOP
            PERFORM update_leaderboard_ranks(cat, per);
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- REAL-TIME SUBSCRIPTION EXAMPLES (for frontend)
-- ============================================

-- Subscribe to leaderboard changes for a category
-- JavaScript/TypeScript example:
/*
const channel = supabase
  .channel('leaderboard-efficiency-weekly')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'leaderboard_entries',
      filter: 'category=eq.efficiency,period=eq.weekly'
    },
    (payload) => {
      console.log('Leaderboard update:', payload);
      // Refresh leaderboard display
    }
  )
  .subscribe();
*/

-- Subscribe to new achievements
/*
const achievementChannel = supabase
  .channel('new-achievements')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'achievements'
    },
    (payload) => {
      console.log('New achievement unlocked:', payload);
      // Show achievement notification
    }
  )
  .subscribe();
*/