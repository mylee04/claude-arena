import React from 'react';
import { Trophy, Zap, Users, TrendingUp, Shield, Sparkles } from 'lucide-react';

const About: React.FC = () => {
  const features = [
    {
      icon: Trophy,
      title: 'Multiple Leaderboards',
      description: 'Compete in various categories beyond just token usage - efficiency, speed, tool mastery, and more.'
    },
    {
      icon: Zap,
      title: 'Real-time Updates',
      description: 'See your rankings update in real-time as you use Claude Code. Track your progress instantly.'
    },
    {
      icon: Users,
      title: 'Team Competitions',
      description: 'Join or create teams to compete together. Share strategies and learn from the best.'
    },
    {
      icon: TrendingUp,
      title: 'Detailed Analytics',
      description: 'Get insights into your coding patterns, peak productivity hours, and improvement areas.'
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Your code remains private. We only track anonymized usage metrics with your consent.'
    },
    {
      icon: Sparkles,
      title: 'Achievement System',
      description: 'Unlock badges and achievements as you improve. Show off your coding prowess.'
    }
  ];

  const roadmap = [
    {
      phase: 'Phase 1',
      status: 'current',
      title: 'MVP Launch',
      items: [
        'Import Sniffly analytics data',
        'Basic leaderboard categories',
        'User profiles and achievements',
        'Team creation and management'
      ]
    },
    {
      phase: 'Phase 2',
      status: 'upcoming',
      title: 'Enhanced Features',
      items: [
        'Data marketplace for usage patterns',
        'Advanced analytics dashboard',
        'Mentorship matching system',
        'API for third-party integrations'
      ]
    },
    {
      phase: 'Phase 3',
      status: 'future',
      title: 'AI Integration',
      items: [
        'Direct Claude Code integration',
        'AI-powered coaching',
        'Real-time collaboration',
        'Premium subscriptions'
      ]
    }
  ];

  return (
    <div className="space-y-12 fade-in max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold gradient-text">About Claude Arena</h1>
        <p className="text-xl text-muted max-w-3xl mx-auto">
          Transform your Claude Code usage data into a competitive and engaging experience. 
          Learn from the best, track your progress, and become a more efficient developer.
        </p>
      </div>

      {/* Mission */}
      <div className="card text-center">
        <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
        <p className="text-muted max-w-3xl mx-auto">
          We believe that coding with AI should be fun, competitive, and rewarding. Claude Arena turns 
          mundane usage metrics into meaningful insights and friendly competition, helping developers 
          improve their skills while building an amazing community.
        </p>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="card-hover">
                <Icon className="w-8 h-8 text-accent-blue mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div className="card">
        <h2 className="text-2xl font-semibold mb-6">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent-blue/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-accent-blue">1</span>
            </div>
            <h3 className="font-semibold mb-2">Connect Your Data</h3>
            <p className="text-sm text-muted">
              Import your usage data from Sniffly or connect directly with Claude Code
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent-purple/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-accent-purple">2</span>
            </div>
            <h3 className="font-semibold mb-2">Track Progress</h3>
            <p className="text-sm text-muted">
              Monitor your rankings, unlock achievements, and analyze your coding patterns
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-accent-green">3</span>
            </div>
            <h3 className="font-semibold mb-2">Compete & Learn</h3>
            <p className="text-sm text-muted">
              Join teams, compete in challenges, and learn from top performers
            </p>
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <div>
        <h2 className="text-3xl font-bold text-center mb-8">Product Roadmap</h2>
        <div className="space-y-6">
          {roadmap.map((phase) => (
            <div 
              key={phase.phase} 
              className={`card ${
                phase.status === 'current' 
                  ? 'border-accent-blue bg-accent-blue/5' 
                  : 'opacity-75'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <span className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  ${phase.status === 'current' 
                    ? 'bg-accent-blue/20 text-accent-blue' 
                    : phase.status === 'upcoming'
                    ? 'bg-accent-purple/20 text-accent-purple'
                    : 'bg-gray-200 dark:bg-gray-800 text-muted'
                  }
                `}>
                  {phase.phase}
                </span>
                <h3 className="text-xl font-semibold">{phase.title}</h3>
                {phase.status === 'current' && (
                  <span className="ml-auto text-sm text-accent-green flex items-center gap-1">
                    <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
                    In Progress
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {phase.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-muted">
                    <span className="text-accent-blue mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="card bg-gradient-to-r from-accent-blue/10 to-accent-purple/10 text-center">
        <h2 className="text-2xl font-semibold mb-4">Ready to Join the Arena?</h2>
        <p className="text-muted mb-6 max-w-2xl mx-auto">
          Start competing with thousands of Claude Code users worldwide. Import your data and see where you rank!
        </p>
        <div className="flex gap-4 justify-center">
          <button className="btn-primary">Get Started</button>
          <button className="btn-secondary">View Documentation</button>
        </div>
      </div>
    </div>
  );
};

export default About;