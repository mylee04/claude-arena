import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { 
  leaderboardCategories, 
  mockLeaderboardData
} from '../../utils/mockData';
import type { TimePeriod, LeaderboardEntry } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';

const Leaderboards: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'efficiency'
  );
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all-time');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Simulate loading when changing categories
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [selectedCategory, timePeriod]);

  const currentCategory = leaderboardCategories.find(cat => cat.id === selectedCategory);
  const leaderboardData = mockLeaderboardData[selectedCategory] || [];

  // Filter by search query
  const filteredData = leaderboardData.filter(entry =>
    entry.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchParams({ category: categoryId });
  };

  const getTrendIcon = (trend: LeaderboardEntry['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-accent-green" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-accent-red" />;
      default:
        return <Minus className="w-4 h-4 text-muted" />;
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold gradient-text">Leaderboards</h1>
        <p className="text-muted">Compete with the best Claude Code users worldwide</p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        {leaderboardCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${selectedCategory === category.id
                ? 'bg-accent-blue text-white'
                : 'bg-dark-card text-muted hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800'
              }
            `}
          >
            <span>{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted" />
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              className="input text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all-time">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="card p-0 overflow-hidden">
        {currentCategory && (
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-2xl">{currentCategory.icon}</span>
              {currentCategory.name}
            </h2>
            <p className="text-sm text-muted mt-1">{currentCategory.description}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-bg/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted">Rank</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted">User</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted">
                    {currentCategory?.metric || 'Score'}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted">Trend</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted">Stats</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted">
                      No users found matching your search
                    </td>
                  </tr>
                ) : (
                  filteredData.map((entry) => (
                    <tr key={entry.userId} className="table-row">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`
                            font-mono font-semibold text-lg
                            ${entry.rank === 1 ? 'text-gold' : 
                              entry.rank === 2 ? 'text-silver' : 
                              entry.rank === 3 ? 'text-bronze' : 'text-muted'}
                          `}>
                            #{entry.rank}
                          </span>
                          {entry.rank <= 3 && (
                            <span className="text-lg">
                              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={entry.avatar} 
                            alt={entry.displayName}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p 
                              className="font-medium dark:text-gray-100" 
                              style={{ color: 'rgb(17 24 39)' }}
                            >
                              {entry.displayName}
                            </p>
                            <p className="text-sm text-muted">@{entry.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-accent-blue font-semibold">
                          {entry.score}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(entry.trend)}
                          {entry.trendValue && (
                            <span className={`
                              text-sm font-mono
                              ${entry.trend === 'up' ? 'text-accent-green' : 
                                entry.trend === 'down' ? 'text-accent-red' : 'text-muted'}
                            `}>
                              {entry.trend === 'up' ? '+' : ''}{entry.trendValue}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {entry.additionalStats && (
                          <div className="text-sm text-muted">
                            {Object.entries(entry.additionalStats).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                {key}: <span className="text-gray-600 dark:text-gray-300">{value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboards;