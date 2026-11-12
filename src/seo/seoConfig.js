const envSiteUrl = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_SITE_URL)
  ? process.env.REACT_APP_SITE_URL.replace(/\/$/, '')
  : null;

export const siteSeo = {
  siteName: "RangDe Indian Cuisine",
  siteUrl: envSiteUrl || "https://rangdeottawa.com",
  brandShort: "RangDe",
  defaultTitle: "RangDe Indian Cuisine | Indian Restaurant in Kanata, Ottawa",
  defaultDescription: "RangDe Indian Cuisine at 700 March Rd Unit H, Kanata (Ottawa). Authentic Indian menu, reservations, and catering.",
  locale: "en_CA",
  ogLocale: "en_CA",
  htmlLang: 'en',
  cuisine: "Indian",
  priceRange: "$$",
  email: "info@rangdeottawa.com",
  servesCuisine: ["Indian"],
  areaServed: "Kanata, Ottawa, Ontario",
  ogImage: '/logo192.png',
  openingHours: ['Mo-Su 11:30-22:00'],
  restaurants: [
  {
    name: "RangDe Indian Cuisine",
    streetAddress: "700 March Rd Unit H",
    addressLocality: "Kanata",
    addressRegion: "ON",
    postalCode: "K2K 2V9",
    addressCountry: "CA",
    telephone: "+1-613-595-0777",
  }
  ],
};

export const pages = {
  home: {
    path: "/",
    title: "RangDe Indian Cuisine | Kanata, Ottawa",
    description: "RangDe Indian Cuisine in Kanata — authentic Indian dining, menu, reservations, and catering.",
  },
  about: {
    path: "/about",
    title: "About RangDe | Indian Restaurant in Kanata",
    description: "Learn about RangDe Indian Cuisine at 700 March Rd in Kanata, Ottawa.",
  },
  menu: {
    path: "/menu",
    title: "Menu | RangDe Indian Cuisine Kanata",
    description: "Browse the RangDe menu — Indian curries, biryani, tandoor, and vegetarian dishes in Kanata.",
  },
  locations: {
    path: "/locations",
    title: "Location | RangDe Kanata Ottawa",
    description: "Visit RangDe at 700 March Rd Unit H, Kanata, ON K2K 2V9.",
  },
  reservations: {
    path: "/reservations",
    title: "Reservations | RangDe Kanata",
    description: "Reserve a table at RangDe Indian Cuisine in Kanata, Ottawa.",
  },
  catering: {
    path: "/catering",
    title: "Catering | RangDe Kanata Ottawa",
    description: "Indian catering from RangDe for Kanata, Ottawa, and nearby communities.",
  },
  cateringByTray: {
    path: "/catering-by-tray",
    title: "Catering by the Tray | RangDe Kanata",
    description: "Order Indian catering trays from RangDe Indian Cuisine in Kanata.",
  },
  contact: {
    path: "/contact",
    title: "Contact | RangDe Indian Cuisine",
    description: "Contact RangDe at (613) 595-0777 or info@rangdeottawa.com. 700 March Rd Unit H, Kanata.",
  }
};

export function absoluteUrl(path = '/') {
  const normalized = path.startsWith('http') ? path : `${siteSeo.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
  return normalized;
}

export function buildRestaurantJsonLd() {
  return siteSeo.restaurants.map((restaurant) => ({
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${absoluteUrl('/')}#restaurant-${restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: restaurant.name,
    image: absoluteUrl(siteSeo.ogImage),
    url: absoluteUrl('/'),
    telephone: restaurant.telephone,
    email: siteSeo.email,
    servesCuisine: siteSeo.servesCuisine,
    priceRange: siteSeo.priceRange,
    menu: absoluteUrl('/menu'),
    acceptsReservations: true,
    address: {
      '@type': 'PostalAddress',
      streetAddress: restaurant.streetAddress,
      addressLocality: restaurant.addressLocality,
      addressRegion: restaurant.addressRegion,
      postalCode: restaurant.postalCode,
      addressCountry: restaurant.addressCountry,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '11:30',
      closes: '22:00',
    },
    areaServed: siteSeo.areaServed,
  }));
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${absoluteUrl('/')}#website`,
    name: siteSeo.siteName,
    url: absoluteUrl('/'),
    description: siteSeo.defaultDescription,
    publisher: {
      '@type': 'Organization',
      name: siteSeo.siteName,
      url: absoluteUrl('/'),
      logo: absoluteUrl(siteSeo.ogImage),
      email: siteSeo.email,
    },
    potentialAction: {
      '@type': 'ReserveAction',
      target: absoluteUrl('/reservations'),
      name: 'Reserve a table',
    },
  };
}

export function buildMenuItemJsonLd(item, path) {
  if (!item) return null;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'MenuItem',
    name: item.name,
    description: item.description || undefined,
    url: absoluteUrl(path),
    image: item.image_url || item.imageUrl || undefined,
    offers: item.price != null && item.price !== '' ? {
      '@type': 'Offer',
      priceCurrency: "CAD",
      price: String(item.price),
      availability: 'https://schema.org/InStock',
    } : undefined,
  };
  return data;
}

export const siteFaqs = [["Where is RangDe located?", "RangDe Indian Cuisine is at 700 March Rd Unit H, Kanata, ON K2K 2V9 (Ottawa area)."], ["What is the phone number?", "Call (613) 595-0777."], ["What are the hours?", "Open Monday to Sunday, 11:30 AM – 10:00 PM."], ["Do you offer catering?", "Yes. RangDe offers catering and catering-by-the-tray options."]];

export function pageSeo(key, overrides = {}) {
  const page = pages[key] || {};
  return {
    title: overrides.title || page.title,
    description: overrides.description || page.description,
    path: overrides.path || page.path,
  };
}
