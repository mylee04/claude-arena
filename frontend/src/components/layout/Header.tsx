import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, User, Users, Info, BarChart3 } from 'lucide-react';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';

const Header: React.FC = () => {
  const location = useLocation();

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
            <button className="btn-secondary text-sm">
              Import Data
            </button>
            <div className="w-10 h-10 rounded-full p-0.5" style={{ background: 'linear-gradient(to bottom right, var(--color-accent-blue), var(--color-accent-purple))' }}>
              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
                <User className="w-5 h-5 text-muted" />
              </div>
            </div>
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