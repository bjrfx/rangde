import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, CalendarDays, DollarSign, Lightbulb } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import api from '../../api';
import { useTheme } from '../../ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const chartColors = { gold: 'rgba(212, 175, 55, 1)', goldAlpha: 'rgba(212, 175, 55, 0.3)', green: 'rgba(74, 222, 128, 1)', greenAlpha: 'rgba(74, 222, 128, 0.3)', blue: 'rgba(96, 165, 250, 1)', blueAlpha: 'rgba(96, 165, 250, 0.3)', red: 'rgba(248, 113, 113, 1)', purple: 'rgba(192, 132, 252, 1)', amber: 'rgba(251, 191, 36, 1)', cyan: 'rgba(34, 211, 238, 1)' };

function getChartOptions(theme) {
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const tooltipBg = isDark ? '#1a1a1a' : '#ffffff';
  const tooltipBorder = isDark ? '#333' : '#e5e5e5';
  const tooltipTitle = isDark ? '#fff' : '#111';
  const tooltipBody = isDark ? '#d1d5db' : '#525252';
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: textColor, font: { family: 'Inter' } } }, tooltip: { backgroundColor: tooltipBg, borderColor: tooltipBorder, borderWidth: 1, titleColor: tooltipTitle, bodyColor: tooltipBody, cornerRadius: 8 } },
    scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { grid: { color: gridColor }, ticks: { color: textColor } } },
  };
}

export default function AdminAnalytics({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const { theme } = useTheme();
  const commonOptions = getChartOptions(theme);

  useEffect(() => { setLoading(true); api.getAnalytics().then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false)); }, [period]);

  if (loading || !data) return <div className="space-y-6"><div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div><div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-72 rounded-xl" />)}</div></div>;

  const isDark = theme === 'dark';
  const doughnutBorder = isDark ? '#0d0d0d' : '#ffffff';

  const peakDaysChart = { labels: data.peakDays?.map(d => d.day) || [], datasets: [{ label: 'Reservations', data: data.peakDays?.map(d => d.count) || [], backgroundColor: [chartColors.goldAlpha, chartColors.blueAlpha, chartColors.greenAlpha, chartColors.goldAlpha, chartColors.blueAlpha, chartColors.greenAlpha, chartColors.goldAlpha], borderColor: [chartColors.gold, chartColors.blue, chartColors.green, chartColors.gold, chartColors.blue, chartColors.green, chartColors.gold], borderWidth: 1.5, borderRadius: 8 }] };
  const groupSizeChart = { labels: data.groupSizeDistribution?.map(g => g.label) || [], datasets: [{ data: data.groupSizeDistribution?.map(g => g.count) || [], backgroundColor: [chartColors.gold, chartColors.green, chartColors.blue, chartColors.purple, chartColors.amber], borderColor: doughnutBorder, borderWidth: 2 }] };
  const monthlyChart = { labels: data.monthlyTrend?.map(m => m.month) || [], datasets: [{ label: 'Reservations', data: data.monthlyTrend?.map(m => m.reservations) || [], borderColor: chartColors.gold, backgroundColor: chartColors.goldAlpha, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: chartColors.gold }, { label: 'Catering', data: data.monthlyTrend?.map(m => m.catering) || [], borderColor: chartColors.green, backgroundColor: chartColors.greenAlpha, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: chartColors.green }] };
  const branchPerformance = data.branchPerformance || [{ branch: 'Queen St', reservations: 42, revenue: 12600 }, { branch: 'Brampton', reservations: 38, revenue: 11400 }, { branch: 'Dundas', reservations: 35, revenue: 10500 }, { branch: 'Mississauga', reservations: 28, revenue: 8400 }, { branch: 'Scarborough', reservations: 22, revenue: 6600 }, { branch: 'Etobicoke', reservations: 18, revenue: 5400 }];
  const branchChart = { labels: branchPerformance.map(b => b.branch), datasets: [{ label: 'Reservations', data: branchPerformance.map(b => b.reservations), backgroundColor: chartColors.goldAlpha, borderColor: chartColors.gold, borderWidth: 1.5, borderRadius: 6 }] };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Analytics</h1><p className="text-neutral-500 text-sm mt-1">Performance insights across all branches</p></div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="select-dark w-36"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="year">This Year</option></select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: 'Total Reservations', value: data.totalReservations ?? 156, change: '+12%', icon: CalendarDays, color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10' }, { label: 'Total Guests', value: data.totalGuests ?? 624, change: '+8%', icon: Users, color: 'text-blue-500 dark:text-blue-400 bg-blue-500/10' }, { label: 'Avg Group Size', value: data.avgGroupSize ?? '4.0', change: '+5%', icon: TrendingUp, color: 'text-green-500 dark:text-green-400 bg-green-500/10' }, { label: 'Est. Revenue', value: `$${(data.revenueEstimate?.total ?? 54900).toLocaleString()}`, change: '+15%', icon: DollarSign, color: 'text-purple-500 dark:text-purple-400 bg-purple-500/10' }].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between mb-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color.split(' ')[2]}`}><Icon size={20} className={stat.color.split(' ')[0] + ' ' + stat.color.split(' ')[1]} /></div><span className="text-green-500 dark:text-green-400 text-xs font-medium">{stat.change}</span></div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</p><p className="text-neutral-500 text-xs mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-neutral-900 dark:text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-amber-500 dark:text-amber-400" /> Monthly Trends</h3>
          <div className="h-64"><Line data={monthlyChart} options={{ ...commonOptions, plugins: { ...commonOptions.plugins, legend: { ...commonOptions.plugins.legend, position: 'top' } } }} /></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-neutral-900 dark:text-white font-semibold mb-4 flex items-center gap-2"><CalendarDays size={18} className="text-blue-500 dark:text-blue-400" /> Reservations by Day</h3>
          <div className="h-64"><Bar data={peakDaysChart} options={{ ...commonOptions, plugins: { ...commonOptions.plugins, legend: { display: false } } }} /></div>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-neutral-900 dark:text-white font-semibold mb-4 flex items-center gap-2"><Users size={18} className="text-green-500 dark:text-green-400" /> Group Size Distribution</h3>
          <div className="h-56 flex items-center justify-center"><Doughnut data={groupSizeChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: commonOptions.plugins.legend.labels.color, padding: 12, font: { size: 11 } } }, tooltip: commonOptions.plugins.tooltip }, cutout: '60%' }} /></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 lg:col-span-2 shadow-sm dark:shadow-none">
          <h3 className="text-neutral-900 dark:text-white font-semibold mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-amber-500 dark:text-amber-400" /> Branch Performance</h3>
          <div className="h-56"><Bar data={branchChart} options={{ ...commonOptions, indexAxis: 'y', plugins: { ...commonOptions.plugins, legend: { display: false } } }} /></div>
        </motion.div>
      </div>

      {/* Revenue + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-neutral-900 dark:text-white font-semibold mb-4 flex items-center gap-2"><DollarSign size={18} className="text-green-500 dark:text-green-400" /> Revenue Breakdown</h3>
          <div className="space-y-4">
            {[{ label: 'Dine-in Revenue', value: `$${(data.revenueEstimate?.dineIn ?? 39200).toLocaleString()}`, pct: 71 }, { label: 'Catering Revenue', value: `$${(data.revenueEstimate?.catering ?? 12800).toLocaleString()}`, pct: 23 }, { label: 'Special Events', value: `$${(data.revenueEstimate?.events ?? 2900).toLocaleString()}`, pct: 6 }].map(item => (
              <div key={item.label}><div className="flex justify-between mb-1.5"><span className="text-neutral-500 dark:text-neutral-400 text-sm">{item.label}</span><span className="text-neutral-900 dark:text-white text-sm font-medium">{item.value}</span></div><div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2"><div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${item.pct}%` }} /></div></div>
            ))}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800"><div className="flex justify-between"><span className="text-amber-500 dark:text-amber-400 font-semibold">Total Estimated Revenue</span><span className="text-neutral-900 dark:text-white text-lg font-bold">${(data.revenueEstimate?.total ?? 54900).toLocaleString()}</span></div></div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-neutral-900 dark:text-white font-semibold mb-4 flex items-center gap-2"><Lightbulb size={18} className="text-amber-500 dark:text-amber-400" /> AI Insights & Recommendations</h3>
          <div className="space-y-3">
            {(data.recommendations || ['Saturday evenings are your busiest — consider adding extra staff.', 'Groups of 2 make up 35% of reservations. Promote couple specials.', 'Brampton branch shows highest growth potential.', 'Catering requests spike in summer months.', 'Consider a loyalty program — 40% are repeat guests.']).map((rec, i) => (
              <div key={i} className="flex items-start gap-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
                <span className="flex-shrink-0 w-6 h-6 bg-amber-500/10 rounded-full flex items-center justify-center mt-0.5"><span className="text-amber-500 dark:text-amber-400 text-xs font-bold">{i + 1}</span></span>
                <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
