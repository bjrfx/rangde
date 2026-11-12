export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

export function menuItemPath(item, localePrefix = '') {
  const base = `${localePrefix}/menu`.replace(/\/{2,}/g, '/');
  const path = `${base}/${slugify(item.name)}-${item.id}`;
  return path.startsWith('/') ? path : `/${path}`;
}

/** Extract Clover alphanumeric (or legacy numeric) id from `/menu/{slug}-{id}`. */
export function menuItemIdFromParam(param) {
  const value = String(param || '').trim();
  if (!value) return '';
  const match = value.match(/-([A-Za-z0-9]+)$/);
  if (match) return match[1];
  if (/^[A-Za-z0-9]+$/.test(value)) return value;
  return value;
}
