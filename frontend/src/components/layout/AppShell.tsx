import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Headset,
  LayoutDashboard,
  LogOut,
  Menu,
  Phone,
  PhoneCall,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button } from '../ui';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/calls', label: 'Calls', icon: PhoneCall },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/agents', label: 'Agents', icon: Headset },
];

export function AppShell() {
  const { user, isDemoMode, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    const wasDemo = isDemoMode;
    logout();
    navigate(wasDemo ? '/' : '/login', { replace: true });
  };

  const renderNavLinks = () => (
    <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary Navigation">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMobileMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Phone className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">CallFlow</p>
            <p className="text-xs text-slate-500">Operations Console</p>
          </div>
        </div>

        {renderNavLinks()}

        <div className="border-t border-slate-200 p-4">
          {user && (
            <div className="mb-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
                <Badge tone="info">{user.role}</Badge>
              </div>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          )}
          <Button variant="secondary" className="w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile header & drawer */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Phone className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-slate-900">CallFlow</span>
          </div>
          <Button
            variant="ghost"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white lg:hidden">
            {renderNavLinks()}
            <div className="border-t border-slate-100 px-4 py-3">
              {user && (
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <Badge tone="info">{user.role}</Badge>
                </div>
              )}
              <Button variant="secondary" className="w-full" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {isDemoMode && (
            <div
              role="status"
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-2.5 text-xs text-brand-900 sm:text-sm"
            >
              <div className="flex items-center gap-2">
                <Badge tone="info">DEMO SANDBOX</Badge>
                <span>
                  Running with in-memory sample data—create calls, update statuses, and add notes
                  for this session.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="font-semibold text-brand-700 underline-offset-2 hover:underline"
              >
                Exit Demo
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
