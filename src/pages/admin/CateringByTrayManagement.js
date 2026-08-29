import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Download, Eye, Image as ImageIcon, Loader2, Plus, Search, Settings, SlidersHorizontal, Trash2, Utensils, X } from 'lucide-react';
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

function titleize(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function money(value, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(Number(value || 0));
}

function emptyItem(categoryId = '') {
  return {
    name: '',
    short_description: '',
    long_description: '',
    category_id: categoryId,
    sort_order: 1,
    is_active: 1,
    available: 1,
    image_url: '',
    tray_options: [{ tray_name: 'Half Tray', serves: 10, price: 75, sort_order: 1, is_active: 1 }],
    ...Object.fromEntries(badgeFields.map((field) => [field, 0])),
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

function OrderDetail({ order, onClose, onStatus }) {
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
            <select value={order.status} onChange={(event) => onStatus(order.id, event.target.value)} className="select-dark">
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

function ItemForm({ item, categories, onSave, onCancel }) {
  const [form, setForm] = useState(item || emptyItem(categories[0]?.id || ''));
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateTray = (index, key, value) => {
    setForm((prev) => ({ ...prev, tray_options: prev.tray_options.map((tray, i) => i === index ? { ...tray, [key]: value } : tray) }));
  };
  const addTray = () => setForm((prev) => ({ ...prev, tray_options: [...prev.tray_options, { tray_name: 'Full Tray', serves: 20, price: 145, sort_order: prev.tray_options.length + 1, is_active: 1 }] }));
  const removeTray = (index) => setForm((prev) => ({ ...prev, tray_options: prev.tray_options.filter((_, i) => i !== index) }));
  const uploadPreview = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('image_url', reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <Modal title={form.id ? 'Edit Menu Item' : 'New Menu Item'} onClose={onCancel}>
      <form onSubmit={(event) => { event.preventDefault(); onSave(form); }} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <input required className="input-dark" placeholder="Item Name" value={form.name} onChange={(event) => set('name', event.target.value)} />
          <select required className="select-dark" value={form.category_id} onChange={(event) => set('category_id', event.target.value)}>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <input className="input-dark md:col-span-2" placeholder="Short Description" value={form.short_description || ''} onChange={(event) => set('short_description', event.target.value)} />
          <textarea className="input-dark min-h-[90px] md:col-span-2" placeholder="Long Description" value={form.long_description || ''} onChange={(event) => set('long_description', event.target.value)} />
          <input type="number" className="input-dark" placeholder="Sort Order" value={form.sort_order || 1} onChange={(event) => set('sort_order', event.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.is_active)} onChange={(event) => set('is_active', event.target.checked ? 1 : 0)} /> Active</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.available)} onChange={(event) => set('available', event.target.checked ? 1 : 0)} /> Available</label>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><ImageIcon size={18} /> Image</h3>
          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
              {form.image_url ? <img src={form.image_url} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="space-y-3">
              <input className="input-dark" placeholder="Image URL" value={form.image_url || ''} onChange={(event) => set('image_url', event.target.value)} />
              <label className="flex min-h-[92px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
                Drag and drop upload, or click to choose
                <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadPreview(event.target.files?.[0])} />
              </label>
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
          <div className="space-y-3">
            {form.tray_options.map((tray, index) => (
              <div key={index} className="grid gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.4fr]">
                <input className="input-dark" placeholder="Tray Name" value={tray.tray_name} onChange={(event) => updateTray(index, 'tray_name', event.target.value)} />
                <input type="number" className="input-dark" placeholder="Serves" value={tray.serves} onChange={(event) => updateTray(index, 'serves', event.target.value)} />
                <input type="number" step="0.01" className="input-dark" placeholder="Price" value={tray.price} onChange={(event) => updateTray(index, 'price', event.target.value)} />
                <button type="button" onClick={() => removeTray(index)} className="rounded-lg p-3 text-red-500 hover:bg-red-500/10" aria-label="Remove tray"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-outline-gold">Cancel</button>
          <button className="btn-gold">Save Item</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminCateringByTrayManagement() {
  const [tab, setTab] = useState('orders');
  const [data, setData] = useState({ categories: [], items: [], orders: [], settings: {}, locations: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const next = await api.getCateringByTrayAdmin();
    setData(next);
    if (selectedOrder?.id) {
      const refreshed = next.orders.find((order) => order.id === selectedOrder.id);
      if (refreshed) setSelectedOrder(refreshed);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.orders.filter((order) => !q || [order.order_number, order.customer_name, order.email, order.phone, order.location_name, order.status].some((field) => String(field || '').toLowerCase().includes(q)));
  }, [data.orders, search]);

  const saveCategory = async (category) => {
    setSaving(true);
    try {
      await api.saveCateringByTrayCategory(category);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category? Items in it may need reassignment.')) return;
    await api.deleteCateringByTrayCategory(id);
    await load();
  };

  const saveItem = async (item) => {
    setSaving(true);
    try {
      await api.saveCateringByTrayItem(item);
      setEditingItem(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this catering item?')) return;
    await api.deleteCateringByTrayItem(id);
    await load();
  };

  const updateOrderStatus = async (id, status) => {
    await api.updateCateringByTrayOrder(id, { status });
    await load();
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api.updateCateringByTraySettings(Object.fromEntries(form.entries()));
    await load();
  };

  if (loading) return <div className="skeleton h-64 rounded-xl" />;

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
                      <td className="px-5 py-4"><select className="select-dark !py-2 text-sm" value={order.status} onChange={(event) => updateOrderStatus(order.id, event.target.value)}>{statusOptions.map((status) => <option key={status} value={status}>{titleize(status)}</option>)}</select></td>
                      <td className="px-5 py-4 text-sm font-semibold">{money(order.total, order.currency)}</td>
                      <td className="px-5 py-4 text-right"><button onClick={() => setSelectedOrder(order)} className="rounded-lg p-2 text-amber-600 hover:bg-amber-500/10" title="View"><Eye size={17} /></button></td>
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
          <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); saveCategory(Object.fromEntries(form.entries())); event.currentTarget.reset(); }} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-4 font-semibold">Create Category</h2>
            <div className="space-y-3">
              <input name="name" required className="input-dark" placeholder="Category Name" />
              <textarea name="description" className="input-dark min-h-[90px]" placeholder="Description" />
              <input name="sort_order" type="number" className="input-dark" placeholder="Sort Order" defaultValue="1" />
              <label className="flex items-center gap-2 text-sm"><input name="is_active" type="checkbox" defaultChecked value="1" /> Visible</label>
              <button disabled={saving} className="btn-gold w-full">{saving ? <Loader2 className="animate-spin" /> : 'Add Category'}</button>
            </div>
          </form>
          <div className="space-y-3">
            {data.categories.map((cat) => (
              <div key={cat.id} className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 md:grid-cols-[1fr_100px_120px_44px]">
                <input className="input-dark" value={cat.name} onChange={(event) => setData((prev) => ({ ...prev, categories: prev.categories.map((c) => c.id === cat.id ? { ...c, name: event.target.value } : c) }))} />
                <input type="number" className="input-dark" value={cat.sort_order} onChange={(event) => setData((prev) => ({ ...prev, categories: prev.categories.map((c) => c.id === cat.id ? { ...c, sort_order: event.target.value } : c) }))} />
                <button onClick={() => saveCategory(cat)} className="btn-outline-gold !px-3 !py-2 text-sm">Save</button>
                <button onClick={() => deleteCategory(cat.id)} className="rounded-lg p-3 text-red-500 hover:bg-red-500/10"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'items' && (
        <div className="space-y-4">
          <button onClick={() => setEditingItem(emptyItem(data.categories[0]?.id || ''))} className="btn-gold"><Plus size={18} className="mr-2" /> Add Item</button>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <img src={item.image_url} alt="" className="h-40 w-full object-cover" />
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="font-bold">{item.name}</h3>
                    <p className="text-sm text-neutral-500">{data.categories.find((cat) => cat.id === item.category_id)?.name || 'Uncategorized'}</p>
                  </div>
                  <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{item.short_description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2.5 py-1 text-xs ${item.available ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>{item.available ? 'Available' : 'Unavailable'}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingItem(item)} className="btn-outline-gold !px-3 !py-2 text-xs">Edit</button>
                      <button onClick={() => deleteItem(item.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <form onSubmit={saveSettings} className="max-w-3xl space-y-5 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid gap-4 md:grid-cols-2">
            <input name="minimum_amount" type="number" step="0.01" className="input-dark" placeholder="Minimum Catering Amount" defaultValue={data.settings.minimum_amount || 0} />
            <input name="maximum_order_size" type="number" className="input-dark" placeholder="Maximum Order Size" defaultValue={data.settings.maximum_order_size || 0} />
            <input name="lead_time_hours" type="number" className="input-dark" placeholder="Lead Time Hours" defaultValue={data.settings.lead_time_hours || 24} />
            <input name="tax_rate" type="number" step="0.0001" className="input-dark" placeholder="Tax Rate" defaultValue={data.settings.tax_rate || 0.13} />
            <input name="currency" className="input-dark" placeholder="Currency" defaultValue={data.settings.currency || 'CAD'} />
            <input name="notification_email" className="input-dark" placeholder="Notification Email" defaultValue={data.settings.notification_email || ''} />
            <input name="pickup_times" className="input-dark md:col-span-2" placeholder="Pickup Times" defaultValue={data.settings.pickup_times || '11:30-21:30'} />
            <input name="delivery_times" className="input-dark md:col-span-2" placeholder="Delivery Times" defaultValue={data.settings.delivery_times || '11:30-21:30'} />
          </div>
          <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600 dark:bg-neutral-950 dark:text-neutral-300">
            <p className="font-semibold text-neutral-900 dark:text-white">Locations</p>
            <p className="mt-1">Locations are loaded from the restaurant/location settings already configured for this website.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.locations.map((loc) => <span key={loc.id || loc.restaurant_id || loc.location_slug} className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-300">{loc.restaurant_name || loc.name}</span>)}
            </div>
          </div>
          <button className="btn-gold">Save Settings</button>
        </form>
      )}

      {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatus={updateOrderStatus} />}
      {editingItem && <ItemForm item={editingItem} categories={data.categories} onSave={saveItem} onCancel={() => setEditingItem(null)} />}
    </div>
  );
}
