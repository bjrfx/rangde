import Seo from '../seo/Seo';
import { buildRecommendedDishesJsonLd, dishRecommendationGroups, pageSeo, siteSeo } from '../seo/seoConfig';
import { menuItemPath } from '../seo/slugify';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, MapPin, ArrowRight } from 'lucide-react';
import { api } from '../api';
import MenuImagePlaceholder from '../components/MenuImagePlaceholder';

function formatPrice(value, currency = 'CAD') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  try {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-CA', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch (_) {
    return `$${amount.toFixed(2)}`;
  }
}

function MenuItemCard({ item, currency, locationKey }) {
  const to = `${menuItemPath(item)}${locationKey ? `?location=${encodeURIComponent(locationKey)}` : ''}`;
  return (
    <Link
      to={to}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/90 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-900/5 dark:border-neutral-800 dark:bg-neutral-900/80 dark:shadow-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={`${item.name} at ${siteSeo.brandShort}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <MenuImagePlaceholder />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-white">
            View dish <ArrowRight size={12} />
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-400">
            {item.name}
          </h3>
          <span className="shrink-0 text-sm font-semibold text-amber-600 dark:text-amber-400">
            {formatPrice(item.price, currency)}
          </span>
        </div>
        {item.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {item.description}
          </p>
        ) : null}
        {item.category_name ? (
          <p className="mt-auto pt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
            {item.category_name}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function scrollChildIntoContainer(container, child) {
  if (!container || !child) return;
  const cRect = container.getBoundingClientRect();
  const bRect = child.getBoundingClientRect();
  const padding = 12;
  if (bRect.top < cRect.top + padding) {
    container.scrollTop -= (cRect.top + padding) - bRect.top;
  } else if (bRect.bottom > cRect.bottom - padding) {
    container.scrollTop += bRect.bottom - (cRect.bottom - padding);
  }
}

export default function Menu() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [locations, setLocations] = useState([]);
  const [locationKey, setLocationKey] = useState('');
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [currency, setCurrency] = useState('CAD');
  const [syncedAt, setSyncedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [highlightCategory, setHighlightCategory] = useState('all');
  const [stickyMetrics, setStickyMetrics] = useState({ headerBottom: 80, filterHeight: 72, offset: 168 });

  const sectionRefs = useRef(new Map());
  const stickyNavRef = useRef(null);
  const sidebarScrollRef = useRef(null);
  const chipScrollRef = useRef(null);
  const categoryButtonRefs = useRef(new Map());
  const chipButtonRefs = useRef(new Map());
  const scrollLockUntil = useRef(0);
  const highlightRef = useRef('all');

  useEffect(() => {
    highlightRef.current = highlightCategory;
  }, [highlightCategory]);

  useEffect(() => {
    let cancelled = false;
    api.getCloverPublicLocations()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setLocations(list);
        const fromUrl = searchParams.get('location') || '';
        const valid = list.some((l) => l.key === fromUrl) ? fromUrl : '';
        setLocationKey((prev) => prev || valid || list[0]?.key || '');
      })
      .catch(() => {
        if (!cancelled) setLocations([]);
      });
    return () => { cancelled = true; };
  }, []);

  const loadMenu = useCallback(async (key) => {
    if (!key) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getCloverPublicMenu(key);
      setCategories(data.categories || []);
      setItems(data.items || []);
      setCurrency(data.currency || 'CAD');
      setSyncedAt(data.synced_at || null);
      setHighlightCategory('all');
      highlightRef.current = 'all';
    } catch (err) {
      setCategories([]);
      setItems([]);
      setError(err.message || 'Unable to load menu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (locationKey) loadMenu(locationKey);
  }, [locationKey, loadMenu]);

  useEffect(() => {
    if (!locationKey) return;
    const current = searchParams.get('location') || '';
    if (current === locationKey) return;
    const next = new URLSearchParams(searchParams);
    next.set('location', locationKey);
    setSearchParams(next, { replace: true });
  }, [locationKey]);

  const measureSticky = useCallback(() => {
    const siteNav = document.querySelector('nav.fixed');
    const filter = stickyNavRef.current;
    const headerBottom = siteNav
      ? Math.ceil(siteNav.getBoundingClientRect().bottom)
      : 80;
    const filterHeight = filter
      ? Math.ceil(filter.getBoundingClientRect().height)
      : 72;
    // Sidebar sticks just below the sticky search/filter bar.
    const offset = headerBottom + filterHeight + 12;
    setStickyMetrics((prev) => {
      if (
        prev.headerBottom === headerBottom
        && prev.filterHeight === filterHeight
        && prev.offset === offset
      ) {
        return prev;
      }
      return { headerBottom, filterHeight, offset };
    });
  }, []);

  useLayoutEffect(() => {
    measureSticky();
    const filter = stickyNavRef.current;
    const siteNav = document.querySelector('nav.fixed');
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measureSticky()) : null;
    if (ro && filter) ro.observe(filter);
    if (ro && siteNav) ro.observe(siteNav);
    window.addEventListener('resize', measureSticky);
    window.addEventListener('scroll', measureSticky, { passive: true });
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measureSticky);
      window.removeEventListener('scroll', measureSticky);
    };
  }, [measureSticky, loading, categories.length, locations.length]);

  const q = search.trim().toLowerCase();

  const sections = useMemo(() => {
    const mapped = categories
      .map((cat) => {
        const sectionItems = items.filter((item) => {
          const inCategory = String(item.category_id) === String(cat.id)
            || (item.categories || []).some((c) => String(c.id) === String(cat.id));
          if (!inCategory) return false;
          if (!q) return true;
          return `${item.name} ${item.description || ''} ${item.category_name || ''}`.toLowerCase().includes(q);
        });
        return {
          id: String(cat.id),
          name: cat.name,
          items: sectionItems,
        };
      })
      .filter((section) => section.items.length > 0);

    if (q) {
      return [{
        id: 'results',
        name: 'Search results',
        items: items.filter((item) => `${item.name} ${item.description || ''} ${item.category_name || ''}`.toLowerCase().includes(q)),
      }].filter((section) => section.items.length > 0);
    }
    return mapped;
  }, [categories, items, q]);

  const visibleCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.items.length, 0),
    [sections]
  );

  const setSectionRef = useCallback((id, node) => {
    const key = String(id);
    if (node) sectionRefs.current.set(key, node);
    else sectionRefs.current.delete(key);
  }, []);

  const setCategoryBtnRef = useCallback((id, node) => {
    const key = String(id);
    if (node) categoryButtonRefs.current.set(key, node);
    else categoryButtonRefs.current.delete(key);
  }, []);

  const setChipBtnRef = useCallback((id, node) => {
    const key = String(id);
    if (node) chipButtonRefs.current.set(key, node);
    else chipButtonRefs.current.delete(key);
  }, []);

  const syncNavHighlight = useCallback((nextId) => {
    const id = String(nextId || 'all');
    if (String(highlightRef.current) === id) return;
    highlightRef.current = id;
    setHighlightCategory(id);
  }, []);

  const updateHighlightFromScroll = useCallback(() => {
    if (Date.now() < scrollLockUntil.current) return;
    if (q) return;

    const ids = sections.map((section) => String(section.id)).filter((id) => id !== 'results');
    if (!ids.length) {
      syncNavHighlight('all');
      return;
    }

    const offset = stickyMetrics.offset || 160;
    const first = sectionRefs.current.get(ids[0]);
    if (first && first.getBoundingClientRect().top > offset + 32) {
      syncNavHighlight('all');
      return;
    }

    let current = ids[0];
    for (const id of ids) {
      const el = sectionRefs.current.get(id);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= offset + 4) current = id;
      else break;
    }
    syncNavHighlight(current);
  }, [q, sections, stickyMetrics.offset, syncNavHighlight]);

  useEffect(() => {
    if (q) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateHighlightFromScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [updateHighlightFromScroll, q, sections]);

  useEffect(() => {
    const id = String(highlightCategory || 'all');
    // Only scroll the sidebar/chip containers — never the page.
    scrollChildIntoContainer(sidebarScrollRef.current, categoryButtonRefs.current.get(id));
    scrollChildIntoContainer(chipScrollRef.current, chipButtonRefs.current.get(id));
  }, [highlightCategory]);

  const jumpToCategory = useCallback((id) => {
    const targetId = String(id);
    setSearch('');

    if (targetId === 'all') {
      syncNavHighlight('all');
      scrollLockUntil.current = Date.now() + 900;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    syncNavHighlight(targetId);

    const scrollToSection = () => {
      const el = sectionRefs.current.get(targetId);
      if (!el) return false;
      scrollLockUntil.current = Date.now() + 1200;
      const top = window.scrollY + el.getBoundingClientRect().top - (stickyMetrics.offset || 160);
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      return true;
    };

    if (!scrollToSection()) {
      // Sections may not be mounted yet after clearing search — try next frames.
      requestAnimationFrame(() => {
        if (!scrollToSection()) {
          requestAnimationFrame(scrollToSection);
        }
      });
    }
  }, [stickyMetrics.offset, syncNavHighlight]);

  const isActive = useCallback((id) => {
    if (q) return false;
    return String(highlightCategory) === String(id);
  }, [highlightCategory, q]);

  const menuJsonLd = useMemo(() => {
    const recommended = buildRecommendedDishesJsonLd();
    if (!items.length) return recommended;
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Menu',
        name: `${siteSeo.siteName} Menu`,
        hasMenuSection: sections.slice(0, 20).map((cat) => ({
          '@type': 'MenuSection',
          name: cat.name,
          hasMenuItem: cat.items.slice(0, 30).map((item) => ({
            '@type': 'MenuItem',
            name: item.name,
            description: item.description || undefined,
            offers: {
              '@type': 'Offer',
              price: String(item.price),
              priceCurrency: currency,
            },
          })),
        })),
      },
      ...recommended,
    ];
  }, [items.length, sections, currency]);

  const sidebarStyle = {
    top: `${stickyMetrics.offset || 168}px`,
    maxHeight: `calc(100vh - ${stickyMetrics.offset || 168}px - 1rem)`,
  };

  const sectionScrollMargin = { scrollMarginTop: `${stickyMetrics.offset}px` };

  const categoryNavItems = useMemo(() => {
    if (q) return [];
    return sections;
  }, [q, sections]);

  return (
    <div className="min-h-screen bg-neutral-50 pt-20 dark:bg-dark-950">
      <Seo
        {...pageSeo('menu')}
        jsonLd={menuJsonLd}
      />
      <div className="indian-mandala-tl" />
      <div className="indian-mandala-br" />

      <section className="relative overflow-hidden border-b border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-black">
        <div className="absolute inset-0 bg-pattern opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Our Menu</p>
          <h1 className="font-display text-4xl font-bold text-neutral-900 dark:text-white md:text-6xl">
            Authentic Indian <span className="text-gold-gradient">Flavors</span>
          </h1>
          <p className="mt-4 max-w-2xl text-neutral-600 dark:text-neutral-400">
            Browse by category, search for favorites, and open any dish for details.
          </p>

          {locations.length > 1 ? (
            <div className="mt-8 flex flex-wrap gap-2">
              {locations.map((loc) => (
                <button
                  key={loc.key}
                  type="button"
                  onClick={() => setLocationKey(loc.key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    locationKey === loc.key
                      ? 'border-amber-500 bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-amber-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
                  }`}
                >
                  <MapPin size={14} />
                  {loc.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div
        ref={stickyNavRef}
        style={{ top: `${stickyMetrics.headerBottom || 80}px` }}
        className="sticky z-30 border-b border-neutral-200/80 bg-white/95 backdrop-blur-xl dark:border-neutral-800 dark:bg-black/90"
      >
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-col gap-3">
            <div className="relative w-full lg:max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes..."
                className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-amber-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-900 dark:focus:bg-neutral-900"
              />
              {search ? (
                <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                  <X size={14} />
                </button>
              ) : null}
            </div>

            {/* Mobile / tablet category chips — hidden on desktop where the sidebar is used */}
            <div ref={chipScrollRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-none lg:hidden">
              <button
                type="button"
                ref={(node) => setChipBtnRef('all', node)}
                onClick={() => jumpToCategory('all')}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive('all')
                    ? 'bg-neutral-900 text-white dark:bg-amber-500 dark:text-black'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                All
              </button>
              {categoryNavItems.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  ref={(node) => setChipBtnRef(cat.id, node)}
                  onClick={() => jumpToCategory(cat.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive(cat.id)
                      ? 'bg-neutral-900 text-white dark:bg-amber-500 dark:text-black'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          {syncedAt ? (
            <p className="mt-2 text-[11px] text-neutral-400">
              Menu synced · {visibleCount} dishes
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-10">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <div className="skeleton aspect-[4/3]" />
                <div className="space-y-2 p-4">
                  <div className="skeleton h-5 w-2/3" />
                  <div className="skeleton h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-amber-500/30 bg-white p-10 text-center dark:bg-neutral-900">
            <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">Menu temporarily unavailable</h2>
            <p className="mx-auto mt-3 max-w-lg text-neutral-500">{error}</p>
            <p className="mt-2 text-sm text-neutral-400">Configure and sync Clover credentials in Admin → Menu Management.</p>
            <button type="button" onClick={() => loadMenu(locationKey)} className="btn-gold mt-6">Retry</button>
          </div>
        ) : visibleCount === 0 ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-neutral-500">No dishes match your filters.</p>
            <button type="button" className="btn-outline-gold mt-4" onClick={() => { setSearch(''); setHighlightCategory('all'); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="relative hidden lg:block">
              <nav
                aria-label="Menu categories"
                style={sidebarStyle}
                className="sticky z-20 flex w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/95 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/90 dark:shadow-none"
              >
                <div className="shrink-0 border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Categories</p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">{categoryNavItems.length} sections</p>
                </div>
                <div
                  ref={sidebarScrollRef}
                  className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-2"
                >
                  <button
                    type="button"
                    ref={(node) => setCategoryBtnRef('all', node)}
                    onClick={() => jumpToCategory('all')}
                    className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      isActive('all')
                        ? 'bg-amber-500/15 font-semibold text-amber-700 dark:text-amber-400'
                        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                    }`}
                  >
                    All dishes
                  </button>
                  {categoryNavItems.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      ref={(node) => setCategoryBtnRef(cat.id, node)}
                      onClick={() => jumpToCategory(cat.id)}
                      className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        isActive(cat.id)
                          ? 'bg-amber-500/15 font-semibold text-amber-700 dark:text-amber-400'
                          : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span className="block leading-snug">{cat.name}</span>
                      <span className="mt-0.5 block text-[11px] font-normal text-neutral-400">{cat.items.length}</span>
                    </button>
                  ))}
                </div>
              </nav>
            </aside>

            <div className="space-y-14">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={`menu-cat-${section.id}`}
                  data-category-id={section.id}
                  ref={(node) => setSectionRef(section.id, node)}
                  style={sectionScrollMargin}
                >
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="font-display text-3xl font-bold text-neutral-900 dark:text-white">{section.name}</h2>
                      <p className="mt-1 text-sm text-neutral-500">{section.items.length} dishes</p>
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {section.items.map((item) => (
                      <MenuItemCard key={`${section.id}-${item.id}`} item={item} currency={currency} locationKey={locationKey} />
                    ))}
                  </div>
                </section>
              ))}

              <section id="recommended-dishes" className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 md:p-8">
                <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white md:text-3xl">
                  Signature &amp; recommended dishes
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
                  Curated chef and signature picks from the Masakali menu — not sales rankings. Availability can vary; confirm on the live menu above.
                </p>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {dishRecommendationGroups.map((group) => (
                    <div key={group.id}>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">{group.label}</h3>
                      <ul className="mt-3 space-y-3">
                        {group.dishes.map((dish) => (
                          <li key={`${group.id}-${dish.name}`}>
                            <p className="font-medium text-neutral-900 dark:text-white">{dish.name}</p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{dish.explanation}</p>
                            <p className="mt-1 text-xs text-neutral-500">
                              {dish.category}
                              {dish.diet ? ` · ${dish.diet}` : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
