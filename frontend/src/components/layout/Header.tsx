import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy, User, Users, Info, BarChart3, LogOut, Settings, ChevronDown } from 'lucide-react';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/leaderboards', label: 'Leaderboards', icon: Trophy },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/teams', label: 'Teams', icon: Users },
    { path: '/about', label: 'About', icon: Info },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b glass-header" style={{ borderColor: 'var(--color-border)' }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--color-accent-blue), var(--color-accent-purple))' }}>
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold">Claude Arena</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${active 
                      ? 'active-nav-item' 
                      : 'text-muted hover:text-gray-900 dark:hover:text-gray-100 nav-item'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            {user && (
              <button className="btn-secondary text-sm">
                Import Data
              </button>
            )}
            
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:scale-[1.02] transition-all duration-200"
                >
                  {userProfile?.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.username}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full p-0.5" style={{ background: 'linear-gradient(to bottom right, var(--color-accent-blue), var(--color-accent-purple))' }}>
                      <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
                        <User className="w-4 h-4 text-muted" />
                      </div>
                    </div>
                  )}
                  <span className="text-sm font-medium hidden md:block">
                    {userProfile?.username || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-lg glass shadow-lg z-50 py-2">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="w-4 h-4 text-muted" />
                        <span>View Profile</span>
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="w-4 h-4 text-muted" />
                        <span>Settings</span>
                      </Link>
                      <div className="border-t my-2" style={{ borderColor: 'var(--color-border)' }} />
                      <button
                        onClick={async () => {
                          setShowUserMenu(false);
                          await signOut();
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/5 transition-colors w-full text-left"
                      >
                        <LogOut className="w-4 h-4 text-muted" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-primary text-sm"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <nav className="md:hidden border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center gap-1 py-2 px-4 rounded-lg text-xs transition-all duration-200
                  ${active 
                    ? 'active' 
                    : 'text-muted'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

export default Header;