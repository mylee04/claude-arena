import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: 'var(--color-accent-blue)' }} />
          <p className="text-muted">Loading Claude Arena...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}