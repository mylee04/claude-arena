import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔥 Application Error Caught:', error);
    console.error('🔍 Error Info:', errorInfo);
    
    // Log specific Supabase-related errors
    if (error.message.includes('Invalid value') || error.message.includes('Supabase')) {
      console.error('🚨 This appears to be a Supabase configuration issue!');
      console.error('📋 Check your .env.local file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} reset={this.reset} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
              Something went wrong
            </h1>
            
            <div className="glass rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold mb-2 text-red-400">Error Details:</h3>
              <pre className="text-sm text-gray-400 whitespace-pre-wrap break-words">
                {this.state.error?.message || 'Unknown error occurred'}
              </pre>
              
              {this.state.error?.message.includes('Supabase') && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                  <p className="text-sm text-yellow-400">
                    💡 <strong>Configuration Issue:</strong> This appears to be a Supabase setup problem. 
                    Please check your <code>.env.local</code> file contains valid 
                    <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> values.
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={this.reset}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;