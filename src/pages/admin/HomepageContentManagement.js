import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Trash2, Save, Loader2, Edit3, X, Star } from 'lucide-react';
import api from '../../api';

const emptyTestimonialForm = {
  name: '',
  text: '',
  rating: 5,
  branch: '',
  sort_order: 1,
  is_active: true,
};

function itemKey(item) {
  const key = item?.source_id ?? item?.id;
  return key === undefined || key === null ? null : String(key);
}

export default function AdminHomepageContentManagement() {
  const [menuItems, setMenuItems] = useState([]);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingFeatured, setSavingFeatured] = useState(false);
  const [savingTestimonial, setSavingTestimonial] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [savedKeys, setSavedKeys] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState(null);
  const [testimonialForm, setTestimonialForm] = useState(emptyTestimonialForm);
  const isDirtySelectionRef = useRef(false);

  const loadData = async () => {
    const [menuResult, featuredResult, testimonialsResult] = await Promise.allSettled([
      api.getMenu(),
      api.getFeaturedDishes(),
      api.getAdminTestimonials(),
    ]);

    if (menuResult.status === 'fulfilled') {
      setMenuItems(menuResult.value || []);
    } else {
      console.error(menuResult.reason);
    }

    if (featuredResult.status === 'fulfilled') {
      const featured = featuredResult.value || [];
      const serverKeys = featured.map((item) => itemKey(item)).filter(Boolean);
      setFeaturedItems(featured);
      setSavedKeys(serverKeys);
      // Do not overwrite unsaved selections while user is curating featured dishes.
      if (!isDirtySelectionRef.current) {
        setSelectedKeys(serverKeys);
      }
    } else {
      console.error(featuredResult.reason);
    }

    if (testimonialsResult.status === 'fulfilled') {
      setTestimonials(testimonialsResult.value || []);
    } else {
      console.error(testimonialsResult.reason);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initialLoad = async () => {
      try {
        await loadData();
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initialLoad();

    const interval = setInterval(async () => {
      try {
        await loadData();
      } catch (err) {
        console.error(err);
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const selectedItems = useMemo(() => {
    if (!selectedKeys.length) return [];
    const byKey = new Map(menuItems.map((item) => [itemKey(item), item]));
    return selectedKeys.map((key) => byKey.get(key)).filter(Boolean);
  }, [menuItems, selectedKeys]);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      const key = itemKey(item);
      if (!key) return false;
      if (selectedKeys.includes(key)) return false;
      if (!q) return true;
      return (
        String(item.name || '').toLowerCase().includes(q)
        || String(item.category_name || '').toLowerCase().includes(q)
      );
    });
  }, [menuItems, search, selectedKeys]);

  const addFeatured = (item) => {
    const key = itemKey(item);
    if (!key) return;
    setSelectedKeys((prev) => {
      if (prev.includes(key)) return prev;
      if (prev.length >= 6) {
        window.alert('You can only select up to 6 featured dishes.');
        return prev;
      }
      isDirtySelectionRef.current = true;
      return [...prev, key];
    });
  };

  const removeFeatured = (keyToRemove) => {
    isDirtySelectionRef.current = true;
    setSelectedKeys((prev) => prev.filter((key) => key !== keyToRemove));
  };

  const saveFeatured = async () => {
    setSavingFeatured(true);
    try {
      const response = await api.updateFeaturedDishes(selectedKeys);
      const savedItems = response?.items || [];
      const persistedKeys = savedItems.map((item) => itemKey(item)).filter(Boolean);
      setFeaturedItems(savedItems);
      setSavedKeys(persistedKeys);
      setSelectedKeys(persistedKeys);
      isDirtySelectionRef.current = false;
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Unable to save featured dishes');
    } finally {
      setSavingFeatured(false);
    }
  };

  const hasUnsavedFeaturedChanges = useMemo(() => {
    if (selectedKeys.length !== savedKeys.length) return true;
    return selectedKeys.some((key, idx) => key !== savedKeys[idx]);
  }, [savedKeys, selectedKeys]);

  const openCreateModal = () => {
    setEditingTestimonial(null);
    setTestimonialForm({ ...emptyTestimonialForm, sort_order: testimonials.length + 1 });
    setModalOpen(true);
  };

  const openEditModal = (testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialForm({
      name: testimonial.name || '',
      text: testimonial.text || '',
      rating: Number(testimonial.rating || 5),
      branch: testimonial.branch || '',
      sort_order: Number(testimonial.sort_order || 1),
      is_active: Boolean(testimonial.is_active),
    });
    setModalOpen(true);
  };

  const saveTestimonial = async (e) => {
    e.preventDefault();
    if (!testimonialForm.name.trim() || !testimonialForm.text.trim()) {
      window.alert('Name and testimonial text are required.');
      return;
    }

    setSavingTestimonial(true);
    try {
      if (editingTestimonial) {
        const updated = await api.updateTestimonial(editingTestimonial.id, testimonialForm);
        setTestimonials((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await api.createTestimonial(testimonialForm);
        setTestimonials((prev) => [created, ...prev]);
      }
      setModalOpen(false);
      setEditingTestimonial(null);
      setTestimonialForm(emptyTestimonialForm);
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Unable to save testimonial');
    } finally {
      setSavingTestimonial(false);
    }
  };

  const deleteTestimonial = async (id) => {
    if (!window.confirm('Delete this testimonial?')) return;
    try {
      await api.deleteTestimonial(id);
      setTestimonials((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Unable to delete testimonial');
    }
  };

  if (loading) {
    return <div className="skeleton h-64 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Homepage Content</h1>
        <p className="text-neutral-500 text-sm mt-1">Manage featured dishes and testimonials with live refresh.</p>
      </div>

      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Featured Dishes</h2>
            <p className="text-neutral-500 text-xs mt-1">Select up to 6 dishes shown on homepage.</p>
            {hasUnsavedFeaturedChanges && (
              <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">You have unsaved featured dish changes.</p>
            )}
          </div>
          <button onClick={saveFeatured} disabled={savingFeatured || !hasUnsavedFeaturedChanges} className="btn-gold !text-sm disabled:opacity-60">
            {savingFeatured ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}Save Featured Dishes
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Selected ({selectedItems.length}/6)</h3>
            <div className="space-y-2">
              {selectedItems.map((item) => {
                const key = itemKey(item);
                return (
                  <div key={key} className="flex items-center justify-between border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm text-neutral-900 dark:text-white font-medium">{item.name}</p>
                      <p className="text-xs text-neutral-500">{item.category_name || 'Menu'}</p>
                    </div>
                    <button onClick={() => removeFeatured(key)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              {selectedItems.length === 0 && <p className="text-sm text-neutral-500">No featured dishes selected.</p>}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Find Dishes</h3>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by dish or category"
                className="input-dark !pl-9"
              />
            </div>
            <div className="max-h-72 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-lg divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredMenu.slice(0, 50).map((item) => (
                <div key={itemKey(item)} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-sm text-neutral-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-neutral-500">{item.category_name || 'Menu'}</p>
                  </div>
                  <button
                    onClick={() => addFeatured(item)}
                    disabled={selectedKeys.length >= 6}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 disabled:opacity-50"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
              ))}
              {filteredMenu.length === 0 && <p className="px-3 py-3 text-sm text-neutral-500">No dishes found.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Testimonials</h2>
            <p className="text-neutral-500 text-xs mt-1">Create, edit, activate/deactivate, or delete testimonials.</p>
          </div>
          <button onClick={openCreateModal} className="btn-gold !text-sm"><Plus size={16} className="mr-2" /> Add Testimonial</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left text-neutral-500 text-xs uppercase tracking-wider px-3 py-3">Guest</th>
                <th className="text-left text-neutral-500 text-xs uppercase tracking-wider px-3 py-3 hidden lg:table-cell">Review</th>
                <th className="text-left text-neutral-500 text-xs uppercase tracking-wider px-3 py-3">Rating</th>
                <th className="text-left text-neutral-500 text-xs uppercase tracking-wider px-3 py-3">Status</th>
                <th className="text-right text-neutral-500 text-xs uppercase tracking-wider px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {testimonials.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-neutral-500">{item.branch || 'General'}</p>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell text-xs text-neutral-500 max-w-md truncate">{item.text}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(Math.max(1, Math.min(5, Number(item.rating) || 5)))].map((_, idx) => <Star key={idx} size={12} className="fill-amber-500" />)}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${item.is_active ? 'status-confirmed' : 'status-cancelled'}`}>
                      {item.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => openEditModal(item)} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg" title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => deleteTestimonial(item.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {testimonials.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-neutral-500 text-sm">No testimonials yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-lg w-full shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{editingTestimonial ? 'Edit Testimonial' : 'Add Testimonial'}</h3>
                <button onClick={() => setModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={saveTestimonial} className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-500 mb-1">Guest Name</label>
                  <input
                    type="text"
                    value={testimonialForm.name}
                    onChange={(e) => setTestimonialForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="input-dark"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-500 mb-1">Branch</label>
                  <input
                    type="text"
                    value={testimonialForm.branch}
                    onChange={(e) => setTestimonialForm((prev) => ({ ...prev, branch: e.target.value }))}
                    className="input-dark"
                    placeholder="Wellington, Stittsville..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-500 mb-1">Testimonial</label>
                  <textarea
                    rows={4}
                    value={testimonialForm.text}
                    onChange={(e) => setTestimonialForm((prev) => ({ ...prev, text: e.target.value }))}
                    className="input-dark resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-neutral-500 mb-1">Rating</label>
                    <select
                      value={testimonialForm.rating}
                      onChange={(e) => setTestimonialForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                      className="select-dark"
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>{value} stars</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-500 mb-1">Sort Order</label>
                    <input
                      type="number"
                      min="1"
                      value={testimonialForm.sort_order}
                      onChange={(e) => setTestimonialForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 1 }))}
                      className="input-dark"
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={testimonialForm.is_active}
                    onChange={(e) => setTestimonialForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  Active (visible on homepage)
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={savingTestimonial} className="flex-1 btn-gold disabled:opacity-60">
                    {savingTestimonial ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                    {editingTestimonial ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
