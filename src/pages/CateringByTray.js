import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  CalendarDays,
  Check,
  ChevronDown,
  ChefHat,
  Clock,
  Flame,
  Heart,
  Leaf,
  MapPin,
  Minus,
  Nut,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  Truck,
  Utensils,
  WheatOff,
  X,
} from 'lucide-react';
import api from '../api';

const BADGES = {
  vegetarian: { label: 'Vegetarian', icon: Leaf, className: 'text-emerald-600 bg-emerald-500/10' },
  vegan: { label: 'Vegan', icon: Leaf, className: 'text-green-600 bg-green-500/10' },
  can_be_made_vegan: { label: 'Can Be Made Vegan', icon: Leaf, className: 'text-lime-600 bg-lime-500/10' },
  gluten_free: { label: 'Gluten Free', icon: WheatOff, className: 'text-sky-600 bg-sky-500/10' },
  contains_nuts: { label: 'Contains Nuts', icon: Nut, className: 'text-orange-600 bg-orange-500/10' },
  spicy: { label: 'Spicy', icon: Flame, className: 'text-red-600 bg-red-500/10' },
  recommended: { label: 'Recommended', icon: Star, className: 'text-amber-600 bg-amber-500/10' },
  chef_special: { label: 'Chef Special', icon: ChefHat, className: 'text-purple-600 bg-purple-500/10' },
  best_seller: { label: 'Best Seller', icon: Award, className: 'text-amber-600 bg-amber-500/10' },
  popular: { label: 'Popular', icon: Sparkles, className: 'text-pink-600 bg-pink-500/10' },
  kids_friendly: { label: 'Kids Friendly', icon: Heart, className: 'text-rose-600 bg-rose-500/10' },
  halal: { label: 'Halal', icon: Check, className: 'text-teal-600 bg-teal-500/10' },
};

function money(value, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(Number(value || 0));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function BadgeStrip({ item }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(BADGES).map(([key, badge]) => {
        if (!item[key]) return null;
        const Icon = badge.icon;
        return (
          <span key={key} title={badge.label} className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${badge.className}`}>
            <Icon size={15} />
          </span>
        );
      })}
    </div>
  );
}

function CartLine({ line, currency, onQty, onRemove }) {
  return (
    <div className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
      <img src={line.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" loading="lazy" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-neutral-900 dark:text-white">{line.name}</p>
            <p className="text-xs text-neutral-500">{line.tray_name} · Serves {line.serves}</p>
          </div>
          <button onClick={() => onRemove(line.cartKey)} className="rounded-lg p-1 text-neutral-400 hover:bg-red-500/10 hover:text-red-500" aria-label={`Remove ${line.name}`}>
            <Trash2 size={15} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="inline-flex items-center rounded-full border border-neutral-200 dark:border-neutral-800">
            <button onClick={() => onQty(line.cartKey, line.quantity - 1)} className="p-2" aria-label="Decrease quantity"><Minus size={14} /></button>
            <span className="w-8 text-center text-sm font-semibold">{line.quantity}</span>
            <button onClick={() => onQty(line.cartKey, line.quantity + 1)} className="p-2" aria-label="Increase quantity"><Plus size={14} /></button>
          </div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{money(line.price * line.quantity, currency)}</p>
        </div>
      </div>
    </div>
  );
}

function OrderSummary({ cart, currency, taxRate, onQty, onRemove, onClear, onCheckout }) {
  const subtotal = cart.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);
  const tax = subtotal * Number(taxRate || 0);
  const total = subtotal + tax;

  return (
    <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-neutral-900/5 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">Order Summary</h2>
          <p className="text-sm text-neutral-500">Confirmation required before preparation.</p>
        </div>
        <ShoppingBag className="text-amber-500" size={24} />
      </div>
      {!cart.length ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <Utensils className="mx-auto mb-3 text-neutral-400" size={32} />
          <p className="font-medium text-neutral-700 dark:text-neutral-200">Your tray order is empty.</p>
          <p className="mt-1 text-sm text-neutral-500">Add a few favorites to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cart.map((line) => <CartLine key={line.cartKey} line={line} currency={currency} onQty={onQty} onRemove={onRemove} />)}
          <div className="space-y-2 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
            <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>{money(subtotal, currency)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Tax</span><span>{money(tax, currency)}</span></div>
            <div className="flex justify-between text-lg font-bold text-neutral-900 dark:text-white"><span>Estimated Total</span><span>{money(total, currency)}</span></div>
          </div>
          <button onClick={onCheckout} className="btn-gold w-full">Proceed to Checkout</button>
          <button onClick={onClear} className="btn-outline-gold w-full !py-2.5 text-sm">Clear Cart</button>
        </div>
      )}
    </aside>
  );
}

export default function CateringByTray() {
  const [payload, setPayload] = useState({ categories: [], items: [], settings: null, locations: [] });
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [orderType, setOrderType] = useState('pickup');
  const [locationId, setLocationId] = useState('');
  const [eventDate, setEventDate] = useState(todayIso());
  const [cart, setCart] = useState([]);
  const [selections, setSelections] = useState({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const sectionRefs = useRef({});

  useEffect(() => {
    let mounted = true;
    document.body.classList.add('catering-by-tray-page');
    api.getCateringByTrayPublic()
      .then((data) => {
        if (!mounted) return;
        setPayload(data);
        const firstCategory = data.categories?.[0]?.slug || '';
        setActiveCategory(firstCategory);
        const firstLocation = data.locations?.[0];
        if (firstLocation) setLocationId(String(firstLocation.id || firstLocation.restaurant_id || firstLocation.location_slug));
        const initialSelections = {};
        (data.items || []).forEach((item) => {
          if (item.tray_options?.length) initialSelections[item.id] = { trayId: String(item.tray_options[0].id), quantity: 1 };
        });
        setSelections(initialSelections);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
      document.body.classList.remove('catering-by-tray-page');
    };
  }, []);

  useEffect(() => {
    if (!payload.categories.length) return undefined;
    let frame = null;

    const updateActiveCategory = () => {
      frame = null;
      const offset = window.innerWidth >= 768 ? 220 : mobileDetailsOpen ? 128 : 176;
      const sections = payload.categories
        .map((cat) => ({ slug: cat.slug, node: sectionRefs.current[cat.slug] }))
        .filter(({ node }) => Boolean(node));
      if (!sections.length) return;

      const current = sections.reduce((best, section) => {
        const top = section.node.getBoundingClientRect().top - offset;
        if (top <= 1) return section;
        if (!best) return section;
        const bestTop = best.node.getBoundingClientRect().top - offset;
        return Math.abs(top) < Math.abs(bestTop) ? section : best;
      }, null);

      if (current?.slug) setActiveCategory(current.slug);
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveCategory);
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [payload.categories, mobileDetailsOpen]);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      if (window.innerWidth < 768) {
        if (currentY > 80 && currentY > lastY) setMobileDetailsOpen(false);
        if (currentY < 40) setMobileDetailsOpen(true);
      }
      lastY = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const settings = payload.settings || {};
  const currency = settings.currency || 'CAD';
  const taxRate = Number(settings.tax_rate ?? 0.13);
  const visibleCategories = payload.categories.filter((cat) => cat.is_active !== 0);
  const itemsByCategory = useMemo(() => {
    const map = new Map();
    visibleCategories.forEach((cat) => map.set(cat.id, []));
    payload.items.filter((item) => item.is_active !== 0 && item.available !== 0).forEach((item) => {
      const list = map.get(item.category_id) || [];
      list.push(item);
      map.set(item.category_id, list);
    });
    return map;
  }, [payload.items, visibleCategories]);
  const selectedLocation = payload.locations.find((loc) => String(loc.id || loc.restaurant_id || loc.location_slug) === locationId) || payload.locations[0] || {};
  const subtotal = cart.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);
  const total = subtotal + subtotal * taxRate;

  const scrollToCategory = (slug) => {
    setActiveCategory(slug);
    sectionRefs.current[slug]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateSelection = (itemId, patch) => {
    setSelections((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] || { quantity: 1 }), ...patch } }));
  };

  const addToCart = (item) => {
    const selection = selections[item.id] || {};
    const tray = item.tray_options.find((option) => String(option.id) === String(selection.trayId)) || item.tray_options[0];
    if (!tray) return;
    const quantity = Math.max(1, Number(selection.quantity || 1));
    const cartKey = `${item.id}:${tray.id}`;
    setCart((prev) => {
      const existing = prev.find((line) => line.cartKey === cartKey);
      if (existing) return prev.map((line) => line.cartKey === cartKey ? { ...line, quantity: line.quantity + quantity } : line);
      return [...prev, {
        cartKey,
        item_id: item.id,
        tray_option_id: tray.id,
        name: item.name,
        tray_name: tray.tray_name,
        serves: tray.serves,
        price: Number(tray.price),
        quantity,
        image_url: item.image_url,
      }];
    });
    setSuccess(`${item.name} added`);
    window.setTimeout(() => setSuccess(''), 1600);
  };

  const updateCartQty = (cartKey, quantity) => {
    if (quantity < 1) return setCart((prev) => prev.filter((line) => line.cartKey !== cartKey));
    setCart((prev) => prev.map((line) => line.cartKey === cartKey ? { ...line, quantity } : line));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!cart.length) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    try {
      await api.createCateringByTrayOrder({
        ...data,
        order_type: orderType,
        restaurant_location_id: locationId,
        location_name: selectedLocation.restaurant_name || selectedLocation.name,
        event_date: eventDate,
        currency,
        subtotal,
        tax: subtotal * taxRate,
        total,
        items: cart,
      });
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      setSuccess('Your catering request has been submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 pt-28 dark:bg-dark-950">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="skeleton h-52 rounded-3xl" />
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="skeleton h-96 rounded-2xl lg:col-span-2" />
            <div className="skeleton h-96 rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 pt-24 dark:bg-dark-950">
      <section className="relative overflow-hidden border-b border-amber-500/10 bg-white dark:bg-black">
        <div className="absolute inset-0 bg-pattern opacity-60" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 md:grid-cols-[1.2fr_0.8fr] md:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <ChefHat size={16} /> Fresh trays, made for gatherings
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold text-neutral-900 dark:text-white md:text-6xl">Catering By Tray</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600 dark:text-neutral-300">
              Perfect for family gatherings, office lunches, birthdays, weddings and special occasions.
              Order fresh Indian food by the tray with flexible serving sizes.
            </p>
          </div>
          <div className="hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/15 via-white to-emerald-500/10 p-5 shadow-2xl shadow-amber-900/10 dark:via-neutral-950 md:block">
            <div className="aspect-[4/3] rounded-2xl bg-[url('https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center" />
          </div>
        </div>
      </section>

      {!mobileDetailsOpen ? (
        <div className="sticky top-20 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/95 md:hidden">
          <button
            type="button"
            onClick={() => setMobileDetailsOpen(true)}
            className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-neutral-200"
            aria-expanded={mobileDetailsOpen}
          >
            <span className="truncate">{orderType === 'delivery' ? 'Delivery' : 'Pickup'} · {selectedLocation.restaurant_name || selectedLocation.name || 'Select location'} · {eventDate}</span>
            <ChevronDown className="shrink-0 text-amber-500" size={20} />
          </button>
        </div>
      ) : null}

      <section className={`${mobileDetailsOpen ? 'block' : 'hidden'} border-b border-neutral-200 bg-white/90 backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/90 md:sticky md:top-20 md:z-30 md:block`}>
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"><Truck size={14} /> Order Type</span>
            <select className="select-dark" value={orderType} onChange={(event) => setOrderType(event.target.value)}>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"><MapPin size={14} /> Delivery Location</span>
            <select className="select-dark" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              {payload.locations.map((loc) => (
                <option key={loc.id || loc.restaurant_id || loc.location_slug} value={loc.id || loc.restaurant_id || loc.location_slug}>
                  {loc.restaurant_name || loc.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"><CalendarDays size={14} /> Event Date</span>
            <input className="input-dark" type="date" min={todayIso()} value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
          </label>
        </div>
      </section>

      <nav className={`sticky ${mobileDetailsOpen ? 'top-20' : 'top-[124px]'} z-20 border-b border-neutral-200 bg-neutral-50/95 backdrop-blur dark:border-neutral-800 dark:bg-dark-950/95 md:top-[164px]`}>
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3">
          {visibleCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.slug)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${activeCategory === cat.slug ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-white text-neutral-600 hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:text-white'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:gap-12">
        <div className="space-y-12 pb-24 lg:pb-0">
          {visibleCategories.map((cat) => {
            const items = itemsByCategory.get(cat.id) || [];
            if (!items.length) return null;
            return (
              <section key={cat.id} id={`cat-${cat.slug}`} ref={(node) => { sectionRefs.current[cat.slug] = node; }} className="scroll-mt-48 md:scroll-mt-56">
                <div className="mb-5">
                  <h2 className="font-display text-3xl font-bold text-neutral-900 dark:text-white">{cat.name}</h2>
                  {cat.description ? <p className="mt-1 text-neutral-500">{cat.description}</p> : null}
                </div>
                <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:gap-6">
                  {items.map((item) => {
                    const selection = selections[item.id] || {};
                    const tray = item.tray_options.find((option) => String(option.id) === String(selection.trayId)) || item.tray_options[0];
                    return (
                      <motion.article key={item.id} layout className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-900/5 transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
                        <div className="aspect-[16/10] overflow-hidden bg-neutral-200 min-[480px]:aspect-[4/3] md:aspect-[16/10]">
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                        </div>
                        <div className="space-y-4 p-4 md:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold leading-snug text-neutral-900 dark:text-white md:text-xl">{item.name}</h3>
                              <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300 min-[480px]:text-xs min-[480px]:leading-5 md:text-sm md:leading-6">{item.short_description}</p>
                            </div>
                            <BadgeStrip item={item} />
                          </div>
                          <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Tray Size</span>
                            <select className="select-dark" value={selection.trayId || tray?.id || ''} onChange={(event) => updateSelection(item.id, { trayId: event.target.value })}>
                              {item.tray_options.map((option) => (
                                <option key={option.id} value={option.id}>{option.tray_name} · Serves {option.serves} · {money(option.price, currency)}</option>
                              ))}
                            </select>
                          </label>
                          <div className="flex flex-col gap-3 min-[480px]:items-stretch md:flex-row md:items-center md:justify-between">
                            <div>
                              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Quantity</span>
                              <div className="mt-2 inline-flex items-center rounded-full border border-neutral-200 dark:border-neutral-800">
                                <button onClick={() => updateSelection(item.id, { quantity: Math.max(1, Number(selection.quantity || 1) - 1) })} className="p-3" aria-label="Decrease quantity"><Minus size={16} /></button>
                                <span className="w-10 text-center font-bold">{selection.quantity || 1}</span>
                                <button onClick={() => updateSelection(item.id, { quantity: Number(selection.quantity || 1) + 1 })} className="p-3" aria-label="Increase quantity"><Plus size={16} /></button>
                              </div>
                            </div>
                            <button onClick={() => addToCart(item)} className="btn-gold !px-5 min-[480px]:w-full md:w-auto">
                              Add To Order
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        <div className="hidden lg:sticky lg:top-60 lg:block lg:self-start">
          <OrderSummary cart={cart} currency={currency} taxRate={taxRate} onQty={updateCartQty} onRemove={(key) => setCart((prev) => prev.filter((line) => line.cartKey !== key))} onClear={() => setCart([])} onCheckout={() => setCheckoutOpen(true)} />
        </div>
      </div>

      {cart.length ? (
        <button onClick={() => setCartOpen(true)} className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-2xl bg-neutral-950 px-5 py-4 text-white shadow-2xl dark:bg-amber-500 dark:text-black lg:hidden">
          <span className="font-semibold">{cart.reduce((sum, line) => sum + line.quantity, 0)} Items</span>
          <span className="font-bold">{money(total, currency)} · View Cart</span>
        </button>
      ) : null}

      <AnimatePresence>
        {(checkoutOpen || cartOpen) && (
          <motion.div className="fixed inset-0 z-50 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setCheckoutOpen(false); setCartOpen(false); }}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              onClick={(event) => event.stopPropagation()}
              className="ml-auto h-full w-full max-w-2xl overflow-y-auto bg-white p-6 dark:bg-neutral-950"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-3xl font-bold text-neutral-900 dark:text-white">{checkoutOpen ? 'Checkout Request' : 'Your Cart'}</h2>
                <button onClick={() => { setCheckoutOpen(false); setCartOpen(false); }} className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X /></button>
              </div>
              {!checkoutOpen ? (
                <OrderSummary cart={cart} currency={currency} taxRate={taxRate} onQty={updateCartQty} onRemove={(key) => setCart((prev) => prev.filter((line) => line.cartKey !== key))} onClear={() => setCart([])} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />
              ) : (
                <form onSubmit={submitOrder} className="space-y-4">
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-neutral-700 dark:text-neutral-200">
                    <p className="font-semibold">Estimated total: {money(total, currency)}</p>
                    <p className="mt-1">The restaurant will confirm availability, timing, and final details before preparing your order.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input name="customer_name" required placeholder="Name" className="input-dark" />
                    <input name="phone" required placeholder="Phone" className="input-dark" />
                    <input name="email" required type="email" placeholder="Email" className="input-dark md:col-span-2" />
                    <input name="preferred_time" required type="time" className="input-dark" aria-label="Preferred pickup or delivery time" />
                    <input name="company_name" placeholder="Company Name (optional)" className="input-dark" />
                    <input name="event_name" placeholder="Event Name (optional)" className="input-dark md:col-span-2" />
                  </div>
                  {orderType === 'delivery' ? <textarea name="delivery_address" required placeholder="Delivery Address" className="input-dark min-h-[96px]" /> : null}
                  <textarea name="special_instructions" placeholder="Special Instructions" className="input-dark min-h-[110px]" />
                  <label className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
                    <input required type="checkbox" name="confirmation_acknowledged" value="1" className="mt-1" />
                    <span>I understand catering orders require confirmation from the restaurant.</span>
                  </label>
                  <button disabled={submitting} className="btn-gold w-full disabled:opacity-60">
                    {submitting ? 'Submitting...' : 'Submit Catering Request'}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-2xl dark:bg-amber-500 dark:text-black">
            {success}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
