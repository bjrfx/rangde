import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CalendarDays, CheckCircle2, Download, Eye, Image as ImageIcon, Loader2, Plus, Search, Settings, SlidersHorizontal, Trash2, Utensils, X } from 'lucide-react';
import api from '../../api';

const badgeFields = [
  'vegetarian',
  'vegan',
  'can_be_made_vegan',
  'gluten_free',
  'contains_nuts',
  'spicy',
  'recommended',
  'chef_special',
  'best_seller',
  'popular',
  'kids_friendly',
  'halal',
];

const statusOptions = ['pending', 'confirmed', 'preparing', 'completed', 'cancelled'];
const CATERING_BY_TRAY_REFRESH_KEY = 'catering-by-tray-updated-at';
const DEFAULT_SETTINGS_FORM = {
  minimum_amount: '0',
  maximum_order_size: '0',
  lead_time_hours: '24',
  tax_rate: '0.13',
  currency: 'CAD',
  notification_email: '',
  pause_catering_orders: '0',
  pickup_times: '11:30-21:30',
  delivery_times: '11:30-21:30',
  image_disclaimer_enabled: '1',
  image_disclaimer_text: 'Images are for illustration purpose only',
  image_resolution_mode: 'smart_crop',
  image_exact_width: '600',
  image_exact_height: '400',
  image_proportional_size: '600',
};

function toFormValue(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function normalizeSettingsForm(settings = {}) {
  const mode = String(settings.image_resolution_mode || DEFAULT_SETTINGS_FORM.image_resolution_mode).trim().toLowerCase();
  const safeMode = ['original', 'smart_crop', 'exact', 'proportional'].includes(mode) ? mode : 'smart_crop';
  return {
    minimum_amount: toFormValue(settings.minimum_amount, DEFAULT_SETTINGS_FORM.minimum_amount),
    maximum_order_size: toFormValue(settings.maximum_order_size, DEFAULT_SETTINGS_FORM.maximum_order_size),
    lead_time_hours: toFormValue(settings.lead_time_hours, DEFAULT_SETTINGS_FORM.lead_time_hours),
    tax_rate: toFormValue(settings.tax_rate, DEFAULT_SETTINGS_FORM.tax_rate),
    currency: String(settings.currency || DEFAULT_SETTINGS_FORM.currency).trim().toUpperCase() || DEFAULT_SETTINGS_FORM.currency,
    notification_email: toFormValue(settings.notification_email, DEFAULT_SETTINGS_FORM.notification_email),
    pause_catering_orders: toFormValue(settings.pause_catering_orders, DEFAULT_SETTINGS_FORM.pause_catering_orders),
    pickup_times: toFormValue(settings.pickup_times, DEFAULT_SETTINGS_FORM.pickup_times),
    delivery_times: toFormValue(settings.delivery_times, DEFAULT_SETTINGS_FORM.delivery_times),
    image_disclaimer_enabled: toFormValue(settings.image_disclaimer_enabled, DEFAULT_SETTINGS_FORM.image_disclaimer_enabled),
    image_disclaimer_text: toFormValue(settings.image_disclaimer_text, DEFAULT_SETTINGS_FORM.image_disclaimer_text),
    image_resolution_mode: safeMode,
    image_exact_width: toFormValue(settings.image_exact_width, DEFAULT_SETTINGS_FORM.image_exact_width),
    image_exact_height: toFormValue(settings.image_exact_height, DEFAULT_SETTINGS_FORM.image_exact_height),
    image_proportional_size: toFormValue(settings.image_proportional_size, DEFAULT_SETTINGS_FORM.image_proportional_size),
  };
}

function broadcastCateringByTrayRefresh() {
  const value = String(Date.now());
  try {
    window.localStorage.setItem(CATERING_BY_TRAY_REFRESH_KEY, value);
  } catch (_err) {
    // Ignore storage failures (private mode/quota) and still dispatch in-tab event.
  }
  window.dispatchEvent(new CustomEvent('catering-by-tray-updated', { detail: { value } }));
}

function titleize(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function money(value, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(Number(value || 0));
}

function parsePositiveNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseNonNegativeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function buildGoogleImageVariant(originalUrl, suffix) {
  const source = String(originalUrl || '').trim();
  if (!source || !suffix) return source;
  const googleUrlMatch = source.match(/^(https:\/\/lh3\.googleusercontent\.com\/d\/[^/?#=]+)(?:=[^?#]+)?([?#].*)?$/i);
  if (!googleUrlMatch) return source;
  return `${googleUrlMatch[1]}=${suffix}${googleUrlMatch[2] || ''}`;
}

function AdminItemImage({ src, alt }) {
  const imageSources = useMemo(() => {
    const source = String(src || '').trim();
    if (!source) return [];
    const variants = [
      buildGoogleImageVariant(source, 'w800-h500-c'),
      source,
      buildGoogleImageVariant(source, 'w1600'),
    ];
    return Array.from(new Set(variants.filter(Boolean)));
  }, [src]);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [src]);

  if (!imageSources[imageIndex]) {
    return (
      <div className="flex h-40 w-full items-center justify-center bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
        <Utensils size={22} />
      </div>
    );
  }

  return (
    <img
      src={imageSources[imageIndex]}
      alt={alt}
      className="h-40 w-full object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setImageIndex((prev) => prev + 1)}
    />
  );
}

function emptyItem(categoryId = '') {
  return {
    name: '',
    short_description: '',
    long_description: '',
    category_id: categoryId,
    base_price: '',
    item_formula_multiplier: '',
    sort_order: 1,
    is_active: 1,
    available: 1,
    image_url: '',
    tray_options: [{ tray_name: 'Half Tray', serves: '10–15', price: 75, formula_id: '', custom_multiplier: '', sort_order: 1, is_active: 1 }],
    ...Object.fromEntries(badgeFields.map((field) => [field, 0])),
  };
}

const MAX_CATEGORY_FORMULAS = 4;
const MAX_ITEM_IMAGE_BYTES = 5 * 1024 * 1024;

function emptyCategoryFormula(sortOrder = 1) {
  return { id: null, label: '', multiplier: '', sort_order: sortOrder };
}

function normalizeCategoryFormulas(formulas = []) {
  return formulas.map((formula, index) => ({
    id: formula.id ?? null,
    label: formula.label ?? '',
    multiplier: formula.multiplier ?? '',
    sort_order: index + 1,
  }));
}

// Tray custom multiplier wins over the selected category formula.
function resolveTrayMultiplier(tray, categoryFormulas = []) {
  const custom = parsePositiveNumber(tray?.custom_multiplier);
  if (custom !== null) return { multiplier: custom, source: 'custom' };
  const selected = categoryFormulas.find((formula) => String(formula.id) === String(tray?.formula_id));
  const selectedMultiplier = parsePositiveNumber(selected?.multiplier);
  if (selectedMultiplier !== null) return { multiplier: selectedMultiplier, source: 'category', label: selected.label };
  return { multiplier: null, source: 'manual' };
}

function normalizeTrayOptions(trays = []) {
  return trays
    .map((tray, index) => ({
      ...tray,
      sort_order: index + 1,
    }))
    .filter((tray) => String(tray.tray_name || '').trim());
}

function sanitizeItemPayload(item) {
  return {
    ...item,
    base_price: item.base_price === '' ? null : item.base_price,
    item_formula_multiplier: item.item_formula_multiplier === '' ? null : item.item_formula_multiplier,
    tray_options: normalizeTrayOptions(item.tray_options || []).map((tray) => ({
      id: tray.id || null,
      tray_name: tray.tray_name,
      serves: tray.serves,
      price: tray.price,
      formula_id: tray.formula_id === '' || tray.formula_id === undefined ? null : tray.formula_id,
      custom_multiplier: tray.custom_multiplier === '' || tray.custom_multiplier === undefined ? null : tray.custom_multiplier,
      sort_order: tray.sort_order,
      is_active: tray.is_active,
    })),
  };
}

function Modal({ title, children, onClose }) {
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900" initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }} onClick={(event) => event.stopPropagation()}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h2>
            <button onClick={onClose} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"><X size={20} /></button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function OrderDetail({ order, onClose, onStatus, statusPending = false }) {
  if (!order) return null;
  return (
    <Modal title={`Order ${order.order_number}`} onClose={onClose}>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <h3 className="mb-3 font-semibold">Customer</h3>
            <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <p><strong>Name:</strong> {order.customer_name}</p>
              <p><strong>Email:</strong> {order.email}</p>
              <p><strong>Phone:</strong> {order.phone}</p>
              <p><strong>Company:</strong> {order.company_name || 'N/A'}</p>
              <p><strong>Event:</strong> {order.event_name || 'N/A'}</p>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <h3 className="mb-3 font-semibold">Items</h3>
            <div className="space-y-3">
              {(order.items || []).map((item) => (
                <div key={item.id} className="flex justify-between gap-3 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-950">
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">{item.item_name}</p>
                    <p className="text-neutral-500">{item.tray_name} · Serves {item.serves} · Qty {item.quantity}</p>
                  </div>
                  <p className="font-semibold">{money(item.line_total, order.currency)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-outline-gold !px-4 !py-2 text-sm">Print Order</button>
            <button onClick={() => window.print()} className="btn-outline-gold !px-4 !py-2 text-sm"><Download size={16} className="mr-2" /> Export PDF</button>
            <button onClick={() => window.open(`/catering-by-tray/order-summary/${order.id}`, '_blank', 'noopener,noreferrer')} className="btn-outline-gold !px-4 !py-2 text-sm">Open Order Summary</button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <h3 className="mb-3 font-semibold">Event Details</h3>
            <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <p><strong>Website:</strong> {order.website || 'N/A'}</p>
              <p><strong>Location:</strong> {order.location_name}</p>
              <p><strong>Type:</strong> {titleize(order.order_type)}</p>
              <p><strong>Date:</strong> {order.event_date}</p>
              <p><strong>Time:</strong> {order.preferred_time}</p>
              <p><strong>Delivery Address:</strong> {order.delivery_address || 'N/A'}</p>
              <p><strong>Instructions:</strong> {order.special_instructions || 'N/A'}</p>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <h3 className="mb-3 font-semibold">Status</h3>
            <select value={order.status} disabled={statusPending} onChange={(event) => onStatus(order.id, event.target.value)} className="select-dark disabled:opacity-60">
              {statusOptions.map((status) => <option key={status} value={status}>{titleize(status)}</option>)}
            </select>
          </div>
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{money(order.subtotal, order.currency)}</span></div>
            <div className="mt-2 flex justify-between text-sm"><span>Tax</span><span>{money(order.tax, order.currency)}</span></div>
            <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 text-lg font-bold dark:border-neutral-800"><span>Total</span><span>{money(order.total, order.currency)}</span></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CategoryDeleteConfirm({ category, itemCount, deleting, onCancel, onConfirm }) {
  if (!category) return null;
  const hasItems = itemCount > 0;
  return (
    <Modal title="Delete Category" onClose={onCancel}>
      <div className="space-y-5">
        <p className="text-neutral-700 dark:text-neutral-300">
          {hasItems
            ? `Deleting "${category.name}" will also permanently delete all ${itemCount} item${itemCount === 1 ? '' : 's'} belonging to this category.`
            : `Delete "${category.name}"? This category will be permanently removed.`}
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={deleting} className="btn-outline-gold">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={deleting} className="btn-gold bg-red-600 text-white hover:bg-red-700">
            {deleting ? <Loader2 className="animate-spin" /> : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ItemForm({ item, categories, onSave, onCancel, onError }) {
  const trayKeyRef = useRef(0);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingTrayKey, setDeletingTrayKey] = useState('');
  const [formError, setFormError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const decorateTrayOptions = (trays = []) => normalizeTrayOptions(trays).map((tray) => ({
    ...tray,
    formula_id: tray.formula_id ?? '',
    custom_multiplier: tray.custom_multiplier ?? '',
    _trayKey: tray.id ? `existing-${tray.id}` : `new-${trayKeyRef.current++}`,
  }));
  const toFormState = (nextItem) => ({
    ...(nextItem || emptyItem(categories[0]?.id || '')),
    base_price: nextItem?.base_price ?? '',
    item_formula_multiplier: nextItem?.item_formula_multiplier ?? '',
    tray_options: decorateTrayOptions(nextItem?.tray_options || []),
  });
  const [form, setForm] = useState(() => toFormState(item || emptyItem(categories[0]?.id || '')));
  // Reset only when a different item is opened, so in-progress edits are never wiped.
  const loadedItemKey = useRef(item?.id ?? 'new');
  useEffect(() => {
    const nextKey = item?.id ?? 'new';
    if (loadedItemKey.current === nextKey) return;
    loadedItemKey.current = nextKey;
    setForm(toFormState(item || emptyItem(categories[0]?.id || '')));
    setDeletingTrayKey('');
    setFormError('');
  }, [item, categories]);
  useEffect(() => () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);
  const busy = submitting || Boolean(deletingTrayKey);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const selectedCategory = categories.find((cat) => String(cat.id) === String(form.category_id));
  const categoryFormulas = useMemo(
    () => (selectedCategory?.formulas || []).filter((formula) => parsePositiveNumber(formula.multiplier) !== null),
    [selectedCategory]
  );
  const basePrice = parseNonNegativeNumber(form.base_price);
  const updateTray = (trayKey, key, value) => {
    setForm((prev) => ({ ...prev, tray_options: prev.tray_options.map((tray) => tray._trayKey === trayKey ? { ...tray, [key]: value } : tray) }));
  };
  const addTray = () => setForm((prev) => ({
    ...prev,
    tray_options: decorateTrayOptions([
      ...prev.tray_options,
      { tray_name: 'Full Tray', serves: '30–50', price: 145, formula_id: '', custom_multiplier: '', sort_order: prev.tray_options.length + 1, is_active: 1 },
    ]),
  }));
  const clearPendingImage = () => {
    setImageFile(null);
    setImagePreviewUrl('');
  };
  const choosePendingImage = (file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      setFormError('Please choose an image file (JPG, PNG, WEBP, GIF or AVIF).');
      return;
    }
    if (file.size > MAX_ITEM_IMAGE_BYTES) {
      setFormError('Image must be 5 MB or smaller.');
      return;
    }
    setFormError('');
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  // Uploads a newly chosen image only when one is pending, then saves the item.
  const persist = async (nextForm, options) => {
    let working = nextForm;
    if (imageFile) {
      const uploaded = await api.uploadCateringByTrayImage(imageFile);
      working = { ...working, image_url: uploaded.url };
      setForm((prev) => ({ ...prev, image_url: uploaded.url }));
      clearPendingImage();
    }
    return onSave(sanitizeItemPayload(working), options);
  };

  const reportError = (error, fallback) => {
    const message = error?.message || fallback;
    setFormError(message);
    onError(message);
  };

  const removeTray = async (trayKey) => {
    if (busy || submittingRef.current) return;
    const nextTrayOptions = normalizeTrayOptions(form.tray_options.filter((tray) => tray._trayKey !== trayKey));
    if (!form.id) {
      setForm((prev) => ({ ...prev, tray_options: decorateTrayOptions(nextTrayOptions) }));
      return;
    }
    submittingRef.current = true;
    setDeletingTrayKey(trayKey);
    setFormError('');
    try {
      const saved = await persist({ ...form, tray_options: nextTrayOptions }, { keepOpen: true });
      if (saved) setForm(toFormState(saved));
    } catch (error) {
      reportError(error, 'Unable to remove tray option');
    } finally {
      submittingRef.current = false;
      setDeletingTrayKey('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFormError('');
    try {
      await persist(form, { keepOpen: false });
    } catch (error) {
      reportError(error, 'Unable to save item');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const previewSrc = imagePreviewUrl || form.image_url;

  return (
    <Modal title={form.id ? 'Edit Menu Item' : 'New Menu Item'} onClose={() => { if (!busy) onCancel(); }}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <input required className="input-dark" placeholder="Item Name" value={form.name} onChange={(event) => set('name', event.target.value)} />
          <select required className="select-dark" value={form.category_id} onChange={(event) => set('category_id', event.target.value)}>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <input type="number" min="0" step="0.01" className="input-dark md:col-span-2" placeholder="Base Price" value={form.base_price} onChange={(event) => set('base_price', event.target.value)} />
          <input className="input-dark md:col-span-2" placeholder="Short Description" value={form.short_description || ''} onChange={(event) => set('short_description', event.target.value)} />
          <textarea className="input-dark min-h-[90px] md:col-span-2" placeholder="Long Description" value={form.long_description || ''} onChange={(event) => set('long_description', event.target.value)} />
          <input type="number" className="input-dark" placeholder="Sort Order" value={form.sort_order || 1} onChange={(event) => set('sort_order', event.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.is_active)} onChange={(event) => set('is_active', event.target.checked ? 1 : 0)} /> Active</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.available)} onChange={(event) => set('available', event.target.checked ? 1 : 0)} /> Available</label>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h3 className="mb-2 font-semibold">Pricing Formula</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {categoryFormulas.length
              ? <>Formulas available from <strong>{selectedCategory?.name}</strong>: {categoryFormulas.map((formula) => `${formula.label} × ${formula.multiplier}`).join(', ')}</>
              : <>No category formulas configured. Add them in the Categories tab, or set a custom multiplier per tray.</>}
          </p>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Each tray option calculates independently as Base Price × its selected formula. Trays set to Manual keep the price you type.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><ImageIcon size={18} /> Image</h3>
          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
              {previewSrc ? <img src={previewSrc} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : null}
            </div>
            <div className="space-y-3">
              <input
                className="input-dark"
                placeholder="Image URL"
                value={imageFile ? '' : (form.image_url || '')}
                onChange={(event) => {
                  clearPendingImage();
                  set('image_url', event.target.value);
                }}
              />
              <label
                className="flex min-h-[92px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  choosePendingImage(event.dataTransfer?.files?.[0]);
                }}
              >
                {imageFile ? `Selected: ${imageFile.name} (uploads when you save)` : 'Drag and drop upload, or click to choose'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    choosePendingImage(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
              {imageFile ? (
                <button type="button" onClick={clearPendingImage} className="text-xs font-medium text-red-500 hover:underline">Discard selected image</button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Dietary Badges</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {badgeFields.map((field) => (
              <label key={field} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(form[field])} onChange={(event) => set(field, event.target.checked ? 1 : 0)} />
                {titleize(field)}
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Tray Options</h3>
            <button type="button" onClick={addTray} className="btn-outline-gold !px-3 !py-2 text-xs"><Plus size={14} className="mr-1" /> Add Tray</button>
          </div>
          <AnimatePresence initial={false}>
            {form.tray_options.map((tray) => {
              const resolved = resolveTrayMultiplier(tray, categoryFormulas);
              const trayPrice = (basePrice !== null && resolved.multiplier !== null)
                ? Number((basePrice * resolved.multiplier).toFixed(2))
                : null;
              const isCustom = String(tray.custom_multiplier ?? '') !== '';
              return (
              <motion.div
                key={tray._trayKey}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="mb-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950"
              >
                <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.4fr]">
                  <input className="input-dark" placeholder="Tray Name" value={tray.tray_name} onChange={(event) => updateTray(tray._trayKey, 'tray_name', event.target.value)} />
                  <input type="text" maxLength={50} className="input-dark" placeholder="Serves (e.g. 10–15)" value={tray.serves} onChange={(event) => updateTray(tray._trayKey, 'serves', event.target.value)} />
                  <input
                    type="number"
                    step="0.01"
                    className="input-dark"
                    placeholder="Price"
                    value={trayPrice !== null ? trayPrice : tray.price}
                    onChange={(event) => updateTray(tray._trayKey, 'price', event.target.value)}
                    disabled={trayPrice !== null}
                  />
                  <button
                    type="button"
                    onClick={() => removeTray(tray._trayKey)}
                    disabled={busy}
                    className="rounded-lg p-3 text-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Remove tray"
                  >
                    {deletingTrayKey === tray._trayKey ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[1.4fr_0.8fr_1.6fr]">
                  <select
                    className="select-dark"
                    value={isCustom ? 'custom' : String(tray.formula_id ?? '')}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === 'custom') {
                        updateTray(tray._trayKey, 'formula_id', '');
                        updateTray(tray._trayKey, 'custom_multiplier', '1');
                        return;
                      }
                      updateTray(tray._trayKey, 'custom_multiplier', '');
                      updateTray(tray._trayKey, 'formula_id', value);
                    }}
                  >
                    <option value="">Manual price (no formula)</option>
                    {categoryFormulas.map((formula) => (
                      <option key={formula.id} value={formula.id}>{formula.label} × {formula.multiplier}</option>
                    ))}
                    <option value="custom">Custom multiplier…</option>
                  </select>
                  <input
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    className="input-dark"
                    placeholder="Custom ×"
                    value={tray.custom_multiplier ?? ''}
                    onChange={(event) => updateTray(tray._trayKey, 'custom_multiplier', event.target.value)}
                    disabled={!isCustom}
                  />
                  <p className="self-center text-xs text-neutral-500">
                    {resolved.multiplier === null
                      ? 'Manual pricing — price is used as typed.'
                      : `${resolved.source === 'custom' ? 'Custom' : `Category: ${resolved.label}`} · Base Price × ${resolved.multiplier} = ${trayPrice === null ? 'set Base Price' : money(trayPrice)}`}
                  </p>
                </div>
              </motion.div>
            );
            })}
          </AnimatePresence>
        </div>
        {formError ? (
          <p className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"><AlertCircle size={16} /> {formError}</p>
        ) : null}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="btn-outline-gold disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={busy} className="btn-gold disabled:opacity-60">{submitting ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</> : 'Save Item'}</button>
        </div>
      </form>
    </Modal>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map());
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
  }, []);
  const notify = useCallback((type, message) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    timersRef.current.set(id, setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500));
  }, [dismiss]);
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);
  return { toasts, notify, dismiss };
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${toast.type === 'error'
              ? 'border-red-200 bg-white text-red-700 dark:border-red-500/30 dark:bg-neutral-900 dark:text-red-300'
              : 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-500/30 dark:bg-neutral-900 dark:text-emerald-300'}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            {toast.type === 'error' ? <AlertCircle size={18} className="mt-0.5 flex-shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />}
            <p className="flex-1 text-neutral-800 dark:text-neutral-100">{toast.message}</p>
            <button type="button" onClick={() => onDismiss(toast.id)} className="rounded p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white" aria-label="Dismiss notification"><X size={14} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const ORDERS_POLL_INTERVAL_MS = 15000;

function compareBySortOrderThenName(a, b) {
  return (Number(a.sort_order || 0) - Number(b.sort_order || 0)) || String(a.name || '').localeCompare(String(b.name || ''));
}

function upsertById(list, entry) {
  const exists = list.some((row) => Number(row.id) === Number(entry.id));
  const next = exists ? list.map((row) => (Number(row.id) === Number(entry.id) ? entry : row)) : [...list, entry];
  return next.sort(compareBySortOrderThenName);
}

export default function AdminCateringByTrayManagement() {
  const [tab, setTab] = useState('orders');
  const [data, setData] = useState({ categories: [], items: [], orders: [], settings: {}, locations: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [categoryDelete, setCategoryDelete] = useState(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS_FORM);
  const [settingsFeedback, setSettingsFeedback] = useState({ type: '', message: '' });
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const [pendingActions, setPendingActions] = useState({});
  const pendingRef = useRef(new Set());
  const initialLoadRef = useRef(false);
  const { toasts, notify, dismiss } = useToasts();

  const isPending = (key) => Boolean(pendingActions[key]);

  // Each action gets its own key so unrelated buttons never share a loading state,
  // and a second click on the same action is ignored while it is in flight.
  const runAction = useCallback(async (key, task) => {
    if (pendingRef.current.has(key)) return undefined;
    pendingRef.current.add(key);
    setPendingActions((prev) => ({ ...prev, [key]: true }));
    try {
      return await task();
    } finally {
      pendingRef.current.delete(key);
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const next = await api.getCateringByTrayAdmin();
      setData({
        categories: next.categories || [],
        items: next.items || [],
        orders: next.orders || [],
        settings: next.settings || {},
        locations: next.locations || [],
      });
    } catch (error) {
      setLoadError(error?.message || 'Unable to load catering by tray data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    loadAll();
  }, [loadAll]);

  // Only orders change from the outside (new customer orders), so poll just those, and only while visible.
  useEffect(() => {
    if (tab !== 'orders') return undefined;
    let cancelled = false;
    let inFlight = false;
    const refreshOrders = async () => {
      if (inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
      try {
        const orders = await api.getCateringByTrayAdminOrders();
        if (!cancelled && Array.isArray(orders)) setData((prev) => ({ ...prev, orders }));
      } catch (_error) {
        // Background refresh failures are non-fatal; the next tick retries.
      } finally {
        inFlight = false;
      }
    };
    const interval = setInterval(refreshOrders, ORDERS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tab]);

  useEffect(() => {
    if (!settingsDirty && !pendingActions['settings-save']) {
      setSettingsForm(normalizeSettingsForm(data.settings || {}));
    }
  }, [data.settings, settingsDirty, pendingActions]);

  const imageResolutionMode = settingsForm.image_resolution_mode;
  const selectedOrder = useMemo(
    () => (selectedOrderId === null ? null : data.orders.find((order) => Number(order.id) === Number(selectedOrderId)) || null),
    [data.orders, selectedOrderId]
  );

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.orders.filter((order) => !q || [order.order_number, order.customer_name, order.email, order.phone, order.location_name, order.status].some((field) => String(field || '').toLowerCase().includes(q)));
  }, [data.orders, search]);

  const groupedItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    const filteredItems = data.items.filter((item) => !q || [item.name, item.short_description, item.long_description].some((field) => String(field || '').toLowerCase().includes(q)));
    const categoryById = new Map(data.categories.map((cat) => [String(cat.id), cat]));
    const groups = data.categories.map((category) => ({
      key: `cat-${category.id}`,
      category,
      items: filteredItems.filter((item) => String(item.category_id) === String(category.id)),
    })).filter((group) => group.items.length);
    const uncategorized = filteredItems.filter((item) => !categoryById.has(String(item.category_id)));
    if (uncategorized.length) {
      groups.push({
        key: 'cat-uncategorized',
        category: { id: 'uncategorized', name: 'Uncategorized' },
        items: uncategorized,
      });
    }
    return groups;
  }, [data.categories, data.items, itemSearch]);

  const getCategoryDraft = (category) => categoryDrafts[String(category.id)] || {
    name: category.name,
    sort_order: category.sort_order,
    formulas: normalizeCategoryFormulas(category.formulas || []),
  };

  const updateCategoryDraft = (category, patch) => {
    setCategoryDrafts((prev) => ({
      ...prev,
      [String(category.id)]: { ...getCategoryDraft(category), ...patch },
    }));
  };

  const updateCategoryFormula = (category, index, patch) => {
    const draft = getCategoryDraft(category);
    const formulas = draft.formulas.map((formula, i) => i === index ? { ...formula, ...patch } : formula);
    updateCategoryDraft(category, { formulas });
  };

  const addCategoryFormula = (category) => {
    const draft = getCategoryDraft(category);
    if (draft.formulas.length >= MAX_CATEGORY_FORMULAS) return;
    updateCategoryDraft(category, { formulas: [...draft.formulas, emptyCategoryFormula(draft.formulas.length + 1)] });
  };

  const removeCategoryFormula = (category, index) => {
    const draft = getCategoryDraft(category);
    updateCategoryDraft(category, { formulas: normalizeCategoryFormulas(draft.formulas.filter((_, i) => i !== index)) });
  };

  // Merge a saved category (and, when prices were recalculated, its items) into local state.
  const applySavedCategory = (result) => {
    const savedCategory = result?.category;
    if (!savedCategory) return;
    setData((prev) => {
      const next = { ...prev, categories: upsertById(prev.categories, savedCategory) };
      if (Array.isArray(result.items) && result.items.length) {
        const updatedIds = new Set(result.items.map((row) => Number(row.id)));
        next.items = [
          ...prev.items.filter((row) => !updatedIds.has(Number(row.id))),
          ...result.items,
        ].sort(compareBySortOrderThenName);
      }
      return next;
    });
  };

  const createCategory = (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const payload = {
      name: String(form.get('name') || '').trim(),
      description: String(form.get('description') || '').trim(),
      sort_order: form.get('sort_order') || 1,
      is_active: form.get('is_active') ? 1 : 0,
    };
    return runAction('category-create', async () => {
      try {
        const result = await api.saveCateringByTrayCategory(payload);
        applySavedCategory(result);
        formEl.reset();
        broadcastCateringByTrayRefresh();
        notify('success', `Category "${result?.category?.name || payload.name}" created.`);
      } catch (error) {
        notify('error', error?.message || 'Unable to create category');
      }
    });
  };

  const saveCategoryDraft = (category) => {
    const key = String(category.id);
    const draft = getCategoryDraft(category);
    return runAction(`category-save-${category.id}`, async () => {
      try {
        const result = await api.saveCateringByTrayCategory({
          ...category,
          name: draft.name,
          sort_order: draft.sort_order,
          formulas: normalizeCategoryFormulas(
            draft.formulas.filter((formula) => String(formula.label || '').trim() !== '' || parsePositiveNumber(formula.multiplier) !== null)
          ),
        });
        applySavedCategory(result);
        // Keep the draft if the admin kept typing while the save was in flight.
        setCategoryDrafts((prev) => {
          if (prev[key] && prev[key] !== categoryDrafts[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
        broadcastCateringByTrayRefresh();
        notify('success', `Category "${result?.category?.name || draft.name}" saved.`);
      } catch (error) {
        notify('error', error?.message || 'Unable to save category');
      }
    });
  };

  const deleteCategory = (id) => {
    const category = data.categories.find((cat) => Number(cat.id) === Number(id));
    if (!category) return;
    setCategoryDelete({
      category,
      itemCount: data.items.filter((item) => Number(item.category_id) === Number(id)).length,
    });
  };

  const confirmDeleteCategory = () => {
    if (!categoryDelete?.category?.id) return undefined;
    const { id: categoryId, name } = categoryDelete.category;
    return runAction(`category-delete-${categoryId}`, async () => {
      try {
        await api.deleteCateringByTrayCategory(categoryId);
        setData((prev) => ({
          ...prev,
          categories: prev.categories.filter((cat) => Number(cat.id) !== Number(categoryId)),
          items: prev.items.filter((item) => Number(item.category_id) !== Number(categoryId)),
        }));
        setCategoryDrafts((prev) => {
          const next = { ...prev };
          delete next[String(categoryId)];
          return next;
        });
        setCategoryDelete(null);
        broadcastCateringByTrayRefresh();
        notify('success', `Category "${name}" deleted.`);
      } catch (error) {
        notify('error', error?.message || 'Unable to delete category');
      }
    });
  };

  // Called by ItemForm; throws on failure so the modal stays open with the entered data.
  const saveItem = async (payload, { keepOpen = false } = {}) => {
    const saved = await api.saveCateringByTrayItem(payload);
    setData((prev) => ({ ...prev, items: upsertById(prev.items, saved) }));
    broadcastCateringByTrayRefresh();
    if (keepOpen) {
      setEditingItem(saved);
      notify('success', 'Tray option removed.');
    } else {
      setEditingItem(null);
      notify('success', payload.id ? `"${saved?.name || payload.name}" updated.` : `"${saved?.name || payload.name}" created.`);
    }
    return saved;
  };

  const deleteItem = (item) => {
    if (!window.confirm('Delete this catering item?')) return undefined;
    return runAction(`item-delete-${item.id}`, async () => {
      try {
        await api.deleteCateringByTrayItem(item.id);
        setData((prev) => ({ ...prev, items: prev.items.filter((row) => Number(row.id) !== Number(item.id)) }));
        broadcastCateringByTrayRefresh();
        notify('success', `"${item.name}" deleted.`);
      } catch (error) {
        notify('error', error?.message || 'Unable to delete item');
      }
    });
  };

  const updateOrderStatus = (id, status) => runAction(`order-status-${id}`, async () => {
    try {
      const updated = await api.updateCateringByTrayOrder(id, { status });
      setData((prev) => ({
        ...prev,
        orders: prev.orders.map((order) => (Number(order.id) === Number(id)
          ? (updated?.id ? updated : { ...order, status })
          : order)),
      }));
      notify('success', `Order status updated to ${titleize(status)}.`);
    } catch (error) {
      notify('error', error?.message || 'Unable to update order status');
    }
  });

  const updateSettingsField = (field, value) => {
    setSettingsForm((prev) => ({ ...prev, [field]: value }));
    setSettingsDirty(true);
    if (settingsFeedback.type) {
      setSettingsFeedback({ type: '', message: '' });
    }
  };

  const settingsSaving = isPending('settings-save');

  const saveSettings = (event) => {
    event.preventDefault();
    return runAction('settings-save', async () => {
      setSettingsFeedback({ type: '', message: '' });
      try {
        const saved = await api.updateCateringByTraySettings({
          ...settingsForm,
          image_resolution_mode: imageResolutionMode,
        });
        const mergedSettings = { ...data.settings, ...saved };
        setData((prev) => ({ ...prev, settings: { ...prev.settings, ...saved } }));
        setSettingsForm(normalizeSettingsForm(mergedSettings));
        setSettingsDirty(false);
        broadcastCateringByTrayRefresh();
        setSettingsFeedback({ type: 'success', message: 'Settings saved successfully.' });
        notify('success', 'Settings saved.');
      } catch (err) {
        const errorMessage = String(err?.message || '').trim();
        const message = errorMessage.toLowerCase() === 'failed to fetch'
          ? 'Unable to save settings. Please check your connection and try again.'
          : (errorMessage || 'Unable to save settings. Please try again.');
        setSettingsFeedback({ type: 'error', message });
        notify('error', message);
      }
    });
  };

  if (loading) return <div className="skeleton h-64 rounded-xl" />;

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-6 text-center dark:border-red-500/30 dark:bg-neutral-900">
        <p className="text-red-600 dark:text-red-400">{loadError}</p>
        <button type="button" onClick={loadAll} className="btn-outline-gold mt-4 !px-4 !py-2 text-sm">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Catering By Tray</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage tray menu, settings, and incoming catering orders.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['orders', CalendarDays],
            ['categories', SlidersHorizontal],
            ['items', Utensils],
            ['settings', Settings],
          ].map(([key, Icon]) => (
            <button key={key} onClick={() => setTab(key)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${tab === key ? 'bg-amber-500 text-black' : 'bg-white text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300'}`}>
              <Icon size={16} /> {titleize(key)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="relative max-w-lg">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input className="input-dark !pl-10" placeholder="Search customer, phone, email, order number..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    {['Order', 'Customer', 'Location', 'Date', 'Status', 'Total', ''].map((head) => <th key={head} className="px-5 py-4 text-left text-xs uppercase tracking-wider text-neutral-500">{head}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="px-5 py-4 text-sm font-semibold">{order.order_number}</td>
                      <td className="px-5 py-4"><p className="text-sm font-medium">{order.customer_name}</p><p className="text-xs text-neutral-500">{order.phone}</p></td>
                      <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300">{order.location_name}</td>
                      <td className="px-5 py-4 text-sm">{order.event_date}</td>
                      <td className="px-5 py-4"><select className="select-dark !py-2 text-sm disabled:opacity-60" value={order.status} disabled={isPending(`order-status-${order.id}`)} onChange={(event) => updateOrderStatus(order.id, event.target.value)}>{statusOptions.map((status) => <option key={status} value={status}>{titleize(status)}</option>)}</select></td>
                      <td className="px-5 py-4 text-sm font-semibold">{money(order.total, order.currency)}</td>
                      <td className="px-5 py-4 text-right"><button onClick={() => setSelectedOrderId(order.id)} className="rounded-lg p-2 text-amber-600 hover:bg-amber-500/10" title="View"><Eye size={17} /></button></td>
                    </tr>
                  ))}
                  {!filteredOrders.length && <tr><td colSpan={7} className="px-6 py-12 text-center text-neutral-500">No catering by tray orders found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form onSubmit={createCategory} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-4 font-semibold">Create Category</h2>
            <div className="space-y-3">
              <input name="name" required className="input-dark" placeholder="Category Name" />
              <textarea name="description" className="input-dark min-h-[90px]" placeholder="Description" />
              <input name="sort_order" type="number" className="input-dark" placeholder="Sort Order" defaultValue="1" />
              <label className="flex items-center gap-2 text-sm"><input name="is_active" type="checkbox" defaultChecked value="1" /> Visible</label>
              <p className="text-xs text-neutral-500">Add pricing formulas after creating the category.</p>
              <button type="submit" disabled={isPending('category-create')} className="btn-gold w-full disabled:opacity-60">{isPending('category-create') ? <><Loader2 size={16} className="mr-2 animate-spin" /> Adding...</> : 'Add Category'}</button>
            </div>
          </form>
          <div className="space-y-3">
            {data.categories.map((cat) => {
              const draft = getCategoryDraft(cat);
              const categorySaving = isPending(`category-save-${cat.id}`);
              const categoryDeleting = isPending(`category-delete-${cat.id}`);
              return (
              <div key={cat.id} className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="grid gap-3 md:grid-cols-[1fr_100px_120px_44px]">
                  <input className="input-dark" value={draft.name} onChange={(event) => updateCategoryDraft(cat, { name: event.target.value })} />
                  <input type="number" className="input-dark" value={draft.sort_order} onChange={(event) => updateCategoryDraft(cat, { sort_order: event.target.value })} />
                  <button type="button" onClick={() => saveCategoryDraft(cat)} disabled={categorySaving || categoryDeleting} className="btn-outline-gold !px-3 !py-2 text-sm disabled:opacity-60">{categorySaving ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Saving</> : 'Save'}</button>
                  <button type="button" onClick={() => deleteCategory(cat.id)} disabled={categorySaving || categoryDeleting} className="rounded-lg p-3 text-red-500 hover:bg-red-500/10 disabled:opacity-60" aria-label={`Delete ${cat.name}`}>{categoryDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}</button>
                </div>
                <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Pricing Formulas (max {MAX_CATEGORY_FORMULAS})</h3>
                    <button
                      type="button"
                      onClick={() => addCategoryFormula(cat)}
                      disabled={draft.formulas.length >= MAX_CATEGORY_FORMULAS}
                      className="btn-outline-gold !px-3 !py-1.5 text-xs disabled:opacity-50"
                    >
                      <Plus size={14} className="mr-1" /> Add Formula
                    </button>
                  </div>
                  {draft.formulas.length ? draft.formulas.map((formula, index) => (
                    <div key={formula.id ?? `new-${index}`} className="mb-2 grid gap-2 md:grid-cols-[1.4fr_0.7fr_44px]">
                      <input className="input-dark" placeholder="Formula name (e.g. Half Tray)" value={formula.label} onChange={(event) => updateCategoryFormula(cat, index, { label: event.target.value })} />
                      <input type="number" min="0.0001" step="0.0001" className="input-dark" placeholder="Multiplier" value={formula.multiplier} onChange={(event) => updateCategoryFormula(cat, index, { multiplier: event.target.value })} />
                      <button type="button" onClick={() => removeCategoryFormula(cat, index)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>
                    </div>
                  )) : <p className="text-xs text-neutral-500">No formulas yet — items in this category use manual tray prices.</p>}
                </div>
                <p className="text-xs text-neutral-500">
                  {(cat.formulas || []).length
                    ? `Saved formulas: ${(cat.formulas || []).map((formula) => `${formula.label} × ${formula.multiplier}`).join(', ')}`
                    : 'Saved formulas: none.'}
                </p>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {tab === 'items' && (
        <div className="space-y-4">
          <button onClick={() => setEditingItem(emptyItem(data.categories[0]?.id || ''))} className="btn-gold"><Plus size={18} className="mr-2" /> Add Item</button>
          <div className="relative max-w-lg">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input className="input-dark !pl-10" placeholder="Search items by name or description..." value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} />
          </div>
          {groupedItems.length ? groupedItems.map((group) => (
            <section key={group.key} className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{group.category.name}</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <AdminItemImage src={item.image_url} alt={item.name} />
                    <div className="space-y-3 p-4">
                      <div>
                        <h3 className="font-bold">{item.name}</h3>
                        <p className="text-sm text-neutral-500">{group.category.name}</p>
                      </div>
                      <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{item.short_description}</p>
                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${item.available ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>{item.available ? 'Available' : 'Unavailable'}</span>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingItem(item)} className="btn-outline-gold !px-3 !py-2 text-xs">Edit</button>
                          <button type="button" onClick={() => deleteItem(item)} disabled={isPending(`item-delete-${item.id}`)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 disabled:opacity-60" aria-label={`Delete ${item.name}`}>{isPending(`item-delete-${item.id}`) ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )) : <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">No items found</div>}
        </div>
      )}

      {tab === 'settings' && (
        <form onSubmit={saveSettings} className="max-w-3xl space-y-5 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid gap-4 md:grid-cols-2">
            <input name="minimum_amount" type="number" step="0.01" className="input-dark" placeholder="Minimum Catering Amount" value={settingsForm.minimum_amount} onChange={(event) => updateSettingsField('minimum_amount', event.target.value)} />
            <input name="maximum_order_size" type="number" className="input-dark" placeholder="Maximum Order Size" value={settingsForm.maximum_order_size} onChange={(event) => updateSettingsField('maximum_order_size', event.target.value)} />
            <input name="lead_time_hours" type="number" className="input-dark" placeholder="Lead Time Hours" value={settingsForm.lead_time_hours} onChange={(event) => updateSettingsField('lead_time_hours', event.target.value)} />
            <input name="tax_rate" type="number" step="0.0001" className="input-dark" placeholder="Tax Rate" value={settingsForm.tax_rate} onChange={(event) => updateSettingsField('tax_rate', event.target.value)} />
            <input name="currency" className="input-dark" placeholder="Currency" value={settingsForm.currency} onChange={(event) => updateSettingsField('currency', event.target.value)} />
            <input name="notification_email" className="input-dark" placeholder="Notification Email" value={settingsForm.notification_email} onChange={(event) => updateSettingsField('notification_email', event.target.value)} />
            <label className="md:col-span-2 space-y-1">
              <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Pause Catering Orders</span>
              <select name="pause_catering_orders" className="select-dark" value={settingsForm.pause_catering_orders} onChange={(event) => updateSettingsField('pause_catering_orders', event.target.value)}>
                <option value="0">Disabled</option>
                <option value="1">Enabled</option>
              </select>
            </label>
            <input name="pickup_times" className="input-dark md:col-span-2" placeholder="Pickup Times" value={settingsForm.pickup_times} onChange={(event) => updateSettingsField('pickup_times', event.target.value)} />
            <input name="delivery_times" className="input-dark md:col-span-2" placeholder="Delivery Times" value={settingsForm.delivery_times} onChange={(event) => updateSettingsField('delivery_times', event.target.value)} />
            <label className="md:col-span-2 space-y-1">
              <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Catering Image Disclaimer</span>
              <select name="image_disclaimer_enabled" className="select-dark" value={settingsForm.image_disclaimer_enabled} onChange={(event) => updateSettingsField('image_disclaimer_enabled', event.target.value)}>
                <option value="1">Enabled</option>
                <option value="0">Disabled</option>
              </select>
            </label>
            <input
              name="image_disclaimer_text"
              className="input-dark md:col-span-2"
              placeholder="Image Disclaimer Text"
              maxLength={255}
              value={settingsForm.image_disclaimer_text}
              onChange={(event) => updateSettingsField('image_disclaimer_text', event.target.value)}
            />
            <label className="md:col-span-2 space-y-1">
              <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Catering Image Resolution</span>
              <select
                name="image_resolution_mode"
                className="select-dark"
                value={settingsForm.image_resolution_mode}
                onChange={(event) => updateSettingsField('image_resolution_mode', event.target.value)}
              >
                <option value="original">Original Resolution</option>
                <option value="smart_crop">Smart Crop</option>
                <option value="exact">Exact Width &amp; Height</option>
                <option value="proportional">Proportional Scaling</option>
              </select>
            </label>
            <div className={`md:col-span-2 grid gap-4 md:grid-cols-2 ${imageResolutionMode === 'exact' ? '' : 'hidden'}`}>
              <input
                name="image_exact_width"
                type="number"
                min="1"
                step="1"
                className="input-dark"
                placeholder="Exact Width"
                value={settingsForm.image_exact_width}
                onChange={(event) => updateSettingsField('image_exact_width', event.target.value)}
              />
              <input
                name="image_exact_height"
                type="number"
                min="1"
                step="1"
                className="input-dark"
                placeholder="Exact Height"
                value={settingsForm.image_exact_height}
                onChange={(event) => updateSettingsField('image_exact_height', event.target.value)}
              />
            </div>
            <label className={`md:col-span-2 space-y-1 ${imageResolutionMode === 'proportional' ? '' : 'hidden'}`}>
              <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Proportional Size</span>
              <input
                name="image_proportional_size"
                type="number"
                min="1"
                step="1"
                className="input-dark"
                placeholder="Size"
                value={settingsForm.image_proportional_size}
                onChange={(event) => updateSettingsField('image_proportional_size', event.target.value)}
              />
            </label>
          </div>
          <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600 dark:bg-neutral-950 dark:text-neutral-300">
            <p className="font-semibold text-neutral-900 dark:text-white">Locations</p>
            <p className="mt-1">Locations are loaded from the restaurant/location settings already configured for this website.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.locations.map((loc) => <span key={loc.id || loc.restaurant_id || loc.location_slug} className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-300">{loc.restaurant_name || loc.name}</span>)}
            </div>
          </div>
          {settingsFeedback.message ? (
            <p className={`text-sm ${settingsFeedback.type === 'error' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {settingsFeedback.message}
            </p>
          ) : null}
          <button type="submit" disabled={settingsSaving} className="btn-gold disabled:opacity-60 disabled:cursor-not-allowed">
            {settingsSaving ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</> : 'Save Settings'}
          </button>
        </form>
      )}

      {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrderId(null)} onStatus={updateOrderStatus} statusPending={isPending(`order-status-${selectedOrder.id}`)} />}
      {editingItem && <ItemForm item={editingItem} categories={data.categories} onSave={saveItem} onCancel={() => setEditingItem(null)} onError={(message) => notify('error', message)} />}
      {categoryDelete && <CategoryDeleteConfirm category={categoryDelete.category} itemCount={categoryDelete.itemCount} deleting={isPending(`category-delete-${categoryDelete.category.id}`)} onCancel={() => { if (!isPending(`category-delete-${categoryDelete.category.id}`)) setCategoryDelete(null); }} onConfirm={confirmDeleteCategory} />}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
