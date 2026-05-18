import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, CalendarDays, Users, MapPin, Check, X, Clock, Loader2 } from 'lucide-react';
import api from '../../api';

const statusConfig = {
  pending: { label: 'Pending', class: 'status-pending', actions: ['confirmed', 'cancelled'] },
  confirmed: { label: 'Confirmed', class: 'status-confirmed', actions: ['completed', 'no_show', 'cancelled'] },
  completed: { label: 'Completed', class: 'status-completed', actions: [] },
  cancelled: { label: 'Cancelled', class: 'status-cancelled', actions: ['pending'] },
  no_show: { label: 'No Show', class: 'status-no_show', actions: [] },
};

export default function AdminReservationManagement({ token }) {
  const [reservations, setReservations] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRes, setSelectedRes] = useState(null);
  const [updating, setUpdating] = useState(false);

  const loadData = async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    try {
      const [resData, restData] = await Promise.all([api.getReservations(), api.getRestaurants()]);
      setReservations(resData);
      setRestaurants(restData);
      if (selectedRes?.id) {
        const refreshed = (resData || []).find((row) => row.id === selectedRes.id);
        if (refreshed) setSelectedRes(refreshed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadData({ showLoader: true });
    const interval = setInterval(() => loadData(), 8000);
    return () => clearInterval(interval);
  }, [selectedRes?.id]);
  const updateStatus = async (id, status) => { setUpdating(true); try { await api.updateReservation(id, { status }); setReservations(reservations.map(r => r.id === id ? { ...r, status } : r)); if (selectedRes?.id === id) setSelectedRes({ ...selectedRes, status }); } catch (err) { console.error(err); } setUpdating(false); };
  const deleteReservation = async (id) => { try { await api.deleteReservation(id); setReservations(reservations.filter(r => r.id !== id)); setSelectedRes(null); } catch (err) { console.error(err); } };
  const filtered = reservations.filter(r => { if (filterBranch && r.restaurant_id !== parseInt(filterBranch)) return false; if (filterStatus && r.status !== filterStatus) return false; if (filterDate && r.date !== filterDate) return false; if (search && !r.name?.toLowerCase().includes(search.toLowerCase()) && !r.email?.toLowerCase().includes(search.toLowerCase()) && !r.confirmation_code?.toLowerCase().includes(search.toLowerCase())) return false; return true; });
  const stats = { total: reservations.length, pending: reservations.filter(r => r.status === 'pending').length, confirmed: reservations.filter(r => r.status === 'confirmed').length, today: reservations.filter(r => r.date === new Date().toISOString().split('T')[0]).length };

  if (loading) return <div className="space-y-6"><div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div><div className="skeleton h-12 w-full rounded-xl" />{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 w-full rounded" />)}</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Reservations</h1><p className="text-neutral-500 text-sm mt-1">Manage reservations across all branches</p></div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Total', value: stats.total, icon: CalendarDays, color: 'text-blue-500 dark:text-blue-400 bg-blue-500/10' }, { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-500 dark:text-yellow-400 bg-yellow-500/10' }, { label: 'Confirmed', value: stats.confirmed, icon: Check, color: 'text-green-500 dark:text-green-400 bg-green-500/10' }, { label: 'Today', value: stats.today, icon: CalendarDays, color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10' }].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm dark:shadow-none">
              <div className={`w-8 h-8 ${s.color.split(' ')[2]} rounded-lg flex items-center justify-center mb-2`}><Icon size={16} className={s.color.split(' ')[0] + ' ' + s.color.split(' ')[1]} /></div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{s.value}</p><p className="text-neutral-500 text-xs">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" /><input type="text" placeholder="Search name, email, or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-dark !pl-10" /></div>
        <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="select-dark md:w-48"><option value="">All Branches</option>{restaurants.map(r => <option key={r.id} value={r.id}>{r.name || r.brand}</option>)}</select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="select-dark md:w-40"><option value="">All Status</option>{Object.entries(statusConfig).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}</select>
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="input-dark md:w-44" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-neutral-200 dark:border-neutral-800">
              <th className="text-left text-neutral-500 text-xs font-medium uppercase tracking-wider px-6 py-4">Guest</th>
              <th className="text-left text-neutral-500 text-xs font-medium uppercase tracking-wider px-6 py-4 hidden md:table-cell">Branch</th>
              <th className="text-left text-neutral-500 text-xs font-medium uppercase tracking-wider px-6 py-4">Date & Time</th>
              <th className="text-left text-neutral-500 text-xs font-medium uppercase tracking-wider px-6 py-4 hidden lg:table-cell">Guests</th>
              <th className="text-left text-neutral-500 text-xs font-medium uppercase tracking-wider px-6 py-4">Status</th>
              <th className="text-right text-neutral-500 text-xs font-medium uppercase tracking-wider px-6 py-4">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {filtered.map((res) => {
                const config = statusConfig[res.status] || statusConfig.pending;
                return (
                  <tr key={res.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer" onClick={() => setSelectedRes(res)}>
                    <td className="px-6 py-4"><div><p className="text-neutral-900 dark:text-white text-sm font-medium">{res.name}</p><p className="text-neutral-500 text-xs">{res.email}</p></div></td>
                    <td className="px-6 py-4 hidden md:table-cell"><span className="text-neutral-600 dark:text-neutral-400 text-sm">{res.restaurant_name || restaurants.find(r => r.id === res.restaurant_id)?.name?.replace('Masakali Indian Cuisine – ', '').replace('RangDe Indian Cuisine', 'RangDe') || '—'}</span></td>
                    <td className="px-6 py-4"><p className="text-neutral-900 dark:text-white text-sm">{res.date}</p><p className="text-neutral-500 text-xs">{res.time}</p></td>
                    <td className="px-6 py-4 hidden lg:table-cell"><span className="text-neutral-600 dark:text-neutral-300 text-sm">{res.persons}</span></td>
                    <td className="px-6 py-4"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.class}`}>{config.label}</span></td>
                    <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>{config.actions.slice(0, 2).map(action => (<button key={action} onClick={() => updateStatus(res.id, action)} className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${action === 'confirmed' ? 'bg-green-500/10 text-green-500 dark:text-green-400 hover:bg-green-500/20' : action === 'cancelled' ? 'bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20' : action === 'completed' ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400 hover:bg-blue-500/20' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>{action}</button>))}</div></td>
                  </tr>);
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-500">No reservations found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>{selectedRes && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" onClick={() => setSelectedRes(null)}>
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 max-w-md w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-neutral-900 dark:text-white">Reservation Details</h2><button onClick={() => setSelectedRes(null)} className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"><X size={20} /></button></div>
            <div className="space-y-4">
              <div className="flex justify-between"><span className="text-neutral-500 text-sm">Code</span><span className="text-amber-500 dark:text-amber-400 font-bold">{selectedRes.confirmation_code}</span></div>
              {[['Name', selectedRes.name], ['Email', selectedRes.email], ['Phone', selectedRes.phone], ['Branch', restaurants.find(r => r.id === selectedRes.restaurant_id)?.name || '—'], ['Date', selectedRes.date], ['Time', selectedRes.time], ['Guests', selectedRes.persons]].map(([l, v]) => <div key={l} className="flex justify-between"><span className="text-neutral-500 text-sm">{l}</span><span className="text-neutral-900 dark:text-white text-sm">{v}</span></div>)}
              <div className="flex justify-between"><span className="text-neutral-500 text-sm">Status</span><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[selectedRes.status]?.class || ''}`}>{statusConfig[selectedRes.status]?.label || selectedRes.status}</span></div>
              {selectedRes.special_requests && <div><span className="text-neutral-500 text-sm block mb-1">Special Requests</span><p className="text-neutral-600 dark:text-neutral-300 text-sm bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">{selectedRes.special_requests}</p></div>}
            </div>
            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              {statusConfig[selectedRes.status]?.actions.map(action => (<button key={action} onClick={() => updateStatus(selectedRes.id, action)} disabled={updating} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${action === 'confirmed' ? 'bg-green-500/10 text-green-500 dark:text-green-400 hover:bg-green-500/20' : action === 'cancelled' ? 'bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20' : action === 'completed' ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400 hover:bg-blue-500/20' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>{action}</button>))}
              <button onClick={() => { if (window.confirm('Delete this reservation?')) deleteReservation(selectedRes.id); }} className="px-4 py-2 bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition-all ml-auto">Delete</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}
