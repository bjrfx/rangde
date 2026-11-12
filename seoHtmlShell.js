/**
 * Route-level HTML shell enhancement for crawlers (SPA prerender substitute).
 * Injects correct title/description/canonical/OG/JSON-LD and meaningful #root
 * content into the CRA index.html for known public routes.
 * React replaces #root on hydrate; data-seo-prerender tags are removed by Seo.js.
 * Site-specific: do not copy this file between repositories.
 */
'use strict';

const SITE = {
  "siteUrl": "https://rangdeottawa.ca",
  "siteName": "RangDe Indian Cuisine",
  "brandH1": "RangDe Indian Cuisine",
  "htmlLang": "en",
  "locale": "en_CA",
  "hasFr": false,
  "navLinks": [
    [
      "/",
      "Home"
    ],
    [
      "/about",
      "About"
    ],
    [
      "/menu",
      "Menu"
    ],
    [
      "/locations",
      "Locations"
    ],
    [
      "/reservations",
      "Reservations"
    ],
    [
      "/catering-by-tray",
      "Catering"
    ],
    [
      "/contact",
      "Contact"
    ]
  ],
  "locationLines": [
    "RangDe Indian Cuisine — 700 March Rd Unit H, Kanata"
  ],
  "pages": {
    "/": {
      "title": "RangDe Indian Cuisine | Kanata, Ottawa",
      "description": "Discover RangDe Indian Cuisine in Kanata — South and North Indian dining, menu, reservations, and catering."
    },
    "/about": {
      "title": "About RangDe | Indian Restaurant in Kanata",
      "description": "Learn about RangDe Indian Cuisine at 700 March Rd in Kanata, Ottawa — part of Masakali Group."
    },
    "/menu": {
      "title": "Menu | RangDe Indian Cuisine Kanata",
      "description": "Browse the RangDe menu — dosas, curries, biryani, tandoor, vegetarian dishes, and more in Kanata."
    },
    "/locations": {
      "title": "Locations | RangDe & Masakali Group",
      "description": "Find RangDe at 700 March Rd Unit H, Kanata, plus sister Masakali Group locations. Hours, directions, and contact."
    },
    "/reservations": {
      "title": "Reservations | RangDe Kanata",
      "description": "Reserve a table at RangDe Indian Cuisine in Kanata, Ottawa."
    },
    "/catering": {
      "title": "Catering | RangDe Kanata Ottawa",
      "description": "Indian catering from RangDe for Kanata, Ottawa, and nearby communities."
    },
    "/catering-by-tray": {
      "title": "Catering by the Tray | RangDe Kanata",
      "description": "Order Indian catering trays from RangDe Indian Cuisine in Kanata."
    },
    "/contact": {
      "title": "Contact | RangDe Indian Cuisine",
      "description": "Contact RangDe at (613) 595-0777 or info@rangdeottawa.com. 700 March Rd Unit H, Kanata."
    }
  }
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function normalizePath(pathname) {
  const raw = String(pathname || '/').split('?')[0].split('#')[0] || '/';
  if (raw.length > 1 && raw.endsWith('/')) return raw.replace(/\/+$/, '') || '/';
  return raw || '/';
}

function toEnglishPath(pathname) {
  const p = normalizePath(pathname);
  if (p === '/fr') return '/';
  if (p.startsWith('/fr/')) return p.slice(3) || '/';
  return p;
}

function toFrenchPath(pathname) {
  const en = toEnglishPath(pathname);
  return en === '/' ? '/fr' : `/fr${en}`;
}

function resolvePage(pathname) {
  const p = normalizePath(pathname);
  if (SITE.pages[p]) return { path: p, ...SITE.pages[p], isFrench: p === '/fr' || p.startsWith('/fr/') };
  // FR fallback: reuse EN page copy with /fr path (Montreal)
  if (SITE.hasFr) {
    const en = toEnglishPath(p);
    if (SITE.pages[en] && (p === '/fr' || p.startsWith('/fr/'))) {
      return { path: p, ...SITE.pages[en], isFrench: true };
    }
  }
  return null;
}

function buildWebPageJsonLd(page) {
  const url = `${SITE.siteUrl}${page.path === '/' ? '/' : page.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE.siteName,
      url: SITE.siteUrl + '/',
    },
  };
}

function buildBodyHtml(page) {
  const nav = SITE.navLinks
    .map(([href, label]) => {
      const link = page.isFrench
        ? (href === '/' ? '/fr' : `/fr${href}`)
        : href;
      return `<a href="${escapeAttr(link)}">${escapeHtml(label)}</a>`;
    })
    .join(' · ');
  const locs = (SITE.locationLines || [])
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('');
  return (
    `<div data-seo-prerender-body>` +
    `<header><p>${escapeHtml(SITE.siteName)}</p>` +
    `<h1>${escapeHtml(SITE.brandH1)}</h1>` +
    `<p>${escapeHtml(page.description)}</p>` +
    `<nav aria-label="Primary">${nav}</nav></header>` +
    `<main><h2>${escapeHtml(page.title)}</h2>` +
    `<p>${escapeHtml(page.description)}</p>` +
    (locs ? `<ul>${locs}</ul>` : '') +
    `</main></div>`
  );
}

function upsertMetaByName(html, name, content) {
  const re = new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*>`, 'i');
  const tag = `<meta name="${name}" content="${escapeAttr(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

function upsertMetaByProperty(html, property, content) {
  const re = new RegExp(`<meta\\s+[^>]*property=["']${property}["'][^>]*>`, 'i');
  const tag = `<meta property="${property}" content="${escapeAttr(content)}" data-seo-prerender="1" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

/**
 * @param {string} html - raw index.html
 * @param {string} pathname - request path
 * @returns {string} enhanced HTML (or original if route has no static page SEO)
 */
function applySeoShell(html, pathname) {
  const page = resolvePage(pathname);
  if (!page || !html) return html;

  let out = html;
  const canonical = `${SITE.siteUrl}${page.path === '/' ? '/' : page.path}`;
  const lang = page.isFrench ? 'fr' : SITE.htmlLang;

  out = out.replace(/<html([^>]*)lang=["'][^"']*["']/i, `<html$1lang="${lang}"`);
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  out = upsertMetaByName(out, 'description', page.description);
  out = upsertMetaByProperty(out, 'og:title', page.title);
  out = upsertMetaByProperty(out, 'og:description', page.description);
  out = upsertMetaByProperty(out, 'og:url', canonical);
  out = upsertMetaByProperty(out, 'og:locale', page.isFrench ? 'fr_CA' : SITE.locale);

  // Canonical: remove any existing then inject one marked for client cleanup
  out = out.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi, '');
  let headInject = `    <link rel="canonical" href="${escapeAttr(canonical)}" data-seo-prerender="1" />\n`;

  if (SITE.hasFr) {
    const enPath = toEnglishPath(page.path);
    const frPath = toFrenchPath(page.path);
    headInject +=
      `    <link rel="alternate" hreflang="en-CA" href="${escapeAttr(SITE.siteUrl + (enPath === '/' ? '/' : enPath))}" data-seo-prerender="1" />\n` +
      `    <link rel="alternate" hreflang="fr-CA" href="${escapeAttr(SITE.siteUrl + frPath)}" data-seo-prerender="1" />\n` +
      `    <link rel="alternate" hreflang="x-default" href="${escapeAttr(SITE.siteUrl + (enPath === '/' ? '/' : enPath))}" data-seo-prerender="1" />\n`;
  }

  const jsonLd = buildWebPageJsonLd(page);
  headInject +=
    `    <script type="application/ld+json" data-seo-prerender="1">${JSON.stringify(jsonLd)}</script>\n`;

  out = out.replace(/<\/head>/i, `${headInject}  </head>`);

  const body = buildBodyHtml(page);
  if (/<div id="root"\s*><\/div>/i.test(out)) {
    out = out.replace(/<div id="root"\s*><\/div>/i, `<div id="root">${body}</div>`);
  } else if (/<div id="root"[^>]*>\s*<\/div>/i.test(out)) {
    out = out.replace(/<div id="root"[^>]*>\s*<\/div>/i, `<div id="root">${body}</div>`);
  }

  return out;
}

function canEnhancePath(pathname) {
  return !!resolvePage(pathname);
}

module.exports = {
  applySeoShell,
  canEnhancePath,
  SITE,
};
