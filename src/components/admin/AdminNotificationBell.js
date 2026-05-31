import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellRing, CheckCheck, Trash2, Settings, Info, CalendarPlus, CalendarX, Crown, UtensilsCrossed, MessageSquareWarning, AlertTriangle } from 'lucide-react';

function formatWhen(ts) {
  if (!ts) return 'Just now';
  const d = new Date(ts);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleString();
}

function typeMeta(type) {
  switch (type) {
    case 'reservation_created':
      return { icon: CalendarPlus, color: 'text-emerald-500', label: 'Reservation created' };
    case 'reservation_cancelled':
      return { icon: CalendarX, color: 'text-rose-500', label: 'Reservation cancelled' };
    case 'vip':
      return { icon: Crown, color: 'text-amber-500', label: 'VIP booking' };
    case 'catering':
      return { icon: UtensilsCrossed, color: 'text-violet-500', label: 'Catering request' };
    case 'contact':
      return { icon: MessageSquareWarning, color: 'text-sky-500', label: 'Contact request' };
    case 'capacity_alert':
      return { icon: AlertTriangle, color: 'text-orange-500', label: 'Capacity alert' };
    default:
      return { icon: Info, color: 'text-neutral-500', label: 'Update' };
  }
}

export default function AdminNotificationBell({ model, compact = false }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [panelPos, setPanelPos] = useState({ top: 64, left: 0, width: 420 });
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const sorted = useMemo(() => [...model.notifications], [model.notifications]);

  const calcPanelPos = () => {
    const trigger = buttonRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const desiredWidth = vw < 520 ? Math.max(320, vw - 24) : 420;
    const margin = 12;
    let left = rect.right - desiredWidth;
    if (left < margin) left = margin;
    if (left + desiredWidth > vw - margin) left = vw - desiredWidth - margin;
    const top = rect.bottom + 10;
    setPanelPos({ top, left, width: desiredWidth });
  };

  useEffect(() => {
    if (!open) return;
    calcPanelPos();
    const onResize = () => calcPanelPos();
    const onScroll = () => calcPanelPos();
    const onClickOutside = (e) => {
      const inTrigger = buttonRef.current && buttonRef.current.contains(e.target);
      const inPanel = panelRef.current && panelRef.current.contains(e.target);
      if (!inTrigger && !inPanel) setOpen(false);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  const onEnable = async () => {
    const result = await model.requestBrowserPermission();
    if (result.ok) {
      setToast({ type: 'success', message: 'Browser notifications enabled.' });
      setTimeout(() => setToast(null), 2200);
    }
  };

  useEffect(() => {
    if (model.permissionModalOpen) {
      setOpen(false);
    }
  }, [model.permissionModalOpen]);

  const dropdown = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
          className="fixed z-[240] rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden"
        >
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">Notifications</p>
              <div className="flex items-center gap-1">
                <button onClick={model.markAllRead} className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 inline-flex items-center gap-1"><CheckCheck size={12} /> Mark all</button>
                <button onClick={model.clearAll} className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 inline-flex items-center gap-1"><Trash2 size={12} /> Clear all</button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-xs text-neutral-500">
                {model.permission === 'granted' && 'Browser alerts enabled'}
                {model.permission === 'default' && 'Enable browser alerts for instant updates'}
                {model.permission === 'denied' && 'Browser alerts blocked'}
                {model.permission === 'unsupported' && 'Browser alerts not supported'}
              </div>
              <button onClick={onEnable} className="px-2 py-1 text-xs rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 inline-flex items-center gap-1"><Settings size={12} /> {model.permission === 'granted' ? 'Enabled' : 'Enable'}</button>
            </div>
          </div>

          <div className="max-h-[380px] overflow-auto">
            {sorted.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-neutral-500">No notifications yet</p>
                <p className="text-xs text-neutral-400 mt-1">Live updates will appear here instantly.</p>
              </div>
            )}
            {sorted.map((n) => {
              const meta = typeMeta(n._type);
              const Icon = meta.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => model.markOneRead(n.id)}
                  className={`w-full text-left p-3 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${Number(n.is_read) ? '' : 'bg-amber-500/5'}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon size={16} className={`${meta.color} mt-0.5`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{n.title || meta.label}</p>
                        <span className="text-[11px] text-neutral-500 whitespace-nowrap">{formatWhen(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{n.message || meta.label}</p>
                      <p className="text-[11px] mt-1 text-neutral-400">{meta.label}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        {model.unreadCount > 0 ? <BellRing size={16} /> : <Bell size={16} />}
        {!compact && <span>Notifications</span>}
        <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 font-semibold">{model.unreadCount}</span>
      </button>

      {typeof document !== 'undefined' ? createPortal(dropdown, document.body) : null}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="fixed top-4 right-4 z-[260] px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm shadow-lg">
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {typeof document !== 'undefined' ? createPortal(
        <AnimatePresence>
          {model.permissionModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[250] bg-black/50">
              <div className="fixed inset-0 z-[251] p-4 sm:p-6 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-auto rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-2xl"
              >
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Enable Browser Notifications</h3>
              <p className="text-sm text-neutral-500 mt-2">{model.permissionMessage || 'Allow notifications to receive real-time admin updates.'}</p>
              <div className="mt-4 rounded-lg bg-neutral-50 dark:bg-neutral-800 p-3 text-xs text-neutral-600 dark:text-neutral-300">
                If notifications are blocked, open browser site settings and set notifications to Allow for this admin URL.
              </div>
              <div className="mt-5 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-end gap-2">
                <button onClick={() => model.setPermissionModalOpen(false)} className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">Close</button>
                <button
                  onClick={() => {
                    const ok = model.openBrowserSettings();
                    if (!ok) setToast({ type: 'error', message: 'Open browser settings manually to allow notifications.' });
                  }}
                  className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Open Browser Settings
                </button>
                <button onClick={onEnable} className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400">Try Again</button>
              </div>
              </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      ) : null}
    </>
  );
}
