import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { CalendarDays, ChevronLeft, ChevronRight, Lock, Unlock, Save, Info } from 'lucide-react';
import api from '../../api';

const SITE_KEY = 'rangde';
const SITE_LOCATION_SLUGS = {
  california: ['california'],
  montreal: ['montreal'],
  rangde: ['rangde'],
  restobar: ['restobar'],
  ottawa: ['stittsville', 'wellington'],
};

function toDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeDayKey(value) {
  return String(value || '').slice(0, 10);
}

function monthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toDateInput(start), end: toDateInput(end) };
}

function buildCalendarGrid(viewDate) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function occupancyColor(pct) {
  if (pct >= 90) return 'bg-red-600/25 border-red-500/40';
  if (pct >= 60) return 'bg-amber-500/25 border-amber-500/40';
  if (pct >= 1) return 'bg-sky-500/20 border-sky-500/35';
  return 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800';
}

function InfoHint({ label, children }) {
  return (
    <span className="relative inline-flex items-center group">
      <button
        type="button"
        aria-label={label}
        title={label}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:border-neutral-500 transition-colors"
      >
        <Info size={10} />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-[130] mt-2 hidden -translate-x-1/2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-[11px] font-normal text-neutral-600 dark:text-neutral-300 shadow-xl w-72 group-hover:block group-focus-within:block">
        {children}
      </span>
    </span>
  );
}

export default function SmartCalendar() {
  const [viewDate, setViewDate] = useState(new Date());
  const [restaurants, setRestaurants] = useState([]);
  const [summaryMap, setSummaryMap] = useState(new Map());
  const [reservations, setReservations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [catering, setCatering] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [blockouts, setBlockouts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingCap, setSavingCap] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [tableDraft, setTableDraft] = useState({});
  const [hoveredDateKey, setHoveredDateKey] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast] = useState(null);
  const [rangeSelecting, setRangeSelecting] = useState(false);
  const [rangeStartKey, setRangeStartKey] = useState('');
  const [rangeEndKey, setRangeEndKey] = useState('');
  const [monthPanelOpen, setMonthPanelOpen] = useState(false);

  const { start, end } = useMemo(() => monthRange(viewDate), [viewDate]);
  const days = useMemo(() => buildCalendarGrid(viewDate), [viewDate]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [_summaryRes, reservationsRes, contactsRes, cateringRes, notifRes, capRes, blockRes, restaurantsRes] = await Promise.all([
        api.getCalendarSummary(start, end),
        api.getReservations(),
        api.getContactInquiries(),
        api.getCateringRequests(),
        api.getAdminNotifications({ limit: 20 }),
        api.getCapacitySettings(),
        api.getReservationBlockouts({ start, end }),
        api.getRestaurants(),
      ]);

      const map = new Map();
      const filteredRestaurants = (restaurantsRes || []).filter((r) => {
        const allowed = SITE_LOCATION_SLUGS[SITE_KEY] || [];
        return allowed.includes(String(r.slug || '').toLowerCase());
      });
      const allowedRestaurantIds = new Set(filteredRestaurants.map((r) => Number(r.id)));

      const filteredReservations = (reservationsRes || []).filter((r) => allowedRestaurantIds.has(Number(r.restaurant_id || 0)));
      const filteredContacts = (contactsRes || []).filter((c) => {
        const rid = Number(c.restaurant_id || 0);
        return rid === 0 || allowedRestaurantIds.has(rid);
      });
      const filteredCatering = (cateringRes || []).filter((c) => {
        const rid = Number(c.restaurant_id || 0);
        return rid === 0 || allowedRestaurantIds.has(rid);
      });

      setReservations(filteredReservations);
      setContacts(filteredContacts);
      setCatering(filteredCatering);
      setNotifications(notifRes?.notifications || []);
      setRestaurants(filteredRestaurants);
      const capRows = capRes?.settings || [];
      const filteredCapRows = capRows.filter((row) => allowedRestaurantIds.has(Number(row.restaurant_id || 0)));
      let activeCapacityRows = filteredCapRows;
      if (filteredCapRows.length) {
        setCapacity(filteredCapRows);
      } else {
        const seeds = filteredRestaurants.flatMap((r) => ([
          { restaurant_id: r.id, service_period: 'lunch', total_seats: 30, avg_duration_minutes: 75, is_active: 1 },
          { restaurant_id: r.id, service_period: 'dinner', total_seats: 45, avg_duration_minutes: 90, is_active: 1 },
        ]));
        setCapacity(seeds);
        activeCapacityRows = seeds;
      }
      setBlockouts((blockRes?.blockouts || []).filter((b) => allowedRestaurantIds.has(Number(b.restaurant_id || 0))));

      filteredReservations.forEach((r) => {
        const dateKey = normalizeDayKey(r.date);
        const item = map.get(dateKey) || { reservations: 0, contacts: 0, catering: 0, covers: 0, occupancy: 0 };
        item.reservations += 1;
        item.covers += Number(r.persons || 0);
        map.set(dateKey, item);
      });
      filteredContacts.forEach((c) => {
        const dateKey = normalizeDayKey(c.created_at);
        const item = map.get(dateKey) || { reservations: 0, contacts: 0, catering: 0, covers: 0, occupancy: 0 };
        item.contacts += 1;
        map.set(dateKey, item);
      });
      filteredCatering.forEach((c) => {
        const dateKey = normalizeDayKey(c.event_date);
        const item = map.get(dateKey) || { reservations: 0, contacts: 0, catering: 0, covers: 0, occupancy: 0 };
        item.catering += 1;
        map.set(dateKey, item);
      });

      const capacityIndex = new Map();
      activeCapacityRows.forEach((row) => {
        const rid = Number(row.restaurant_id || 0);
        const period = String(row.service_period || 'dinner');
        if (!capacityIndex.has(rid)) capacityIndex.set(rid, { lunch: 0, dinner: 0 });
        if (Number(row.is_active) === 1) {
          capacityIndex.get(rid)[period] = Number(row.total_seats || 0);
        }
      });

      filteredReservations.forEach((r) => {
        const dateKey = normalizeDayKey(r.date);
        const hour = parseInt(String(r.time || '00:00').slice(0, 2), 10);
        const period = Number.isFinite(hour) && hour < 16 ? 'lunch' : 'dinner';
        const restCap = capacityIndex.get(Number(r.restaurant_id || 0)) || { lunch: 0, dinner: 0 };
        const dayCap = Number(restCap[period] || 0);
        const item = map.get(dateKey) || { reservations: 0, contacts: 0, catering: 0, covers: 0, occupancy: 0 };
        if (dayCap > 0) {
          const occ = (Number(item.covers || 0) / dayCap) * 100;
          item.occupancy = Math.min(100, Math.max(Number(item.occupancy || 0), occ));
        }
        map.set(dateKey, item);
      });

      setSummaryMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [start, end]);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.emit('admin:join', {});
    const onLive = async () => {
      await loadAll();
    };
    socket.on('reservation.created', onLive);
    socket.on('contact.created', onLive);
    socket.on('catering.created', onLive);
    socket.on('admin.notification.created', onLive);
    socket.on('reservation.updated', onLive);
    return () => {
      socket.off('reservation.created', onLive);
      socket.off('contact.created', onLive);
      socket.off('catering.created', onLive);
      socket.off('admin.notification.created', onLive);
      socket.off('reservation.updated', onLive);
      socket.close();
    };
  }, [start, end]);

  const runReservationAction = async (reservationId, action, extra = {}) => {
    const loadingKey = `${reservationId}:${action}`;
    setActionLoading((prev) => ({ ...prev, [loadingKey]: true }));
    const prevReservations = reservations;
    const optimistic = reservations.map((r) => {
      if (Number(r.id) !== Number(reservationId)) return r;
      if (action === 'confirm') return { ...r, status: 'confirmed' };
      if (action === 'cancel') return { ...r, status: 'cancelled' };
      if (action === 'seat') return { ...r, status: 'completed', seated_at: new Date().toISOString() };
      if (action === 'mark_vip') return { ...r, is_vip: 1 };
      if (action === 'unmark_vip') return { ...r, is_vip: 0 };
      if (action === 'assign_table') return { ...r, table_assigned: extra.table_label || null };
      return r;
    });
    setReservations(optimistic);
    try {
      await api.reservationAction(reservationId, action, extra);
      await loadAll();
      setToast({ type: 'success', message: `Action "${action.replace('_', ' ')}" completed.` });
    } catch (err) {
      console.error(err);
      setReservations(prevReservations);
      setToast({ type: 'error', message: err.message || 'Action failed' });
    } finally {
      setActionLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectedDateData = useMemo(() => {
    if (!selectedDate) return null;
    const date = toDateInput(selectedDate);
    const dayReservations = reservations.filter((r) => normalizeDayKey(r.date) === date);
    const dayContacts = contacts.filter((c) => normalizeDayKey(c.created_at) === date);
    const dayCatering = catering.filter((c) => normalizeDayKey(c.event_date) === date);
    const lunch = dayReservations.filter((r) => Number(String(r.time || '00:00').slice(0, 2)) < 16);
    const dinner = dayReservations.filter((r) => Number(String(r.time || '00:00').slice(0, 2)) >= 16);
    return { date, dayReservations, dayContacts, dayCatering, lunch, dinner };
  }, [selectedDate, reservations, contacts, catering]);

  const saveCapacity = async () => {
    setSavingCap(true);
    try {
      await api.updateCapacitySettings(capacity);
      await loadAll();
    } finally {
      setSavingCap(false);
    }
  };

  const toggleBlockSelectedDay = async () => {
    if (!selectedDateData) return;
    const date = selectedDateData.date;
    const existing = blockouts.find((b) => b.block_date === date && b.service_period === 'all_day' && Number(b.is_active) === 1);
    if (existing) {
      await api.deleteReservationBlockout(existing.id);
    } else {
      await api.createReservationBlockouts({
        restaurant_id: 1,
        start_date: date,
        end_date: date,
        service_period: 'all_day',
        reason: blockReason || 'Blocked by admin',
      });
    }
    await loadAll();
  };

  const selectedRangeDates = useMemo(() => {
    if (!rangeStartKey || !rangeEndKey) return [];
    const startKey = rangeStartKey <= rangeEndKey ? rangeStartKey : rangeEndKey;
    const endKey = rangeStartKey <= rangeEndKey ? rangeEndKey : rangeStartKey;
    return days
      .map((d) => toDateInput(d))
      .filter((key) => key >= startKey && key <= endKey);
  }, [rangeStartKey, rangeEndKey, days]);
  const monthKpis = useMemo(() => {
    const vals = Array.from(summaryMap.values());
    const totals = vals.reduce((acc, item) => {
      acc.reservations += Number(item.reservations || 0);
      acc.contacts += Number(item.contacts || 0);
      acc.catering += Number(item.catering || 0);
      acc.covers += Number(item.covers || 0);
      acc.maxOcc = Math.max(acc.maxOcc, Number(item.occupancy || 0));
      return acc;
    }, { reservations: 0, contacts: 0, catering: 0, covers: 0, maxOcc: 0 });
    const busiest = [...summaryMap.entries()]
      .sort((a, b) => Number(b[1]?.reservations || 0) - Number(a[1]?.reservations || 0))[0];
    return {
      ...totals,
      busiestDate: busiest ? normalizeDayKey(busiest[0]) : '-',
      busiestReservations: busiest ? Number(busiest[1]?.reservations || 0) : 0,
    };
  }, [summaryMap]);
  const monthInsights = useMemo(() => {
    const monthlyReservations = reservations.filter((r) => {
      const d = normalizeDayKey(r.date);
      return d >= start && d <= end;
    });
    const total = monthlyReservations.length;
    const cancelled = monthlyReservations.filter((r) => String(r.status || '').toLowerCase() === 'cancelled').length;
    const completed = monthlyReservations.filter((r) => String(r.status || '').toLowerCase() === 'completed').length;
    const confirmed = monthlyReservations.filter((r) => String(r.status || '').toLowerCase() === 'confirmed').length;
    const largeParties = monthlyReservations.filter((r) => Number(r.persons || 0) >= 6).length;
    const vipCount = monthlyReservations.filter((r) => Number(r.is_vip || 0) === 1).length;

    const byHour = {};
    monthlyReservations.forEach((r) => {
      const h = String(r.time || '00:00').slice(0, 2);
      byHour[h] = (byHour[h] || 0) + 1;
    });
    const peakTime = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];

    const byWeek = new Map();
    monthlyReservations.forEach((r) => {
      const dt = new Date(`${normalizeDayKey(r.date)}T00:00:00`);
      const weekKey = `${dt.getFullYear()}-W${Math.ceil((dt.getDate() + new Date(dt.getFullYear(), dt.getMonth(), 1).getDay()) / 7)}`;
      byWeek.set(weekKey, (byWeek.get(weekKey) || 0) + 1);
    });
    const weeklyTrend = Array.from(byWeek.entries()).map(([week, count]) => ({ week, count }));
    const maxWeekly = Math.max(1, ...weeklyTrend.map((x) => x.count));

    const upcomingVip = monthlyReservations
      .filter((r) => Number(r.is_vip || 0) === 1 && normalizeDayKey(r.date) >= toDateInput(new Date()))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 5);

    return {
      total,
      cancelled,
      completed,
      confirmed,
      largeParties,
      vipCount,
      cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
      peakTime: peakTime ? `${peakTime[0]}:00` : '--:--',
      weeklyTrend,
      maxWeekly,
      upcomingVip,
    };
  }, [reservations, start, end]);
  const hoveredSummary = hoveredDateKey ? (summaryMap.get(hoveredDateKey) || { reservations: 0, contacts: 0, catering: 0, covers: 0, occupancy: 0 }) : null;
  const topPartiesForHovered = useMemo(() => {
    if (!hoveredDateKey) return [];
    return reservations
      .filter((r) => normalizeDayKey(r.date) === hoveredDateKey)
      .sort((a, b) => Number(b.persons || 0) - Number(a.persons || 0))
      .slice(0, 3);
  }, [hoveredDateKey, reservations]);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-4 right-4 z-[120] px-4 py-2 rounded-lg text-sm shadow-lg ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Smart Reservation Calendar</h1>
          <p className="text-neutral-500 text-sm mt-1">Live occupancy, blockouts, and request activity in one control center.</p>
        </div>
        <div />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
          <p className="text-[11px] text-neutral-500 inline-flex items-center gap-1">Month Reservations <InfoHint label="Month Reservations info">Total reservation entries in the currently selected month.</InfoHint></p>
          <p className="text-xl font-semibold">{monthKpis.reservations}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
          <p className="text-[11px] text-neutral-500 inline-flex items-center gap-1">Expected Covers <InfoHint label="Expected Covers info">Total expected guests (sum of party size) for reservations in this month.</InfoHint></p>
          <p className="text-xl font-semibold">{monthKpis.covers}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
          <p className="text-[11px] text-neutral-500 inline-flex items-center gap-1">Contact Requests <InfoHint label="Contact Requests info">Number of contact form submissions in this month.</InfoHint></p>
          <p className="text-xl font-semibold">{monthKpis.contacts}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
          <p className="text-[11px] text-neutral-500 inline-flex items-center gap-1">Catering Requests <InfoHint label="Catering Requests info">Number of catering form submissions in this month.</InfoHint></p>
          <p className="text-xl font-semibold">{monthKpis.catering}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
          <p className="text-[11px] text-neutral-500 inline-flex items-center gap-1">Peak Occupancy <InfoHint label="Peak Occupancy info">Highest occupancy reached by any day in this month based on covers vs configured capacity.</InfoHint></p>
          <p className="text-xl font-semibold">{Math.round(monthKpis.maxOcc)}%</p>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
          <p className="text-[11px] text-neutral-500 inline-flex items-center gap-1">Busiest Day <InfoHint label="Busiest Day info">Date with the highest reservation count in the selected month.</InfoHint></p>
          <p className="text-sm font-semibold">{monthKpis.busiestDate} ({monthKpis.busiestReservations})</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <p className="text-xs text-neutral-500">Peak Service Time</p>
          <p className="text-2xl font-semibold mt-1">{monthInsights.peakTime}</p>
          <p className="text-xs text-neutral-500 mt-1">Based on reservation times this month</p>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <p className="text-xs text-neutral-500">Cancellation Trend</p>
          <p className="text-2xl font-semibold mt-1">{monthInsights.cancellationRate}%</p>
          <p className="text-xs text-neutral-500 mt-1">{monthInsights.cancelled} cancelled of {monthInsights.total}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <p className="text-xs text-neutral-500">Large Parties</p>
          <p className="text-2xl font-semibold mt-1">{monthInsights.largeParties}</p>
          <p className="text-xs text-neutral-500 mt-1">Groups of 6+ guests</p>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <p className="text-xs text-neutral-500">VIP Reservations</p>
          <p className="text-2xl font-semibold mt-1">{monthInsights.vipCount}</p>
          <p className="text-xs text-neutral-500 mt-1">Flagged VIP in selected month</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-3 inline-flex items-center gap-1">
            Weekly Reservation Growth
            <InfoHint label="Weekly Reservation Growth info">
              Weekly reservation count trend for the selected month. Longer bars indicate more bookings in that week.
            </InfoHint>
          </p>
          <div className="space-y-2">
            {monthInsights.weeklyTrend.length ? monthInsights.weeklyTrend.map((w) => (
              <div key={w.week} className="flex items-center gap-2">
                <div className="w-20 text-[11px] text-neutral-500">{w.week}</div>
                <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${(w.count / monthInsights.maxWeekly) * 100}%` }} />
                </div>
                <div className="w-8 text-[11px] text-neutral-600 dark:text-neutral-300 text-right">{w.count}</div>
              </div>
            )) : <p className="text-xs text-neutral-500">No weekly data yet.</p>}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-3">Upcoming VIP Parties</p>
          <div className="space-y-2">
            {monthInsights.upcomingVip.length ? monthInsights.upcomingVip.map((r) => (
              <div key={r.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-2">
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">{r.name} · {r.persons}</p>
                <p className="text-[11px] text-neutral-500">{normalizeDayKey(r.date)} · {String(r.time || '').slice(0, 5)}</p>
              </div>
            )) : <p className="text-xs text-neutral-500">No upcoming VIP reservations.</p>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 relative z-[60]">
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-visible">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <button className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}><ChevronLeft size={18} /></button>
            <div className="inline-flex items-center gap-2">
              <button onClick={() => setMonthPanelOpen(true)} className="font-semibold text-neutral-900 dark:text-white px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
                {viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </button>
              <InfoHint label="Calendar legend info">
                Heatmap colors: light blue = low occupancy, amber = medium occupancy, red = high/full occupancy.{"\n"}
                R = Reservations, C = Contact requests, Cat = Catering requests, Occ = Occupancy percentage.
              </InfoHint>
            </div>
            <button className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 text-xs font-medium text-neutral-500 px-3 pt-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="px-2 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2 p-3">
            {days.map((d) => {
              const key = toDateInput(d);
              const info = summaryMap.get(key) || { reservations: 0, contacts: 0, catering: 0, occupancy: 0 };
              const isCurrentMonth = d.getMonth() === viewDate.getMonth();
              const isToday = key === toDateInput(new Date());
              const isBlocked = blockouts.some((b) => b.block_date === key && Number(b.is_active) === 1);
              const isInDragRange = selectedRangeDates.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => { setSelectedDate(d); setDrawerOpen(true); }}
                  onMouseEnter={() => setHoveredDateKey(key)}
                  onMouseLeave={() => setHoveredDateKey(null)}
                  onMouseDown={() => { setRangeSelecting(true); setRangeStartKey(key); setRangeEndKey(key); }}
                  onMouseUp={() => setRangeSelecting(false)}
                  onMouseOver={() => { if (rangeSelecting) setRangeEndKey(key); }}
                  className={`relative min-h-[92px] rounded-xl border p-2 text-left transition-all hover:shadow ${occupancyColor(info.occupancy)} ${!isCurrentMonth ? 'opacity-45' : ''} ${isToday ? 'ring-2 ring-amber-500/40' : ''} ${isInDragRange ? 'ring-2 ring-blue-400/50' : ''}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-900 dark:text-white">{d.getDate()}</span>
                    <div className="flex items-center gap-1">
                      {isToday && Number(info.reservations || 0) > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold">
                          {info.reservations}
                        </span>
                      )}
                      {isBlocked && <span className="text-[10px] text-red-500 font-semibold">BLOCKED</span>}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] text-neutral-700 dark:text-neutral-300">
                    <div>R: {info.reservations}</div>
                    <div>C: {info.contacts}</div>
                    <div>Cat: {info.catering}</div>
                    <div>Occ: {Math.round(info.occupancy || 0)}%</div>
                  </div>
                  {hoveredDateKey === key && (
                    <div className="pointer-events-none absolute left-1/2 top-full z-[110] mt-1 w-44 -translate-x-1/2 rounded-lg border border-amber-500/30 bg-white/95 dark:bg-neutral-950/95 p-2 text-[10px] shadow-lg">
                      <p className="font-semibold text-neutral-800 dark:text-neutral-100">Quick Preview</p>
                      <p>Top parties: {topPartiesForHovered.map((r) => `${r.name} (${r.persons})`).join(', ') || 'None'}</p>
                      <p>Occupancy: {Math.round(info.occupancy || 0)}%</p>
                      <p>VIP: {reservations.filter((r) => normalizeDayKey(r.date) === key && Number(r.is_vip) === 1).length}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="px-3 pb-3 flex items-center gap-2">
            <button
              disabled={!selectedRangeDates.length}
              onClick={async () => {
                if (!selectedRangeDates.length) return;
                try {
                  for (const dateKey of selectedRangeDates) {
                    // Apply to first location for the current site; admins can repeat per location if needed
                    const rid = restaurants[0]?.id;
                    if (!rid) continue;
                    await api.createReservationBlockouts({
                      restaurant_id: rid,
                      start_date: dateKey,
                      end_date: dateKey,
                      service_period: 'all_day',
                      reason: blockReason || 'Range blockout',
                    });
                  }
                  setToast({ type: 'success', message: `Blocked ${selectedRangeDates.length} day(s).` });
                  setRangeStartKey('');
                  setRangeEndKey('');
                  await loadAll();
                } catch (err) {
                  setToast({ type: 'error', message: err.message || 'Failed to block range' });
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white disabled:opacity-50"
            >
              Block Selected Range ({selectedRangeDates.length})
            </button>
            <button
              onClick={() => { setRangeStartKey(''); setRangeEndKey(''); }}
              className="px-3 py-1.5 rounded-lg text-xs border border-neutral-300 dark:border-neutral-700"
            >
              Clear Selection
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-2 inline-flex items-center gap-1">
              Capacity Settings
              <InfoHint label="Capacity Settings info">
                Configure service capacity per location and period.{"\n"}
                Left numeric field = total seats available.{"\n"}
                Right numeric field = average table duration in minutes.{"\n"}
                ON/OFF toggle enables or disables that lunch/dinner capacity row.
              </InfoHint>
            </h3>
            <p className="text-[11px] text-neutral-500 mb-3">
              Per row: left field = seats, right field = average stay (minutes), toggle = active/inactive.
            </p>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {capacity.map((row, idx) => (
                <div key={`${row.restaurant_id}-${row.service_period}`} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-5 text-neutral-500">{(restaurants.find((r) => Number(r.id) === Number(row.restaurant_id))?.name || `R${row.restaurant_id}`)} · {row.service_period}</div>
                  <input className="col-span-3 border rounded px-2 py-1 bg-transparent" type="number" value={row.total_seats || 0} onChange={(e) => {
                    const next = [...capacity];
                    next[idx] = { ...row, total_seats: Number(e.target.value || 0) };
                    setCapacity(next);
                  }} />
                  <input className="col-span-2 border rounded px-2 py-1 bg-transparent" type="number" value={row.avg_duration_minutes || 90} onChange={(e) => {
                    const next = [...capacity];
                    next[idx] = { ...row, avg_duration_minutes: Number(e.target.value || 90) };
                    setCapacity(next);
                  }} />
                  <button className="col-span-2 text-[10px] px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800" onClick={() => {
                    const next = [...capacity];
                    next[idx] = { ...row, is_active: row.is_active ? 0 : 1 };
                    setCapacity(next);
                  }}>{row.is_active ? 'ON' : 'OFF'}</button>
                </div>
              ))}
            </div>
            <button onClick={saveCapacity} disabled={savingCap} className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 disabled:opacity-60">
              <Save size={15} /> {savingCap ? 'Saving...' : 'Save Capacity'}
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 inline-flex items-center gap-1">
              Live Notifications
              <InfoHint label="Live Notifications info">
                Real-time activity feed from admin actions and incoming forms, including reservation created/updated/cancelled, contact requests, catering requests, blockout updates, and related system alerts.
              </InfoHint>
            </h3>
            <div className="space-y-2 max-h-72 overflow-auto">
              {notifications.map((n) => (
                <div key={n.id} className={`p-2 rounded-lg border text-xs ${n.is_read ? 'border-neutral-200 dark:border-neutral-700' : 'border-amber-400/50 bg-amber-500/10'}`}>
                  <p className="font-medium text-neutral-800 dark:text-neutral-100">{n.title}</p>
                  <p className="text-neutral-500 mt-1">{n.message || 'Update received'}</p>
                </div>
              ))}
              {!notifications.length && <p className="text-xs text-neutral-500">No notifications yet.</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 inline-flex items-center gap-1">
              Hover Preview
              <InfoHint label="Hover Preview info">
                Hover over any calendar day to quickly view totals, occupancy, and largest parties without opening the day drawer.
              </InfoHint>
            </h3>
            {hoveredDateKey && hoveredSummary ? (
              <div className="text-xs text-neutral-600 dark:text-neutral-300 space-y-1">
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">{hoveredDateKey}</p>
                <p>Reservations: {hoveredSummary.reservations}</p>
                <p>Contacts: {hoveredSummary.contacts}</p>
                <p>Catering: {hoveredSummary.catering}</p>
                <p>Occupancy: {Math.round(hoveredSummary.occupancy || 0)}%</p>
                <p>Largest parties: {topPartiesForHovered.map((r) => `${r.name} (${r.persons})`).join(', ') || 'None'}</p>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Hover a calendar day for quick insights.</p>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {monthPanelOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[135] bg-black/30 p-4 sm:p-8">
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} className="mx-auto max-w-5xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })} Analytics
                </h3>
                <button onClick={() => setMonthPanelOpen(false)} className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">Close</button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"><p className="text-[11px] text-neutral-500">Reservations</p><p className="text-xl font-semibold">{monthKpis.reservations}</p></div>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"><p className="text-[11px] text-neutral-500">Expected Covers</p><p className="text-xl font-semibold">{monthKpis.covers}</p></div>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"><p className="text-[11px] text-neutral-500">Contacts</p><p className="text-xl font-semibold">{monthKpis.contacts}</p></div>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"><p className="text-[11px] text-neutral-500">Catering</p><p className="text-xl font-semibold">{monthKpis.catering}</p></div>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"><p className="text-[11px] text-neutral-500">Peak Occupancy</p><p className="text-xl font-semibold">{Math.round(monthKpis.maxOcc)}%</p></div>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"><p className="text-[11px] text-neutral-500">Busiest Day</p><p className="text-sm font-semibold">{monthKpis.busiestDate} ({monthKpis.busiestReservations})</p></div>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                  <p className="text-sm font-semibold mb-2">Weekly Trend</p>
                  <div className="space-y-2">
                    {monthInsights.weeklyTrend.length ? monthInsights.weeklyTrend.map((w) => (
                      <div key={w.week} className="flex items-center gap-2">
                        <div className="w-20 text-[11px] text-neutral-500">{w.week}</div>
                        <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${(w.count / monthInsights.maxWeekly) * 100}%` }} />
                        </div>
                        <div className="w-8 text-[11px] text-right">{w.count}</div>
                      </div>
                    )) : <p className="text-xs text-neutral-500">No weekly data yet.</p>}
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                  <p className="text-sm font-semibold mb-2">Service Insights</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">Peak Time: <span className="font-semibold">{monthInsights.peakTime}</span></p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">Cancellations: <span className="font-semibold">{monthInsights.cancelled}</span></p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">Cancellation Rate: <span className="font-semibold">{monthInsights.cancellationRate}%</span></p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">Large Parties (6+): <span className="font-semibold">{monthInsights.largeParties}</span></p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">VIP: <span className="font-semibold">{monthInsights.vipCount}</span></p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawerOpen && selectedDateData && (
          <motion.div initial={{ x: 420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 420, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-[140] p-5 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{selectedDateData.date}</h3>
                <p className="text-xs text-neutral-500">Day Micro View</p>
              </div>
              <button className="text-sm text-neutral-500 hover:text-neutral-900" onClick={() => setDrawerOpen(false)}>Close</button>
            </div>

            <div className="flex gap-2 mb-4">
              <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Block reason (optional)" className="flex-1 border rounded-lg px-3 py-2 text-sm bg-transparent" />
              <button onClick={toggleBlockSelectedDay} className="px-3 py-2 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black text-sm inline-flex items-center gap-1">
                {blockouts.some((b) => b.block_date === selectedDateData.date && Number(b.is_active) === 1) ? <Unlock size={14} /> : <Lock size={14} />}
                Toggle
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Lunch</p>
                <div className="space-y-2">
                  {selectedDateData.lunch.map((r) => (
                    <div key={r.id} className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-3">
                      <p className="font-medium text-sm text-neutral-900 dark:text-white">{r.name} · {r.persons} guests {Number(r.is_vip) ? '· VIP' : ''}</p>
                      <p className="text-xs text-neutral-500">{r.time} · {r.phone} · {r.email} · {r.status}{r.table_assigned ? ` · Table ${r.table_assigned}` : ''}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <button disabled={actionLoading[`${r.id}:confirm`]} onClick={() => runReservationAction(r.id, 'confirm')} className="px-2 py-1 text-[10px] rounded bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 disabled:opacity-50">{actionLoading[`${r.id}:confirm`] ? '...' : 'Confirm'}</button>
                        <button disabled={actionLoading[`${r.id}:cancel`]} onClick={() => runReservationAction(r.id, 'cancel')} className="px-2 py-1 text-[10px] rounded bg-red-600/15 text-red-700 dark:text-red-300 disabled:opacity-50">{actionLoading[`${r.id}:cancel`] ? '...' : 'Cancel'}</button>
                        <button disabled={actionLoading[`${r.id}:seat`]} onClick={() => runReservationAction(r.id, 'seat')} className="px-2 py-1 text-[10px] rounded bg-blue-600/15 text-blue-700 dark:text-blue-300 disabled:opacity-50">{actionLoading[`${r.id}:seat`] ? '...' : 'Seat'}</button>
                        <button disabled={actionLoading[`${r.id}:${Number(r.is_vip) ? 'unmark_vip' : 'mark_vip'}`]} onClick={() => runReservationAction(r.id, Number(r.is_vip) ? 'unmark_vip' : 'mark_vip')} className="px-2 py-1 text-[10px] rounded bg-amber-600/15 text-amber-700 dark:text-amber-300 disabled:opacity-50">{actionLoading[`${r.id}:${Number(r.is_vip) ? 'unmark_vip' : 'mark_vip'}`] ? '...' : (Number(r.is_vip) ? 'Unmark VIP' : 'Mark VIP')}</button>
                        <button disabled={actionLoading[`${r.id}:send_email`]} onClick={() => runReservationAction(r.id, 'send_email')} className="px-2 py-1 text-[10px] rounded bg-neutral-600/15 text-neutral-700 dark:text-neutral-200 disabled:opacity-50">{actionLoading[`${r.id}:send_email`] ? '...' : 'Send Email'}</button>
                      </div>
                      <div className="mt-2 flex gap-1">
                        <input value={tableDraft[r.id] || ''} onChange={(e) => setTableDraft((prev) => ({ ...prev, [r.id]: e.target.value }))} placeholder="Table" className="w-20 border rounded px-2 py-1 text-[10px] bg-transparent" />
                        <button disabled={actionLoading[`${r.id}:assign_table`]} onClick={() => runReservationAction(r.id, 'assign_table', { table_label: tableDraft[r.id] || '' })} className="px-2 py-1 text-[10px] rounded bg-neutral-900 text-white dark:bg-white dark:text-black disabled:opacity-50">{actionLoading[`${r.id}:assign_table`] ? '...' : 'Assign'}</button>
                      </div>
                    </div>
                  ))}
                  {!selectedDateData.lunch.length && <p className="text-xs text-neutral-500">No lunch reservations.</p>}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Dinner</p>
                <div className="space-y-2">
                  {selectedDateData.dinner.map((r) => (
                    <div key={r.id} className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-3">
                      <p className="font-medium text-sm text-neutral-900 dark:text-white">{r.name} · {r.persons} guests {Number(r.is_vip) ? '· VIP' : ''}</p>
                      <p className="text-xs text-neutral-500">{r.time} · {r.phone} · {r.email} · {r.status}{r.table_assigned ? ` · Table ${r.table_assigned}` : ''}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <button disabled={actionLoading[`${r.id}:confirm`]} onClick={() => runReservationAction(r.id, 'confirm')} className="px-2 py-1 text-[10px] rounded bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 disabled:opacity-50">{actionLoading[`${r.id}:confirm`] ? '...' : 'Confirm'}</button>
                        <button disabled={actionLoading[`${r.id}:cancel`]} onClick={() => runReservationAction(r.id, 'cancel')} className="px-2 py-1 text-[10px] rounded bg-red-600/15 text-red-700 dark:text-red-300 disabled:opacity-50">{actionLoading[`${r.id}:cancel`] ? '...' : 'Cancel'}</button>
                        <button disabled={actionLoading[`${r.id}:seat`]} onClick={() => runReservationAction(r.id, 'seat')} className="px-2 py-1 text-[10px] rounded bg-blue-600/15 text-blue-700 dark:text-blue-300 disabled:opacity-50">{actionLoading[`${r.id}:seat`] ? '...' : 'Seat'}</button>
                        <button disabled={actionLoading[`${r.id}:${Number(r.is_vip) ? 'unmark_vip' : 'mark_vip'}`]} onClick={() => runReservationAction(r.id, Number(r.is_vip) ? 'unmark_vip' : 'mark_vip')} className="px-2 py-1 text-[10px] rounded bg-amber-600/15 text-amber-700 dark:text-amber-300 disabled:opacity-50">{actionLoading[`${r.id}:${Number(r.is_vip) ? 'unmark_vip' : 'mark_vip'}`] ? '...' : (Number(r.is_vip) ? 'Unmark VIP' : 'Mark VIP')}</button>
                        <button disabled={actionLoading[`${r.id}:send_email`]} onClick={() => runReservationAction(r.id, 'send_email')} className="px-2 py-1 text-[10px] rounded bg-neutral-600/15 text-neutral-700 dark:text-neutral-200 disabled:opacity-50">{actionLoading[`${r.id}:send_email`] ? '...' : 'Send Email'}</button>
                      </div>
                      <div className="mt-2 flex gap-1">
                        <input value={tableDraft[r.id] || ''} onChange={(e) => setTableDraft((prev) => ({ ...prev, [r.id]: e.target.value }))} placeholder="Table" className="w-20 border rounded px-2 py-1 text-[10px] bg-transparent" />
                        <button disabled={actionLoading[`${r.id}:assign_table`]} onClick={() => runReservationAction(r.id, 'assign_table', { table_label: tableDraft[r.id] || '' })} className="px-2 py-1 text-[10px] rounded bg-neutral-900 text-white dark:bg-white dark:text-black disabled:opacity-50">{actionLoading[`${r.id}:assign_table`] ? '...' : 'Assign'}</button>
                      </div>
                    </div>
                  ))}
                  {!selectedDateData.dinner.length && <p className="text-xs text-neutral-500">No dinner reservations.</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
                  <p className="text-[11px] text-neutral-500">Reservations</p>
                  <p className="text-lg font-semibold">{selectedDateData.dayReservations.length}</p>
                </div>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
                  <p className="text-[11px] text-neutral-500">Contacts</p>
                  <p className="text-lg font-semibold">{selectedDateData.dayContacts.length}</p>
                </div>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
                  <p className="text-[11px] text-neutral-500">Catering</p>
                  <p className="text-lg font-semibold">{selectedDateData.dayCatering.length}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && <div className="text-xs text-neutral-500 inline-flex items-center gap-2"><CalendarDays size={14} /> Syncing live data...</div>}
    </div>
  );
}
