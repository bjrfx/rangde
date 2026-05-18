import React, { useState, useEffect } from 'react';
import { Settings, Calendar, Loader2, Check, AlertTriangle, PauseCircle } from 'lucide-react';
import api from '../../api';

export default function ReservationSettings({ token }) {
  const [tuesdayDisabled, setTuesdayDisabled] = useState(true);
  const [reservationsPaused, setReservationsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPause, setSavingPause] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getReservationSettings();
      setTuesdayDisabled(data?.tuesday_disabled ?? true);
      setReservationsPaused(data?.reservations_paused ?? false);
    } catch (err) {
      console.error(err);
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTuesday = async () => {
    const newTuesday = !tuesdayDisabled;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const result = await api.updateReservationSettings({
        tuesday_disabled: newTuesday,
        reservations_paused: reservationsPaused,
      });
      setTuesdayDisabled(result?.tuesday_disabled ?? newTuesday);
      setReservationsPaused(result?.reservations_paused ?? reservationsPaused);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to update setting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async () => {
    const newPaused = !reservationsPaused;
    setSavingPause(true);
    setError('');
    setSaved(false);
    try {
      const result = await api.updateReservationSettings({
        tuesday_disabled: tuesdayDisabled,
        reservations_paused: newPaused,
      });
      setTuesdayDisabled(result?.tuesday_disabled ?? tuesdayDisabled);
      setReservationsPaused(result?.reservations_paused ?? newPaused);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to update setting. Please try again.');
    } finally {
      setSavingPause(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-4 w-48 rounded" />
        <div className="skeleton h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Reservation Settings</h1>
        <p className="text-neutral-500 text-sm mt-1">Manage reservation availability and day-specific rules</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <span className="text-red-500 dark:text-red-400 text-sm">{error}</span>
        </div>
      )}

      {saved && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
          <Check size={18} className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <span className="text-green-500 dark:text-green-400 text-sm">Settings saved successfully!</span>
        </div>
      )}

      {/* Pause Reservations Card */}
      <div className={`bg-white dark:bg-neutral-900 border rounded-xl shadow-sm dark:shadow-none ${
        reservationsPaused
          ? 'border-red-500/40 ring-1 ring-red-500/20'
          : 'border-neutral-200 dark:border-neutral-800'
      }`}>
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              reservationsPaused ? 'bg-red-500/10' : 'bg-amber-500/10'
            }`}>
              <PauseCircle size={20} className={reservationsPaused ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Pause All Reservations</h2>
              <p className="text-neutral-500 text-xs mt-0.5">Temporarily block all new reservation submissions</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className={`flex items-center justify-between p-4 rounded-xl border ${
            reservationsPaused
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700/50'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                reservationsPaused ? 'bg-red-500/10' : 'bg-green-500/10'
              }`}>
                <span className={`font-bold text-xs ${
                  reservationsPaused ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'
                }`}>
                  {reservationsPaused ? 'OFF' : 'ON'}
                </span>
              </div>
              <div>
                <h3 className="text-neutral-900 dark:text-white font-semibold text-sm">
                  Reservations are {reservationsPaused ? 'Paused' : 'Active'}
                </h3>
                <p className="text-neutral-500 text-xs mt-0.5">
                  {reservationsPaused
                    ? 'All reservations are currently paused. Customers will see a notice and cannot submit new bookings.'
                    : 'Reservations are accepting new bookings normally.'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePause}
              disabled={savingPause}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                !reservationsPaused
                  ? 'bg-green-500'
                  : 'bg-red-400 dark:bg-red-500'
              } ${savingPause ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={reservationsPaused ? 'Click to resume reservations' : 'Click to pause all reservations'}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                  !reservationsPaused ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              {savingPause && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={14} className="text-white animate-spin" />
                </span>
              )}
            </button>
          </div>

          <div className={`mt-4 p-3 rounded-lg border ${
            reservationsPaused
              ? 'bg-red-500/5 border-red-500/10'
              : 'bg-amber-500/5 border-amber-500/10'
          }`}>
            <p className={`text-xs leading-relaxed ${
              reservationsPaused
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              <strong>Note:</strong> {reservationsPaused
                ? 'Reservations are paused. Customers visiting the reservations page will see a prominent "Reservations Paused" banner and the booking form will be disabled. Toggle this back on to resume accepting bookings.'
                : 'When paused, the reservation form will be hidden and replaced with a message informing customers that reservations are temporarily unavailable. Use this for holidays, closures, or capacity issues.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Closed Days Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm dark:shadow-none">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Closed Days</h2>
              <p className="text-neutral-500 text-xs mt-0.5">Configure which days of the week reservations are blocked</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <span className="text-red-500 dark:text-red-400 font-bold text-sm">TUE</span>
              </div>
              <div>
                <h3 className="text-neutral-900 dark:text-white font-semibold text-sm">Tuesday Reservations</h3>
                <p className="text-neutral-500 text-xs mt-0.5">
                  {tuesdayDisabled
                    ? 'Tuesdays are currently blocked — customers cannot book on Tuesdays.'
                    : 'Tuesdays are currently open — customers can book on Tuesdays.'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleTuesday}
              disabled={saving}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                !tuesdayDisabled
                  ? 'bg-green-500'
                  : 'bg-neutral-300 dark:bg-neutral-600'
              } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={tuesdayDisabled ? 'Click to enable Tuesday reservations' : 'Click to disable Tuesday reservations'}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                  !tuesdayDisabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              {saving && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={14} className="text-white animate-spin" />
                </span>
              )}
            </button>
          </div>

          <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
            <p className="text-amber-600 dark:text-amber-400 text-xs leading-relaxed">
              <strong>Note:</strong> When Tuesday reservations are disabled, all Tuesday dates will appear greyed out and unselectable in the reservation calendar. Customers will see a message explaining that Tuesday reservations are not available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
