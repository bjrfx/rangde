import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, CalendarDays, BarChart3, LogOut, Menu, X, ChefHat, Users, MessageSquare, Sparkles, Mail, Settings, Megaphone } from 'lucide-react';

const sidebarLinks = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Menu Management', path: '/admin/menu', icon: UtensilsCrossed },
  { name: 'Homepage Content', path: '/admin/homepage', icon: Sparkles },
  { name: 'Reservations', path: '/admin/reservations', icon: CalendarDays },
  { name: 'Reservation Settings', path: '/admin/reservation-settings', icon: Settings },
  { name: 'Catering', path: '/admin/catering', icon: Users },
  { name: 'Contact', path: '/admin/contact', icon: MessageSquare },
  { name: 'Email Settings', path: '/admin/notifications', icon: Mail },
  { name: 'Hiring Banner', path: '/admin/hiring', icon: Megaphone },
  { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
];

export default function AdminLayout({ children, admin, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-950 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
            <Link to="/admin" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                <ChefHat size={20} className="text-black" />
              </div>
              <div>
                <h1 className="text-neutral-900 dark:text-white font-semibold text-sm">RangDe Admin</h1>
                <p className="text-neutral-400 dark:text-neutral-500 text-xs">Restaurant Group</p>
              </div>
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 p-4 space-y-1">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">
                    {admin?.name?.charAt(0) || 'A'}
                  </span>
                </div>
                <div>
                  <p className="text-neutral-900 dark:text-white text-xs font-medium">{admin?.name || 'Admin'}</p>
                  <p className="text-neutral-400 dark:text-neutral-500 text-[10px]">{admin?.role || 'super_admin'}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between px-6 h-16">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-neutral-400 dark:text-neutral-500 hover:text-amber-600 dark:hover:text-amber-400 text-xs transition-colors">
                ← View Website
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
