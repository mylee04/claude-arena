import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Activity } from 'lucide-react';
import StatCard from '../ui/StatCard';
import { 
  mockUsers, 
  mockActivities, 
  mockLeaderboardData,
  leaderboardCategories,
  mockChartData 
} from '../../utils/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const currentUser = mockUsers[0]; // Mock current user

  return (
    <div className="space-y-8 fade-in">
      {/* Welcome Section */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">
          Welcome back, <span className="gradient-text">{currentUser.displayName}</span>
        </h1>
        <p className="text-muted">You're currently ranked #{currentUser.rank} globally</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sessions"
          value={currentUser.stats.totalSessions.toLocaleString()}
          change={12.5}
          trend="up"
          icon="📊"
        />
        <StatCard
          title="Success Rate"
          value={`${currentUser.stats.successRate}%`}
          change={2.3}
          trend="up"
          icon="🎯"
        />
        <StatCard
          title="Current Streak"
          value={`${currentUser.stats.currentStreak} days`}
          change={0}
          trend="stable"
          icon="🔥"
        />
        <StatCard
          title="Efficiency Score"
          value={currentUser.stats.averageEfficiency.toFixed(1)}
          change={-1.2}
          trend="down"
          icon="⚡"
        />
      </div>

      {/* Quick Access to Leaderboards */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Top Leaderboards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaderboardCategories.slice(0, 3).map((category) => {
            const topEntries = mockLeaderboardData[category.id]?.slice(0, 3) || [];
            
            return (
              <Link
                key={category.id}
                to={`/leaderboards?category=${category.id}`}
                className="card-hover group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <h3 className="font-semibold">{category.name}</h3>
                  </div>
                  <TrendingUp className="w-4 h-4 text-muted group-hover:text-accent-blue transition-colors" />
                </div>
                
                <div className="space-y-2">
                  {topEntries.map((entry) => (
                    <div key={entry.userId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted font-mono w-6">#{entry.rank}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-300">
                          {entry.displayName}
                        </span>
                      </div>
                      <span className="text-muted font-mono">{entry.score}</span>
                    </div>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Activity Chart */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Activity This Week</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis 
                dataKey="date" 
                stroke="#737373"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en', { weekday: 'short' })}
              />
              <YAxis stroke="#737373" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a1a', 
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#a3a3a3' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Recent Activity</h3>
          <Activity className="w-5 h-5 text-muted" />
        </div>
        
        <div className="space-y-3">
          {mockActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 py-3 border-b last:border-0">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-lg">
                {activity.type === 'achievement' && '🏆'}
                {activity.type === 'streak' && '🔥'}
                {activity.type === 'rank_up' && '📈'}
                {activity.type === 'milestone' && '🎯'}
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium text-accent-blue">{activity.username}</span>
                  <span className="text-muted ml-1">{activity.description}</span>
                </p>
                <p className="text-xs text-muted mt-1">
                  {new Date(activity.timestamp).toRelativeTime()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper to format relative time
declare global {
  interface Date {
    toRelativeTime(): string;
  }
}

Date.prototype.toRelativeTime = function() {
  const seconds = Math.floor((Date.now() - this.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  
  return "just now";
};

export default Dashboard;