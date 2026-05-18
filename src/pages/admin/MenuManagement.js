import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, X, Save, ChefHat, Search, Loader2, Flame, Leaf } from 'lucide-react';
import api from '../../api';

export default function AdminMenuManagement({ token }) {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const emptyForm = { name: '', description: '', price: '', category_id: '', is_vegetarian: false, spice_level: 'medium', is_featured: false };
  const [form, setForm] = useState(emptyForm);

  const normalizeId = (value) => String(value ?? '');
  const formatPrice = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : '0.00';
  };

  const loadData = async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    try {
      const [items, cats] = await Promise.all([api.getMenu(), api.getCategories()]);
      setMenuItems(items);
      setCategories(cats);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadData({ showLoader: true });
    const interval = setInterval(() => loadData(), 8000);
    return () => clearInterval(interval);
  }, []);
  const handleChange = (e) => { const { name, value, type, checked } = e.target; setForm({ ...form, [name]: type === 'checkbox' ? checked : value }); };
  const openCreate = () => { setEditItem(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ name: item.name, description: item.description || '', price: item.price?.toString() || '', category_id: normalizeId(item.category_id), is_vegetarian: item.is_vegetarian || false, spice_level: item.spice_level || 'medium', is_featured: item.is_featured || false }); setShowModal(true); };
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category_id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        category_id: normalizeId(form.category_id),
      };
      const selectedCategoryName = categories.find(c => normalizeId(c.id) === normalizeId(form.category_id))?.name;

      if (editItem) {
        const updated = await api.updateMenuItem(editItem.id, payload);
        setMenuItems(menuItems.map(i => normalizeId(i.id) === normalizeId(editItem.id) ? { ...i, ...updated, category_name: updated.category_name || selectedCategoryName } : i));
      } else {
        const created = await api.createMenuItem(payload);
        created.category_name = created.category_name || selectedCategoryName;
        setMenuItems([...menuItems, created]);
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Unable to save menu item');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id) => {
    try {
      await api.deleteMenuItem(id);
      setMenuItems(menuItems.filter(i => normalizeId(i.id) !== normalizeId(id)));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Unable to delete menu item');
    }
  };
  const filtered = menuItems.filter(item => { if (filterCategory && normalizeId(item.category_id) !== normalizeId(filterCategory)) return false; if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false; return true; });
  const spiceColors = { mild: 'text-green-500 dark:text-green-400 bg-green-500/10', medium: 'text-yellow-500 dark:text-yellow-400 bg-yellow-500/10', hot: 'text-orange-500 dark:text-orange-400 bg-orange-500/10', extra_hot: 'text-red-500 dark:text-red-400 bg-red-500/10' };

  if (loading) return <div className="space-y-4"><div className="skeleton h-10 w-1/3 mb-6" />{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-16 w-full mb-2" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Menu Management</h1><p className="text-neutral-500 text-sm mt-1">{menuItems.length} items in menu</p></div>
        <button onClick={openCreate} className="btn-gold !text-sm"><Plus size={18} className="mr-2" /> Add Menu Item</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" /><input type="text" placeholder="Search menu items..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-dark !pl-10" /></div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="select-dark sm:w-48"><option value="">All Categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-neutral-200 dark:border-neutral-800">
              <th className="text-left text-neutral-500 text-xs font-medium uppercase tracking-wider px-6 py-4">Item</th>
              <th className="text-left text-neutral-500 text-xs font-medium uppercase tracking-wider px-6 py-4 hidden md:table-cell">Category</th>
              <th className="text-left text-neutral-500 text-xs font-medium uppercase tracking-wider px-6 py-4">Price</th>
              <th className="text-left text-neutral-500 text-xs font-medium uppercase tracking-wider px-6 py-4 hidden lg:table-cell">Tags</th>
              <th className="text-right text-neutral-500 text-xs font-medium uppercase tracking-wider px-6 py-4">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0"><ChefHat size={16} className="text-amber-500 dark:text-amber-400" /></div><div><p className="text-neutral-900 dark:text-white text-sm font-medium">{item.name}</p><p className="text-neutral-500 text-xs truncate max-w-[200px]">{item.description}</p></div></div></td>
                  <td className="px-6 py-4 hidden md:table-cell"><span className="text-neutral-600 dark:text-neutral-400 text-sm">{item.category_name || categories.find(c => normalizeId(c.id) === normalizeId(item.category_id))?.name}</span></td>
                  <td className="px-6 py-4"><span className="text-amber-500 dark:text-amber-400 font-semibold">${formatPrice(item.price)}</span></td>
                  <td className="px-6 py-4 hidden lg:table-cell"><div className="flex gap-1.5">{item.is_vegetarian && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-500/10 text-green-500 dark:text-green-400 rounded-full"><Leaf size={10} /> Veg</span>}<span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${spiceColors[item.spice_level] || ''}`}><Flame size={10} /> {item.spice_level}</span>{item.is_featured && <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-full">★ Featured</span>}</div></td>
                  <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => openEdit(item)} className="p-2 text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"><Edit3 size={16} /></button><button onClick={() => setDeleteConfirm(item.id)} className="p-2 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16} /></button></div></td>
                </tr>))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-neutral-500">No menu items found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>{deleteConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" onClick={() => setDeleteConfirm(null)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 max-w-sm w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-neutral-900 dark:text-white font-semibold mb-2">Delete Menu Item?</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition-colors">Delete</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>{showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" onClick={() => setShowModal(false)}>
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{editItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <div><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Item Name *</label><input type="text" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Butter Chicken" className="input-dark" required /></div>
              <div><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Description</label><textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Short description..." className="input-dark resize-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Price ($) *</label><input type="number" step="0.01" name="price" value={form.price} onChange={handleChange} placeholder="0.00" className="input-dark" required /></div>
                <div><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Category *</label><select name="category_id" value={form.category_id} onChange={handleChange} className="select-dark" required><option value="">Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div><label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Spice Level</label><div className="flex gap-2">{['mild', 'medium', 'hot', 'extra_hot'].map(level => (<button key={level} type="button" onClick={() => setForm({ ...form, spice_level: level })} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${form.spice_level === level ? spiceColors[level] + ' border border-current/20' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-200 dark:border-neutral-700'}`}>{level.replace('_', ' ')}</button>))}</div></div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="is_vegetarian" checked={form.is_vegetarian} onChange={handleChange} className="w-4 h-4 bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 rounded text-amber-500 focus:ring-amber-500/30" /><span className="text-neutral-600 dark:text-neutral-300 text-sm">Vegetarian</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="is_featured" checked={form.is_featured} onChange={handleChange} className="w-4 h-4 bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 rounded text-amber-500 focus:ring-amber-500/30" /><span className="text-neutral-600 dark:text-neutral-300 text-sm">Featured</span></label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-gold disabled:opacity-50">{saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}{editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}
