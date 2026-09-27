// Shared display helpers for database-driven location cards (/locations, homepage, admin).

export function normalizePhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function formatPhoneDisplay(value) {
  const digits = normalizePhoneDigits(value);
  if (!digits || /^1?0+$/.test(digits)) return '';
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return String(value || '').trim();
}

export function buildTelHref(value) {
  const digits = normalizePhoneDigits(value);
  if (!digits) return '';
  if (digits.length === 10) return `tel:+1${digits}`;
  return `tel:+${digits}`;
}

export function formatLocationAddress(location) {
  if (!location) return '';
  const address = String(location.address || '').trim();
  const lowerAddress = address.toLowerCase();
  // Addresses are often stored in full ("123 Main St, Ottawa, ON K1A 0A1"); avoid repeating parts.
  const looksComplete = (address.match(/,/g) || []).length >= 2;
  const countryAliases = { usa: ['usa', 'united states', 'u.s.a', 'u.s.'], canada: ['canada'] };
  const extras = [];
  const city = String(location.city || '').trim();
  if (city && !lowerAddress.includes(city.toLowerCase())) extras.push(city);
  const province = String(location.province_state || '').trim();
  if (province && !looksComplete && !lowerAddress.includes(province.toLowerCase())) extras.push(province);
  const country = String(location.country || '').trim();
  if (country) {
    const aliases = countryAliases[country.toLowerCase()] || [country.toLowerCase()];
    if (!aliases.some((alias) => lowerAddress.includes(alias))) extras.push(country);
  }
  return [address, ...extras].filter(Boolean).join(', ');
}

export function getOpeningHoursLines(location) {
  if (!location) return [];
  if (Array.isArray(location.opening_hours_lines)) return location.opening_hours_lines.filter(Boolean);
  const raw = location.opening_hours;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  return String(raw).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function ensureAbsoluteUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url)) return url.startsWith('//') ? `https:${url}` : url;
  if (url.startsWith('/')) return url;
  return `https://${url}`;
}

// Uses the configured google_maps_url; otherwise falls back to a search for the address.
export function getDirectionsUrl(location) {
  const configured = ensureAbsoluteUrl(location?.google_maps_url);
  if (configured) return configured;
  const address = [formatLocationAddress(location), location?.postal_code].filter(Boolean).join(' ');
  if (!address) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function getLocationImageUrl(location) {
  return ensureAbsoluteUrl(location?.image_url);
}

export function getWebsiteUrl(location) {
  return ensureAbsoluteUrl(location?.website);
}

export function getWebsiteLabel(location) {
  return String(location?.website || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function isLocationNew(location) {
  const value = location?.is_new;
  return value === true || value === 1 || value === '1';
}

export function getCountryLocations(country) {
  return Array.isArray(country?.locations) ? country.locations : [];
}
