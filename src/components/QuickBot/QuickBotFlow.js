const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

function toSafeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return String(value || '').trim();
}

export function normalizePhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function buildTelNumber(rawPhone, countryCode) {
  const digits = normalizePhoneDigits(rawPhone);
  if (!digits) return '';
  if (digits.startsWith('1') && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `${countryCode}${digits}`;
  }
  return `+${digits}`;
}

function formatPhoneDisplay(rawPhone) {
  const digits = normalizePhoneDigits(rawPhone);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return normalizeString(rawPhone);
}

function normalizeMenuText(value) {
  return normalizeString(value).toLowerCase().replace(/\s+/g, ' ');
}

function safeParsePrice(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fallbackRestaurantName(location) {
  return location?.name || 'Selected Location';
}

function locationMatchesRestaurant(location, restaurant) {
  if (!location || !restaurant) return false;
  const slug = normalizeString(location.slug).toLowerCase();
  const locationName = normalizeMenuText(location.name);
  const locationTokens = locationName.split(',').map((token) => token.trim()).filter(Boolean);
  const primaryToken = locationTokens[0] || '';
  const secondaryToken = locationTokens[1] || '';
  const restaurantName = normalizeMenuText(restaurant.name);
  const restaurantSlug = normalizeString(restaurant.slug).toLowerCase();
  const restaurantCity = normalizeMenuText(restaurant.city);
  const restaurantState = normalizeMenuText(restaurant.province_state || restaurant.state || '');
  const restaurantCountry = normalizeMenuText(restaurant.country || '');
  const aliases = toSafeArray(location.aliases).map((alias) => normalizeMenuText(alias));

  if (slug && slug === restaurantSlug) return true;
  if (slug && restaurantName.includes(slug)) return true;
  if (primaryToken && (restaurantName.includes(primaryToken) || restaurantCity.includes(primaryToken))) return true;
  if (secondaryToken && (restaurantName.includes(secondaryToken) || restaurantState.includes(secondaryToken) || restaurantCountry.includes(secondaryToken))) return true;
  if (aliases.some((alias) => alias && (restaurantName.includes(alias) || restaurantCity.includes(alias) || restaurantState.includes(alias) || restaurantSlug.includes(alias)))) return true;
  return false;
}

export function resolveRestaurantForLocation(location, restaurants) {
  const source = toSafeArray(restaurants);
  const explicitId = Number(location?.restaurantId);
  if (Number.isFinite(explicitId) && explicitId > 0) {
    const idMatch = source.find((restaurant) => Number(restaurant.id) === explicitId);
    if (idMatch) return idMatch;
  }

  const match = source.find((restaurant) => locationMatchesRestaurant(location, restaurant));
  if (match) return match;

  if (source.length === 1) {
    return source[0];
  }

  const locationHint = normalizeMenuText(location?.name || '');
  const hintMatch = source.find((restaurant) => {
    const city = normalizeMenuText(restaurant.city);
    const state = normalizeMenuText(restaurant.province_state || restaurant.state || '');
    const name = normalizeMenuText(restaurant.name);
    return (city && locationHint.includes(city)) || (state && locationHint.includes(state)) || (name && locationHint.includes(name));
  });

  return hintMatch || null;
}

function normalizeReservationItem(item) {
  return {
    id: item.id,
    date: item.date,
    time: item.time,
    persons: item.persons,
    special_requests: item.special_requests || '',
    restaurant_name: item.restaurant_name || item.restaurant || '',
    status: item.status || 'confirmed',
    confirmation_code: item.confirmation_code || '',
  };
}

function normalizeCategory(item) {
  const id = item?.id ?? item?.category_id ?? item?.key ?? item?.slug ?? '';
  const name = item?.name || item?.label || item?.slug || String(id);
  return {
    id: String(id),
    name: String(name),
    slug: normalizeMenuText(name).replace(/[^a-z0-9]+/g, '-'),
  };
}

function normalizeMenuItem(item) {
  return {
    id: item.id,
    name: item.name || 'Menu Item',
    price: safeParsePrice(item.price),
    description: item.description || '',
    spice_level: item.spice_level || 'medium',
    image_url: item.image_url || item?.images?.[0]?.source || '',
    category_id: item.category_id != null ? String(item.category_id) : '',
    category_name: item.category_name || '',
  };
}

function normalizeRestaurant(item, config) {
  const locationMatch = toSafeArray(config.locations).find((location) => locationMatchesRestaurant(location, item));
  const sourcePhone = item.phone || locationMatch?.fallbackPhone || '';
  return {
    id: item.id,
    name: item.name || locationMatch?.name || 'Restaurant',
    address: [item.address, item.city, item.province_state].filter(Boolean).join(', '),
    phone: formatPhoneDisplay(sourcePhone),
    opening_hours: item.opening_hours || item.hours || 'Call for latest hours',
    slug: item.slug || locationMatch?.slug || '',
    menuBranch: locationMatch?.menuBranch || null,
  };
}

async function requestJSON(config, endpoint, options = {}) {
  const response = await fetch(`${config.apiBase}${endpoint}`, {
    ...options,
    headers: {
      ...JSON_HEADERS,
      ...(options.headers || {}),
    },
  });

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    payload = { error: 'Unable to parse server response.' };
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}

async function fetchMenuWithBranchFallback(config, location, categoryId) {
  const branch = location?.menuBranch || config.defaultMenuBranch || undefined;
  const params = new URLSearchParams();
  if (branch) params.set('branch', branch);
  if (categoryId) params.set('category', categoryId);

  const menuItems = await requestJSON(config, `/menu${params.toString() ? `?${params}` : ''}`);
  return toSafeArray(menuItems).map(normalizeMenuItem);
}

export function createQuickBotAPI(config) {
  return {
    async findReservations({ email, phone }) {
      const payload = await requestJSON(config, '/reservations/manage', {
        method: 'POST',
        body: JSON.stringify({ email: normalizeString(email), phone: normalizeString(phone) }),
      });

      return toSafeArray(payload).map(normalizeReservationItem);
    },

    async createReservation({
      location,
      restaurants,
      name,
      email,
      phone,
      date,
      time,
      persons,
      special_requests,
    }) {
      const restaurant = resolveRestaurantForLocation(location, restaurants);
      if (!restaurant?.id) {
        throw new Error('Unable to resolve restaurant location for booking.');
      }

      return requestJSON(config, '/reservations', {
        method: 'POST',
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          name: normalizeString(name),
          email: normalizeString(email),
          phone: normalizeString(phone),
          date,
          time,
          persons: Number(persons),
          special_requests: normalizeString(special_requests),
        }),
      });
    },

    async updateReservation({ id, lookup_email, lookup_phone, date, time, persons, special_requests }) {
      return requestJSON(config, `/reservations/manage/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          lookup_email: normalizeString(lookup_email),
          lookup_phone: normalizeString(lookup_phone),
          date,
          time,
          persons: Number(persons),
          special_requests: normalizeString(special_requests),
        }),
      });
    },

    async getCategories(location) {
      const params = new URLSearchParams();
      const branch = location?.menuBranch || config.defaultMenuBranch || undefined;
      if (branch) params.set('branch', branch);
      const payload = await requestJSON(config, `/categories${params.toString() ? `?${params}` : ''}`);
      return toSafeArray(payload).map(normalizeCategory);
    },

    async getMenuByCategory({ location, categoryId }) {
      return fetchMenuWithBranchFallback(config, location, categoryId);
    },

    async searchMenu({ location, query }) {
      const normalizedQuery = normalizeMenuText(query);
      const items = await fetchMenuWithBranchFallback(config, location);
      if (!normalizedQuery) return items;

      return items.filter((item) => {
        const name = normalizeMenuText(item.name);
        const description = normalizeMenuText(item.description);
        const categoryName = normalizeMenuText(item.category_name);
        return name.includes(normalizedQuery) || description.includes(normalizedQuery) || categoryName.includes(normalizedQuery);
      });
    },

    async submitCatering({ event_type, event_date, guests, event_location, notes, name, email, phone }) {
      return requestJSON(config, '/catering', {
        method: 'POST',
        body: JSON.stringify({
          event_type: normalizeString(event_type),
          event_date,
          guests: Number(guests),
          event_location: normalizeString(event_location),
          notes: normalizeString(notes),
          name: normalizeString(name),
          email: normalizeString(email),
          phone: normalizeString(phone),
        }),
      });
    },

    async submitContact({ name, email, phone, message }) {
      return requestJSON(config, '/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: normalizeString(name),
          email: normalizeString(email),
          phone: normalizeString(phone),
          subject: 'general',
          message: normalizeString(message),
        }),
      });
    },

    async getRestaurants() {
      const payload = await requestJSON(config, '/restaurants');
      return toSafeArray(payload).map((restaurant) => normalizeRestaurant(restaurant, config));
    },
  };
}

export function getActions({ hasReservations }) {
  if (hasReservations) {
    return [
      { id: 'view-reservations', label: 'View My Reservations' },
      // { id: 'update-reservation', label: 'Update Reservation' },
      { id: 'book-table', label: 'Book New Table' },
      { id: 'catering', label: 'Catering Request' },
      { id: 'contact', label: 'Contact Us' },
      { id: 'view-menu', label: 'View Menu' },
      { id: 'search-menu', label: 'Search Menu Item' },
      { id: 'locations', label: 'Restaurant Locations' },
      { id: 'call', label: 'Call Restaurant' },
    ];
  }

  return [
    { id: 'book-table', label: 'Book a Table' },
    { id: 'view-menu', label: 'View Menu' },
    { id: 'search-menu', label: 'Search Menu Item' },
    { id: 'catering', label: 'Catering Request' },
    { id: 'contact', label: 'Contact Us' },
    { id: 'locations', label: 'Restaurant Locations' },
    { id: 'call', label: 'Call Restaurant' },
  ];
}

export function getLocationOptions(config, restaurants) {
  return toSafeArray(config.locations).map((location) => {
    const restaurant = resolveRestaurantForLocation(location, restaurants);
    const sourcePhone = restaurant?.phone || location.fallbackPhone || '';
    return {
      ...location,
      restaurantName: restaurant?.name || fallbackRestaurantName(location),
      phone: formatPhoneDisplay(sourcePhone),
      tel: buildTelNumber(sourcePhone, config.defaultCallCountryCode || '+1'),
    };
  });
}

export function getStepProgress(meta) {
  if (!meta || !meta.total) return 0;
  return Math.min(100, Math.round(((meta.step + 1) / meta.total) * 100));
}
