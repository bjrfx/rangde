import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Mail, MapPin, RefreshCw, Save, Send, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../api';
import EmailTemplateEditor from '../../components/admin/EmailTemplateEditor';

function flattenVariables(variables) {
  const groups = variables || {};
  return Array.from(new Set(Object.values(groups).flat())).sort();
}

export default function EmailTemplatesManagement() {
  const [templates, setTemplates] = useState([]);
  const [variables, setVariables] = useState({});
  const [locations, setLocations] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [previewOpen, setPreviewOpen] = useState(true);

  const placeholders = useMemo(() => flattenVariables(variables), [variables]);
  const selectedTemplate = templates.find((item) => item.template_key === selectedKey);

  const loadData = async () => {
    const [templateResult, locationResult] = await Promise.all([
      api.getEmailTemplates(),
      api.getEmailLocationSettings(),
    ]);
    const loadedTemplates = templateResult.templates || [];
    setTemplates(loadedTemplates);
    setVariables(templateResult.variables || {});
    setLocations(locationResult.locations || []);
    const nextKey = selectedKey || loadedTemplates[0]?.template_key || '';
    setSelectedKey(nextKey);
    const selected = loadedTemplates.find((item) => item.template_key === nextKey) || loadedTemplates[0];
    if (selected) setForm({ ...selected });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadData();
      } catch (err) {
        console.error(err);
        window.alert(err.message || 'Unable to load email templates');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const selectTemplate = async (templateKey) => {
    setSelectedKey(templateKey);
    setMessage('');
    try {
      const response = await api.getEmailTemplate(templateKey);
      setForm({ ...response.template });
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Unable to load template');
    }
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage('');
  };

  const saveTemplate = async () => {
    if (!form) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await api.updateEmailTemplate(form.template_key, form);
      setForm({ ...response.template });
      setTemplates((prev) => prev.map((item) => item.template_key === form.template_key ? response.template : item));
      setMessage('Template saved.');
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Unable to save template');
    } finally {
      setSaving(false);
    }
  };

  const resetTemplate = async () => {
    if (!form || !window.confirm('Reset this template to the default content?')) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await api.resetEmailTemplate(form.template_key);
      setForm({ ...response.template });
      setTemplates((prev) => prev.map((item) => item.template_key === form.template_key ? response.template : item));
      setMessage('Template reset to default.');
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Unable to reset template');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!form) return;
    if (!testEmail.trim()) {
      window.alert('Enter a test recipient email.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await api.sendTestEmail(form.template_key, {
        to: testEmail.trim(),
        restaurant_id: locations[0]?.restaurant_id || null,
        sample_type: form.template_key.includes('reservation') ? 'reservation' : 'default',
      });
      setMessage('Test email sent.');
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Unable to send test email');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Email Templates</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage transactional email content, placeholders, locations, and test sends.</p>
        </div>
        <button type="button" onClick={() => setPreviewOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-amber-500 dark:border-neutral-700 dark:text-neutral-200">
          <Eye size={16} /> Preview
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          {templates.map((template) => (
            <button
              key={template.template_key}
              type="button"
              onClick={() => selectTemplate(template.template_key)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${template.template_key === selectedKey ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-neutral-200 hover:border-amber-300 dark:border-neutral-800'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">{template.display_name}</span>
                {template.is_enabled ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-neutral-400" />}
              </div>
              <p className="mt-1 truncate text-xs text-neutral-500">{template.template_key}</p>
            </button>
          ))}
        </aside>

        {form && (
          <section className="space-y-5">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{selectedTemplate?.display_name || form.display_name}</h2>
                  <p className="text-xs text-neutral-500">{form.template_key}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  <input type="checkbox" checked={Boolean(form.is_enabled)} onChange={(event) => updateForm('is_enabled', event.target.checked ? 1 : 0)} className="h-5 w-5 rounded border-neutral-300 text-amber-500 focus:ring-amber-500" />
                  Enabled
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Subject</span>
                <input value={form.subject_template || ''} onChange={(event) => updateForm('subject_template', event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white" />
              </label>
            </div>

            <EmailTemplateEditor value={form.html_template || ''} onChange={(value) => updateForm('html_template', value)} placeholders={form.available_variables_json || placeholders} />

            <label className="block rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Plain Text Fallback</span>
              <textarea value={form.text_template || ''} rows={7} onChange={(event) => updateForm('text_template', event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 font-mono text-sm text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white" />
            </label>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white"><Mail size={16} /> Send Test Email</h3>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="test@example.com" className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white" />
                  <button type="button" onClick={sendTest} disabled={saving} className="btn-gold justify-center disabled:opacity-60"><Send size={16} className="mr-2" />Send</button>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white"><MapPin size={16} /> Email Locations</h3>
                <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
                  {locations.map((location) => (
                    <div key={location.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                      <p className="font-semibold text-neutral-900 dark:text-white">{location.restaurant_name}</p>
                      <p>{location.address}</p>
                      <p>{location.business_hours}</p>
                      <p className="truncate text-amber-600 dark:text-amber-400">{location.online_order_url}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {previewOpen && (
              <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">Preview</h3>
                <div className="max-h-[560px] overflow-auto rounded-lg border border-neutral-200 bg-neutral-100 p-3 dark:border-neutral-800 dark:bg-neutral-950">
                  <div dangerouslySetInnerHTML={{ __html: form.html_template || '' }} />
                </div>
              </div>
            )}

            <div className="sticky bottom-0 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white/95 p-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-neutral-500">{message}</div>
              <div className="flex gap-3">
                <button type="button" onClick={resetTemplate} disabled={saving} className="inline-flex items-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-amber-500 dark:border-neutral-700 dark:text-neutral-200"><RefreshCw size={16} className="mr-2" />Reset</button>
                <button type="button" onClick={saveTemplate} disabled={saving} className="btn-gold justify-center disabled:opacity-60">{saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}Save Template</button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
