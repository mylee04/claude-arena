import React from 'react';
import { Users, Plus, Trophy, TrendingUp, Search } from 'lucide-react';

const Teams: React.FC = () => {
  // Mock team data
  const mockTeams = [
    {
      id: '1',
      name: 'Code Wizards',
      logo: '🧙‍♂️',
      memberCount: 12,
      averageScore: 89.5,
      rank: 1,
      topMembers: ['Alex Chen', 'Sarah Johnson', 'Mike Wilson'],
      recentAchievement: 'Won Weekly Challenge'
    },
    {
      id: '2',
      name: 'Syntax Samurai',
      logo: '⚔️',
      memberCount: 8,
      averageScore: 87.2,
      rank: 2,
      topMembers: ['Lisa Zhang', 'Eddie Kim', 'Carl Peterson'],
      recentAchievement: 'Highest Efficiency Score'
    },
    {
      id: '3',
      name: 'Debug Dynasty',
      logo: '🐛',
      memberCount: 15,
      averageScore: 85.9,
      rank: 3,
      topMembers: ['Emma Davis', 'Ryan Park', 'Jessica Liu'],
      recentAchievement: 'Most Active Team'
    },
    {
      id: '4',
      name: 'Async Avengers',
      logo: '🦸',
      memberCount: 10,
      averageScore: 84.3,
      rank: 4,
      topMembers: ['Tom Anderson', 'Nina Patel', 'Chris Wang'],
      recentAchievement: 'Fastest Growing Team'
    }
  ];

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold gradient-text">Teams</h1>
        <p className="text-muted">Join forces with other Claude Code users</p>
      </div>

      {/* Team Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Team
        </button>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Search teams..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* My Team */}
      <div className="card bg-gradient-to-r from-accent-blue/10 to-accent-purple/10 border-accent-blue/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            My Team
          </h2>
          <span className="badge-blue">
            Member
          </span>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="text-4xl">{mockTeams[0].logo}</div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold">{mockTeams[0].name}</h3>
            <p className="text-muted mb-2">{mockTeams[0].memberCount} members • Rank #{mockTeams[0].rank}</p>
            <div className="flex flex-wrap gap-4 text-sm justify-center md:justify-start">
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-accent-yellow" />
                <span>Average Score: {mockTeams[0].averageScore}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-accent-green" />
                <span>{mockTeams[0].recentAchievement}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary">View Details</button>
            <button className="btn-ghost text-accent-red">Leave Team</button>
          </div>
        </div>
      </div>

      {/* Team Leaderboard */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-6">Top Teams</h2>
        <div className="space-y-4">
          {mockTeams.map((team, index) => (
            <div 
              key={team.id} 
              className="flex items-center gap-4 p-4 rounded-lg border border-dark-border hover:bg-dark-card/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`
                    font-mono font-semibold text-lg
                    ${index === 0 ? 'text-gold' : 
                      index === 1 ? 'text-silver' : 
                      index === 2 ? 'text-bronze' : 'text-muted'}
                  `}>
                    #{team.rank}
                  </span>
                  {index < 3 && (
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  )}
                </div>
                <div className="text-3xl">{team.logo}</div>
                <div>
                  <h3 className="font-semibold text-lg">{team.name}</h3>
                  <p className="text-sm text-muted">
                    {team.memberCount} members • Score: {team.averageScore}
                  </p>
                </div>
              </div>
              
              <div className="hidden md:block">
                <p className="text-sm text-muted mb-1">Top Members</p>
                <div className="flex gap-2">
                  {team.topMembers.slice(0, 3).map((member, i) => (
                    <span key={i} className="text-xs bg-dark-bg px-2 py-1 rounded">
                      {member}
                    </span>
                  ))}
                </div>
              </div>

              <button className="btn-secondary">View Team</button>
            </div>
          ))}
        </div>
      </div>

      {/* Open Teams */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-6">Teams Recruiting Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-hover">
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">🚀</div>
              <span className="badge-green">
                Open
              </span>
            </div>
            <h3 className="font-semibold mb-1">Rocket Coders</h3>
            <p className="text-sm text-muted mb-3">
              Looking for efficiency-focused developers
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">5/10 members</span>
              <button className="btn-primary btn py-1 px-3 text-sm">Join</button>
            </div>
          </div>

          <div className="card-hover">
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">🌟</div>
              <span className="badge-green">
                Open
              </span>
            </div>
            <h3 className="font-semibold mb-1">Star Developers</h3>
            <p className="text-sm text-muted mb-3">
              Building the future, one commit at a time
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">7/12 members</span>
              <button className="btn-primary btn py-1 px-3 text-sm">Join</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teams;