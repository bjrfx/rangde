import React, { useEffect, useState } from 'react';
import { Loader2, Mail, Save } from 'lucide-react';
import api from '../../api';

const initialForm = {
  reservations_email: '',
  contact_email: '',
  catering_email: '',
};

export default function AdminNotificationEmailSettings() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const data = await api.getNotificationEmails();
        if (mounted) {
          setForm({
            reservations_email: data?.reservations_email || '',
            contact_email: data?.contact_email || '',
            catering_email: data?.catering_email || '',
          });
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Unable to load settings');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSuccess('');
    setError('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await api.updateNotificationEmails(form);
      setForm({
        reservations_email: updated?.reservations_email || '',
        contact_email: updated?.contact_email || '',
        catering_email: updated?.catering_email || '',
      });
      setSuccess('Notification email settings saved.');
    } catch (err) {
      setError(err.message || 'Unable to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="skeleton h-64 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Email Notification Settings</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Configure where reservation, contact, and catering form notifications are sent.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm dark:shadow-none space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm">
            {success}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <label className="block">
            <span className="block text-sm text-neutral-500 dark:text-neutral-400 mb-2">Reservations Recipient Email(s)</span>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                name="reservations_email"
                value={form.reservations_email}
                onChange={handleChange}
                placeholder="reservations-team@example.com"
                className="input-dark !pl-10"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-2">Leave empty to disable reservation emails.</p>
          </label>

          <label className="block">
            <span className="block text-sm text-neutral-500 dark:text-neutral-400 mb-2">Contact Recipient Email(s)</span>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                name="contact_email"
                value={form.contact_email}
                onChange={handleChange}
                placeholder="contact-team@example.com"
                className="input-dark !pl-10"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-2">Leave empty to disable contact form notifications.</p>
          </label>

          <label className="block md:col-span-2">
            <span className="block text-sm text-neutral-500 dark:text-neutral-400 mb-2">Catering Recipient Email(s)</span>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                name="catering_email"
                value={form.catering_email}
                onChange={handleChange}
                placeholder="catering-team@example.com"
                className="input-dark !pl-10"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-2">Leave empty to disable catering notifications.</p>
          </label>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-gold !text-sm disabled:opacity-60" disabled={saving}>
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
