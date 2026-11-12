import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, FileText, Loader2, RefreshCw, Search } from 'lucide-react';
import { siteSeo } from '../../seo/seoConfig';

/**
 * SEO Monitoring — live on-site crawlability checks + Search Console / Bing setup guide.
 * Does NOT invent GSC metrics. External Search Console / Bing APIs require OAuth setup.
 */
export default function SeoMonitoring() {
  const siteUrl = (siteSeo.siteUrl || '').replace(/\/$/, '');
  const [checks, setChecks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const runChecks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [robotsRes, sitemapRes, llmsRes, llmsFullRes] = await Promise.all([
        fetch('/robots.txt', { cache: 'no-store' }),
        fetch('/sitemap.xml', { cache: 'no-store' }),
        fetch('/llms.txt', { cache: 'no-store' }),
        fetch('/llms-full.txt', { cache: 'no-store' }),
      ]);

      const robotsText = robotsRes.ok ? await robotsRes.text() : '';
      const sitemapText = sitemapRes.ok ? await sitemapRes.text() : '';
      const llmsText = llmsRes.ok ? await llmsRes.text() : '';
      const llmsFullText = llmsFullRes.ok ? await llmsFullRes.text() : '';

      const locMatches = sitemapText.match(/<loc>/g) || [];
      const hasLlmsInSitemap = /llms(-full)?\.txt/i.test(sitemapText);
      const hasAdminInSitemap = /\/admin/i.test(sitemapText);
      const hasOaiSearchBot = /OAI-SearchBot/i.test(robotsText);
      const hasApiDisallow = /Disallow:\s*\/api/i.test(robotsText);
      const hasSitemapLine = /Sitemap:\s*https?:\/\//i.test(robotsText);

      setChecks({
        robotsOk: robotsRes.ok,
        sitemapOk: sitemapRes.ok,
        llmsOk: llmsRes.ok,
        llmsFullOk: llmsFullRes.ok,
        sitemapUrlCount: locMatches.length,
        hasLlmsInSitemap,
        hasAdminInSitemap,
        hasOaiSearchBot,
        hasApiDisallow,
        hasSitemapLine,
        robotsPreview: robotsText.slice(0, 1200),
        llmsPreview: llmsText.slice(0, 400),
        checkedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message || 'Failed to run crawlability checks');
      setChecks(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const Status = ({ ok, label, detail }) => (
    <div className={`rounded-xl border p-4 ${ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <div className="flex items-start gap-3">
        {ok ? <CheckCircle2 className="text-emerald-500 shrink-0" size={18} /> : <AlertCircle className="text-amber-500 shrink-0" size={18} />}
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{label}</p>
          {detail ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{detail}</p> : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-neutral-900 dark:text-white">SEO Monitoring</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
            On-site crawlability for {siteUrl || 'this website'}. Google Search Console and Bing Webmaster
            metrics appear here only after API credentials are connected — this page never invents clicks,
            impressions, or rankings.
          </p>
        </div>
        <button
          type="button"
          onClick={runChecks}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Re-check
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Live on-site checks</h2>
        {loading && !checks ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 size={16} className="animate-spin" /> Checking…</div>
        ) : checks ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Status ok={checks.robotsOk} label="robots.txt reachable" detail={checks.hasOaiSearchBot && checks.hasApiDisallow ? 'Includes OAI-SearchBot + /api disallow' : 'Review crawler rules'} />
            <Status ok={checks.sitemapOk && !checks.hasLlmsInSitemap && !checks.hasAdminInSitemap} label="sitemap.xml" detail={`${checks.sitemapUrlCount} <loc> URLs · llms/admin excluded: ${!checks.hasLlmsInSitemap && !checks.hasAdminInSitemap ? 'yes' : 'needs review'}`} />
            <Status ok={checks.llmsOk} label="llms.txt reachable" detail="AI-readable summary (not a sitemap entry)" />
            <Status ok={checks.llmsFullOk} label="llms-full.txt reachable" detail="Extended AI-readable summary" />
          </div>
        ) : null}
        {checks?.checkedAt ? (
          <p className="text-xs text-neutral-400">Last check: {new Date(checks.checkedAt).toLocaleString()}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
          <Search size={18} /> Search Console &amp; Bing (not connected)
        </h2>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Indexed pages, queries, CTR, and average position require Google Search Console and/or Bing Webmaster Tools.
          Do not submit sitemaps from this panel until property ownership is verified.
        </p>
        <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
          <li>1. Verify property ownership for <code className="text-amber-600 dark:text-amber-400">{siteUrl}</code> in Google Search Console (DNS or HTML tag).</li>
          <li>2. Submit sitemap: <code className="text-amber-600 dark:text-amber-400">{siteUrl}/sitemap.xml</code></li>
          <li>3. Add the same site in Bing Webmaster Tools (or import from GSC).</li>
          <li>4. To show live metrics here later: enable Search Console API + OAuth client, store refresh token in server env (never in the browser), then add a read-only admin API route.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:underline dark:text-amber-400">
            Google Search Console <ExternalLink size={12} />
          </a>
          <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:underline dark:text-amber-400">
            Bing Webmaster Tools <ExternalLink size={12} />
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-neutral-300 p-6 dark:border-neutral-700">
        <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">Planned metrics (API required)</h2>
        <p className="mb-3 text-sm text-neutral-500">These cards stay empty until credentials exist — no placeholder numbers.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['Clicks', 'Impressions', 'Average CTR', 'Average position'].map((label) => (
            <div key={label} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
              <p className="text-xs uppercase tracking-wide text-neutral-400">{label}</p>
              <p className="mt-2 text-sm text-neutral-500">Awaiting Search Console API</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
          <p><strong>Google:</strong> Search Console API — OAuth 2.0, scopes <code>webmasters.readonly</code>; env e.g. <code>GSC_CLIENT_ID</code>, <code>GSC_CLIENT_SECRET</code>, <code>GSC_REFRESH_TOKEN</code>, <code>GSC_SITE_URL</code>.</p>
          <p><strong>Bing:</strong> Webmaster API — API key + site URL; env e.g. <code>BING_WEBMASTER_API_KEY</code>.</p>
        </div>
      </section>

      {checks?.robotsPreview ? (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
            <FileText size={18} /> robots.txt preview
          </h2>
          <pre className="max-h-64 overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 whitespace-pre-wrap">{checks.robotsPreview}</pre>
        </section>
      ) : null}
    </div>
  );
}
