import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { logOAuthDebugInfo } from '../../utils/oauthDebug';
import { handleOAuthCallbackWithWorkarounds } from '../../utils/oauthWorkarounds';
import { OAuthErrorHandler } from './OAuthErrorHandler';
import { handleImplicitFlowResponse, hasImplicitFlowTokens } from '../../utils/implicitFlowHandler';
import { useAuth } from '../../hooks/useAuth';

export function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [authError, setAuthError] = useState<Error | null>(null);
  const [recoveryMethod, setRecoveryMethod] = useState<string>('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback with enhanced workarounds...');
        
        // First, use debug utilities to analyze the callback
        const debugInfo = logOAuthDebugInfo();
        
        const { hasError, error, errorDescription, isValidCallback } = debugInfo;

        // Handle OAuth errors from provider
        if (hasError && error) {
          console.error('❌ OAuth error from provider:', error, errorDescription);
          const providerError = new Error(`OAuth Provider Error: ${errorDescription || error}`);
          setAuthError(providerError);
          setStatus('error');
          setErrorMessage(errorDescription || error);
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        // If no auth parameters, this might not be a valid callback
        if (!isValidCallback) {
          console.warn('⚠️ Invalid OAuth callback - no authentication parameters found');
          const invalidError = new Error('No authentication parameters found in callback URL');
          setAuthError(invalidError);
          setStatus('error');
          setErrorMessage('No authentication parameters found in callback URL');
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }

        // Check if this is an implicit flow response
        if (hasImplicitFlowTokens()) {
          console.log('🔐 Detected implicit flow tokens, handling directly...');
          const implicitResult = await handleImplicitFlowResponse();
          
          if (implicitResult.success) {
            console.log('✅ Implicit flow handled successfully');
            setStatus('success');
            setRecoveryMethod('Implicit Flow Direct Handler');
            toast.success('Successfully signed in!');
            
            // Wait longer to ensure AuthContext has time to detect the session
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 3000);
            return;
          } else {
            console.error('❌ Implicit flow handler failed:', implicitResult.error);
            // Fall through to standard workarounds
          }
        }
        
        // Use enhanced OAuth callback handler with workarounds
        console.log('🔧 Attempting OAuth callback with workaround strategies...');
        const result = await handleOAuthCallbackWithWorkarounds();
        
        if (result.success && result.session?.user) {
          console.log('✅ OAuth callback successful with method:', result.method);
          setStatus('success');
          setRecoveryMethod(result.method || 'Unknown');
          toast.success(`Successfully signed in! (${result.method})`);
          
          // Redirect to dashboard
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1500);
        } else {
          console.error('❌ All OAuth workaround methods failed:', result.error);
          const workaroundError = new Error(result.error || 'OAuth callback failed');
          setAuthError(workaroundError);
          setStatus('error');
          setErrorMessage(result.error || 'Authentication session could not be established');
          
          // Don't auto-redirect on workaround failure - let user see the error handler
          // setTimeout(() => {
          //   navigate('/login', { replace: true });
          // }, 5000);
        }

      } catch (error) {
        console.error('❌ OAuth callback processing error:', error);
        const processingError = error instanceof Error ? error : new Error('Unknown processing error');
        setAuthError(processingError);
        setStatus('error');
        setErrorMessage(processingError.message);
        
        // Don't auto-redirect on processing errors - let user see diagnostics
        // setTimeout(() => {
        //   navigate('/login', { replace: true });
        // }, 3000);
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  // Check if we're authenticated through AuthContext (fallback session)
  const { session: authSession } = useAuth();
  
  useEffect(() => {
    // If we have a session from AuthContext but we're still on callback page, redirect
    if (authSession && status !== 'success') {
      console.log('🔄 Session detected from AuthContext, redirecting...');
      navigate('/', { replace: true });
    }
  }, [authSession, status, navigate]);

  // If there's an OAuth-specific error, show the enhanced error handler
  if (status === 'error' && authError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <OAuthErrorHandler 
          error={authError}
          onRetry={() => {
            setStatus('processing');
            setAuthError(null);
            setErrorMessage('');
            // Trigger a fresh callback attempt
            window.location.reload();
          }}
          onClearAuth={() => {
            // Clear auth and redirect to login
            navigate('/login', { replace: true });
          }}
          showDiagnostics={true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-md w-full text-center">
        <div className="glass rounded-xl p-8">
          {status === 'processing' && (
            <>
              <div className="flex justify-center mb-6">
                <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--color-accent-blue)' }} />
              </div>
              <h2 className="text-xl font-semibold mb-2">Processing Authentication</h2>
              <p className="text-muted">Please wait while we complete your sign in...</p>
              <div className="mt-4 flex justify-center">
                <Settings className="w-4 h-4 animate-spin" style={{ color: 'var(--color-accent-blue)' }} />
                <span className="ml-2 text-sm text-muted">Running enhanced OAuth recovery...</span>
              </div>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <CheckCircle className="w-12 h-12" style={{ color: 'var(--color-accent-green)' }} />
              </div>
              <h2 className="text-xl font-semibold mb-2">Authentication Successful</h2>
              <p className="text-muted">Redirecting you to the dashboard...</p>
              {recoveryMethod && (
                <p className="text-sm text-muted mt-2">
                  Recovery method: {recoveryMethod}
                </p>
              )}
            </>
          )}
          
          {status === 'error' && !authError && (
            <>
              <div className="flex justify-center mb-6">
                <AlertCircle className="w-12 h-12" style={{ color: 'var(--color-accent-red)' }} />
              </div>
              <h2 className="text-xl font-semibold mb-2">Authentication Failed</h2>
              <p className="text-muted mb-4">{errorMessage}</p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="px-4 py-2 glass rounded-lg hover:scale-[1.02] transition-all duration-200"
                style={{ borderColor: 'var(--color-accent-blue)' }}
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}