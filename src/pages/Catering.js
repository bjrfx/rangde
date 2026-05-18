import React, { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Users, CalendarDays, MapPin, Utensils, Check, Loader2, ArrowRight, PartyPopper, Phone } from 'lucide-react';

function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay }} className={className}>
      {children}
    </motion.div>
  );
}

const eventTypes = ['Wedding', 'Corporate Event', 'Birthday Party', 'Anniversary', 'Festival/Holiday', 'Private Dining', 'Other'];

const packages = [
  {
    name: 'Silver',
    guests: 'Ideal for small events',
    price: 'Starting at $18/person',
    features: ['2 curries (Veg/Paneer)', '2 appetizers (2Veg)', 'Steamed Rice', 'Butter Naan', 'Dessert (Gulab Jamun)'],
  },
  {
    name: 'Gold',
    guests: 'Ideal for medium events',
    price: 'Starting at $23/person',
    features: ['3 curries (2Veg/Paneer)', '3 appetizers (3Veg)', 'Steamed Rice', 'Butter Naan', 'Dessert (Gulab Jamun)'],
    featured: true,
  },
  {
    name: 'Platinum',
    guests: 'Ideal for large events',
    price: 'Starting at $28/person',
    features: ['4 curries (2Veg/2Paneer)', '4 appetizers (3Veg/Paneer)', 'Steamed Rice', 'Butter Naan', 'Dessert (Gulab Jamun)'],
  },
];

export default function Catering() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', event_date: '', guests: '', event_location: '', event_type: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setForm({ ...form, phone: digitsOnly });
      setError('');
      return;
    }

    setForm({ ...form, [name]: value });
    setError('');
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.event_date || !form.guests) { setError('Please fill in all required fields.'); return; }
    if (!/^\d{10}$/.test(form.phone)) { setError('Phone number must be exactly 10 digits.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        phone: `1${form.phone}`,
      };
      const response = await fetch('/api/catering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to submit request.');
      setSubmitted(true);
    }
    catch (err) { setError(err.message || 'Failed to submit request. Please try again.'); }
    finally { setSubmitting(false); }
  };
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen pt-20 relative">
      <div className="indian-mandala-tl" /><div className="indian-mandala-br" />
      {/* Hero */}
      <section className="py-20 bg-pattern bg-indian-paisley relative overflow-hidden bg-indian-arch">
        <div className="indian-vine-left" /><div className="indian-vine-right" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <AnimatedSection>
            <span className="text-amber-500 dark:text-amber-400 text-sm font-semibold uppercase tracking-wider">Catering Services</span>
            <div className="section-divider !mx-0" />
            <h1 className="font-display text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mt-4 mb-4">Ordering for an <span className="text-gold-gradient">Event/Party?</span></h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-2xl">From intimate gatherings to grand celebrations — let RangDe bring the finest Indian cuisine to your event.</p>
          </AnimatedSection>
        </div>
      </section>

      {/* Packages */}
      <section className="py-16 bg-neutral-50 dark:bg-neutral-950 bg-section-indian relative overflow-hidden bg-indian-border-bottom">
        <div className="max-w-7xl mx-auto px-4">
          <AnimatedSection className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white">Catering <span className="text-gold-gradient">Packages</span></h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-8">
            {packages.map((pkg, i) => (
              <AnimatedSection key={pkg.name} delay={i * 0.1}>
                <div className={`bg-white dark:bg-neutral-900 border rounded-2xl p-8 h-full flex flex-col card-hover shadow-sm dark:shadow-none ${pkg.featured ? 'border-amber-500/30 gold-glow' : 'border-neutral-200 dark:border-neutral-800'} relative`}>
                  {pkg.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-4 py-1 rounded-full">Most Popular</span>}
                  <h3 className="font-display text-2xl font-bold text-neutral-900 dark:text-white mb-2">{pkg.name}</h3>
                  <p className="text-amber-500 dark:text-amber-400 font-semibold mb-1">{pkg.price}</p>
                  <p className="text-neutral-500 text-sm mb-6">{pkg.guests} guests</p>
                  <ul className="space-y-3 flex-1">
                    {pkg.features.map(f => <li key={f} className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300 text-sm"><Check size={16} className="text-amber-500 dark:text-amber-400 flex-shrink-0" /> {f}</li>)}
                  </ul>
                  <a href="#catering-form" className={`mt-8 text-center block py-3 rounded-lg font-semibold transition-all ${pkg.featured ? 'btn-gold' : 'btn-outline-gold'}`}>Get Quote</a>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="catering-form" className="py-16 bg-neutral-50 dark:bg-dark-950 bg-indian-jali relative overflow-hidden">
        <div className="indian-vine-left" /><div className="indian-vine-right" />
        <div className="max-w-4xl mx-auto px-4">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-neutral-900 border border-green-500/20 rounded-2xl p-10 text-center shadow-sm dark:shadow-none">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><PartyPopper size={40} className="text-green-500 dark:text-green-400" /></div>
                <h2 className="font-display text-3xl font-bold text-neutral-900 dark:text-white mb-4">Request Submitted!</h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-8">Our team will contact you within 24 hours.</p>
                <button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', event_date: '', guests: '', event_location: '', event_type: '', notes: '' }); }} className="btn-gold">Submit Another Request</button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 md:p-10 shadow-sm dark:shadow-none">
                  <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white mb-2">Request Catering</h2>
                  <p className="text-neutral-500 text-sm mb-8">Fill in your event details and we'll get back to you with a custom quote.</p>
                  {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 dark:text-red-400 text-sm">{error}</div>}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Full Name *</label><input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your name" className="input-dark" required /></div>
                    <div><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Email Address *</label><input type="email" name="email" value={form.email} onChange={handleChange} placeholder="your@email.com" className="input-dark" required /></div>
                    <div><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Phone Number *</label><input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="4373761995" className="input-dark" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} minLength={10} required /></div>
                    <div><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Event Type</label><select name="event_type" value={form.event_type} onChange={handleChange} className="select-dark"><option value="">Select type</option>{eventTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Event Date *</label><input type="date" name="event_date" value={form.event_date} onChange={handleChange} min={today} className="input-dark" required /></div>
                    <div><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Number of Guests *</label><input type="number" name="guests" value={form.guests} onChange={handleChange} min="10" placeholder="Estimated" className="input-dark" required /></div>
                    <div className="md:col-span-2"><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Event Location</label><input type="text" name="event_location" value={form.event_location} onChange={handleChange} placeholder="Venue name and address" className="input-dark" /></div>
                    <div className="md:col-span-2"><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Additional Notes</label><textarea name="notes" value={form.notes} onChange={handleChange} rows={4} placeholder="Dietary requirements, theme preferences..." className="input-dark resize-none" /></div>
                  </div>
                  <div className="mt-8"><button type="submit" disabled={submitting} className="btn-gold disabled:opacity-50">{submitting ? <><Loader2 size={18} className="mr-2 animate-spin" /> Submitting...</> : <>Submit Request <ArrowRight size={18} className="ml-2" /></>}</button></div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
