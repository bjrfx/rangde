import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, CheckCircle2, Clock, ExternalLink, Eye, EyeOff, Globe, ImagePlus, Loader2, Mail,
  MapPin, Pencil, Phone, Plus, Save, Sparkles, Trash2, Upload, X, Flag, AlertTriangle,
} from 'lucide-react';
import api from '../../api';
import {
  formatLocationAddress, formatPhoneDisplay, getDirectionsUrl, getLocationImageUrl, getOpeningHoursLines, isLocationNew,
} from '../../utils/locationHelpers';

const inputClass = 'mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white';
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';
const cardClass = 'rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none';
const iconButtonClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-amber-500/40 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-amber-400';

const emptyLocationForm = {
  id: null,
  name: '',
  brand: 'Masakali Indian Cuisine',
  slug: '',
  address: '',
  city: '',
  province_state: '',
  country: '',
  postal_code: '',
  latitude: '',
  longitude: '',
  phone: '',
  email: '',
  website: '',
  opening_hours: '',
  google_maps_url: '',
  image_url: '',
  display_order: '',
  badge_label: '',
  is_new: false,
  is_active: true,
};

function ordinal(value) {
  const n = Number(value) || 0;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function toLocationForm(location, fallbackCountry = '') {
  if (!location) return { ...emptyLocationForm, country: fallbackCountry };
  return {
    id: location.id,
    name: location.name || '',
    brand: location.brand || '',
    slug: location.slug || '',
    address: location.address || '',
    city: location.city || '',
    province_state: location.province_state || '',
    country: location.country || fallbackCountry,
    postal_code: location.postal_code || '',
    latitude: location.latitude ?? '',
    longitude: location.longitude ?? '',
    phone: location.phone || '',
    email: location.email || '',
    website: location.website || '',
    opening_hours: getOpeningHoursLines(location).join('\n'),
    google_maps_url: location.google_maps_url || '',
    image_url: location.image_url || '',
    display_order: location.display_order || '',
    badge_label: location.badge_label || '',
    is_new: isLocationNew(location),
    is_active: location.is_active !== false && location.is_active !== 0,
  };
}

function toLocationPayload(form) {
  return {
    ...form,
    opening_hours_lines: String(form.opening_hours || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
  };
}

function Field({ label, children, hint, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-neutral-400 dark:text-neutral-500">{hint}</span>}
    </label>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
        checked ? 'border-amber-500/40 bg-amber-500/5' : 'border-neutral-200 dark:border-neutral-700'
      }`}
    >
      <span className={`relative mt-0.5 inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-neutral-900 dark:text-white">{label}</span>
        {description && <span className="block text-xs text-neutral-500">{description}</span>}
      </span>
    </button>
  );
}

function Modal({ title, subtitle, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8">
      <div className={`w-full ${wide ? 'max-w-5xl' : 'max-w-lg'} ${cardClass} my-auto`}>
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">{footer}</div>}
      </div>
    </div>
  );
}

function LocationBadges({ location, className = '' }) {
  const badges = [];
  if (location.badge_label) badges.push({ key: 'custom', label: location.badge_label, className: 'bg-amber-500 text-black' });
  if (isLocationNew(location)) badges.push({ key: 'new', label: 'New', className: 'bg-blue-500 text-white' });
  if (!badges.length) return null;
  return (
    <div className={`flex flex-wrap justify-end gap-1.5 ${className}`}>
      {badges.map((badge) => (
        <span key={badge.key} className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-sm ${badge.className}`}>{badge.label}</span>
      ))}
    </div>
  );
}

function LocationThumb({ location, className = 'h-16 w-24' }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = getLocationImageUrl(location);
  useEffect(() => setFailed(false), [imageUrl]);

  return (
    <div className={`relative flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-amber-900/30 to-neutral-900/20 ${className}`}>
      {imageUrl && !failed ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <MapPin size={22} className="text-white/40" />
        </div>
      )}
    </div>
  );
}

function CardPreview({ form }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = getLocationImageUrl(form);
  const hours = String(form.opening_hours || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const phone = formatPhoneDisplay(form.phone);
  const directions = getDirectionsUrl(form);
  useEffect(() => setFailed(false), [imageUrl]);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="relative h-40 bg-gradient-to-br from-amber-900/30 to-red-900/20">
        {imageUrl && !failed ? (
          <>
            <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center"><MapPin size={40} className="text-white/20" /></div>
        )}
        <LocationBadges location={{ ...form }} className="absolute right-3 top-3" />
        {!form.is_active && (
          <span className="absolute left-3 top-3 rounded-full bg-neutral-900/80 px-2.5 py-0.5 text-[11px] font-semibold text-white">Hidden</span>
        )}
      </div>
      <div className="space-y-2.5 p-5">
        <div>
          <h4 className="text-base font-semibold text-neutral-900 dark:text-white">{form.name || 'Location name'}</h4>
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{form.brand || 'Brand'}</p>
        </div>
        <p className="flex items-start gap-2 text-xs text-neutral-500"><MapPin size={13} className="mt-0.5 flex-shrink-0" />{formatLocationAddress(form) || 'Address'}</p>
        {phone && <p className="flex items-center gap-2 text-xs text-neutral-500"><Phone size={13} />{phone}</p>}
        {form.email && <p className="flex items-center gap-2 text-xs text-neutral-500"><Mail size={13} />{form.email}</p>}
        {hours.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-neutral-500">
            <Clock size={13} className="mt-0.5 flex-shrink-0" />
            <div>{hours.map((line) => <div key={line}>{line}</div>)}</div>
          </div>
        )}
        <div className="flex items-center justify-between pt-1 text-xs">
          {directions ? (
            <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-amber-600 hover:underline dark:text-amber-400">
              <MapPin size={12} /> Directions <ExternalLink size={10} />
            </a>
          ) : <span className="text-neutral-400">No directions</span>}
          {form.website && <span className="inline-flex items-center gap-1 text-neutral-400"><Globe size={12} />{String(form.website).replace(/^https?:\/\//, '')}</span>}
        </div>
      </div>
    </div>
  );
}

export default function LocationManagement() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [locationModal, setLocationModal] = useState(null);
  const [countryModal, setCountryModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');

  const noticeTimer = useRef(null);

  const showNotice = (type, text) => {
    setNotice({ type, text });
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4500);
  };

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const load = useCallback(async () => {
    try {
      const data = await api.getAdminLocations();
      setCountries(Array.isArray(data?.countries) ? data.countries : []);
      setLoadError('');
    } catch (err) {
      console.error(err);
      setLoadError(err.message || 'Unable to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const listedCountries = useMemo(() => countries.filter((c) => c.is_listed !== false && c.id), [countries]);
  const countryNameOptions = useMemo(() => {
    const names = countries.map((c) => c.name);
    if (locationModal?.form?.country && !names.some((n) => n.toLowerCase() === locationModal.form.country.toLowerCase())) {
      names.push(locationModal.form.country);
    }
    return names;
  }, [countries, locationModal]);

  const totals = useMemo(() => {
    const all = countries.flatMap((c) => c.locations || []);
    return {
      countries: listedCountries.length,
      locations: all.length,
      active: all.filter((l) => l.is_active !== false).length,
      isNew: all.filter(isLocationNew).length,
    };
  }, [countries, listedCountries]);

  const runAction = async (key, action, successText) => {
    setBusyKey(key);
    try {
      const result = await action();
      if (Array.isArray(result?.countries)) setCountries(result.countries);
      else await load();
      if (successText) showNotice('success', successText);
    } catch (err) {
      console.error(err);
      showNotice('error', err.message || 'Something went wrong');
    } finally {
      setBusyKey('');
    }
  };

  const moveCountry = (index, direction) => {
    const ids = listedCountries.map((c) => c.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    runAction(`country-move-${ids[target]}`, () => api.reorderLocationCountries(ids), 'Country order updated');
  };

  const moveLocation = (country, index, direction) => {
    const ids = (country.locations || []).map((l) => l.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    runAction(`location-move-${ids[target]}`, () => api.reorderLocations(ids), 'Location order updated');
  };

  const quickUpdateLocation = (location, changes, text) => {
    const payload = toLocationPayload({ ...toLocationForm(location), ...changes });
    runAction(`location-${location.id}`, () => api.updateLocation(location.id, payload), text);
  };

  const deleteLocation = (location) => {
    if (!window.confirm(`Delete "${location.name}"? This cannot be undone.\n\nTip: use "Hide" to temporarily remove it from the website instead.`)) return;
    runAction(`location-${location.id}`, () => api.deleteLocation(location.id), 'Location deleted');
  };

  const deleteCountry = (country) => {
    if (!window.confirm(`Delete country "${country.name}"?`)) return;
    runAction(`country-${country.id}`, () => api.deleteLocationCountry(country.id), 'Country deleted');
  };

  const openLocationModal = (location, countryName = '') => {
    setFormError('');
    setLocationModal({ mode: location ? 'edit' : 'create', form: toLocationForm(location, countryName || listedCountries[0]?.name || '') });
  };

  const updateLocationField = (field, value) => {
    setLocationModal((prev) => (prev ? { ...prev, form: { ...prev.form, [field]: value } } : prev));
    setFormError('');
  };

  const saveLocation = async (event) => {
    event.preventDefault();
    if (!locationModal) return;
    setSaving(true);
    setFormError('');
    try {
      const payload = toLocationPayload(locationModal.form);
      if (locationModal.mode === 'edit') await api.updateLocation(locationModal.form.id, payload);
      else await api.createLocation(payload);
      await load();
      showNotice('success', locationModal.mode === 'edit' ? 'Location saved' : 'Location added');
      setLocationModal(null);
    } catch (err) {
      setFormError(err.message || 'Unable to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setFormError('');
    try {
      const { url } = await api.uploadLocationImage(file);
      updateLocationField('image_url', url);
    } catch (err) {
      setFormError(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const openCountryModal = (country, presetName = '') => {
    setFormError('');
    setCountryModal({
      mode: country ? 'edit' : 'create',
      form: country
        ? { id: country.id, name: country.name, display_order: country.display_order || '', is_active: country.is_active !== false }
        : { id: null, name: presetName, display_order: '', is_active: true },
    });
  };

  const saveCountry = async (event) => {
    event.preventDefault();
    if (!countryModal) return;
    setSaving(true);
    setFormError('');
    try {
      const { id, ...payload } = countryModal.form;
      if (countryModal.mode === 'edit') await api.updateLocationCountry(id, payload);
      else await api.createLocationCountry(payload);
      await load();
      showNotice('success', countryModal.mode === 'edit' ? 'Country saved' : 'Country added');
      setCountryModal(null);
    } catch (err) {
      setFormError(err.message || 'Unable to save country');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-72 rounded-lg" />
        <div className="skeleton h-40 w-full rounded-xl" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  const form = locationModal?.form;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Location Management</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage countries, location cards and their display order on the Locations page and homepage.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => openCountryModal(null)} className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-amber-500/50 hover:text-amber-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-amber-400">
            <Flag size={16} /> Add Country
          </button>
          <button type="button" onClick={() => openLocationModal(null)} className="btn-gold !px-4 !py-2.5 text-sm">
            <Plus size={16} className="mr-2" /> Add Location
          </button>
        </div>
      </div>

      {notice && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
          notice.type === 'error'
            ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            : 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
        }`}>
          {notice.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          {notice.text}
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {loadError} <button type="button" onClick={load} className="ml-2 font-semibold underline">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Countries', value: totals.countries },
          { label: 'Locations', value: totals.locations },
          { label: 'Active on website', value: totals.active },
          { label: 'Marked New', value: totals.isNew },
        ].map((stat) => (
          <div key={stat.label} className={`${cardClass} p-4`}>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-neutral-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className={`${cardClass} p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Countries</h2>
            <p className="text-xs text-neutral-500">Countries appear on the website in this order. Hidden countries are not shown.</p>
          </div>
        </div>
        {listedCountries.length === 0 ? (
          <p className="text-sm text-neutral-500">No countries yet. Add your first country to start grouping locations.</p>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {listedCountries.map((country, index) => (
              <div key={country.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-10 text-sm font-semibold text-amber-600 dark:text-amber-400">{ordinal(index + 1)}</span>
                <div className="min-w-[160px] flex-1">
                  <p className="font-medium text-neutral-900 dark:text-white">{country.name}</p>
                  <p className="text-xs text-neutral-500">{(country.locations || []).length} location{(country.locations || []).length === 1 ? '' : 's'}</p>
                </div>
                {!country.is_active && <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">Hidden</span>}
                <div className="flex items-center gap-1.5">
                  <button type="button" className={iconButtonClass} disabled={index === 0 || Boolean(busyKey)} onClick={() => moveCountry(index, -1)} title="Move up"><ArrowUp size={14} /></button>
                  <button type="button" className={iconButtonClass} disabled={index === listedCountries.length - 1 || Boolean(busyKey)} onClick={() => moveCountry(index, 1)} title="Move down"><ArrowDown size={14} /></button>
                  <button type="button" className={iconButtonClass} onClick={() => openCountryModal(country)} title="Edit country"><Pencil size={14} /></button>
                  <button type="button" className={`${iconButtonClass} hover:!text-red-500`} disabled={Boolean(busyKey)} onClick={() => deleteCountry(country)} title="Delete country"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {countries.map((country) => {
        const locations = country.locations || [];
        return (
          <section key={country.id || `unlisted-${country.name}`} className={`${cardClass} overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">{country.name}</h2>
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-600 dark:text-amber-400">
                  {locations.length} Location{locations.length === 1 ? '' : 's'}
                </span>
                {country.is_listed === false && (
                  <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">Not in country list</span>
                )}
                {country.is_listed !== false && !country.is_active && (
                  <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">Country hidden</span>
                )}
              </div>
              <div className="flex gap-2">
                {country.is_listed === false && (
                  <button type="button" onClick={() => openCountryModal(null, country.name)} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-amber-600 dark:border-neutral-700 dark:text-neutral-300">
                    <Flag size={13} /> Add to countries
                  </button>
                )}
                <button type="button" onClick={() => openLocationModal(null, country.name)} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 dark:text-amber-400">
                  <Plus size={13} /> Add location to {country.name}
                </button>
              </div>
            </div>

            {locations.length === 0 ? (
              <p className="px-6 py-6 text-sm text-neutral-500">No locations in {country.name} yet.</p>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {locations.map((location, index) => {
                  const isBusy = busyKey === `location-${location.id}`;
                  const inactive = location.is_active === false;
                  return (
                    <div key={location.id} className={`flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center ${inactive ? 'opacity-60' : ''}`}>
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <span className="w-10 flex-shrink-0 text-sm font-semibold text-amber-600 dark:text-amber-400">{ordinal(index + 1)}</span>
                        <LocationThumb location={location} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-neutral-900 dark:text-white">{location.name}</p>
                            {isLocationNew(location) && <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">New</span>}
                            {location.badge_label && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black">{location.badge_label}</span>}
                            {inactive && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">Inactive</span>}
                          </div>
                          <p className="text-xs text-amber-600/90 dark:text-amber-400/80">{location.brand}</p>
                          <p className="mt-0.5 truncate text-xs text-neutral-500">{formatLocationAddress(location)}</p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-neutral-400">
                            <span className={location.image_url ? 'text-green-600 dark:text-green-400' : ''}>{location.image_url ? '✓ Image' : 'No image'}</span>
                            <span className={location.google_maps_url ? 'text-green-600 dark:text-green-400' : ''}>{location.google_maps_url ? '✓ Maps link' : 'No maps link'}</span>
                            <span className={getOpeningHoursLines(location).length ? 'text-green-600 dark:text-green-400' : ''}>{getOpeningHoursLines(location).length ? '✓ Hours' : 'No hours'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                        {isBusy && <Loader2 size={16} className="mr-1 animate-spin text-amber-500" />}
                        <button type="button" className={iconButtonClass} disabled={index === 0 || Boolean(busyKey)} onClick={() => moveLocation(country, index, -1)} title="Move up"><ArrowUp size={14} /></button>
                        <button type="button" className={iconButtonClass} disabled={index === locations.length - 1 || Boolean(busyKey)} onClick={() => moveLocation(country, index, 1)} title="Move down"><ArrowDown size={14} /></button>
                        <button
                          type="button"
                          disabled={Boolean(busyKey)}
                          onClick={() => quickUpdateLocation(location, { is_new: !isLocationNew(location) }, isLocationNew(location) ? 'New badge removed' : 'Marked as New')}
                          className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                            isLocationNew(location) ? 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-neutral-200 text-neutral-500 hover:text-blue-600 dark:border-neutral-700 dark:text-neutral-400'
                          }`}
                          title="Toggle New badge"
                        >
                          <Sparkles size={13} /> New
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(busyKey)}
                          onClick={() => quickUpdateLocation(location, { is_active: inactive }, inactive ? 'Location is now visible' : 'Location hidden from website')}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-neutral-200 px-2.5 text-xs font-medium text-neutral-500 transition-colors hover:text-amber-600 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400"
                          title={inactive ? 'Show on website' : 'Hide from website'}
                        >
                          {inactive ? <><Eye size={13} /> Show</> : <><EyeOff size={13} /> Hide</>}
                        </button>
                        <button type="button" onClick={() => openLocationModal(location)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 dark:text-amber-400">
                          <Pencil size={13} /> Edit
                        </button>
                        <button type="button" className={`${iconButtonClass} hover:!text-red-500`} disabled={Boolean(busyKey)} onClick={() => deleteLocation(location)} title="Delete location"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {locationModal && form && (
        <Modal
          wide
          title={locationModal.mode === 'edit' ? 'Edit Location' : 'Add Location'}
          subtitle={locationModal.mode === 'edit' ? `Editing ${form.name}` : 'Create a new location card'}
          onClose={() => !saving && setLocationModal(null)}
          footer={(
            <>
              {formError && <p className="mr-auto text-sm text-red-600 dark:text-red-400">{formError}</p>}
              <button type="button" onClick={() => setLocationModal(null)} disabled={saving} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">Cancel</button>
              <button type="submit" form="location-form" disabled={saving || uploading} className="btn-gold !px-5 !py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                {locationModal.mode === 'edit' ? 'Save Changes' : 'Add Location'}
              </button>
            </>
          )}
        >
          <form id="location-form" onSubmit={saveLocation} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-7">
              <fieldset className="space-y-4">
                <legend className="mb-2 text-sm font-semibold text-neutral-900 dark:text-white">Basic information</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Location / restaurant name *" className="sm:col-span-2">
                    <input className={inputClass} value={form.name} maxLength={255} required onChange={(e) => updateLocationField('name', e.target.value)} placeholder="Masakali Indian Cuisine - Downtown" />
                  </Field>
                  <Field label="Brand">
                    <input className={inputClass} value={form.brand} maxLength={100} onChange={(e) => updateLocationField('brand', e.target.value)} placeholder="Masakali Indian Cuisine" />
                  </Field>
                  <Field label="Slug" hint="Unique ID used by reservations/menus. Leave blank to generate. Change with care.">
                    <input className={inputClass} value={form.slug} maxLength={100} onChange={(e) => updateLocationField('slug', e.target.value)} placeholder="auto-generated" />
                  </Field>
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="mb-2 text-sm font-semibold text-neutral-900 dark:text-white">Address</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Street address *" className="sm:col-span-2">
                    <input className={inputClass} value={form.address} maxLength={500} required onChange={(e) => updateLocationField('address', e.target.value)} />
                  </Field>
                  <Field label="City *">
                    <input className={inputClass} value={form.city} maxLength={100} required onChange={(e) => updateLocationField('city', e.target.value)} />
                  </Field>
                  <Field label="Province / State">
                    <input className={inputClass} value={form.province_state} maxLength={100} onChange={(e) => updateLocationField('province_state', e.target.value)} />
                  </Field>
                  <Field label="Postal / ZIP code">
                    <input className={inputClass} value={form.postal_code} maxLength={20} onChange={(e) => updateLocationField('postal_code', e.target.value)} />
                  </Field>
                  <Field label="Country *" hint={countryNameOptions.length ? '' : 'Add a country first, or type one — it will be created automatically.'}>
                    {countryNameOptions.length ? (
                      <select className={inputClass} value={form.country} required onChange={(e) => updateLocationField('country', e.target.value)}>
                        <option value="" disabled>Select a country</option>
                        {countryNameOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                    ) : (
                      <input className={inputClass} value={form.country} required maxLength={100} onChange={(e) => updateLocationField('country', e.target.value)} />
                    )}
                  </Field>
                  <Field label="Latitude">
                    <input className={inputClass} type="number" step="any" value={form.latitude} onChange={(e) => updateLocationField('latitude', e.target.value)} />
                  </Field>
                  <Field label="Longitude">
                    <input className={inputClass} type="number" step="any" value={form.longitude} onChange={(e) => updateLocationField('longitude', e.target.value)} />
                  </Field>
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="mb-2 text-sm font-semibold text-neutral-900 dark:text-white">Contact</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone">
                    <input className={inputClass} value={form.phone} maxLength={20} onChange={(e) => updateLocationField('phone', e.target.value)} placeholder="6135551234" />
                  </Field>
                  <Field label="Email">
                    <input className={inputClass} type="email" value={form.email} maxLength={255} onChange={(e) => updateLocationField('email', e.target.value)} />
                  </Field>
                  <Field label="Website" className="sm:col-span-2">
                    <input className={inputClass} value={form.website} maxLength={255} onChange={(e) => updateLocationField('website', e.target.value)} placeholder="https://" />
                  </Field>
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="mb-2 text-sm font-semibold text-neutral-900 dark:text-white">Hours, directions & image</legend>
                <Field label="Opening hours" hint="One line per entry, e.g. “Mon-Thu: 11:30 AM - 10:00 PM”.">
                  <textarea className={inputClass} rows={3} value={form.opening_hours} onChange={(e) => updateLocationField('opening_hours', e.target.value)} placeholder={'Mon-Sun: 11:30 AM - 10:00 PM'} />
                </Field>
                <Field label="Google Maps URL" hint="Used by the Directions link. If empty, a Google Maps search for the address is used.">
                  <div className="flex gap-2">
                    <input className={inputClass} value={form.google_maps_url} onChange={(e) => updateLocationField('google_maps_url', e.target.value)} placeholder="https://maps.google.com/?q=..." />
                    {form.google_maps_url && (
                      <a href={getDirectionsUrl(form)} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center rounded-lg border border-neutral-300 px-3 text-neutral-500 hover:text-amber-600 dark:border-neutral-700" title="Test link">
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </Field>
                <Field label="Image URL" hint="Paste an image URL or upload a photo (max 5 MB). Leave empty to use the default card design.">
                  <div className="flex gap-2">
                    <input className={inputClass} value={form.image_url} maxLength={500} onChange={(e) => updateLocationField('image_url', e.target.value)} placeholder="https://.../restaurant.jpg" />
                    <span className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:text-amber-600 dark:border-neutral-700 dark:text-neutral-300">
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </span>
                    {form.image_url && (
                      <button type="button" onClick={() => updateLocationField('image_url', '')} className="mt-1.5 inline-flex items-center rounded-lg border border-neutral-300 px-3 text-neutral-400 hover:text-red-500 dark:border-neutral-700" title="Remove image">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </Field>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="mb-2 text-sm font-semibold text-neutral-900 dark:text-white">Display</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Display order within country" hint="1 = first. Leave blank to keep the current position (or add to the end).">
                    <input className={inputClass} type="number" min="1" value={form.display_order} onChange={(e) => updateLocationField('display_order', e.target.value)} />
                  </Field>
                  <Field label="Custom badge (optional)" hint="e.g. “Main Branch”. Shown on the card image.">
                    <input className={inputClass} value={form.badge_label} maxLength={50} onChange={(e) => updateLocationField('badge_label', e.target.value)} />
                  </Field>
                  <Toggle checked={form.is_new} onChange={(v) => updateLocationField('is_new', v)} label="New location" description="Shows the “New” badge on the card." />
                  <Toggle checked={form.is_active} onChange={(v) => updateLocationField('is_active', v)} label="Active" description="Inactive locations are hidden from the website and reservations." />
                </div>
              </fieldset>
            </div>

            <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"><ImagePlus size={14} /> Live card preview</p>
              <CardPreview form={form} />
            </aside>
          </form>
        </Modal>
      )}

      {countryModal && (
        <Modal
          title={countryModal.mode === 'edit' ? 'Edit Country' : 'Add Country'}
          subtitle={countryModal.mode === 'edit' ? 'Renaming a country also updates all of its locations.' : 'Countries group location cards on the website.'}
          onClose={() => !saving && setCountryModal(null)}
          footer={(
            <>
              {formError && <p className="mr-auto text-sm text-red-600 dark:text-red-400">{formError}</p>}
              <button type="button" onClick={() => setCountryModal(null)} disabled={saving} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">Cancel</button>
              <button type="submit" form="country-form" disabled={saving} className="btn-gold !px-5 !py-2.5 text-sm disabled:opacity-60">
                {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                Save Country
              </button>
            </>
          )}
        >
          <form id="country-form" onSubmit={saveCountry} className="space-y-4">
            <Field label="Country name *">
              <input className={inputClass} value={countryModal.form.name} maxLength={100} required autoFocus onChange={(e) => setCountryModal((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))} placeholder="e.g. United Kingdom" />
            </Field>
            <Field label="Display order" hint="1 = shown first. Leave blank to add at the end.">
              <input className={inputClass} type="number" min="1" value={countryModal.form.display_order} onChange={(e) => setCountryModal((prev) => ({ ...prev, form: { ...prev.form, display_order: e.target.value } }))} />
            </Field>
            <Toggle
              checked={countryModal.form.is_active}
              onChange={(v) => setCountryModal((prev) => ({ ...prev, form: { ...prev.form, is_active: v } }))}
              label="Show on website"
              description="Hidden countries and their locations are not shown on the Locations page or homepage."
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
