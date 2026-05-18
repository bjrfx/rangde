import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, UtensilsCrossed, Users, TrendingUp, Clock, ArrowUpRight, BarChart3, MapPin, Mail } from 'lucide-react';
import api from '../../api';

const statCards = [
  { key: 'totalReservations', label: 'Total Reservations', icon: CalendarDays, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'confirmedReservations', label: 'Confirmed', icon: Users, color: 'text-green-500 dark:text-green-400', bg: 'bg-green-500/10' },
  { key: 'todayReservations', label: "Today's Reservations", icon: Clock, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'totalMenuItems', label: 'Menu Items', icon: UtensilsCrossed, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500/10' },
];

export default function AdminDashboard({ token }) {
  const [analytics, setAnalytics] = useState(null);
  const [recentReservations, setRecentReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [analyticsData, reservations] = await Promise.all([api.getAnalytics(), api.getReservations()]);
        setAnalytics(analyticsData);
        setRecentReservations((reservations || []).slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6"><div className="skeleton h-4 w-1/2 mb-2" /><div className="skeleton h-8 w-1/3" /></div>)}
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
          <div className="skeleton h-6 w-1/4 mb-4" />
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 w-full mb-2" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard</h1><p className="text-neutral-500 text-sm mt-1">Welcome back. Here's an overview of your restaurant group.</p></div>
      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between mb-4"><div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}><Icon size={20} className={stat.color} /></div></div>
              <div className="text-3xl font-bold text-neutral-900 dark:text-white">{analytics?.[stat.key] ?? 0}</div>
              <div className="text-neutral-500 text-sm mt-1">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Reservations */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-neutral-900 dark:text-white font-semibold">Recent Reservations</h2>
            <Link to="/admin/reservations" className="text-amber-500 dark:text-amber-400 text-sm hover:underline flex items-center gap-1">View All <ArrowUpRight size={14} /></Link>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {recentReservations.length === 0 ? (
              <div className="p-6 text-center text-neutral-500 text-sm">No reservations yet</div>
            ) : recentReservations.map((res) => (
              <div key={res.id} className="px-6 py-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center"><span className="text-amber-500 dark:text-amber-400 font-bold text-sm">{res.name?.charAt(0)}</span></div>
                  <div><p className="text-neutral-900 dark:text-white text-sm font-medium">{res.name}</p><p className="text-neutral-500 text-xs">{res.date} at {res.time} · {res.persons} guests</p></div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${res.status === 'confirmed' ? 'status-confirmed' : res.status === 'pending' ? 'status-pending' : res.status === 'cancelled' ? 'status-cancelled' : res.status === 'completed' ? 'status-completed' : 'status-no_show'}`}>{res.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Branch Performance */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-neutral-900 dark:text-white font-semibold">Branch Activity</h2>
            <Link to="/admin/analytics" className="text-amber-500 dark:text-amber-400 text-sm hover:underline flex items-center gap-1">Analytics <ArrowUpRight size={14} /></Link>
          </div>
          <div className="p-6 space-y-4">
            {analytics?.branchStats?.map((branch, i) => {
              const maxCount = Math.max(...(analytics.branchStats.map(b => b.count) || [1]));
              const pct = maxCount > 0 ? (branch.count / maxCount) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1"><span className="text-neutral-600 dark:text-neutral-300 truncate mr-2">{branch.name}</span><span className="text-amber-500 dark:text-amber-400 font-medium">{branch.count}</span></div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full" /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Manage Menu', path: '/admin/menu', icon: UtensilsCrossed, desc: 'Add, edit, delete items' },
          { label: 'Homepage Content', path: '/admin/homepage', icon: TrendingUp, desc: 'Featured dishes & testimonials' },
          { label: 'Reservations', path: '/admin/reservations', icon: CalendarDays, desc: 'View & manage bookings' },
          { label: 'Catering', path: '/admin/catering', icon: Users, desc: 'Manage catering requests' },
          { label: 'Contact', path: '/admin/contact', icon: MapPin, desc: 'Manage contact inquiries' },
          { label: 'Email Settings', path: '/admin/notifications', icon: Mail, desc: 'Set notification recipients' },
          { label: 'Analytics', path: '/admin/analytics', icon: BarChart3, desc: 'Performance insights' },
          { label: 'View Website', path: '/', icon: ArrowUpRight, desc: 'See public website' },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} to={action.path} className="bg-white/80 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 hover:border-amber-500/30 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-all group shadow-sm dark:shadow-none">
              <Icon size={20} className="text-amber-500 dark:text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-neutral-900 dark:text-white font-medium text-sm">{action.label}</h3>
              <p className="text-neutral-500 text-xs mt-1">{action.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Revenue Estimate */}
      {analytics?.revenueEstimate && (
        <div className="bg-gradient-to-r from-amber-100/50 dark:from-amber-900/20 via-white dark:via-neutral-900 to-amber-100/50 dark:to-amber-900/20 border border-amber-500/10 rounded-xl p-8 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3 mb-6"><TrendingUp size={24} className="text-amber-500 dark:text-amber-400" /><h2 className="text-neutral-900 dark:text-white font-semibold text-lg">Revenue Estimate</h2></div>
          <div className="grid sm:grid-cols-4 gap-6">
            <div><p className="text-neutral-500 text-xs uppercase tracking-wider">Avg. Spend/Guest</p><p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">${analytics.revenueEstimate.avgSpendPerGuest}</p></div>
            <div><p className="text-neutral-500 text-xs uppercase tracking-wider">Total Guests</p><p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{analytics.revenueEstimate.totalGuests}</p></div>
            <div><p className="text-neutral-500 text-xs uppercase tracking-wider">Est. Revenue</p><p className="text-2xl font-bold text-amber-500 dark:text-amber-400 mt-1">${analytics.revenueEstimate.estimatedRevenue.toLocaleString()}</p></div>
            <div><p className="text-neutral-500 text-xs uppercase tracking-wider">Monthly Growth</p><p className="text-2xl font-bold text-green-500 dark:text-green-400 mt-1">+{analytics.revenueEstimate.monthlyGrowth}%</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
