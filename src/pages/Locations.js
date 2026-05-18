import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { MapPin, Phone, Mail, Globe, Clock, ExternalLink, Navigation } from 'lucide-react';
import api from '../api';

const CALIFORNIA_PHONE = '(408) 352-5097';

function formatPhoneDisplay(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return String(value || '').trim();
}

function resolveDisplayPhone(restaurant) {
  const slug = String(restaurant?.slug || '').toLowerCase();
  const raw = String(restaurant?.phone || '').trim();
  const digits = raw.replace(/\D/g, '');

  // Always show the verified California number in consistent format.
  if (slug === 'california') {
    return CALIFORNIA_PHONE;
  }

  if (!raw || digits === '0000000000' || digits === '10000000000') return '';
  return formatPhoneDisplay(raw);
}

function resolveTelLink(phone) {
  return `+${String(phone || '').replace(/\D/g, '')}`;
}

function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const locationImages = {
  wellington: 'from-amber-900/30 to-red-900/20',
  stittsville: 'from-emerald-900/30 to-amber-900/20',
  montreal: 'from-blue-900/30 to-purple-900/20',
  rangde: 'from-orange-900/30 to-pink-900/20',
  restobar: 'from-violet-900/30 to-amber-900/20',
  california: 'from-cyan-900/30 to-amber-900/20',
};

const locationDetails = {
  wellington: { hours: 'Mon-Sun: 11:30 AM - 10:00 PM', maps: 'https://maps.google.com/?q=1111+Wellington+St+W+Ottawa+ON+K1Y+1P1' },
  stittsville: { hours: 'Mon-Sun: 11:30 AM - 10:00 PM', maps: 'https://maps.google.com/?q=5507+Hazeldean+Rd+Unit+C3-1+Stittsville+ON+K2S+0P5', badge: 'Main Branch' },
  montreal: { hours: 'Mon-Sun: 12:00 PM - 10:00 PM', maps: 'https://maps.google.com/?q=1015+Sherbrooke+St+W+Montreal+Quebec+H3A+1G5', badge: 'New' },
  rangde: { hours: 'Mon-Sun: 11:30 AM - 10:00 PM', maps: 'https://maps.google.com/?q=700+March+Rd+Unit+H+Kanata+ON+K2K+2V9' },
  restobar: { hours: 'Mon-Thu: 4:00 PM - 12:00 AM, Fri-Sun: 12:00 PM - 2:00 AM', maps: 'https://maps.google.com/?q=97+Clarence+St+Ottawa+ON+K1N+5P9' },
  california: { hours: 'Now Open', maps: 'https://maps.google.com/?q=10310+S+De+Anza+Blvd+Cupertino+CA+95014', badge: 'USA' },
};

function LocationCard({ restaurant, delay = 0 }) {
  const details = locationDetails[restaurant.slug] || {};
  const gradient = locationImages[restaurant.slug] || 'from-amber-900/20 to-neutral-900';
  const displayPhone = resolveDisplayPhone(restaurant);

  return (
    <AnimatedSection delay={delay}>
      <div className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden card-hover gold-glow-hover h-full flex flex-col shadow-sm dark:shadow-none">
        <div className={`h-32 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
          <MapPin size={44} className="text-white/10 group-hover:text-white/20 transition-colors" />
          {details.badge && (
            <span className="absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/90 text-black">
              {details.badge}
            </span>
          )}
        </div>

        <div className="p-6 flex-1 flex flex-col">
          <h3 className="text-neutral-900 dark:text-white font-semibold text-xl mb-1">{restaurant.name || restaurant.brand}</h3>
          <p className="text-amber-500 dark:text-amber-400/80 text-sm font-medium mb-4">{restaurant.brand}</p>

          <div className="space-y-3 mb-6 flex-1">
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-neutral-400 dark:text-neutral-500 mt-0.5 flex-shrink-0" />
              <span className="text-neutral-500 dark:text-neutral-400 text-sm">
                {restaurant.address}, {restaurant.city}, {restaurant.province_state}, {restaurant.country}
              </span>
            </div>

            {displayPhone && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
                <a href={`tel:${resolveTelLink(displayPhone)}`} className="text-neutral-500 dark:text-neutral-400 text-sm hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                  {displayPhone}
                </a>
              </div>
            )}

            {restaurant.email && (
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
                <a href={`mailto:${restaurant.email}`} className="text-neutral-500 dark:text-neutral-400 text-sm hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                  {restaurant.email}
                </a>
              </div>
            )}

            {details.hours && (
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-neutral-400 dark:text-neutral-500 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-500 dark:text-neutral-400 text-sm">{details.hours}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Link to="/reservations" className="flex-1 text-center px-4 py-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-all">
              Reserve
            </Link>
            <Link to="/menu" className="flex-1 text-center px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all">
              View Menu
            </Link>
            {details.maps && (
              <a href={details.maps} target="_blank" rel="noopener noreferrer" className="px-3 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all" title="Open in Google Maps">
                <Navigation size={16} />
              </a>
            )}
          </div>

          {restaurant.website && (
            <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 text-neutral-400 dark:text-neutral-500 text-xs hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
              <Globe size={12} /> {restaurant.website.replace('https://', '')}
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </AnimatedSection>
  );
}

export default function Locations() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRestaurants()
      .then(data => {
        setRestaurants(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const usaLocations = restaurants.filter((restaurant) => {
    const country = (restaurant.country || '').toLowerCase();
    return country.includes('usa') || country.includes('united states');
  });

  const canadaLocations = restaurants.filter((restaurant) => {
    const country = (restaurant.country || '').toLowerCase();
    return country.includes('canada');
  });

  return (
    <div className="min-h-screen pt-20 relative">
      <div className="indian-mandala-tl" />
      <div className="indian-mandala-br" />

      <section className="py-20 bg-pattern bg-indian-paisley relative overflow-hidden bg-indian-arch">
        <div className="indian-vine-left" />
        <div className="indian-vine-right" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <AnimatedSection>
            <span className="text-amber-500 dark:text-amber-400 text-sm font-semibold uppercase tracking-wider">Our Locations</span>
            <div className="section-divider !mx-0" />
            <h1 className="font-display text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mt-4 mb-4">
              Find a <span className="text-gold-gradient">Location</span> Near You
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-2xl">
              Browse all branches grouped by country.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-16 bg-neutral-50 dark:bg-dark-950 bg-section-indian relative overflow-hidden">
        <div className="indian-vine-left" />
        <div className="indian-vine-right" />
        <div className="max-w-7xl mx-auto px-4">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                  <div className="skeleton h-40 mb-6 rounded-xl" />
                  <div className="skeleton h-6 w-3/4 mb-3" />
                  <div className="skeleton h-4 w-1/2 mb-6" />
                  <div className="skeleton h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-12">
              <div>
                <AnimatedSection className="mb-6">
                  <h2 className="font-display text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white">Canada</h2>
                </AnimatedSection>
                {canadaLocations.length === 0 ? (
                  <p className="text-neutral-500 dark:text-neutral-400">No Canada locations available yet.</p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {canadaLocations
                      .sort((a, b) => {
                        // Put RangDe locations first
                        const aIsRangDe = (a.slug === 'rangde' || (a.brand || '').toLowerCase().includes('rangde')) ? 0 : 1;
                        const bIsRangDe = (b.slug === 'rangde' || (b.brand || '').toLowerCase().includes('rangde')) ? 0 : 1;
                        return aIsRangDe - bIsRangDe;
                      })
                      .map((restaurant, i) => (
                      <LocationCard key={restaurant.id || restaurant.slug || `canada-${i}`} restaurant={restaurant} delay={i * 0.08} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <AnimatedSection className="mb-6">
                  <h2 className="font-display text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white">USA</h2>
                </AnimatedSection>
                {usaLocations.length === 0 ? (
                  <p className="text-neutral-500 dark:text-neutral-400">No USA locations available yet.</p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {usaLocations.map((restaurant, i) => (
                      <LocationCard key={restaurant.id || restaurant.slug || `usa-${i}`} restaurant={restaurant} delay={i * 0.08} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
