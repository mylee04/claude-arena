import React, { useState } from 'react';
import { Terminal, CheckCircle, AlertCircle, Loader2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface ClaudeLogsData {
  user_stats: {
    total_sessions: number;
    total_tokens_used: number;
    total_hours: number;
    error_rate: number;
    projects_count: number;
  };
  tool_usage: Record<string, number>;
  daily_activity: Record<string, { sessions: number; tokens: number }>;
  achievements: string[];
  leaderboard_stats: Record<string, number>;
}

const ImportData: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importedData, setImportedData] = useState<ClaudeLogsData | null>(null);
  const [importProgress, setImportProgress] = useState<string>('');

  const runImportScript = async () => {
    setIsImporting(true);
    setImportProgress('Starting import...');
    
    try {
      // In a real implementation, this would run the Python script
      // For now, we'll simulate the process
      setImportProgress('Scanning ~/.claude/projects/ for logs...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setImportProgress('Parsing session data...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setImportProgress('Calculating statistics...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for demonstration
      const mockData: ClaudeLogsData = {
        user_stats: {
          total_sessions: 68,
          total_tokens_used: 733038794,
          total_hours: 467.37,
          error_rate: 15.2,
          projects_count: 11
        },
        tool_usage: {
          "Bash": 50,
          "Read": 36,
          "TodoWrite": 35,
          "Write": 35,
          "Edit": 32
        },
        daily_activity: {
          "2025-07-30": { sessions: 1, tokens: 4568090 },
          "2025-07-31": { sessions: 16, tokens: 55965439 }
        },
        achievements: ["first_session", "getting_started", "tool_master", "day_warrior"],
        leaderboard_stats: {
          precisionist_score: 84.8,
          speed_demon_score: 26.47,
          night_owl_score: 16.18,
          tool_master_score: 17,
          marathon_score: 467.37
        }
      };
      
      setImportedData(mockData);
      setImportProgress('Import complete!');
      toast.success('Successfully imported Claude Code logs!');
      
    } catch (error) {
      toast.error('Failed to import data');
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleUploadToArena = async () => {
    if (!importedData) return;
    
    setIsImporting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8281';
      const response = await fetch(`${apiUrl}/api/import/claude-logs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importedData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }
      
      const result = await response.json();
      toast.success(result.message || 'Data uploaded successfully!');
      
      // TODO: Navigate to dashboard or refresh leaderboards
    } catch (error) {
      toast.error('Failed to upload data');
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8 fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Import Your Claude Code Data</h1>
        <p className="text-muted">Import directly from your Claude Code logs - no external tools needed!</p>
      </div>

      {!importedData ? (
        /* Import Section */
        <div className="card space-y-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center">
              {isImporting ? (
                <Loader2 className="w-10 h-10 text-accent-blue animate-spin" />
              ) : (
                <Terminal className="w-10 h-10 text-gray-400" />
              )}
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">One-Click Import</h2>
              <p className="text-muted max-w-lg mx-auto">
                We'll automatically scan your Claude Code logs in <code className="text-accent-blue">~/.claude/projects/</code> 
                and extract all your usage data.
              </p>
            </div>

            {importProgress && (
              <div className="text-sm text-accent-blue animate-pulse">
                {importProgress}
              </div>
            )}

            <button
              onClick={runImportScript}
              disabled={isImporting}
              className="btn-primary mx-auto"
            >
              {isImporting ? 'Importing...' : 'Import Claude Logs'}
            </button>

            <div className="mt-4 text-sm text-muted">
              <label className="flex items-center justify-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>Include conversation history (with consent)</span>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-lg font-medium mb-3">What we'll import:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-accent-green mt-0.5" />
                <span className="text-muted">Session metrics and duration</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-accent-green mt-0.5" />
                <span className="text-muted">Token usage statistics</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-accent-green mt-0.5" />
                <span className="text-muted">Tool usage patterns</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-accent-green mt-0.5" />
                <span className="text-muted">Project analytics</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-accent-green mt-0.5" />
                <span className="text-muted">Error rates and debugging</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-accent-green mt-0.5" />
                <span className="text-muted">Achievement progress</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-lg font-medium mb-3">Manual Import Option:</h3>
            <div className="bg-gray-900 rounded-lg p-4">
              <code className="text-sm text-gray-300">
                python scripts/import_claude_logs.py --output my-stats.json
              </code>
            </div>
            <p className="text-sm text-muted mt-2">
              Run this command in your terminal, then upload the generated JSON file.
            </p>
          </div>
        </div>
      ) : (
        /* Results Section */
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Import Summary</h2>
              <BarChart3 className="w-6 h-6 text-accent-blue" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted mb-1">Sessions</p>
                <p className="text-2xl font-bold">{importedData.user_stats.total_sessions}</p>
              </div>
              <div>
                <p className="text-sm text-muted mb-1">Total Hours</p>
                <p className="text-2xl font-bold">{importedData.user_stats.total_hours.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted mb-1">Projects</p>
                <p className="text-2xl font-bold">{importedData.user_stats.projects_count}</p>
              </div>
              <div>
                <p className="text-sm text-muted mb-1">Tokens Used</p>
                <p className="text-2xl font-bold">
                  {(importedData.user_stats.total_tokens_used / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Top Tools Used</h3>
                <div className="space-y-2">
                  {Object.entries(importedData.tool_usage)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([tool, count]) => (
                      <div key={tool} className="flex items-center justify-between">
                        <span className="text-sm text-muted">{tool}</span>
                        <span className="text-sm font-medium">{count} uses</span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Achievements Unlocked</h3>
                <div className="flex flex-wrap gap-2">
                  {importedData.achievements.map(achievement => (
                    <span
                      key={achievement}
                      className="px-3 py-1 bg-accent-green/20 text-accent-green rounded-full text-sm"
                    >
                      ✅ {achievement.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Leaderboard Preview</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-muted mb-1">🎯 Precisionist</p>
                    <p className="font-medium">{importedData.leaderboard_stats.precisionist_score.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-muted mb-1">🚀 Speed Demon</p>
                    <p className="font-medium">{importedData.leaderboard_stats.speed_demon_score.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-muted mb-1">🦉 Night Owl</p>
                    <p className="font-medium">{importedData.leaderboard_stats.night_owl_score.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setImportedData(null);
                setImportProgress('');
              }}
              className="btn-secondary"
            >
              Import Again
            </button>
            <button
              onClick={handleUploadToArena}
              disabled={isImporting}
              className="btn-primary"
            >
              {isImporting ? 'Uploading...' : 'Upload to Arena'}
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="card border-accent-blue/50 bg-accent-blue/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-accent-blue">Privacy First</p>
            <p className="text-muted">
              All data processing happens locally on your machine. We only upload aggregated statistics,
              never your actual conversations or code. Your privacy is our top priority.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportData;