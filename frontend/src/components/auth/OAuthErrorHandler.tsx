/**
 * OAuth Error Handler Component
 * Provides enhanced error handling and recovery for OAuth token exchange issues
 * Specifically handles "Failed to execute 'fetch' on 'Window': Invalid value" error
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Settings, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { OAuthDiagnostics, type PKCEDiagnosticResult } from '../../utils/oauthDiagnostics';
import { supabase } from '../../lib/supabase';

interface OAuthErrorHandlerProps {
  error: Error;
  onRetry?: () => void;
  onClearAuth?: () => void;
  showDiagnostics?: boolean;
}

export function OAuthErrorHandler({ 
  error, 
  onRetry, 
  onClearAuth,
  showDiagnostics = false 
}: OAuthErrorHandlerProps) {
  const [diagnostics, setDiagnostics] = useState<PKCEDiagnosticResult[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  const isOAuthError = error.message.includes('Invalid value') || 
                      error.message.includes('fetch') ||
                      error.message.includes('OAuth') ||
                      error.message.includes('PKCE');

  useEffect(() => {
    // Auto-run diagnostics for OAuth-related errors
    if (isOAuthError && showDiagnostics) {
      runDiagnostics();
    }
  }, [error, showDiagnostics, isOAuthError]);

  const runDiagnostics = async () => {
    if (isRunningDiagnostics) return;
    
    setIsRunningDiagnostics(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const diagnosticsTool = new OAuthDiagnostics(supabaseUrl);
      const results = await diagnosticsTool.runFullDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
      toast.error('Failed to run diagnostics');
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const clearOAuthData = () => {
    // Clear OAuth-related data from localStorage
    const keysToRemove = [
      'claude-arena-auth-token',
      'pkce_code_verifier',
      'pkce_code_challenge',
      'oauth_state'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Clear Supabase session
    supabase.auth.signOut({ scope: 'local' });
    
    toast.success('OAuth data cleared');
    
    if (onClearAuth) {
      onClearAuth();
    }
  };

  const handleRetryWithFallback = async () => {
    // Clear potentially corrupted OAuth data first
    clearOAuthData();
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (onRetry) {
      onRetry();
    } else {
      // Fallback: redirect to login
      window.location.href = '/login';
    }
  };

  const copyDiagnosticsData = () => {
    const diagnosticsData = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      diagnostics: diagnostics
    };
    
    navigator.clipboard.writeText(JSON.stringify(diagnosticsData, null, 2))
      .then(() => toast.success('Diagnostics data copied to clipboard'))
      .catch(() => toast.error('Failed to copy diagnostics data'));
  };

  if (!isOAuthError) {
    // Render generic error for non-OAuth errors
    return (
      <div className="glass rounded-lg p-4 border border-red-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-800">Application Error</h3>
            <p className="text-sm text-red-600 mt-1">{error.message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-6 border border-orange-200 max-w-2xl mx-auto">
      <div className="flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-orange-500 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-orange-800 mb-2">
            OAuth Authentication Issue Detected
          </h3>
          
          <p className="text-sm text-orange-700 mb-4">
            We encountered an issue during the authentication process. This typically happens 
            when there's a problem with the OAuth token exchange or callback parameters.
          </p>

          {/* Error Details */}
          <div className="bg-orange-50 rounded p-3 mb-4">
            <p className="text-sm font-mono text-orange-800">
              {error.message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleRetryWithFallback}
              className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 rounded transition-colors text-sm"
              disabled={isRunningDiagnostics}
            >
              <RefreshCw className="w-4 h-4" />
              Clear & Retry Authentication
            </button>
            
            {showDiagnostics && (
              <button
                onClick={runDiagnostics}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded transition-colors text-sm"
                disabled={isRunningDiagnostics}
              >
                <Settings className="w-4 h-4" />
                {isRunningDiagnostics ? 'Running Diagnostics...' : 'Run Diagnostics'}
              </button>
            )}
          </div>

          {/* Diagnostics Results */}
          {diagnostics.length > 0 && (
            <div className="border-t border-orange-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-orange-800">Diagnostic Results</h4>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-orange-600 hover:text-orange-800 transition-colors"
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
              
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {diagnostics.map((result, index) => (
                  <div 
                    key={index}
                    className={`text-xs p-2 rounded ${
                      result.success 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <div className="font-medium truncate" title={result.testName}>
                      {result.testName}
                    </div>
                    <div>{result.success ? '✅ Pass' : '❌ Fail'}</div>
                  </div>
                ))}
              </div>

              {/* Detailed Results */}
              {showDetails && (
                <div className="space-y-2">
                  {diagnostics.map((result, index) => (
                    <div key={index} className="bg-white rounded p-3 border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{result.testName}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          result.success 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.success ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      {result.error && (
                        <p className="text-xs text-red-600 mb-2">{result.error}</p>
                      )}
                      {result.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                            View Details
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-50 rounded overflow-auto text-xs">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={copyDiagnosticsData}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Copy Diagnostics Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Helpful Tips */}
          <div className="border-t border-orange-200 pt-4 mt-4">
            <h4 className="font-medium text-orange-800 mb-2">Common Solutions:</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Try signing in again (this often resolves temporary issues)</li>
              <li>• Clear your browser cache and cookies for this site</li>
              <li>• Check if you have browser extensions blocking requests</li>
              <li>• Ensure your system clock is accurate (OAuth is time-sensitive)</li>
              <li>• Try using an incognito/private browsing window</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper hook for easier integration with existing error boundaries
 */
export function useOAuthErrorHandler() {
  const handleOAuthError = (error: Error, options?: {
    showDiagnostics?: boolean;
    onRetry?: () => void;
    onClearAuth?: () => void;
  }) => {
    const isOAuthError = error.message.includes('Invalid value') || 
                        error.message.includes('fetch') ||
                        error.message.includes('OAuth') ||
                        error.message.includes('PKCE');

    if (isOAuthError) {
      console.error('🚨 OAuth Error Detected:', error);
      
      // Auto-clear potentially corrupted OAuth data
      const keysToRemove = [
        'claude-arena-auth-token',
        'pkce_code_verifier', 
        'pkce_code_challenge',
        'oauth_state'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Show user-friendly error message
      toast.error('Authentication issue detected. Please try signing in again.');
      
      if (options?.onClearAuth) {
        options.onClearAuth();
      }
    }

    return isOAuthError;
  };

  return { handleOAuthError };
}