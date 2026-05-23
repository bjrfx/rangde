import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, Search, Trash2, Download, Eye, Loader2, Check, AlertTriangle, ChevronLeft, ChevronRight, FileText, X, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../api';

export default function HiringBannerManagement({ token }) {
  // Banner settings state
  const [bannerSettings, setBannerSettings] = useState(null);
  const [bannerText, setBannerText] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [toggleLoading, setToggleLoading] = useState(false);

  // Applications state
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [appsLoading, setAppsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewApp, setViewApp] = useState(null);

  useEffect(() => {
    loadSettings();
    loadApplications(1, '');
  }, []);

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const data = await api.getAdminHiringBanner();
      setBannerSettings(data);
      setBannerText(data?.banner_text || '');
      setCtaText(data?.cta_text || 'Apply Now');
    } catch (err) {
      console.error(err);
      setSettingsError('Failed to load banner settings.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadApplications = useCallback(async (page = 1, search = '') => {
    setAppsLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const data = await api.getHiringApplications(params);
      setApplications(data.applications || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setAppsLoading(false);
    }
  }, []);

  const handleToggleBanner = async () => {
    if (!bannerSettings) return;
    setToggleLoading(true);
    setSettingsError('');
    try {
      const data = await api.updateHiringBanner({
        is_enabled: bannerSettings.is_enabled ? 0 : 1,
        banner_text: bannerSettings.banner_text,
        cta_text: bannerSettings.cta_text,
      });
      setBannerSettings(data);
      setBannerText(data.banner_text);
      setCtaText(data.cta_text);
    } catch (err) {
      setSettingsError('Failed to toggle banner.');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!bannerText.trim()) {
      setSettingsError('Banner text is required.');
      return;
    }
    setSaving(true);
    setSettingsError('');
    setSettingsSaved(false);
    try {
      const data = await api.updateHiringBanner({
        is_enabled: bannerSettings?.is_enabled ?? 1,
        banner_text: bannerText.trim(),
        cta_text: ctaText.trim() || 'Apply Now',
      });
      setBannerSettings(data);
      setBannerText(data.banner_text);
      setCtaText(data.cta_text);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      setSettingsError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadApplications(1, searchTerm);
  };

  const handlePageChange = (newPage) => {
    loadApplications(newPage, searchTerm);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteHiringApplication(deleteId);
      setDeleteId(null);
      loadApplications(pagination.page, searchTerm);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadResume = async (appId, filename) => {
    try {
      const response = await api.downloadResume(appId);
      if (!response.ok) {
        const errData = await response.json();
        alert(errData.error || 'Failed to download resume');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'resume';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Failed to download resume');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (_) {
      return dateStr;
    }
  };

  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-4 w-48 rounded" />
        <div className="skeleton h-40 w-full rounded-xl" />
        <div className="skeleton h-60 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
          <Megaphone size={24} className="text-amber-500" />
          Hiring Banner Management
        </h1>
        <p className="text-neutral-500 text-sm mt-1">Manage the hiring banner and view job applications</p>
      </div>

      {settingsError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <span className="text-red-500 dark:text-red-400 text-sm">{settingsError}</span>
        </div>
      )}

      {settingsSaved && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
          <Check size={18} className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <span className="text-green-500 dark:text-green-400 text-sm">Banner settings saved successfully!</span>
        </div>
      )}

      {/* ====== Banner Settings Card ====== */}
      <div className={`bg-white dark:bg-neutral-900 border rounded-xl shadow-sm dark:shadow-none ${
        bannerSettings?.is_enabled
          ? 'border-amber-500/30 ring-1 ring-amber-500/10'
          : 'border-neutral-200 dark:border-neutral-800'
      }`}>
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                bannerSettings?.is_enabled ? 'bg-amber-500/10' : 'bg-neutral-200 dark:bg-neutral-800'
              }`}>
                <Megaphone size={20} className={bannerSettings?.is_enabled ? 'text-amber-500 dark:text-amber-400' : 'text-neutral-400'} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Banner Settings</h2>
                <p className="text-neutral-500 text-xs mt-0.5">Toggle visibility and edit banner content</p>
              </div>
            </div>
            {/* Toggle Switch */}
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold ${
                bannerSettings?.is_enabled
                  ? 'text-green-500 dark:text-green-400'
                  : 'text-neutral-400'
              }`}>
                {bannerSettings?.is_enabled ? 'LIVE' : 'OFF'}
              </span>
              <button
                onClick={handleToggleBanner}
                disabled={toggleLoading}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                  bannerSettings?.is_enabled
                    ? 'bg-green-500'
                    : 'bg-neutral-300 dark:bg-neutral-600'
                } ${toggleLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={bannerSettings?.is_enabled ? 'Click to disable banner' : 'Click to enable banner'}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    bannerSettings?.is_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
                {toggleLoading && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={14} className="text-white animate-spin" />
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Banner Text
            </label>
            <input
              type="text"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              className="input-dark"
              placeholder="JOIN OUR TEAM: NOW HIRING ✨"
              maxLength={255}
            />
            <p className="text-neutral-400 text-xs mt-1">{bannerText.length}/255 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              CTA Button Text
            </label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              className="input-dark"
              placeholder="Apply Now"
              maxLength={100}
            />
          </div>

          {/* Live Preview */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Live Preview
            </label>
            <div className="relative overflow-hidden rounded-lg" style={{
              background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
              border: '1px solid rgba(201, 168, 76, 0.3)',
            }}>
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-white/90 text-sm font-medium truncate">
                    {bannerText || 'Banner text...'}
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, #d4b85c, #c9a84c)',
                      color: '#1a1a1a',
                    }}>
                    {ctaText || 'Apply Now'} →
                  </span>
                </div>
                <span className="text-white/40 ml-2 flex-shrink-0">✕</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={settingsSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black text-sm font-semibold rounded-lg transition-all duration-300 hover:from-amber-500 hover:to-amber-400 hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-50"
            >
              {settingsSaving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* ====== Applications Section ====== */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm dark:shadow-none">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-blue-500 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Applications
                  {pagination.total > 0 && (
                    <span className="ml-2 text-xs font-normal text-neutral-400">({pagination.total} total)</span>
                  )}
                </h2>
                <p className="text-neutral-500 text-xs mt-0.5">Review and manage job applications</p>
              </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 text-neutral-900 dark:text-white placeholder-neutral-400 w-48 sm:w-64"
                  placeholder="Search name, email, phone..."
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {/* Applications Table */}
        <div className="overflow-x-auto">
          {appsLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={40} className="text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                {searchTerm ? 'No applications match your search.' : 'No applications received yet.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-6 py-3">ID</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-6 py-3">Full Name</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-6 py-3 hidden sm:table-cell">Phone</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-6 py-3 hidden md:table-cell">Email</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-6 py-3 hidden lg:table-cell">Resume</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-6 py-3 hidden lg:table-cell">Submitted</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400">#{app.id}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">{app.full_name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300 hidden sm:table-cell">{app.phone_number}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300 hidden md:table-cell">{app.email}</td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {app.resume_file ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                          <FileText size={12} /> Uploaded
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500 dark:text-neutral-400 hidden lg:table-cell whitespace-nowrap">{formatDate(app.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* View */}
                        <button
                          onClick={() => setViewApp(app)}
                          className="p-2 text-neutral-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-500/10"
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                        {/* Download Resume */}
                        {app.resume_file && (
                          <button
                            onClick={() => handleDownloadResume(app.id, app.resume_file)}
                            className="p-2 text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors rounded-lg hover:bg-amber-500/10"
                            title="Download resume"
                          >
                            <Download size={16} />
                          </button>
                        )}
                        {/* Delete */}
                        <button
                          onClick={() => setDeleteId(app.id)}
                          className="p-2 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                          title="Delete application"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} applications)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====== View Application Modal ====== */}
      {viewApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewApp(null)}>
          <div
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Application Details</h3>
              <button onClick={() => setViewApp(null)} className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Full Name</label>
                <p className="text-neutral-900 dark:text-white text-sm mt-0.5">{viewApp.full_name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Phone Number</label>
                <p className="text-neutral-900 dark:text-white text-sm mt-0.5">{viewApp.phone_number}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Email</label>
                <p className="text-neutral-900 dark:text-white text-sm mt-0.5">{viewApp.email}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Resume</label>
                {viewApp.resume_file ? (
                  <button
                    onClick={() => handleDownloadResume(viewApp.id, viewApp.resume_file)}
                    className="mt-1 inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors"
                  >
                    <Download size={14} />
                    {viewApp.resume_file}
                  </button>
                ) : (
                  <p className="text-neutral-400 text-sm mt-0.5">No resume uploaded</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Submitted</label>
                <p className="text-neutral-900 dark:text-white text-sm mt-0.5">{formatDate(viewApp.created_at)}</p>
              </div>
            </div>
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
              <button
                onClick={() => setViewApp(null)}
                className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Delete Confirmation Modal ====== */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteId(null)}>
          <div
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Delete Application</h3>
              <p className="text-neutral-500 text-sm">Are you sure you want to delete this application? This action cannot be undone.</p>
            </div>
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
