import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CalendarDays, Clock3, Mail, MapPin, Phone, Receipt, Utensils } from 'lucide-react';
import api from '../api';

function money(value, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(Number(value || 0));
}

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[170px_1fr]">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-sm text-neutral-800 dark:text-neutral-100">{value || 'N/A'}</p>
    </div>
  );
}

function SummaryItem({ item, currency }) {
  const imageSrc = String(item.item_image_url || item.image_url || '').trim();
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        {imageSrc ? (
          <img src={imageSrc} alt={item.item_name || 'Ordered item'} className="h-16 w-16 shrink-0 rounded-lg object-cover" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <Utensils size={18} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-semibold text-neutral-900 dark:text-white">{item.item_name || 'Item'}</p>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{money(item.line_total, currency)}</p>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {item.tray_name || 'Tray'}{item.serves ? ` · Serves ${item.serves}` : ''} · Qty {item.quantity || 1}
          </p>
          {item.item_description ? <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{item.item_description}</p> : null}
          <p className="mt-1 text-xs text-neutral-500">Unit price: {money(item.unit_price, currency)}</p>
        </div>
      </div>
    </div>
  );
}

export default function CateringByTrayOrderSummary() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  const localePrefix = window.location.pathname.startsWith('/fr/') ? '/fr' : '';
  const cateringBasePath = `${localePrefix}/catering-by-tray`;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) {
        if (!mounted) return;
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      setNotFound(false);
      try {
        const data = await api.getCateringByTrayOrderSummary(id);
        if (mounted) setPayload(data);
      } catch (err) {
        if (!mounted) return;
        const message = String(err?.message || 'Unable to load order summary');
        if (/not found/i.test(message)) setNotFound(true);
        else setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const order = payload?.order || {};
  const restaurant = payload?.restaurant || {};
  const items = useMemo(() => (Array.isArray(order.items) ? order.items : []), [order.items]);
  const currency = order.currency || 'CAD';

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 pt-24 dark:bg-dark-950">
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-10">
          <div className="skeleton h-28 rounded-2xl" />
          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <div className="skeleton h-[420px] rounded-2xl" />
            <div className="skeleton h-[420px] rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-neutral-50 pt-24 dark:bg-dark-950">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <AlertTriangle className="mx-auto text-amber-500" size={34} />
            <h1 className="mt-4 font-display text-3xl font-bold text-neutral-900 dark:text-white">Order summary unavailable</h1>
            <p className="mt-3 text-neutral-600 dark:text-neutral-300">This order was not found or may have been removed by the restaurant.</p>
            <Link to={cateringBasePath} className="btn-gold mt-6 inline-flex">Back to Catering By Tray</Link>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-50 pt-24 dark:bg-dark-950">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center dark:border-red-900/70 dark:bg-neutral-900">
            <AlertTriangle className="mx-auto text-red-500" size={34} />
            <h1 className="mt-4 font-display text-3xl font-bold text-neutral-900 dark:text-white">Unable to load order</h1>
            <p className="mt-3 text-neutral-600 dark:text-neutral-300">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="btn-gold mt-6">Try Again</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 pt-24 dark:bg-dark-950">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 md:py-10">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Catering By Tray</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-neutral-900 dark:text-white">Order Summary</h1>
              <p className="mt-2 text-sm text-neutral-500">Order #{order.order_number || order.id}</p>
            </div>
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-700 dark:text-amber-300">{String(order.status || 'pending').replace(/\b\w/g, (char) => char.toUpperCase())}</span>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Receipt size={18} className="text-amber-500" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Order Details</h2>
              </div>
              {items.length ? (
                <div className="space-y-3">
                  {items.map((item) => <SummaryItem key={item.id || `${item.item_name}-${item.tray_name}`} item={item} currency={currency} />)}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">No order items available.</div>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Customer & Event Information</h2>
              <div className="space-y-3">
                <DetailRow label="Name" value={order.customer_name} />
                <DetailRow label="Email" value={order.email} />
                <DetailRow label="Phone" value={order.phone} />
                <DetailRow label="Event date" value={order.event_date} />
                <DetailRow label="Preferred time" value={order.preferred_time} />
                <DetailRow label="Company name" value={order.company_name} />
                <DetailRow label="Event details" value={order.event_name} />
                <DetailRow label="Order type" value={order.order_type} />
                <DetailRow label="Location" value={order.location_name} />
                <DetailRow label="Address" value={order.delivery_address} />
                <DetailRow label="Notes / instructions" value={order.special_instructions} />
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Order Totals</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300"><span>Subtotal</span><span>{money(order.subtotal, currency)}</span></div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300"><span>Tax</span><span>{money(order.tax, currency)}</span></div>
                <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3 text-lg font-bold text-neutral-900 dark:border-neutral-800 dark:text-white"><span>Total</span><span>{money(order.total, currency)}</span></div>
              </div>
              <div className="mt-4 space-y-2 text-xs text-neutral-500">
                <p className="inline-flex items-center gap-1"><CalendarDays size={14} /> Created: {order.created_at || 'N/A'}</p>
                <p className="inline-flex items-center gap-1"><Clock3 size={14} /> Updated: {order.updated_at || 'N/A'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Restaurant Information</h2>
              <div className="space-y-3 text-sm">
                <p className="font-semibold text-neutral-900 dark:text-white">{restaurant.restaurant_name || order.location_name || 'Masakali'}</p>
                <p className="inline-flex items-start gap-2 text-neutral-600 dark:text-neutral-300"><Phone size={15} className="mt-0.5 shrink-0" /> {restaurant.phone || 'N/A'}</p>
                <p className="inline-flex items-start gap-2 text-neutral-600 dark:text-neutral-300"><Mail size={15} className="mt-0.5 shrink-0" /> {restaurant.email || 'N/A'}</p>
                <p className="inline-flex items-start gap-2 text-neutral-600 dark:text-neutral-300"><MapPin size={15} className="mt-0.5 shrink-0" /> {restaurant.address || 'N/A'}</p>
                <DetailRow label="Website" value={restaurant.website || order.website} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
