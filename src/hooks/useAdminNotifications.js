import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api';

const REQUESTED_KEY = 'admin_notification_permission_requested_v1';
const ENABLED_KEY = 'admin_browser_notifications_enabled_v1';

function detectSettingsUrl() {
  const ua = String(navigator.userAgent || '').toLowerCase();
  if (ua.includes('chrome') || ua.includes('edg')) return 'chrome://settings/content/notifications';
  if (ua.includes('firefox')) return 'about:preferences#privacy';
  return '';
}

function inferType(n) {
  const t = String(n?.action_type || '').toLowerCase();
  const title = String(n?.title || '').toLowerCase();
  const msg = String(n?.message || '').toLowerCase();
  const blob = `${t} ${title} ${msg}`;
  if (blob.includes('vip')) return 'vip';
  if (blob.includes('cancel')) return 'reservation_cancelled';
  if (blob.includes('reservation')) return 'reservation_created';
  if (blob.includes('catering')) return 'catering';
  if (blob.includes('contact')) return 'contact';
  if (blob.includes('capacity') || blob.includes('occupancy') || blob.includes('full')) return 'capacity_alert';
  return 'general';
}

export default function useAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const [browserEnabled, setBrowserEnabled] = useState(localStorage.getItem(ENABLED_KEY) === '1');
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');
  const [permissionRequested, setPermissionRequested] = useState(localStorage.getItem(REQUESTED_KEY) === '1');
  const lastNotifiedId = useRef(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAdminNotifications({ limit: 30 });
      const list = (data?.notifications || []).map((n) => ({ ...n, _type: inferType(n) }));
      setNotifications(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.emit('admin:join', {});
    const onLive = async () => {
      await loadNotifications();
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = 1046;
          gain.gain.value = 0.02;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          setTimeout(() => { osc.stop(); ctx.close(); }, 120);
        }
      } catch (_e) {
        // no-op
      }
    };

    socket.on('reservation.created', onLive);
    socket.on('reservation.updated', onLive);
    socket.on('contact.created', onLive);
    socket.on('catering.created', onLive);
    socket.on('admin.notification.created', onLive);

    return () => {
      socket.off('reservation.created', onLive);
      socket.off('reservation.updated', onLive);
      socket.off('contact.created', onLive);
      socket.off('catering.created', onLive);
      socket.off('admin.notification.created', onLive);
      socket.close();
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!browserEnabled || permission !== 'granted' || !notifications.length) return;
    const latest = notifications[0];
    if (!latest?.id || Number(latest.id) === Number(lastNotifiedId.current)) return;
    lastNotifiedId.current = latest.id;
    try {
      new Notification(latest.title || 'New admin update', {
        body: latest.message || 'A new event just arrived.',
      });
    } catch (_e) {
      // no-op
    }
  }, [browserEnabled, permission, notifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  const requestBrowserPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      setPermission('unsupported');
      setPermissionMessage('This browser does not support notifications.');
      setPermissionModalOpen(true);
      return { ok: false, state: 'unsupported' };
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      setBrowserEnabled(true);
      localStorage.setItem(ENABLED_KEY, '1');
      return { ok: true, state: 'granted' };
    }

    if (Notification.permission === 'denied') {
      setPermission('denied');
      setPermissionMessage('Notifications are blocked in browser settings. Enable them and try again.');
      setPermissionModalOpen(true);
      return { ok: false, state: 'denied' };
    }

    const result = await Notification.requestPermission();
    localStorage.setItem(REQUESTED_KEY, '1');
    setPermissionRequested(true);
    setPermission(result);

    if (result === 'granted') {
      setBrowserEnabled(true);
      localStorage.setItem(ENABLED_KEY, '1');
      return { ok: true, state: 'granted' };
    }

    setBrowserEnabled(false);
    localStorage.setItem(ENABLED_KEY, '0');
    setPermissionMessage('Notification permission was not granted. You can enable it anytime from browser settings.');
    setPermissionModalOpen(true);
    return { ok: false, state: result };
  }, []);

  const openBrowserSettings = useCallback(() => {
    const settingsUrl = detectSettingsUrl();
    if (!settingsUrl) return false;
    window.open(settingsUrl, '_blank', 'noopener,noreferrer');
    return true;
  }, []);

  const markOneRead = useCallback(async (id) => {
    await api.markAdminNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (Number(n.id) === Number(id) ? { ...n, is_read: 1 } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.markAllAdminNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
  }, []);

  const clearAll = useCallback(async () => {
    await markAllRead();
  }, [markAllRead]);

  return {
    notifications,
    unreadCount,
    loading,
    permission,
    browserEnabled,
    permissionModalOpen,
    permissionMessage,
    permissionRequested,
    setPermissionModalOpen,
    requestBrowserPermission,
    openBrowserSettings,
    markOneRead,
    markAllRead,
    clearAll,
    refresh: loadNotifications,
  };
}
