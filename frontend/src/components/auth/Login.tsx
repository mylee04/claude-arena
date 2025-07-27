import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Trophy } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      setLoading(true);
      setLoadingProvider(provider);
      console.log('Starting OAuth login with:', provider);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      console.log('OAuth response:', { data, error });
      
      if (error) {
        console.error('OAuth error details:', error);
        throw error;
      }
    } catch (error) {
      console.error('OAuth login error:', error);
      toast.error(`Failed to login with ${provider}`);
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--color-accent-blue), var(--color-accent-purple))' }}>
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Claude Arena</h1>
          <p className="text-muted">Join the leaderboard and compete with other Claude Code enthusiasts</p>
        </div>

        <div className="glass rounded-xl p-8">
          <div className="space-y-4">
            {/* Google Login */}
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 glass rounded-lg transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ borderColor: loadingProvider === 'google' ? 'var(--color-accent-blue)' : 'var(--color-border)' }}
            >
              {loadingProvider === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="font-medium">Continue with Google</span>
                </>
              )}
            </button>

            {/* GitHub Login */}
            <button
              onClick={() => handleOAuthLogin('github')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 glass rounded-lg transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ 
                backgroundColor: 'rgba(24, 24, 27, 0.8)',
                borderColor: loadingProvider === 'github' ? 'var(--color-accent-purple)' : 'var(--color-border)'
              }}
            >
              {loadingProvider === 'github' ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <>
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span className="font-medium text-white">Continue with GitHub</span>
                </>
              )}
            </button>

          </div>

        </div>

        <div className="mt-8 text-center text-xs text-muted">
          By signing in, you agree to our{" "}
          <a href="#" className="hover:underline" style={{ color: 'var(--color-accent-blue)' }}>
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="hover:underline" style={{ color: 'var(--color-accent-blue)' }}>
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}