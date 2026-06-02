import React, { useEffect, useState } from 'react';
import { Loader2, Save, ShoppingBag } from 'lucide-react';
import api from '../../api';

const defaultForm = {
  is_enabled: true,
  title: 'Order Ahead Online — No Waiting, No Calling',
  description: `You can now place your pickup orders online with secure payment and scheduled pickup options.

Skip the hassle of calling or paying in person.

Enjoy a complimentary dessert or pop of your choice with every online pickup order over $50 for a limited time during the month of June.`,
  cta_text: 'Start Your Online Order',
};

export default function OnlineOrderPopupManagement() {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const settings = await api.getAdminOnlineOrderPopupSettings();
        if (!isMounted) return;
        setForm({
          is_enabled: settings?.is_enabled === true || settings?.is_enabled === 1 || settings?.is_enabled === '1',
          title: settings?.title || defaultForm.title,
          description: settings?.description || defaultForm.description,
          cta_text: settings?.cta_text || defaultForm.cta_text,
        });
      } catch (err) {
        console.error(err);
        window.alert(err.message || 'Unable to load popup settings');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage('');
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const saved = await api.updateOnlineOrderPopupSettings(form);
      setForm({
        is_enabled: saved?.is_enabled === true || saved?.is_enabled === 1 || saved?.is_enabled === '1',
        title: saved?.title || defaultForm.title,
        description: saved?.description || defaultForm.description,
        cta_text: saved?.cta_text || defaultForm.cta_text,
      });
      setMessage('Popup settings saved.');
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Unable to save popup settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="skeleton h-64 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Online Order Popup</h1>
        <p className="mt-1 text-sm text-neutral-500">Control the first-visit Clover online pickup promotion.</p>
      </div>

      <form onSubmit={saveSettings} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
          <div className="mb-6 flex flex-col gap-3 border-b border-neutral-200 pb-5 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Popup Content</h2>
              <p className="mt-1 text-xs text-neutral-500">The existing Clover order link is used from the website CTA.</p>
            </div>
            <label className="flex items-center gap-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={form.is_enabled}
                onChange={(event) => updateField('is_enabled', event.target.checked)}
                className="h-5 w-5 rounded border-neutral-300 text-amber-500 focus:ring-amber-500"
              />
              Popup enabled
            </label>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</span>
              <input
                type="text"
                value={form.title}
                maxLength={160}
                onChange={(event) => updateField('title', event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Description</span>
              <textarea
                value={form.description}
                rows={8}
                onChange={(event) => updateField('description', event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">CTA Button Text</span>
              <input
                type="text"
                value={form.cta_text}
                maxLength={80}
                onChange={(event) => updateField('cta_text', event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                required
              />
            </label>
          </div>
        </section>

        <aside className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Preview</h2>
              <p className="text-xs text-neutral-500">{form.is_enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-neutral-50 p-5 dark:bg-neutral-950">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Online Pickup Promotion</p>
            <h3 className="font-display text-xl font-bold leading-tight text-neutral-950 dark:text-white">{form.title}</h3>
            <div className="mt-3 space-y-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              {form.description.split(/\n\s*\n/).filter(Boolean).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-black">
              {form.cta_text}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-gold mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
            Save Settings
          </button>
          {message && <p className="mt-3 text-sm font-medium text-green-600 dark:text-green-400">{message}</p>}
        </aside>
      </form>
    </div>
  );
}
