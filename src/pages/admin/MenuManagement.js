import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw, Save, Upload, Link2, Search, Loader2, Image as ImageIcon, Wifi, WifiOff, Shield, Eye, EyeOff,
} from 'lucide-react';
import { api } from '../../api';

const ACCESS_STYLES = {
  READ_WRITE: { label: 'READ + WRITE ACCESS', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  READ_ONLY: { label: 'READ-ONLY ACCESS', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  CONNECTION_ERROR: { label: 'CONNECTION ERROR', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' },
  NOT_CONFIGURED: { label: 'NOT CONFIGURED', className: 'bg-neutral-500/15 text-neutral-500 border-neutral-500/30' },
  ACCESS_UNVERIFIED: { label: 'ACCESS UNVERIFIED', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
};

function AccessBadge({ level }) {
  const style = ACCESS_STYLES[level] || ACCESS_STYLES.NOT_CONFIGURED;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${style.className}`}>
      <Shield size={12} />
      {style.label}
    </span>
  );
}

export default function AdminMenuManagement() {
  const [locations, setLocations] = useState([]);
  const [locationKey, setLocationKey] = useState('');
  const [config, setConfig] = useState({ merchant_id: '', location_name: '', api_token: '', environment: 'production', currency: 'CAD' });
  const [menu, setMenu] = useState({ items: [], categories: [], access_level: 'NOT_CONFIGURED' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [message, setMessage] = useState('');
  const [imageDrafts, setImageDrafts] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [orderDrafts, setOrderDrafts] = useState({});
  const [savingOrder, setSavingOrder] = useState(false);

  const currentStatus = useMemo(
    () => locations.find((loc) => loc.location_key === locationKey),
    [locations, locationKey]
  );

  const loadStatus = useCallback(async () => {
    const data = await api.getCloverStatus();
    const list = data.locations || [];
    setLocations(list);
    const key = locationKey || list[0]?.location_key || '';
    setLocationKey(key);
    return list;
  }, [locationKey]);

  const loadMenu = useCallback(async (key) => {
    if (!key) return;
    const data = await api.getCloverAdminMenu(key);
    setMenu(data);
    const drafts = {};
    (data.categories || []).forEach((cat) => {
      drafts[cat.id] = cat.sort_order ?? 9000;
    });
    setOrderDrafts(drafts);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const list = await loadStatus();
      const key = locationKey || list[0]?.location_key;
      if (key) {
        const status = list.find((l) => l.location_key === key) || list[0];
        setConfig({
          merchant_id: status?.merchant_id || '',
          location_name: status?.location_name || '',
          api_token: '',
          environment: status?.environment || 'production',
          currency: status?.currency || 'CAD',
        });
        await loadMenu(key);
      }
    } catch (err) {
      setMessage(err.message || 'Failed to load menu management');
    } finally {
      setLoading(false);
    }
  }, [loadStatus, loadMenu, locationKey]);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!locationKey) return;
    const status = locations.find((l) => l.location_key === locationKey);
    if (status) {
      setConfig({
        merchant_id: status.merchant_id || '',
        location_name: status.location_name || '',
        api_token: '',
        environment: status.environment || 'production',
        currency: status.currency || 'CAD',
      });
    }
    loadMenu(locationKey).catch((err) => setMessage(err.message));
  }, [locationKey]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.saveCloverConfig(locationKey, config);
      setMessage('Clover configuration saved.');
      await loadStatus();
    } catch (err) {
      setMessage(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage('');
    try {
      const result = await api.testCloverConnection(locationKey);
      setMessage(result.ok ? `Connection OK · ${result.access_level}` : `Connection issue · ${result.access_level}`);
      await loadStatus();
    } catch (err) {
      setMessage(err.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const result = await api.syncCloverMenu(locationKey);
      setMessage(`Synced ${result.item_count} items across ${result.category_count} categories.`);
      await refreshAll();
    } catch (err) {
      setMessage(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const toggleCategoryVisibility = async (cat) => {
    try {
      const nextHidden = !cat.is_hidden;
      await api.setCloverCategoryVisibility(cat.id, {
        location: locationKey,
        is_hidden: nextHidden,
        category_name: cat.name,
        sort_order: cat.sort_order,
      });
      setMessage(`${cat.name} is now ${nextHidden ? 'hidden' : 'visible'} on the public menu.`);
      await loadMenu(locationKey);
    } catch (err) {
      setMessage(err.message || 'Failed to update category visibility');
    }
  };

  const saveCategoryOrder = async () => {
    setSavingOrder(true);
    setMessage('');
    try {
      const order = (menu.categories || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        sort_order: Number(orderDrafts[cat.id] ?? cat.sort_order ?? 9000),
      }));
      await api.setCloverCategoryOrder({ location: locationKey, order });
      setMessage('Category order saved. Public menu will use this order.');
      await loadMenu(locationKey);
    } catch (err) {
      setMessage(err.message || 'Failed to save category order');
    } finally {
      setSavingOrder(false);
    }
  };

  const toggleItemVisibility = async (item) => {
    try {
      const nextHidden = !item.is_locally_hidden;
      await api.setCloverItemVisibility(item.id, {
        location: locationKey,
        is_hidden: nextHidden,
      });
      setMessage(`${item.name} is now ${nextHidden ? 'hidden' : 'visible'} on the public menu.`);
      await loadMenu(locationKey);
    } catch (err) {
      setMessage(err.message || 'Failed to update item visibility');
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (menu.items || []).filter((item) => {
      if (filterCategory && String(item.category_id) !== String(filterCategory)) return false;
      if (!q) return true;
      return `${item.name} ${item.description || ''}`.toLowerCase().includes(q);
    });
  }, [menu.items, search, filterCategory]);

  const canEditCloverFields = currentStatus?.access_level === 'READ_WRITE';

  const saveImageUrl = async (item) => {
    const url = imageDrafts[item.id] ?? item.image_url ?? '';
    try {
      await api.saveCloverItemImage(item.id, { location: locationKey, image_url: url || null });
      setMessage(`Image updated for ${item.name}`);
      await loadMenu(locationKey);
    } catch (err) {
      setMessage(err.message || 'Failed to save image URL');
    }
  };

  const uploadImage = async (item, file) => {
    if (!file) return;
    try {
      await api.uploadCloverItemImage(item.id, file, locationKey);
      setMessage(`Uploaded image for ${item.name}`);
      await loadMenu(locationKey);
    } catch (err) {
      setMessage(err.message || 'Upload failed');
    }
  };

  if (loading) {
    return <div className="space-y-4"><div className="skeleton h-10 w-1/3" /><div className="skeleton h-40 w-full" /><div className="skeleton h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Menu Management</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Clover is the source of truth for names, prices, and categories. Images and website visibility are managed locally and survive sync.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AccessBadge level={currentStatus?.access_level || 'NOT_CONFIGURED'} />
          <button type="button" onClick={handleSync} disabled={syncing} className="btn-gold !text-sm">
            {syncing ? <Loader2 className="mr-2 animate-spin" size={16} /> : <RefreshCw className="mr-2" size={16} />}
            Sync from Clover
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">{message}</div>
      ) : null}

      {locations.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {locations.map((loc) => (
            <button
              key={loc.location_key}
              type="button"
              onClick={() => setLocationKey(loc.location_key)}
              className={`rounded-full border px-4 py-2 text-sm ${locationKey === loc.location_key ? 'border-amber-500 bg-amber-500 text-black' : 'border-neutral-200 dark:border-neutral-700'}`}
            >
              {loc.location_name}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSaveConfig} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Clover API Configuration</h2>
          <button type="button" onClick={handleTest} disabled={testing} className="btn-outline-gold !text-sm !px-4 !py-2">
            {testing ? <Loader2 className="mr-2 animate-spin" size={14} /> : (currentStatus?.has_token ? <Wifi className="mr-2" size={14} /> : <WifiOff className="mr-2" size={14} />)}
            Test Connection
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Location name</label>
            <input className="input-dark" value={config.location_name} onChange={(e) => setConfig({ ...config, location_name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Merchant ID</label>
            <input className="input-dark" value={config.merchant_id} onChange={(e) => setConfig({ ...config, merchant_id: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">API token {currentStatus?.token_masked ? `(saved: ${currentStatus.token_masked})` : ''}</label>
            <input
              className="input-dark"
              type="password"
              autoComplete="new-password"
              placeholder={currentStatus?.has_token ? 'Leave blank to keep existing token' : 'Paste merchant inventory token'}
              value={config.api_token}
              onChange={(e) => setConfig({ ...config, api_token: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Currency</label>
            <select className="select-dark" value={config.currency} onChange={(e) => setConfig({ ...config, currency: e.target.value })}>
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          <span>Last sync: {currentStatus?.last_sync_at || 'Never'}</span>
          <span>Last test: {currentStatus?.last_tested_at || 'Never'}</span>
          {currentStatus?.last_error ? <span className="text-red-500">{currentStatus.last_error}</span> : null}
        </div>
        <button type="submit" disabled={saving} className="btn-gold mt-4 !text-sm">
          {saving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />}
          Save configuration
        </button>
      </form>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Category visibility & order</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Hidden categories stay in admin but are removed from the public menu (including their dishes). Order is stored in MySQL and is not overwritten by Clover sync.
            </p>
          </div>
          <button type="button" onClick={saveCategoryOrder} disabled={savingOrder} className="btn-outline-gold !text-sm !px-4 !py-2">
            {savingOrder ? <Loader2 className="mr-2 animate-spin" size={14} /> : <Save className="mr-2" size={14} />}
            Save order
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500 dark:border-neutral-800">
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Sort order</th>
                <th className="px-3 py-3">Public</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {(menu.categories || []).map((cat) => (
                <tr key={cat.id} className={cat.is_hidden ? 'bg-neutral-50/80 dark:bg-neutral-950/40' : ''}>
                  <td className="px-3 py-3">
                    <p className="font-medium text-neutral-900 dark:text-white">{cat.name}</p>
                    <p className="text-[10px] text-neutral-400">ID: {cat.id}</p>
                    {cat.is_hidden ? (
                      <span className="mt-1 inline-flex rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        Hidden on website
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      className="input-dark !w-24 !text-sm"
                      value={orderDrafts[cat.id] ?? cat.sort_order ?? 9000}
                      onChange={(e) => setOrderDrafts((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {cat.is_hidden ? (
                      <span className="inline-flex items-center gap-1 text-neutral-500"><EyeOff size={14} /> Hidden</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Eye size={14} /> Visible</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => toggleCategoryVisibility(cat)}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium dark:border-neutral-700"
                    >
                      {cat.is_hidden ? 'Show on menu' : 'Hide on menu'}
                    </button>
                  </td>
                </tr>
              ))}
              {(menu.categories || []).length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-neutral-500">No categories yet. Sync from Clover first.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Menu items ({filteredItems.length})
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input className="input-dark !pl-9" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="select-dark" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All categories</option>
              {(menu.categories || []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}{cat.is_hidden ? ' (hidden)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!canEditCloverFields ? (
          <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Clover item fields are read-only with the current credentials. You can still manage images and website visibility.
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500 dark:border-neutral-800">
                <th className="px-3 py-3">Item</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Visibility</th>
                <th className="px-3 py-3">Image</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredItems.map((item) => (
                <tr key={item.id} className={`align-top ${item.is_locally_hidden ? 'bg-neutral-50/80 dark:bg-neutral-950/40' : ''}`}>
                  <td className="px-3 py-4">
                    <p className="font-medium text-neutral-900 dark:text-white">{item.name}</p>
                    <p className="mt-1 max-w-xs text-xs text-neutral-500 line-clamp-2">{item.description || 'No description'}</p>
                    <p className="mt-1 text-[10px] text-neutral-400">ID: {item.id}</p>
                    {item.is_locally_hidden ? (
                      <span className="mt-1 inline-flex rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        Hidden on website
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-4 text-sm text-neutral-600 dark:text-neutral-300">{item.category_name}</td>
                  <td className="px-3 py-4 text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {menu.currency === 'USD' ? 'US$' : 'CA$'}{Number(item.price || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-4">
                    <button
                      type="button"
                      onClick={() => toggleItemVisibility(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs dark:border-neutral-700"
                    >
                      {item.is_locally_hidden ? <><Eye size={12} /> Show</> : <><EyeOff size={12} /> Hide</>}
                    </button>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-neutral-400"><ImageIcon size={16} /></div>
                        )}
                      </div>
                      <div className="min-w-[180px] flex-1 space-y-2">
                        <input
                          className="input-dark !text-xs"
                          placeholder="https://... or leave blank"
                          value={imageDrafts[item.id] ?? item.image_url ?? ''}
                          onChange={(e) => setImageDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => saveImageUrl(item)} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-[11px] dark:border-neutral-700">
                            <Link2 size={12} /> Save URL
                          </button>
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-[11px] dark:border-neutral-700">
                            <Upload size={12} /> Upload
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(item, e.target.files?.[0])} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <button
                      type="button"
                      className="text-xs text-amber-600 hover:underline dark:text-amber-400"
                      onClick={() => setSelectedItem(item)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-neutral-500">No items. Save Clover credentials and sync.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">{selectedItem.name}</h3>
            <p className="mt-2 text-sm text-neutral-500">{selectedItem.description || 'No description from Clover.'}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Price</dt><dd>{selectedItem.price}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Category</dt><dd>{selectedItem.category_name}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Clover ID</dt><dd className="font-mono text-xs">{selectedItem.id}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Website visibility</dt><dd>{selectedItem.is_locally_hidden ? 'Hidden' : 'Visible'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Editable in Clover</dt><dd>{canEditCloverFields ? 'Yes' : 'No (read-only token)'}</dd></div>
            </dl>
            <button type="button" className="btn-outline-gold mt-6 w-full" onClick={() => setSelectedItem(null)}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
