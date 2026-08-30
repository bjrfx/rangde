export const SITE_KEY = 'rangde';

export const SITE_LOCATION_SLUGS = {
  california: ['california'],
  montreal: ['montreal'],
  rangde: ['rangde'],
  restobar: ['restobar'],
  ottawa: ['stittsville', 'wellington'],
};

export function isCurrentSiteLocation(location) {
  const allowedSlugs = SITE_LOCATION_SLUGS[SITE_KEY] || [];
  const slug = String(location?.location_slug || location?.slug || '').toLowerCase();
  return allowedSlugs.includes(slug);
}
