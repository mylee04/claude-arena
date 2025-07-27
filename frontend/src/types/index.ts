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
  additionalStats?: Record<string, any>;
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
  metadata?: Record<string, any>;
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