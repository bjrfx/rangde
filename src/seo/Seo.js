import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { absoluteUrl, buildRestaurantJsonLd, buildWebSiteJsonLd, pages, siteSeo } from './seoConfig';

export default function Seo({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex = false,
  jsonLd,
  breadcrumbs,
  hreflang = [],
  faqs,
}) {
  const location = useLocation();
  const resolvedPath = path || location.pathname || '/';
  const pageTitle = title || siteSeo.defaultTitle;
  const pageDescription = description || siteSeo.defaultDescription;
  const canonical = absoluteUrl(resolvedPath);
  const ogImage = absoluteUrl(image || siteSeo.ogImage);
  const robots = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';

  const graph = [];
  if (jsonLd) {
    if (Array.isArray(jsonLd)) graph.push(...jsonLd);
    else graph.push(jsonLd);
  } else if (resolvedPath === '/' || resolvedPath === '') {
    graph.push(buildWebSiteJsonLd());
    graph.push(...buildRestaurantJsonLd());
  }

  if (breadcrumbs?.length) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: absoluteUrl(crumb.path),
      })),
    });
  }

  if (faqs?.length) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      })),
    });
  }

  return (
    <Helmet prioritizeSeoTags>
      <html lang={siteSeo.htmlLang || 'en'} />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteSeo.siteName} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={siteSeo.ogLocale} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={ogImage} />

      {hreflang.map((item) => (
        <link key={`${item.hreflang}-${item.href}`} rel="alternate" hrefLang={item.hreflang} href={item.href} />
      ))}

      {graph.map((node, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(node)}
        </script>
      ))}
    </Helmet>
  );
}

export function pageSeo(key, overrides = {}) {
  const page = pages[key] || {};
  return {
    title: overrides.title || page.title,
    description: overrides.description || page.description,
    path: overrides.path || page.path,
  };
}
