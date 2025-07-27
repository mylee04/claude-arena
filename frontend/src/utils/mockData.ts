import type { User, LeaderboardEntry, LeaderboardCategory, Achievement, Activity, ChartDataPoint } from '../types';

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'alex_dev',
    displayName: 'Myungeun Lee',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    email: 'alex@example.com',
    joinedDate: '2024-01-15',
    lastActive: '2025-01-27T10:30:00Z',
    stats: {
      totalSessions: 1247,
      totalTokens: 2847593,
      averageEfficiency: 87.3,
      longestStreak: 42,
      currentStreak: 7,
      favoriteTools: [
        { tool: 'Read', count: 892, percentage: 35.2 },
        { tool: 'Edit', count: 643, percentage: 25.4 },
        { tool: 'Grep', count: 412, percentage: 16.3 },
      ],
      peakHours: [10, 14, 21],
      successRate: 92.4,
      averageSessionDuration: 45.7,
    },
    achievements: [
      {
        id: 'night-owl',
        name: 'Night Owl',
        description: 'Complete 100 sessions between midnight and 6 AM',
        icon: '🦉',
        tier: 'gold',
        unlockedAt: '2024-12-15',
      },
      {
        id: 'speed-demon',
        name: 'Speed Demon',
        description: 'Complete 10 tasks in under 5 minutes each',
        icon: '⚡',
        tier: 'silver',
        unlockedAt: '2024-11-20',
      },
    ],
    rank: 12,
  },
  {
    id: '2',
    username: 'sarah_code',
    displayName: 'Sarah Johnson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    email: 'sarah@example.com',
    joinedDate: '2024-02-20',
    lastActive: '2025-01-27T09:15:00Z',
    stats: {
      totalSessions: 987,
      totalTokens: 1984726,
      averageEfficiency: 91.2,
      longestStreak: 28,
      currentStreak: 14,
      favoriteTools: [
        { tool: 'MultiEdit', count: 534, percentage: 42.1 },
        { tool: 'Grep', count: 298, percentage: 23.5 },
        { tool: 'Read', count: 201, percentage: 15.8 },
      ],
      peakHours: [9, 11, 15],
      successRate: 94.7,
      averageSessionDuration: 38.2,
    },
    achievements: [
      {
        id: 'efficiency-master',
        name: 'Efficiency Master',
        description: 'Maintain 90%+ efficiency for 30 days',
        icon: '🎯',
        tier: 'platinum',
        unlockedAt: '2025-01-10',
      },
    ],
    rank: 5,
  },
];

// Leaderboard Categories
export const leaderboardCategories: LeaderboardCategory[] = [
  {
    id: 'efficiency',
    name: 'Efficiency Masters',
    description: 'Highest success rate with minimal token usage',
    icon: '🎯',
    metric: 'Efficiency Score',
  },
  {
    id: 'speed',
    name: 'Speed Demons',
    description: 'Fastest task completion times',
    icon: '⚡',
    metric: 'Avg. Time',
  },
  {
    id: 'tool-master',
    name: 'Tool Masters',
    description: 'Most diverse and effective tool usage',
    icon: '🛠️',
    metric: 'Tool Diversity',
  },
  {
    id: 'night-owl',
    name: 'Night Owls',
    description: 'Most productive during off-hours',
    icon: '🦉',
    metric: 'Night Sessions',
  },
  {
    id: 'streak',
    name: 'Streak Champions',
    description: 'Longest consecutive days of usage',
    icon: '🔥',
    metric: 'Current Streak',
  },
];

// Mock Leaderboard Data
export const mockLeaderboardData: Record<string, LeaderboardEntry[]> = {
  efficiency: [
    {
      rank: 1,
      userId: '3',
      username: 'mike_tech',
      displayName: 'Mike Wilson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
      score: 96.8,
      trend: 'up',
      trendValue: 2.3,
      additionalStats: { sessions: 432, successRate: '98.2%' },
    },
    {
      rank: 2,
      userId: '2',
      username: 'sarah_code',
      displayName: 'Sarah Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      score: 94.7,
      trend: 'stable',
      additionalStats: { sessions: 987, successRate: '94.7%' },
    },
    {
      rank: 3,
      userId: '4',
      username: 'lisa_dev',
      displayName: 'Lisa Zhang',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa',
      score: 93.2,
      trend: 'up',
      trendValue: 1.1,
      additionalStats: { sessions: 756, successRate: '93.2%' },
    },
  ],
  speed: [
    {
      rank: 1,
      userId: '5',
      username: 'fast_eddie',
      displayName: 'Eddie Kim',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eddie',
      score: 3.2,
      trend: 'down',
      trendValue: 0.2,
      additionalStats: { avgTime: '3.2 min', tasks: 892 },
    },
    {
      rank: 2,
      userId: '1',
      username: 'alex_dev',
      displayName: 'Myungeun Lee',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
      score: 4.1,
      trend: 'up',
      trendValue: 0.3,
      additionalStats: { avgTime: '4.1 min', tasks: 1247 },
    },
  ],
  'tool-master': [
    {
      rank: 1,
      userId: '2',
      username: 'sarah_code',
      displayName: 'Sarah Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      score: 18,
      trend: 'up',
      trendValue: 2,
      additionalStats: { toolsUsed: 18, favoriteTools: ['MultiEdit', 'Grep'] },
    },
  ],
  'night-owl': [
    {
      rank: 1,
      userId: '1',
      username: 'alex_dev',
      displayName: 'Myungeun Lee',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
      score: 347,
      trend: 'up',
      trendValue: 12,
      additionalStats: { nightSessions: 347, peakHour: '2 AM' },
    },
  ],
  streak: [
    {
      rank: 1,
      userId: '6',
      username: 'consistent_carl',
      displayName: 'Carl Peterson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carl',
      score: 127,
      trend: 'up',
      trendValue: 1,
      additionalStats: { currentStreak: 127, longestStreak: 142 },
    },
  ],
};

// Recent Activities
export const mockActivities: Activity[] = [
  {
    id: '1',
    userId: '2',
    username: 'sarah_code',
    type: 'achievement',
    description: 'Unlocked "Efficiency Master" achievement!',
    timestamp: '2025-01-27T08:30:00Z',
    metadata: { achievement: 'efficiency-master' },
  },
  {
    id: '2',
    userId: '1',
    username: 'alex_dev',
    type: 'streak',
    description: 'Reached a 7-day streak!',
    timestamp: '2025-01-27T07:15:00Z',
    metadata: { streak: 7 },
  },
  {
    id: '3',
    userId: '5',
    username: 'fast_eddie',
    type: 'rank_up',
    description: 'Moved up to #1 in Speed Demons!',
    timestamp: '2025-01-26T22:45:00Z',
    metadata: { category: 'speed', oldRank: 2, newRank: 1 },
  },
];

// Chart Data
export const mockChartData: ChartDataPoint[] = [
  { date: '2025-01-21', value: 234 },
  { date: '2025-01-22', value: 267 },
  { date: '2025-01-23', value: 298 },
  { date: '2025-01-24', value: 312 },
  { date: '2025-01-25', value: 289 },
  { date: '2025-01-26', value: 342 },
  { date: '2025-01-27', value: 178 },
];

// All Achievements
export const allAchievements: Achievement[] = [
  {
    id: 'first-session',
    name: 'First Steps',
    description: 'Complete your first Claude Code session',
    icon: '👶',
    tier: 'bronze',
  },
  {
    id: 'efficiency-master',
    name: 'Efficiency Master',
    description: 'Maintain 90%+ efficiency for 30 days',
    icon: '🎯',
    tier: 'platinum',
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Complete 100 sessions between midnight and 6 AM',
    icon: '🦉',
    tier: 'gold',
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Complete 10 tasks in under 5 minutes each',
    icon: '⚡',
    tier: 'silver',
  },
  {
    id: 'tool-explorer',
    name: 'Tool Explorer',
    description: 'Use 15 different Claude tools',
    icon: '🛠️',
    tier: 'silver',
  },
  {
    id: 'marathon-runner',
    name: 'Marathon Runner',
    description: 'Complete a session lasting over 3 hours',
    icon: '🏃',
    tier: 'gold',
  },
  {
    id: 'streak-master',
    name: 'Streak Master',
    description: 'Maintain a 30-day usage streak',
    icon: '🔥',
    tier: 'gold',
  },
  {
    id: 'token-saver',
    name: 'Token Saver',
    description: 'Complete 50 tasks using less than 1000 tokens each',
    icon: '💎',
    tier: 'silver',
  },
];