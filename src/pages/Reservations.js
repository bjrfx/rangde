import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, Users, MapPin, Check, Loader2, ArrowRight, Phone, Mail, MessageSquare, PauseCircle } from 'lucide-react';
import api from '../api';
import { gtagEvent, trackGoogleAdsConversion } from '../utils/gtag';

function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay }} className={className}>
      {children}
    </motion.div>
  );
}

const timeSlots = [
  '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
];

function formatDateOnly(value) {
  if (!value) return '';
  const text = String(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : text;
}

/** Returns today's date in YYYY-MM-DD using the browser's LOCAL timezone (not UTC). */
function getLocalToday() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Check if a YYYY-MM-DD date string falls on a Tuesday (day 2). */
function isTuesday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 2;
}

export default function Reservations() {
  const [restaurants, setRestaurants] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', date: '', time: '', persons: '2', restaurant_id: '', special_requests: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState('');
  const [tuesdayDisabled, setTuesdayDisabled] = useState(true);
  const [reservationsPaused, setReservationsPaused] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [dateClosed, setDateClosed] = useState(false);

  useEffect(() => {
    api.getRestaurants()
      .then((data) => {
        const rangdeOnly = (data || []).filter((r) => (
          r?.slug === 'rangde'
          || String(r?.name || '').toLowerCase().includes('rangde')
          || String(r?.brand || '').toLowerCase().includes('rangde')
        ));
        setRestaurants(rangdeOnly);
      })
      .catch(console.error);

    // Fetch reservation settings
    api.getReservationSettings()
      .then((data) => {
        setTuesdayDisabled(data?.tuesday_disabled ?? true);
        setReservationsPaused(!!data?.reservations_paused);
        setSettingsLoaded(true);
      })
      .catch(() => {
        setTuesdayDisabled(true);
        setReservationsPaused(false);
        setSettingsLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (restaurants.length === 1) {
      setForm((prev) => ({ ...prev, restaurant_id: String(restaurants[0].id) }));
    }
  }, [restaurants]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setForm({ ...form, phone: digitsOnly });
      setError('');
      return;
    }

    // Block Tuesday selection if disabled
    if (name === 'date' && value && tuesdayDisabled && isTuesday(value)) {
      setError('Sorry, reservations are not available on Tuesdays. Please select a different date.');
      return;
    }

    setForm({ ...form, [name]: value });
    setError('');
  };

  
  useEffect(() => {
    const canCheck = form.restaurant_id && form.date;
    if (!canCheck) {
      setDateClosed(false);
      return;
    }
    let cancelled = false;
    api.getReservationAvailability({
      restaurant_id: form.restaurant_id,
      date: form.date,
      time: form.time || '19:00',
    })
      .then((result) => {
        if (cancelled) return;
        const closed = !result?.available;
        setDateClosed(closed);
        if (closed) setError('Reservations are closed for the selected day/service period.');
      })
      .catch(() => {
        if (!cancelled) setDateClosed(false);
      });
    return () => { cancelled = true; };
  }, [form.restaurant_id, form.date, form.time]);

const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.date || !form.time || !form.restaurant_id) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!/^\d{10}$/.test(form.phone)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }

    // Extra server-side guard: block Tuesday submissions
    if (tuesdayDisabled && isTuesday(form.date)) {
      setError('Sorry, reservations are not available on Tuesdays.');
      return;
    }

    // Block if paused
    if (reservationsPaused) {
      setError('Reservations are currently paused. Please try again later or contact us directly.');
      return;
    }
    if (dateClosed) {
      setError('Reservations are closed for the selected day/service period.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        phone: `1${form.phone}`,
      };

      const result = await api.createReservation(payload);

      gtagEvent('reservation_submit_success', {
        event_category: 'engagement',
        event_label: 'reservation_form',
        value: Number(form.persons) || 1,
      });

      trackGoogleAdsConversion({
        conversionLabel: process.env.REACT_APP_GOOGLE_ADS_CONVERSION_LABEL,
        value: 1,
        currency: 'USD',
        transactionId: result?.confirmation_code,
      });

      setConfirmation(result);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to create reservation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', date: '', time: '', persons: '2', restaurant_id: '', special_requests: '' });
    setSubmitted(false);
    setConfirmation(null);
  };

  const today = getLocalToday();

  return (
    <div className="min-h-screen pt-20 relative">
      <div className="indian-mandala-tl" />
      <div className="indian-mandala-br" />

      {/* Hero */}
      <section className="py-20 bg-pattern bg-indian-paisley relative overflow-hidden bg-indian-arch">
        <div className="indian-vine-left" />
        <div className="indian-vine-right" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <AnimatedSection>
            <span className="text-amber-500 dark:text-amber-400 text-sm font-semibold uppercase tracking-wider">Reservations</span>
            <div className="section-divider !mx-0" />
            <h1 className="font-display text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mt-4 mb-4">
              Reserve Your <span className="text-gold-gradient">Table</span>
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-2xl">
              Book your dining experience at RangDe Indian Cuisine.
              Instant confirmation with email notification.
            </p>
            {/* <div className="mt-6">
              <Link to="/manage-reservations" className="btn-outline-gold">
                Manage Existing Reservation
              </Link>
            </div> */}
          </AnimatedSection>
        </div>
      </section>

      {/* Reservation Form */}
      <section className="py-16 bg-neutral-50 dark:bg-dark-950 bg-indian-jali relative overflow-hidden">
        <div className="indian-vine-left" />
        <div className="indian-vine-right" />
        <div className="max-w-4xl mx-auto px-4">
          <AnimatePresence mode="wait">
            {reservationsPaused && settingsLoaded ? (
              /* ── Paused Banner ── */
              <motion.div
                key="paused"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-neutral-900 border border-red-500/20 rounded-2xl p-10 text-center shadow-sm dark:shadow-none"
              >
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PauseCircle size={40} className="text-red-500 dark:text-red-400" />
                </div>
                <h2 className="font-display text-3xl font-bold text-neutral-900 dark:text-white mb-4">
                  Reservations Paused
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 text-lg mb-3 max-w-lg mx-auto">
                  Online reservations are currently paused for the day.
                </p>
                <p className="text-neutral-500 dark:text-neutral-500 text-sm mb-8 max-w-md mx-auto">
                  We apologize for the inconvenience. Please check back later or contact us directly to make a reservation.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="tel:+16135950777"
                    className="btn-gold inline-flex items-center gap-2"
                  >
                    <Phone size={18} />
                    Call (613) 595-0777
                  </a>
                  <a
                    href="mailto:info@rangdeottawa.com"
                    className="btn-outline-gold inline-flex items-center gap-2"
                  >
                    <Mail size={18} />
                    Email Us
                  </a>
                </div>
              </motion.div>
            ) : submitted ? (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-neutral-900 border border-green-500/20 rounded-2xl p-10 text-center shadow-sm dark:shadow-none"
              >
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={40} className="text-green-500 dark:text-green-400" />
                </div>
                <h2 className="font-display text-3xl font-bold text-neutral-900 dark:text-white mb-4">Reservation Confirmed!</h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-8">
                  Your table has been reserved. A confirmation email will be sent to{' '}
                  <span className="text-amber-500 dark:text-amber-400">{confirmation?.email || form.email}</span>.
                </p>

                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-6 max-w-md mx-auto mb-8 text-left space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 text-sm">Confirmation Code</span>
                    <span className="text-amber-500 dark:text-amber-400 font-bold">{confirmation?.confirmation_code || 'MAS-XXXXXX'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 text-sm">Name</span>
                    <span className="text-neutral-900 dark:text-white text-sm">{confirmation?.name || form.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 text-sm">Date</span>
                    <span className="text-neutral-900 dark:text-white text-sm">{formatDateOnly(confirmation?.date || form.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 text-sm">Time</span>
                    <span className="text-neutral-900 dark:text-white text-sm">{confirmation?.time || form.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 text-sm">Guests</span>
                    <span className="text-neutral-900 dark:text-white text-sm">{confirmation?.persons || form.persons}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 text-sm">Restaurant</span>
                    <span className="text-neutral-900 dark:text-white text-sm">{restaurants.find(r => r.id === parseInt(form.restaurant_id))?.name || '—'}</span>
                  </div>
                </div>

                <button onClick={resetForm} className="btn-gold">
                  Make Another Reservation
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 md:p-10 shadow-sm dark:shadow-none">
                  <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white mb-8">
                    Fill in Your Details
                  </h2>

                  {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  {!error && dateClosed && (
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 text-sm">
                      Reservations are closed for the selected day/service period.
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Full Name *</label>
                      <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" className="input-dark" required />
                    </div>
                    <div>
                      <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Email Address *</label>
                      <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="your@email.com" className="input-dark" required />
                    </div>
                    <div>
                      <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Phone Number *</label>
                      <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="4373761995" className="input-dark" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} minLength={10} required />
                    </div>
                    <div>
                      <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Restaurant Branch *</label>
                      <select name="restaurant_id" value={form.restaurant_id} onChange={handleChange} className="select-dark" required>
                        <option value="">Select a location</option>
                        {restaurants.map(r => (
                          <option key={r.id} value={r.id}>{r.name || r.brand} — {r.city}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Date of Visit *</label>
                      <input type="date" name="date" value={form.date} onChange={handleChange} min={today} className="input-dark" required />
                    </div>
                    <div>
                      <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Preferred Time *</label>
                      <select name="time" value={form.time} onChange={handleChange} className="select-dark" required>
                        <option value="">Select time</option>
                        {timeSlots.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Number of Guests *</label>
                      <select name="persons" value={form.persons} onChange={handleChange} className="select-dark" required>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Special Requests (Optional)</label>
                      <textarea name="special_requests" value={form.special_requests} onChange={handleChange} placeholder="Any dietary requirements, celebrations, seating preferences..." rows={3} className="input-dark resize-none" />
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                    <button type="submit" disabled={submitting || dateClosed} className="btn-gold w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
                      {submitting ? (
                        <><Loader2 size={18} className="mr-2 animate-spin" /> Booking...</>
                      ) : (
                        <>Confirm Reservation <ArrowRight size={18} className="ml-2" /></>
                      )}
                    </button>
                    <p className="text-neutral-400 dark:text-neutral-600 text-xs">
                      You'll receive an email confirmation instantly.
                    </p>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info cards */}
          <div className="grid sm:grid-cols-3 gap-6 mt-12">
            {[
              { icon: CalendarDays, title: 'Instant Confirmation', desc: 'Your reservation is confirmed immediately.' },
              { icon: Mail, title: 'Email Notification', desc: 'Receive confirmation and reminder emails.' },
              { icon: Phone, title: 'Need Help?', desc: 'Email info@rangdeottawa.com for assistance.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <AnimatedSection key={item.title} delay={i * 0.1}>
                  <div className="bg-white/80 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 text-center shadow-sm dark:shadow-none">
                    <Icon size={24} className="text-amber-500 dark:text-amber-400 mx-auto mb-3" />
                    <h3 className="text-neutral-900 dark:text-white font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-neutral-500 text-xs">{item.desc}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
