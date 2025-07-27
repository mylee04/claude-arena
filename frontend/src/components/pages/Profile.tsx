import React from 'react';
import { Calendar, Code, Zap, Trophy, Wrench, Clock, TrendingUp } from 'lucide-react';
import { mockUsers, allAchievements } from '../../utils/mockData';
import AchievementBadge from '../ui/AchievementBadge';
import StatCard from '../ui/StatCard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Profile: React.FC = () => {
  const user = mockUsers[0]; // Mock current user

  // Prepare data for charts
  const toolUsageData = user.stats.favoriteTools.map(tool => ({
    name: tool.tool,
    value: tool.count,
    percentage: tool.percentage
  }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  const hourlyActivityData = Array.from({ length: 24 }, (_, hour) => ({
    hour: hour.toString().padStart(2, '0'),
    activity: user.stats.peakHours.includes(hour) ? Math.floor(Math.random() * 50) + 50 : Math.floor(Math.random() * 30)
  }));

  // Check which achievements are unlocked
  const unlockedAchievements = user.achievements.map(a => a.id);
  const displayAchievements = allAchievements.map(achievement => ({
    ...achievement,
    isUnlocked: unlockedAchievements.includes(achievement.id),
    unlockedData: user.achievements.find(a => a.id === achievement.id)
  }));

  return (
    <div className="space-y-8 fade-in">
      {/* Profile Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <img 
            src={user.avatar} 
            alt={user.displayName}
            className="w-24 h-24 rounded-full border-2 border-accent-blue"
          />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold">{user.displayName}</h1>
            <p className="text-muted">@{user.username}</p>
            <div className="flex flex-wrap items-center gap-4 mt-4 justify-center md:justify-start">
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-accent-yellow" />
                <span>Rank #{user.rank}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted" />
                <span>Joined {new Date(user.joinedDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted" />
                <span>Last active {new Date(user.lastActive).toRelativeTime()}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button className="btn-primary">Edit Profile</button>
            <button className="btn-secondary">View Public Profile</button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sessions"
          value={user.stats.totalSessions.toLocaleString()}
          icon="📊"
        />
        <StatCard
          title="Success Rate"
          value={`${user.stats.successRate}%`}
          icon="🎯"
        />
        <StatCard
          title="Longest Streak"
          value={`${user.stats.longestStreak} days`}
          icon="🏆"
        />
        <StatCard
          title="Avg. Session Time"
          value={`${user.stats.averageSessionDuration} min`}
          icon="⏱️"
        />
      </div>

      {/* Tool Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Tool Usage Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={toolUsageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {toolUsageData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Activity by Hour
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#737373"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#737373" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="activity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Achievements
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {displayAchievements.map((achievement) => (
            <AchievementBadge
              key={achievement.id}
              achievement={
                achievement.isUnlocked && achievement.unlockedData
                  ? { ...achievement, ...achievement.unlockedData }
                  : achievement
              }
              locked={!achievement.isUnlocked}
              size="md"
            />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Recent Milestones</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 py-3 border-b">
            <div className="w-10 h-10 rounded-full bg-accent-green/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-green" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Reached 90% Success Rate</p>
              <p className="text-sm text-muted">Maintained for 7 consecutive days</p>
            </div>
            <span className="text-sm text-muted">2 days ago</span>
          </div>
          <div className="flex items-center gap-3 py-3 border-b">
            <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-accent-blue" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Speed Improvement</p>
              <p className="text-sm text-muted">Average task time reduced by 15%</p>
            </div>
            <span className="text-sm text-muted">5 days ago</span>
          </div>
          <div className="flex items-center gap-3 py-3">
            <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center">
              <Code className="w-5 h-5 text-accent-purple" />
            </div>
            <div className="flex-1">
              <p className="font-medium">1000 Sessions Milestone</p>
              <p className="text-sm text-muted">Completed 1000 total coding sessions</p>
            </div>
            <span className="text-sm text-muted">1 week ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;