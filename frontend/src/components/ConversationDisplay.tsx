import React, { useState } from 'react';
import { MessageSquare, Code, Lock, Globe, Users, Search, Filter } from 'lucide-react';

interface Conversation {
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
  project: string;
  tools_used: string[];
}

interface ConversationDisplayProps {
  conversations: Conversation[];
  totalCount: number;
  isOwner: boolean;
}

type PrivacyLevel = 'private' | 'friends' | 'public';

const ConversationDisplay: React.FC<ConversationDisplayProps> = ({ 
  conversations, 
  totalCount,
  isOwner 
}) => {
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('private');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [showTools, setShowTools] = useState(false);

  // Get unique projects
  const projects = Array.from(new Set(conversations.map(c => c.project)));

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = filterProject === 'all' || conv.project === filterProject;
    return matchesSearch && matchesProject;
  });

  // Show based on privacy level
  const visibleConversations = isOwner ? filteredConversations : 
    privacyLevel === 'private' ? [] : filteredConversations;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Conversation History
          </h2>
          <p className="text-muted mt-1">
            {totalCount} total conversations shared
          </p>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Privacy:</span>
            <select
              value={privacyLevel}
              onChange={(e) => setPrivacyLevel(e.target.value as PrivacyLevel)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="private">
                🔒 Private (Only me)
              </option>
              <option value="friends">
                👥 Friends only
              </option>
              <option value="public">
                🌍 Public
              </option>
            </select>
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      {!isOwner && privacyLevel === 'private' && (
        <div className="card bg-gray-800/50 border-gray-700">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-gray-500" />
            <p className="text-muted">
              This user has chosen to keep their conversations private.
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      {visibleConversations.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent-blue"
            />
          </div>
          
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
          >
            <option value="all">All Projects</option>
            {projects.map(project => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>

          <button
            onClick={() => setShowTools(!showTools)}
            className={`btn-secondary ${showTools ? 'bg-accent-blue/20' : ''}`}
          >
            <Code className="w-4 h-4" />
            Tools
          </button>
        </div>
      )}

      {/* Conversations */}
      {visibleConversations.length > 0 ? (
        <div className="space-y-4">
          {visibleConversations.map((conv, index) => (
            <div key={index} className="card hover:border-gray-600 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  conv.role === 'user' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-accent-green/20 text-accent-green'
                }`}>
                  {conv.role === 'user' ? '👤' : '🤖'}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {conv.role === 'user' ? 'User' : 'Claude'}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(conv.timestamp).toLocaleString()}
                      </span>
                      {conv.project && (
                        <span className="text-xs bg-gray-800 px-2 py-0.5 rounded">
                          {conv.project}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {conv.content}
                  </p>
                  
                  {showTools && conv.tools_used.length > 0 && (
                    <div className="flex items-center gap-2 pt-2">
                      <Code className="w-3 h-3 text-gray-500" />
                      <div className="flex flex-wrap gap-1">
                        {conv.tools_used.map((tool, toolIndex) => (
                          <span key={toolIndex} className="text-xs bg-gray-800 px-2 py-0.5 rounded">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        visibleConversations.length === 0 && searchTerm && (
          <div className="text-center py-8 text-muted">
            No conversations match your search.
          </div>
        )
      )}

      {/* Stats */}
      {isOwner && (
        <div className="card bg-gradient-to-r from-accent-blue/10 to-accent-purple/10 border-accent-blue/50">
          <h3 className="text-lg font-medium mb-3">Conversation Insights</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted">Total Shared</p>
              <p className="text-xl font-bold">{conversations.length}</p>
            </div>
            <div>
              <p className="text-muted">Projects</p>
              <p className="text-xl font-bold">{projects.length}</p>
            </div>
            <div>
              <p className="text-muted">Privacy Level</p>
              <p className="text-xl font-bold capitalize">{privacyLevel}</p>
            </div>
            <div>
              <p className="text-muted">Visibility</p>
              <p className="text-xl font-bold">
                {privacyLevel === 'private' ? 'Hidden' : 'Visible'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationDisplay;