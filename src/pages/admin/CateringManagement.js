import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Trash2, Loader2 } from 'lucide-react';
import api from '../../api';

const statusOptions = ['new', 'contacted', 'quoted', 'confirmed', 'completed', 'cancelled'];

function statusClass(status) {
  if (status === 'confirmed' || status === 'completed') return 'status-confirmed';
  if (status === 'cancelled') return 'status-cancelled';
  if (status === 'quoted' || status === 'contacted') return 'status-pending';
  return 'status-pending';
}

export default function AdminCateringManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getCateringRequests();
        setRequests(data || []);
        if (selected?.id) {
          const refreshed = (data || []).find((row) => row.id === selected.id);
          if (refreshed) setSelected(refreshed);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [selected?.id]);

  const filtered = requests.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(item.name || '').toLowerCase().includes(q)
      || String(item.email || '').toLowerCase().includes(q)
      || String(item.phone || '').toLowerCase().includes(q)
      || String(item.event_type || '').toLowerCase().includes(q)
    );
  });

  const updateStatus = async (id, status) => {
    setSavingId(id);
    try {
      const updated = await api.updateCateringRequest(id, { status });
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      if (selected?.id === id) setSelected((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const removeRequest = async (id) => {
    if (!window.confirm('Delete this catering request?')) return;
    try {
      await api.deleteCateringRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="skeleton h-56 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Catering Requests</h1>
        <p className="text-neutral-500 text-sm mt-1">View and manage catering submissions</p>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone..."
          className="input-dark !pl-10"
        />
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left text-neutral-500 text-xs uppercase tracking-wider px-6 py-4">Name</th>
                <th className="text-left text-neutral-500 text-xs uppercase tracking-wider px-6 py-4">Event</th>
                <th className="text-left text-neutral-500 text-xs uppercase tracking-wider px-6 py-4 hidden md:table-cell">Guests</th>
                <th className="text-left text-neutral-500 text-xs uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-right text-neutral-500 text-xs uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 cursor-pointer" onClick={() => setSelected(item)}>
                  <td className="px-6 py-4">
                    <p className="text-neutral-900 dark:text-white text-sm font-medium">{item.name}</p>
                    <p className="text-neutral-500 text-xs">{item.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-neutral-900 dark:text-white text-sm">{item.event_date || '—'}</p>
                    <p className="text-neutral-500 text-xs">{item.event_type || '—'}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-neutral-600 dark:text-neutral-300 text-sm">{item.guests || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusClass(item.status)}`}>{item.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => removeRequest(item.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">No catering requests found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 max-w-lg w-full shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Catering Details</h2>
                <button onClick={() => setSelected(null)} className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-neutral-500">Name</span><span className="text-neutral-900 dark:text-white">{selected.name}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Email</span><span className="text-neutral-900 dark:text-white">{selected.email}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Phone</span><span className="text-neutral-900 dark:text-white">{selected.phone || '—'}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Event Date</span><span className="text-neutral-900 dark:text-white">{selected.event_date || '—'}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Guests</span><span className="text-neutral-900 dark:text-white">{selected.guests || '—'}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Location</span><span className="text-neutral-900 dark:text-white">{selected.event_location || '—'}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Status</span><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusClass(selected.status)}`}>{selected.status}</span></div>
                <div>
                  <span className="text-neutral-500 block mb-1">Notes</span>
                  <p className="text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">{selected.notes || '—'}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(selected.id, status)}
                    disabled={savingId === selected.id || selected.status === status}
                    className="px-3 py-2 rounded-lg text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-50"
                  >
                    {savingId === selected.id && selected.status !== status ? <Loader2 size={14} className="animate-spin" /> : status}
                  </button>
                ))}
                <button onClick={() => removeRequest(selected.id)} className="ml-auto px-3 py-2 rounded-lg text-xs bg-red-500/10 text-red-500">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
