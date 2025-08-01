/**
 * OAuth Diagnostics Panel
 * Development tool for testing and debugging OAuth issues
 */

import { useState } from 'react';
import { Bug, Play, Download, AlertCircle } from 'lucide-react';
import { OAuthDiagnostics, type PKCEDiagnosticResult } from '../../utils/oauthDiagnostics';
import { toast } from 'sonner';

export function OAuthDiagnosticsPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<PKCEDiagnosticResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development mode
  if (import.meta.env.PROD) {
    return null;
  }

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const diagnostics = new OAuthDiagnostics(supabaseUrl);
      const testResults = await diagnostics.runFullDiagnostics();
      setResults(testResults);
      
      const report = diagnostics.getReport();
      if (report.summary.failed > 0) {
        toast.error(`${report.summary.failed} diagnostic tests failed`);
      } else {
        toast.success('All diagnostic tests passed');
      }
    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast.error('Failed to run diagnostics');
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      environment: {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        mode: import.meta.env.MODE,
        isDev: import.meta.env.DEV
      },
      results: results
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oauth-diagnostics-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Diagnostics report downloaded');
  };

  const simulateTokenExchange = async () => {
    const code = new URLSearchParams(window.location.search).get('code');
    const codeVerifier = localStorage.getItem('pkce_code_verifier');
    
    if (!code) {
      toast.error('No authorization code found in URL');
      return;
    }

    setIsRunning(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const diagnostics = new OAuthDiagnostics(supabaseUrl);
      const result = await diagnostics.simulateTokenExchange(code, codeVerifier || undefined);
      
      console.log('Token exchange simulation result:', result);
      
      if (result.success) {
        toast.success('Token exchange simulation successful');
      } else {
        toast.error(`Token exchange failed: ${result.error}`);
      }
      
      setResults(prev => [...prev, result]);
    } catch (error) {
      console.error('Token exchange simulation failed:', error);
      toast.error('Failed to simulate token exchange');
    } finally {
      setIsRunning(false);
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-colors"
          title="OAuth Diagnostics Panel"
        >
          <Bug className="w-4 h-4" />
          OAuth Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-purple-600 text-white">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          <span className="font-medium">OAuth Diagnostics</span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-purple-200 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>
      
      <div className="p-4 space-y-3 overflow-y-auto max-h-80">
        {/* Control Buttons */}
        <div className="flex gap-2">
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded text-sm transition-colors"
          >
            <Play className="w-3 h-3" />
            {isRunning ? 'Running...' : 'Run Full Test'}
          </button>
          
          <button
            onClick={simulateTokenExchange}
            disabled={isRunning}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded text-sm transition-colors"
          >
            Test Token Exchange
          </button>
        </div>

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="border rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">Test Results</span>
              <button
                onClick={downloadReport}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs transition-colors"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-green-50 p-2 rounded">
                <div className="text-green-800 font-medium">Passed</div>
                <div className="text-green-600">
                  {results.filter(r => r.success).length}
                </div>
              </div>
              <div className="bg-red-50 p-2 rounded">
                <div className="text-red-800 font-medium">Failed</div>
                <div className="text-red-600">
                  {results.filter(r => !r.success).length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Results */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <span className="font-medium text-sm">Recent Tests:</span>
            {results.slice(-5).reverse().map((result, index) => (
              <div 
                key={index}
                className={`p-2 rounded text-xs border ${
                  result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <span className="text-green-600">✅</span>
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-600" />
                  )}
                  <span className="font-medium">{result.testName}</span>
                </div>
                {result.error && (
                  <div className="text-red-600 mt-1 text-xs truncate">
                    {result.error}
                  </div>
                )}
                <div className="text-gray-500 text-xs mt-1">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Current OAuth State */}
        <div className="border-t pt-3">
          <span className="font-medium text-sm">Current State:</span>
          <div className="text-xs space-y-1 mt-1">
            <div>
              <span className="text-gray-600">URL:</span> {window.location.pathname}
            </div>
            <div>
              <span className="text-gray-600">Has Code:</span>{' '}
              {new URLSearchParams(window.location.search).has('code') ? '✅' : '❌'}
            </div>
            <div>
              <span className="text-gray-600">Has Verifier:</span>{' '}
              {localStorage.getItem('pkce_code_verifier') ? '✅' : '❌'}
            </div>
            <div>
              <span className="text-gray-600">Has Session:</span>{' '}
              {localStorage.getItem('claude-arena-auth-token') ? '✅' : '❌'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}