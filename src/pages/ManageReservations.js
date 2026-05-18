import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, Loader2, Mail, Phone, PencilLine, Save, Search, Users } from 'lucide-react';
import api from '../api';

const timeSlots = [
  '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
];

function toTenDigits(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function toLookupPhone(value) {
  const tenDigits = toTenDigits(value);
  if (tenDigits.length === 10) return `1${tenDigits}`;
  return tenDigits;
}

function sortNewestFirst(reservations) {
  return [...reservations].sort((a, b) => {
    const aCreated = Date.parse(a.created_at || '');
    const bCreated = Date.parse(b.created_at || '');
    if (!Number.isNaN(aCreated) && !Number.isNaN(bCreated) && aCreated !== bCreated) {
      return bCreated - aCreated;
    }

    if ((a.date || '') !== (b.date || '')) return String(b.date || '').localeCompare(String(a.date || ''));
    if ((a.time || '') !== (b.time || '')) return String(b.time || '').localeCompare(String(a.time || ''));
    return Number(b.id || 0) - Number(a.id || 0);
  });
}

function formatPhoneDisplay(value) {
  const tenDigits = toTenDigits(value);
  if (tenDigits.length !== 10) return value || '—';
  return `${tenDigits.slice(0, 3)}-${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
}

export default function ManageReservations() {
  const [lookup, setLookup] = useState({ email: '', phone: '' });
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    persons: '2',
    special_requests: '',
  });
  const [saving, setSaving] = useState(false);

  const sortedReservations = useMemo(() => sortNewestFirst(reservations), [reservations]);

  const handleLookupChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setLookup((prev) => ({ ...prev, phone: toTenDigits(value) }));
      setError('');
      return;
    }

    setLookup((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleFindReservations = async (e) => {
    e.preventDefault();

    if (!lookup.email.trim() || toTenDigits(lookup.phone).length !== 10) {
      setError('Enter a valid email and 10-digit phone number.');
      return;
    }

    setLoading(true);
    setError('');
    setEditingId(null);

    try {
      const result = await api.findManageReservations(lookup.email.trim().toLowerCase(), lookup.phone);
      setReservations(result || []);
      setLookupDone(true);
    } catch (err) {
      setError(err.message || 'Unable to find reservations.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (reservation) => {
    setEditingId(reservation.id);
    setEditForm({
      name: reservation.name || '',
      email: reservation.email || '',
      phone: toTenDigits(reservation.phone || ''),
      date: String(reservation.date || '').slice(0, 10),
      time: String(reservation.time || '').slice(0, 5),
      persons: String(reservation.persons || '2'),
      special_requests: reservation.special_requests || '',
    });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError('');
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setEditForm((prev) => ({ ...prev, phone: toTenDigits(value) }));
      return;
    }

    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async (reservationId) => {
    if (!editForm.name.trim() || !editForm.email.trim() || editForm.phone.length !== 10 || !editForm.date || !editForm.time) {
      setError('Name, email, phone, date, and time are required.');
      return;
    }

    const guestCount = parseInt(editForm.persons, 10);
    if (!Number.isFinite(guestCount) || guestCount < 1) {
      setError('Guests must be at least 1.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await api.updateManagedReservation(reservationId, {
        lookup_email: lookup.email.trim().toLowerCase(),
        lookup_phone: toLookupPhone(lookup.phone),
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        phone: editForm.phone,
        date: editForm.date,
        time: editForm.time,
        persons: guestCount,
        special_requests: editForm.special_requests,
      });

      setReservations((prev) => prev.map((item) => (item.id === reservationId ? { ...item, ...updated } : item)));
      setEditingId(null);

      // Keep verification credentials in sync if the customer updates their contact details.
      setLookup({
        email: updated.email || editForm.email.trim().toLowerCase(),
        phone: toTenDigits(updated.phone || editForm.phone),
      });
    } catch (err) {
      setError(err.message || 'Unable to update reservation.');
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen pt-20 relative bg-neutral-50 dark:bg-dark-950">
      <section className="py-20 bg-pattern bg-indian-paisley relative overflow-hidden bg-indian-arch">
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-amber-500 dark:text-amber-400 text-sm font-semibold uppercase tracking-wider">Manage Reservations</span>
            <div className="section-divider !mx-0" />
            <h1 className="font-display text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mt-4 mb-4">
              Find and <span className="text-gold-gradient">Update</span> Your Reservation
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-3xl">
              Enter the same email and phone number used during booking.
              Your reservation list will be shown from newest to oldest.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-5xl mx-auto px-4 space-y-8">
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onSubmit={handleFindReservations}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm dark:shadow-none"
          >
            <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white mb-6">Verify Your Details</h2>
            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-1">
                <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Email Address *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="email"
                    name="email"
                    value={lookup.email}
                    onChange={handleLookupChange}
                    placeholder="your@email.com"
                    className="input-dark !pl-10"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-1">
                <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Phone Number *</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={lookup.phone}
                    onChange={handleLookupChange}
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    minLength={10}
                    placeholder="4373761996"
                    className="input-dark !pl-10"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-gold w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" /> Searching...</>
                ) : (
                  <><Search size={16} className="mr-2" /> Find Reservations</>
                )}
              </button>

              <p className="md:col-span-3 text-xs text-neutral-500 -mt-1">We automatically verify as country code 1 + your 10 digits.</p>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
          </motion.form>

          {lookupDone && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">Your Reservations</h3>
                <span className="text-sm text-neutral-500">{sortedReservations.length} found</span>
              </div>

              {sortedReservations.length === 0 && (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center text-neutral-500">
                  No reservations found for this email and phone combination.
                </div>
              )}

              {sortedReservations.map((reservation) => {
                const isEditing = editingId === reservation.id;

                return (
                  <div key={reservation.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm dark:shadow-none">
                    {!isEditing ? (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wider text-neutral-500">Confirmation</p>
                            <p className="text-amber-500 dark:text-amber-400 font-bold text-lg">{reservation.confirmation_code}</p>
                          </div>
                          <button onClick={() => startEdit(reservation)} className="btn-outline-gold !px-5 !py-2.5 text-sm">
                            <PencilLine size={16} className="mr-2" /> Edit Reservation
                          </button>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div><p className="text-neutral-500">Name</p><p className="text-neutral-900 dark:text-white">{reservation.name}</p></div>
                          <div><p className="text-neutral-500">Email</p><p className="text-neutral-900 dark:text-white break-all">{reservation.email}</p></div>
                          <div><p className="text-neutral-500">Phone</p><p className="text-neutral-900 dark:text-white">{formatPhoneDisplay(reservation.phone)}</p></div>
                          <div><p className="text-neutral-500">Date</p><p className="text-neutral-900 dark:text-white">{reservation.date}</p></div>
                          <div><p className="text-neutral-500">Time</p><p className="text-neutral-900 dark:text-white">{String(reservation.time || '').slice(0, 5)}</p></div>
                          <div><p className="text-neutral-500">Guests</p><p className="text-neutral-900 dark:text-white">{reservation.persons}</p></div>
                        </div>

                        {reservation.special_requests && (
                          <div>
                            <p className="text-neutral-500 text-sm mb-1">Special Requests</p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/70 rounded-lg p-3">{reservation.special_requests}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-display text-xl font-bold text-neutral-900 dark:text-white">Edit Reservation {reservation.confirmation_code}</h4>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Name *</label>
                            <input name="name" value={editForm.name} onChange={handleEditChange} className="input-dark" required />
                          </div>
                          <div>
                            <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Email *</label>
                            <input type="email" name="email" value={editForm.email} onChange={handleEditChange} className="input-dark" required />
                          </div>
                          <div>
                            <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Phone *</label>
                            <input type="tel" name="phone" value={editForm.phone} onChange={handleEditChange} className="input-dark" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} minLength={10} required />
                          </div>
                          <div>
                            <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Guests *</label>
                            <select name="persons" value={editForm.persons} onChange={handleEditChange} className="select-dark">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                                <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Date *</label>
                            <input type="date" name="date" value={editForm.date} onChange={handleEditChange} min={today} className="input-dark" required />
                          </div>
                          <div>
                            <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Time *</label>
                            <select name="time" value={editForm.time} onChange={handleEditChange} className="select-dark" required>
                              <option value="">Select time</option>
                              {timeSlots.map((slot) => (
                                <option key={slot} value={slot}>{slot}</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Special Requests</label>
                            <textarea name="special_requests" rows={3} value={editForm.special_requests} onChange={handleEditChange} className="input-dark resize-none" />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => saveEdit(reservation.id)}
                            disabled={saving}
                            className="btn-gold w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? (
                              <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</>
                            ) : (
                              <><Save size={16} className="mr-2" /> Save Changes</>
                            )}
                          </button>
                          <button onClick={cancelEdit} className="btn-outline-gold w-full sm:w-auto">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {sortedReservations.length > 0 && (
                <div className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 text-sm text-neutral-500 flex flex-wrap gap-4">
                  <span className="inline-flex items-center"><CalendarDays size={14} className="mr-2 text-amber-500" /> Update date anytime</span>
                  <span className="inline-flex items-center"><Clock size={14} className="mr-2 text-amber-500" /> Change time slots</span>
                  <span className="inline-flex items-center"><Users size={14} className="mr-2 text-amber-500" /> Adjust guest count</span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
