import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { MapPin, Phone, Mail, Globe, Clock, ExternalLink, Navigation } from 'lucide-react';
import api from '../api';
import {
  buildTelHref, formatLocationAddress, formatPhoneDisplay, getCountryLocations, getDirectionsUrl,
  getLocationImageUrl, getOpeningHoursLines, getWebsiteLabel, getWebsiteUrl, isLocationNew,
} from '../utils/locationHelpers';

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

// Fallback header styling when a location has no image_url.
const locationImages = {
  wellington: 'from-amber-900/30 to-red-900/20',
  stittsville: 'from-emerald-900/30 to-amber-900/20',
  montreal: 'from-blue-900/30 to-purple-900/20',
  rangde: 'from-orange-900/30 to-pink-900/20',
  restobar: 'from-violet-900/30 to-amber-900/20',
  california: 'from-cyan-900/30 to-amber-900/20',
};

function LocationCard({ restaurant, delay = 0 }) {
  const [imageFailed, setImageFailed] = useState(false);
  const gradient = locationImages[restaurant.slug] || 'from-amber-900/20 to-neutral-900';
  const displayPhone = formatPhoneDisplay(restaurant.phone);
  const imageUrl = getLocationImageUrl(restaurant);
  const hoursLines = getOpeningHoursLines(restaurant);
  const directionsUrl = getDirectionsUrl(restaurant);
  const websiteUrl = getWebsiteUrl(restaurant);
  const badges = [restaurant.badge_label, isLocationNew(restaurant) ? 'New' : null].filter(Boolean);

  return (
    <AnimatedSection delay={delay}>
      <div className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden card-hover gold-glow-hover h-full flex flex-col shadow-sm dark:shadow-none">
        <div className={`h-44 bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
          {imageUrl && !imageFailed ? (
            <>
              <img
                src={imageUrl}
                alt={restaurant.name || restaurant.brand || 'Restaurant location'}
                loading="lazy"
                onError={() => setImageFailed(true)}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/20" />
            </>
          ) : (
            <MapPin size={44} className="text-white/10 group-hover:text-white/20 transition-colors" />
          )}
          {badges.length > 0 && (
            <div className="absolute top-3 right-3 flex flex-wrap justify-end gap-2">
              {badges.map((badge) => (
                <span key={badge} className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/90 text-black shadow-sm">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 flex-1 flex flex-col">
          <h3 className="text-neutral-900 dark:text-white font-semibold text-xl mb-1">{restaurant.name || restaurant.brand}</h3>
          <p className="text-amber-500 dark:text-amber-400/80 text-sm font-medium mb-4">{restaurant.brand}</p>

          <div className="space-y-3 mb-6 flex-1">
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-neutral-400 dark:text-neutral-500 mt-0.5 flex-shrink-0" />
              <span className="text-neutral-500 dark:text-neutral-400 text-sm">
                {formatLocationAddress(restaurant)}
              </span>
            </div>

            {displayPhone && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
                <a href={buildTelHref(displayPhone)} className="text-neutral-500 dark:text-neutral-400 text-sm hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                  {displayPhone}
                </a>
              </div>
            )}

            {restaurant.email && (
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
                <a href={`mailto:${restaurant.email}`} className="text-neutral-500 dark:text-neutral-400 text-sm hover:text-amber-500 dark:hover:text-amber-400 transition-colors break-all">
                  {restaurant.email}
                </a>
              </div>
            )}

            {hoursLines.length > 0 && (
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-neutral-400 dark:text-neutral-500 mt-0.5 flex-shrink-0" />
                <div className="text-neutral-500 dark:text-neutral-400 text-sm space-y-0.5">
                  {hoursLines.map((line) => <div key={line}>{line}</div>)}
                </div>
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
            {directionsUrl && (
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all" title="Open in Google Maps" aria-label="Open in Google Maps">
                <Navigation size={16} />
              </a>
            )}
          </div>

          {websiteUrl && (
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 text-neutral-400 dark:text-neutral-500 text-xs hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
              <Globe size={12} /> {getWebsiteLabel(restaurant)}
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </AnimatedSection>
  );
}

export default function Locations() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLocations()
      .then(data => {
        setCountries(Array.isArray(data?.countries) ? data.countries : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

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
              {countries.map((country, countryIndex) => {
                const countryLocations = getCountryLocations(country);
                return (
                  <div key={country.id || country.name}>
                    <AnimatedSection className="mb-6" delay={countryIndex * 0.05}>
                      <h2 className="font-display text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white">{country.name}</h2>
                    </AnimatedSection>
                    {countryLocations.length === 0 ? (
                      <p className="text-neutral-500 dark:text-neutral-400">No {country.name} locations available yet.</p>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {countryLocations.map((restaurant, i) => (
                          <LocationCard key={restaurant.id || restaurant.slug || `${country.name}-${i}`} restaurant={restaurant} delay={i * 0.08} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
