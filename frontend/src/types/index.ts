// User and Profile Types
export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  email: string;
  joinedDate: string;
  lastActive: string;
  stats: UserStats;
  achievements: Achievement[];
  rank: number;
  team?: Team;
  conversations?: Conversation[];
  conversationStats?: ConversationStats;
}

export interface UserStats {
  totalSessions: number;
  totalTokens: number;
  averageEfficiency: number;
  longestStreak: number;
  currentStreak: number;
  favoriteTools: ToolUsage[];
  peakHours: number[];
  successRate: number;
  averageSessionDuration: number;
}

export interface ToolUsage {
  tool: string;
  count: number;
  percentage: number;
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
  additionalStats?: Record<string, string | number | boolean>;
}

export interface LeaderboardCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  metric: string;
}

export type TimePeriod = 'today' | 'week' | 'month' | 'all-time';

// Achievement Types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

// Team Types
export interface Team {
  id: string;
  name: string;
  logo?: string;
  memberCount: number;
  averageScore: number;
  rank: number;
}

// Activity Types
export interface Activity {
  id: string;
  userId: string;
  username: string;
  type: 'achievement' | 'milestone' | 'streak' | 'rank_up';
  description: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

// Chart Types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface StatCard {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon?: string;
}

// Conversation Types
export interface Conversation {
  id?: string;
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
  project: string;
  tools_used: string[];
  privacy_level?: 'private' | 'friends' | 'public';
}

export interface ConversationStats {
  total: number;
  public: number;
  friends: number;
  private: number;
  projects: string[];
  toolsUsed: Record<string, number>;
}

// Agent Types
export type AgentLevel = 'recruit' | 'specialist' | 'expert' | 'master' | 'elite';
export type PrivacyLevel = 'public' | 'friends' | 'private';
export type XPEventType = 'task_completion' | 'achievement_unlock' | 'streak_bonus' | 'collaboration_bonus' | 'perfect_score';

export interface UserAgent {
  id: string;
  user_id: string;  
  agent_name: string;
  agent_display_name: string;
  agent_description?: string;
  is_favorite: boolean;
  total_usage: number;
  total_xp: number;
  current_level: AgentLevel;
  unlock_date: string;
  last_used?: string;
  privacy_level: PrivacyLevel;
}

export interface AgentStats {
  id: string;
  user_agent_id: string;
  user_id: string;
  agent_name: string;
  success_rate: number;
  avg_completion_time?: string;
  fastest_completion?: string;
  total_tasks: number;
  successful_tasks: number;
  failed_tasks: number;
  sessions_count: number;
  total_time_spent?: string;
  streak_days: number;
  best_streak: number;
  shared_conversations: number;
  team_collaborations: number;
  first_use: string;
  last_updated: string;
}

export interface AgentAchievement {
  id: string;
  user_agent_id: string;
  user_id: string;
  agent_name: string;
  achievement_key: string;
  achievement_name: string;
  achievement_description?: string;
  achievement_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  xp_reward: number;
  icon_url?: string;
  unlock_criteria: Record<string, any>;
  unlocked_at: string;
}

export interface XPEvent {
  id: string;
  user_id: string;
  agent_name: string;
  event_type: XPEventType;
  base_points: number;
  bonus_points: number;
  total_points: number;
  metadata: Record<string, any>;
  session_id?: string;
  created_at: string;
}

export interface AgentPortfolio {
  agent_name: string;
  agent_display_name: string;
  current_level: AgentLevel;
  total_xp: number;
  total_usage: number;
  success_rate: number;
  is_favorite: boolean;
  last_used?: string;
  achievements_count: number;
  privacy_level?: PrivacyLevel;
}

export interface AgentOwnershipSummary {
  totalAgents: number;
  totalXP: number;
  highestLevel: AgentLevel;
  favoriteAgent?: string;
  recentXPGains: XPEvent[];
  levelDistribution: Record<AgentLevel, number>;
}