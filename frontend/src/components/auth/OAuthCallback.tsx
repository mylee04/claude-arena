import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { logOAuthDebugInfo } from '../../utils/oauthDebug';

export function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        
        // Use debug utilities to analyze the callback
        const debugInfo = logOAuthDebugInfo();
        
        const { hasError, error, errorDescription, isValidCallback } = debugInfo;

        // Handle OAuth errors
        if (hasError && error) {
          console.error('❌ OAuth error from provider:', error, errorDescription);
          setStatus('error');
          setErrorMessage(errorDescription || error);
          toast.error(`Authentication failed: ${errorDescription || error}`);
          
          // Redirect to login after a delay
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        // If no auth parameters, this might not be a valid callback
        if (!isValidCallback) {
          console.warn('⚠️ Invalid OAuth callback - no authentication parameters found');
          setStatus('error');
          setErrorMessage('No authentication parameters found in callback URL');
          toast.error('Invalid authentication callback');
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }

        // Let Supabase handle the session from URL automatically
        console.log('🔄 Letting Supabase process session from URL...');
        
        // Wait a moment for Supabase auth state to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if we now have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setStatus('error');
          setErrorMessage(sessionError.message);
          toast.error(`Session error: ${sessionError.message}`);
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        if (session?.user) {
          console.log('✅ OAuth callback successful, user:', session.user.id);
          setStatus('success');
          toast.success('Successfully signed in!');
          
          // Redirect to dashboard
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1500);
        } else {
          console.warn('⚠️ No session found after OAuth callback');
          setStatus('error');
          setErrorMessage('Authentication session not found');
          toast.error('Failed to establish session');
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        }

      } catch (error) {
        console.error('❌ OAuth callback processing error:', error);
        setStatus('error');
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(errorMsg);
        toast.error(`Authentication error: ${errorMsg}`);
        
        // Redirect to login after error
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [navigate]);

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
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <CheckCircle className="w-12 h-12" style={{ color: 'var(--color-accent-green)' }} />
              </div>
              <h2 className="text-xl font-semibold mb-2">Authentication Successful</h2>
              <p className="text-muted">Redirecting you to the dashboard...</p>
            </>
          )}
          
          {status === 'error' && (
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