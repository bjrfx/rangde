import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { api } from '../api';
import Seo from '../seo/Seo';
import { buildMenuItemJsonLd, siteSeo } from '../seo/seoConfig';
import { menuItemIdFromParam, menuItemPath } from '../seo/slugify';
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

export default function MenuItem() {
  const { itemSlug } = useParams();
  const [searchParams] = useSearchParams();
  const itemId = menuItemIdFromParam(itemSlug);
  const locationKey = searchParams.get('location') || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      if (!itemId) {
        setData(null);
        setError('Menu item not found');
        setLoading(false);
        return;
      }
      try {
        let location = locationKey;
        if (!location) {
          const locations = await api.getCloverPublicLocations();
          location = locations?.[0]?.key || '';
        }
        const result = await api.getCloverPublicMenuItem(itemId, location);
        if (!cancelled) setData({ ...result, location_key: location });
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err.message || 'Dish not found');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [itemId, locationKey]);

  const item = data?.item;
  const menuBack = data?.location_key
    ? `/menu?location=${encodeURIComponent(data.location_key)}`
    : (locationKey ? `/menu?location=${encodeURIComponent(locationKey)}` : '/menu');
  const path = item
    ? `${menuItemPath(item)}${data?.location_key ? `?location=${encodeURIComponent(data.location_key)}` : ''}`
    : `/menu/${itemSlug}`;
  const title = item ? `${item.name} | ${siteSeo.brandShort} Menu` : `Menu Item | ${siteSeo.brandShort}`;
  const description = item
    ? `${item.name}${item.description ? ` — ${item.description}` : ''} at ${siteSeo.siteName}.`
    : `Menu details at ${siteSeo.siteName}.`;

  return (
    <div className="min-h-screen bg-neutral-50 pt-20 dark:bg-dark-950">
      <Seo
        title={title}
        description={description.slice(0, 160)}
        path={path.split('?')[0]}
        image={item?.image_url || undefined}
        type="article"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Menu', path: '/menu' },
          { name: item?.name || 'Dish', path: path.split('?')[0] },
        ]}
        jsonLd={item ? buildMenuItemJsonLd(item, path.split('?')[0]) : null}
      />
      <div className="indian-mandala-tl" />
      <div className="indian-mandala-br" />

      <section className="mx-auto max-w-5xl px-4 py-10">
        <Link to={menuBack} className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:underline dark:text-amber-400">
          <ArrowLeft size={16} /> Back to menu
        </Link>

        {loading ? (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="skeleton aspect-[4/3] rounded-3xl" />
            <div className="space-y-4">
              <div className="skeleton h-10 w-2/3" />
              <div className="skeleton h-24 w-full" />
            </div>
          </div>
        ) : error || !item ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <h1 className="font-display text-3xl text-neutral-900 dark:text-white">Dish unavailable</h1>
            <p className="mt-3 text-neutral-500">{error || 'This item is no longer on the public menu.'}</p>
            <Link to={menuBack} className="btn-gold mt-6 inline-flex">Browse menu</Link>
          </div>
        ) : (
          <>
            <article className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none md:grid md:grid-cols-2">
              <div className="min-h-[280px] overflow-hidden bg-neutral-100 dark:bg-neutral-950">
                {item.image_url ? (
                  <img src={item.image_url} alt={`${item.name} at ${siteSeo.brandShort}`} className="h-full w-full object-cover" />
                ) : (
                  <MenuImagePlaceholder className="min-h-[280px]" iconClassName="h-16 w-16" />
                )}
              </div>
              <div className="p-8 md:p-10">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                  {item.category_name || 'Menu'}
                </p>
                <h1 className="mt-3 font-display text-4xl font-bold text-neutral-900 dark:text-white">{item.name}</h1>
                {item.description ? (
                  <p className="mt-5 leading-relaxed text-neutral-600 dark:text-neutral-300">{item.description}</p>
                ) : (
                  <p className="mt-5 text-neutral-500">An authentic Indian dish served at {siteSeo.siteName}.</p>
                )}
                <p className="mt-6 text-3xl font-semibold text-amber-600 dark:text-amber-400">
                  {formatPrice(item.price, data.currency)}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/reservations" className="btn-gold">Reserve a table</Link>
                  <Link to={menuBack} className="btn-outline-gold">More dishes</Link>
                </div>
                <p className="mt-8 text-sm text-neutral-500">
                  {data.location_name || siteSeo.siteName} · {siteSeo.areaServed}
                </p>
              </div>
            </article>

            {Array.isArray(data.related) && data.related.length > 0 ? (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">You may also like</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.related.map((related) => (
                    <Link
                      key={related.id}
                      to={`${menuItemPath(related)}${data.location_key ? `?location=${encodeURIComponent(data.location_key)}` : ''}`}
                      className="group rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-amber-400 dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-neutral-900 group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-400">
                          {related.name}
                        </h3>
                        <ArrowRight size={14} className="text-neutral-400" />
                      </div>
                      <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">{formatPrice(related.price, data.currency)}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
