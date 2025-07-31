import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Zap, Bot, Star,
  Grid, List,
  BarChart3, PieChart, Activity
} from 'lucide-react';
import type { AgentPortfolio, AgentLevel, AgentOwnershipSummary, XPEvent } from '../../types';
import AgentCard from './AgentCard';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

interface AgentOwnershipPanelProps {
  agents: AgentPortfolio[];
  summary: AgentOwnershipSummary;
  recentXPEvents: XPEvent[];
  isLoading?: boolean;
  onAgentClick?: (agent: AgentPortfolio) => void;
  onFavoriteToggle?: (agentName: string) => void;
  onPrivacyChange?: (agentName: string, privacy: 'public' | 'friends' | 'private') => void;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'xp' | 'level' | 'usage' | 'recent' | 'success';
type FilterOption = 'all' | 'favorites' | 'recent' | AgentLevel;

const LEVEL_COLORS: Record<AgentLevel, string> = {
  recruit: '#6b7280',
  specialist: '#10b981', 
  expert: '#3b82f6',
  master: '#8b5cf6',
  elite: '#f59e0b'
};

const AgentOwnershipPanel: React.FC<AgentOwnershipPanelProps> = ({
  agents,
  summary,
  recentXPEvents,
  isLoading = false,
  onAgentClick,
  onFavoriteToggle,
  onPrivacyChange
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('xp');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Sort and filter agents
  const filteredAndSortedAgents = React.useMemo(() => {
    let filtered = agents;

    // Apply filters
    switch (filterBy) {
      case 'favorites':
        filtered = agents.filter(agent => agent.is_favorite);
        break;
      case 'recent':
        filtered = agents.filter(agent => {
          if (!agent.last_used) return false;
          const lastUsed = new Date(agent.last_used);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return lastUsed > weekAgo;
        });
        break;
      case 'recruit':
      case 'specialist':
      case 'expert':
      case 'master':
      case 'elite':
        filtered = agents.filter(agent => agent.current_level === filterBy);
        break;
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'xp':
          return b.total_xp - a.total_xp;
        case 'level':
          const levelOrder = ['recruit', 'specialist', 'expert', 'master', 'elite'];
          return levelOrder.indexOf(b.current_level) - levelOrder.indexOf(a.current_level);
        case 'usage':
          return b.total_usage - a.total_usage;
        case 'recent':
          if (!a.last_used && !b.last_used) return 0;
          if (!a.last_used) return 1;
          if (!b.last_used) return -1;
          return new Date(b.last_used).getTime() - new Date(a.last_used).getTime();
        case 'success':
          return b.success_rate - a.success_rate;
        default:
          return 0;
      }
    });
  }, [agents, filterBy, sortBy]);

  // Prepare chart data
  const levelDistributionData = Object.entries(summary.levelDistribution).map(([level, count]) => ({
    level: level.charAt(0).toUpperCase() + level.slice(1),
    count,
    color: LEVEL_COLORS[level as AgentLevel]
  }));

  const xpTimelineData = recentXPEvents
    .slice(-7)
    .reverse()
    .map(event => ({
      date: new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      xp: event.total_points,
      agent: event.agent_name
    }));

  const topAgentsByXP = agents
    .slice()
    .sort((a, b) => b.total_xp - a.total_xp)
    .slice(0, 5)
    .map(agent => ({
      name: agent.agent_display_name,
      xp: agent.total_xp,
      level: agent.current_level
    }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          className="glass rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent-blue/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-accent-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary.totalAgents}</p>
              <p className="text-sm text-muted">Total Agents</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="glass rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent-purple/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-accent-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary.totalXP.toLocaleString()}</p>
              <p className="text-sm text-muted">Total XP</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="glass rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent-gold/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-accent-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold capitalize">{summary.highestLevel}</p>
              <p className="text-sm text-muted">Highest Level</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="glass rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent-orange/20 flex items-center justify-center">
              <Star className="w-6 h-6 text-accent-orange" />
            </div>
            <div>
              <p className="text-xl font-bold truncate">{summary.favoriteAgent || 'None'}</p>
              <p className="text-sm text-muted">Favorite Agent</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">My Agents</h2>
          <span className="px-3 py-1 bg-accent-blue/20 text-accent-blue rounded-full text-sm font-medium">
            {filteredAndSortedAgents.length} agents
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Analytics Toggle */}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showAnalytics 
                ? 'bg-accent-green text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>

          {/* View Toggle */}
          <div className="flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-accent-blue text-white' : 'text-gray-400'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-accent-blue text-white' : 'text-gray-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-accent-blue focus:outline-none"
          >
            <option value="xp">Sort by XP</option>
            <option value="level">Sort by Level</option>
            <option value="usage">Sort by Usage</option>
            <option value="recent">Sort by Recent</option>
            <option value="success">Sort by Success Rate</option>
          </select>

          {/* Filter Dropdown */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-accent-blue focus:outline-none"
          >
            <option value="all">All Agents</option>
            <option value="favorites">Favorites</option>
            <option value="recent">Recently Used</option>
            <option value="elite">Elite Level</option>
            <option value="master">Master Level</option>
            <option value="expert">Expert Level</option>
            <option value="specialist">Specialist Level</option>
            <option value="recruit">Recruit Level</option>
          </select>
        </div>
      </div>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Level Distribution */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Level Distribution
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={levelDistributionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="count"
                      label={({ level, count }) => `${level}: ${count}`}
                    >
                      {levelDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* XP Timeline */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent XP Gains
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={xpTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" stroke="var(--color-text-muted)" />
                    <YAxis stroke="var(--color-text-muted)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-card)', 
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="xp" 
                      stroke="var(--color-accent-blue)" 
                      fill="var(--color-accent-blue)"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Agents */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Top Agents by XP
              </h3>
              <div className="space-y-3">
                {topAgentsByXP.map((agent, index) => (
                  <div key={agent.name} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{agent.name}</p>
                      <p className="text-xs text-muted capitalize">{agent.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{agent.xp.toLocaleString()}</p>
                      <p className="text-xs text-muted">XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Grid/List */}
      <motion.div layout className={viewMode === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
        : 'space-y-4'
      }>
        <AnimatePresence>
          {filteredAndSortedAgents.map((agent) => (
            <motion.div
              key={agent.agent_name}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <AgentCard
                agent={agent}
                isOwner={true}
                onClick={() => onAgentClick?.(agent)}
                onFavoriteToggle={onFavoriteToggle}
                onPrivacyChange={onPrivacyChange}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredAndSortedAgents.length === 0 && (
        <motion.div 
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Bot className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No agents found</h3>
          <p className="text-gray-500">
            {filterBy === 'all' 
              ? "Start using Claude Code to unlock your first agent!" 
              : `No agents match the "${filterBy}" filter.`
            }
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default AgentOwnershipPanel;