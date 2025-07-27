import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

export function ProtectedRoute({ children, requireProfile = false }: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    // Save the attempted location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireProfile && !userProfile) {
    // User is authenticated but profile is not set up
    return <Navigate to="/profile/setup" replace />;
  }

  return <>{children}</>;
}