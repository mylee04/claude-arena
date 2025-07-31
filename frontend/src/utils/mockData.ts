import type { 
  User, 
  LeaderboardEntry, 
  LeaderboardCategory, 
  Achievement, 
  Activity, 
  ChartDataPoint,
  AgentPortfolio,
  AgentOwnershipSummary,
  XPEvent
} from '../types';

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
      additionalStats: { toolsUsed: 18, favoriteTools: 'MultiEdit, Grep' },
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

// Mock Agent Data
export const mockAgentPortfolio: AgentPortfolio[] = [
  {
    agent_name: 'react-arena-specialist',
    agent_display_name: 'React Arena Specialist',
    current_level: 'master',
    total_xp: 750,
    total_usage: 89,
    success_rate: 94.2,
    is_favorite: true,
    last_used: '2025-01-27T10:30:00Z',
    achievements_count: 8,
    privacy_level: 'public'
  },
  {
    agent_name: 'python-elite',
    agent_display_name: 'Python Elite',
    current_level: 'expert',
    total_xp: 420,
    total_usage: 67,
    success_rate: 91.8,
    is_favorite: false,
    last_used: '2025-01-26T14:22:00Z',
    achievements_count: 5,
    privacy_level: 'public'
  },
  {
    agent_name: 'javascript-pro',
    agent_display_name: 'JavaScript Pro',
    current_level: 'specialist',
    total_xp: 280,
    total_usage: 43,
    success_rate: 88.5,
    is_favorite: false,
    last_used: '2025-01-25T09:15:00Z',
    achievements_count: 4,
    privacy_level: 'friends'
  },
  {
    agent_name: 'golang-pro',
    agent_display_name: 'Golang Pro',
    current_level: 'specialist',
    total_xp: 190,
    total_usage: 28,
    success_rate: 85.7,
    is_favorite: false,
    last_used: '2025-01-24T16:45:00Z',
    achievements_count: 3,
    privacy_level: 'public'
  },
  {
    agent_name: 'rust-pro',
    agent_display_name: 'Rust Pro',
    current_level: 'recruit',
    total_xp: 75,
    total_usage: 12,
    success_rate: 83.3,
    is_favorite: false,
    last_used: '2025-01-22T11:30:00Z',
    achievements_count: 1,
    privacy_level: 'private'
  },
  {
    agent_name: 'backend-architect',
    agent_display_name: 'Backend Architect',
    current_level: 'expert',
    total_xp: 510,
    total_usage: 56,
    success_rate: 92.9,
    is_favorite: false,
    last_used: '2025-01-27T08:12:00Z',
    achievements_count: 6,
    privacy_level: 'public'
  },
  {
    agent_name: 'devops-troubleshooter',
    agent_display_name: 'DevOps Troubleshooter',
    current_level: 'specialist',
    total_xp: 340,
    total_usage: 41,
    success_rate: 89.0,
    is_favorite: false,
    last_used: '2025-01-26T19:20:00Z',
    achievements_count: 4,
    privacy_level: 'public'
  },
  {
    agent_name: 'code-reviewer',
    agent_display_name: 'Code Reviewer',
    current_level: 'expert',
    total_xp: 460,
    total_usage: 52,
    success_rate: 96.2,
    is_favorite: true,
    last_used: '2025-01-27T12:45:00Z',
    achievements_count: 7,
    privacy_level: 'public'
  }
];

export const mockAgentSummary: AgentOwnershipSummary = {
  totalAgents: mockAgentPortfolio.length,
  totalXP: mockAgentPortfolio.reduce((sum, agent) => sum + agent.total_xp, 0),
  highestLevel: 'master',
  favoriteAgent: 'React Arena Specialist',
  recentXPGains: [], // Will be populated by mockXPEvents
  levelDistribution: {
    recruit: 1,
    specialist: 3,
    expert: 3,
    master: 1,
    elite: 0
  }
};

export const mockXPEvents: XPEvent[] = [
  {
    id: '1',
    user_id: '1',
    agent_name: 'react-arena-specialist',
    event_type: 'task_completion',
    base_points: 15,
    bonus_points: 5,
    total_points: 20,
    metadata: { task: 'Build user profile tab', difficulty: 'complex' },
    session_id: 'session-123',
    created_at: '2025-01-27T10:30:00Z'
  },
  {
    id: '2',
    user_id: '1',
    agent_name: 'code-reviewer',
    event_type: 'achievement_unlock',
    base_points: 50,
    bonus_points: 0,
    total_points: 50,
    metadata: { achievement: 'perfect-reviewer', tier: 'gold' },
    session_id: 'session-124',
    created_at: '2025-01-27T12:45:00Z'
  },
  {
    id: '3',
    user_id: '1',
    agent_name: 'python-elite',
    event_type: 'streak_bonus',
    base_points: 10,
    bonus_points: 10,
    total_points: 20,
    metadata: { streak_days: 7 },
    session_id: 'session-125',
    created_at: '2025-01-26T14:22:00Z'
  },
  {
    id: '4',
    user_id: '1',
    agent_name: 'backend-architect',
    event_type: 'perfect_score',
    base_points: 25,
    bonus_points: 15,
    total_points: 40,
    metadata: { task: 'API optimization', efficiency: 100 },
    session_id: 'session-126',
    created_at: '2025-01-27T08:12:00Z'
  },
  {
    id: '5',
    user_id: '1',
    agent_name: 'devops-troubleshooter',
    event_type: 'task_completion',
    base_points: 12,
    bonus_points: 3,
    total_points: 15,
    metadata: { task: 'Docker optimization', time_saved: '45min' },
    session_id: 'session-127',
    created_at: '2025-01-26T19:20:00Z'
  }
];