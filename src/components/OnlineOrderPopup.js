import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, Gift, ShoppingBag, X } from 'lucide-react';
import api from '../api';

const defaultSettings = {
  is_enabled: 1,
  title: 'Order Ahead Online — No Waiting, No Calling',
  description: `You can now place your pickup orders online with secure payment and scheduled pickup options.

Skip the hassle of calling or paying in person.

Enjoy a complimentary dessert or pop of your choice with every online pickup order over $50 for a limited time during the month of June.`,
  cta_text: 'Start Your Online Order',
};

function normalizeSettings(settings) {
  return {
    ...defaultSettings,
    ...(settings || {}),
    is_enabled: settings?.is_enabled === true || settings?.is_enabled === 1 || settings?.is_enabled === '1' ? 1 : 0,
    title: String(settings?.title || defaultSettings.title),
    description: String(settings?.description || defaultSettings.description),
    cta_text: String(settings?.cta_text || defaultSettings.cta_text),
  };
}

export default function OnlineOrderPopup({
  orderUrl,
  onStartOrder,
  storageKey = 'masakali_online_order_popup_seen_v1',
}) {
  const [settings, setSettings] = useState(defaultSettings);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      if (window.localStorage.getItem(storageKey) === '1') return;

      try {
        const response = await api.getOnlineOrderPopupSettings();
        if (!isMounted) return;
        const nextSettings = normalizeSettings(response);
        setSettings(nextSettings);
        setVisible(Boolean(nextSettings.is_enabled));
      } catch (err) {
        console.error('Unable to load online order popup settings:', err);
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  const paragraphs = useMemo(() => {
    return String(settings.description || '')
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [settings.description]);

  const markSeen = () => {
    window.localStorage.setItem(storageKey, '1');
    setVisible(false);
  };

  const handleStartOrder = () => {
    markSeen();
    if (typeof onStartOrder === 'function') {
      onStartOrder();
      return;
    }
    if (orderUrl) {
      window.open(orderUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={markSeen}
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-amber-500/25 bg-white text-neutral-900 shadow-2xl dark:bg-neutral-950 dark:text-white"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500" />
            <button
              type="button"
              aria-label="Close online ordering promotion"
              onClick={markSeen}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-amber-500 hover:text-amber-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-amber-400"
            >
              <X size={18} />
            </button>

            <div className="p-6 pt-8 sm:p-8 sm:pt-10">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <ShoppingBag size={24} />
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Online Pickup Promotion
              </p>
              <h2 className="font-display pr-8 text-2xl font-bold leading-tight text-neutral-950 dark:text-white sm:text-3xl">
                {settings.title}
              </h2>

              <div className="mt-4 space-y-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300 sm:text-base">
                {paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-5 grid gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                  <CalendarClock size={15} className="text-amber-600 dark:text-amber-400" />
                  <span>Pickup only</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                  <ShoppingBag size={15} className="text-amber-600 dark:text-amber-400" />
                  <span>$50 minimum</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                  <Gift size={15} className="text-amber-600 dark:text-amber-400" />
                  <span>Dessert or pop</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleStartOrder}
                  className="btn-gold w-full justify-center text-base"
                >
                  {settings.cta_text}
                </button>
                <button
                  type="button"
                  onClick={markSeen}
                  className="w-full rounded-lg border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-white sm:w-auto"
                >
                  Not now
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
