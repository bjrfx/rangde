/**
 * Clover inventory integration: credentials, sync cache, local images,
 * website-only visibility/order settings, admin + public APIs.
 * Mount with: require('./cloverMenu').registerCloverMenu(app, { getDb, authMiddleware, locations, siteKey });
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const CLOVER_API_BASE = 'https://api.clover.com';
const USER_AGENT = 'Masakali-Menu-Sync/1.0';

/** Preferred public category order (matched by name; Clover names are never renamed). */
const DEFAULT_CATEGORY_ORDER = [
  'Appetizers',
  'Chit And Chaat',
  'Tandoori',
  'Chicken Curries',
  'Lamb Curries',
  'Seafood Curries',
  'Vegetarian Curries',
  'Rice & Biryani',
  'Breads',
  'Desserts',
  'Extras',
  'Add Ons',
  'Kids Menu',
  'Indian Drinks',
  'Soft Drinks',
  'Cocktails',
  'Beer',
  'Wine',
  'Alcohol',
  'Miscellaneous',
];

const CATEGORY_ORDER_ALIASES = [
  { rank: 1, names: ['appetizers', 'appetizer', 'starters', 'starter', 'soups', 'soup'] },
  { rank: 2, names: ['chit and chaat', 'chit & chaat', 'chaat', 'chats'] },
  { rank: 3, names: ['tandoori', 'tandoor', 'grill', 'kebabs', 'kebab'] },
  { rank: 4, names: ['chicken curries', 'chicken curry', 'chicken', 'poultry'] },
  { rank: 5, names: ['lamb curries', 'lamb curry', 'lamb', 'goat', 'mutton'] },
  { rank: 6, names: ['seafood curries', 'seafood curry', 'seafood', 'fish', 'shrimp', 'prawn'] },
  { rank: 7, names: ['vegetarian curries', 'veg curries', 'vegetarian', 'veggie', 'paneer', 'vegetable curries'] },
  { rank: 8, names: ['rice & biryani', 'rice and biryani', 'biryani', 'rice', 'pulao'] },
  { rank: 9, names: ['breads', 'bread', 'naan', 'roti'] },
  { rank: 10, names: ['desserts', 'dessert', 'sweets', 'sweet'] },
  { rank: 11, names: ['extras', 'extra', 'sides', 'side orders', 'side'] },
  { rank: 12, names: ['add ons', 'add-ons', 'addons', 'add on'] },
  { rank: 13, names: ['kids menu', 'kids', 'children', 'kid'] },
  { rank: 14, names: ['indian drinks', 'indian drink', 'lassi', 'chai', 'masala soda'] },
  { rank: 15, names: ['soft drinks', 'soft drink', 'beverages', 'beverage', 'soda', 'juice'] },
  { rank: 16, names: ['cocktails', 'cocktail', 'mocktails', 'mocktail'] },
  { rank: 17, names: ['beer', 'beers'] },
  { rank: 18, names: ['wine', 'wines'] },
  { rank: 19, names: ['alcohol', 'spirits', 'liquor', 'bar'] },
  { rank: 20, names: ['miscellaneous', 'misc', 'other', 'others'] },
];

function getEncryptionKey(secret) {
  return crypto.createHash('sha256').update(String(secret || 'masakali_clover_fallback')).digest();
}

function encryptSecret(plainText, secret) {
  if (!plainText) return null;
  const key = getEncryptionKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(payload, secret) {
  if (!payload) return null;
  if (!String(payload).startsWith('v1:')) return String(payload);
  const [, ivHex, tagHex, dataHex] = String(payload).split(':');
  const key = getEncryptionKey(secret);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

function maskToken(token) {
  const value = String(token || '');
  if (value.length < 8) return value ? '••••••••' : '';
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

/** Extract Clover (or legacy numeric) item id from `/menu/{slug}-{id}` style params. */
function resolveCloverItemId(param) {
  const value = String(param || '').trim();
  if (!value) return '';
  const trailing = value.match(/-([A-Za-z0-9]+)$/);
  if (trailing) return trailing[1];
  if (/^[A-Za-z0-9]+$/.test(value)) return value;
  return value;
}

function normalizeCategoryName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function defaultSortOrderForCategoryName(name) {
  const normalized = normalizeCategoryName(name);
  if (!normalized) return 9000;

  for (let i = 0; i < DEFAULT_CATEGORY_ORDER.length; i += 1) {
    if (normalizeCategoryName(DEFAULT_CATEGORY_ORDER[i]) === normalized) {
      return i + 1;
    }
  }

  for (const entry of CATEGORY_ORDER_ALIASES) {
    for (const alias of entry.names) {
      const aliasNorm = normalizeCategoryName(alias);
      if (normalized === aliasNorm || normalized.includes(aliasNorm) || aliasNorm.includes(normalized)) {
        return entry.rank;
      }
    }
  }

  return 9000;
}

async function cloverFetch(merchantId, token, endpoint, options = {}) {
  const url = `${CLOVER_API_BASE}/v3/merchants/${merchantId}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
  return { ok: response.ok, status: response.status, data };
}

function isPublicItem(item) {
  if (!item || item.deleted) return false;
  if (item.hidden) return false;
  if (item.available === false) return false;
  if (String(item.priceType || '').toUpperCase() === 'VARIABLE') return false;
  return true;
}

function normalizeCloverItem(item, currency) {
  const categories = Array.isArray(item.categories?.elements)
    ? item.categories.elements
    : (Array.isArray(item.categories) ? item.categories : []);
  const primaryCategory = categories[0] || null;
  const priceCents = Number(item.price || 0);
  return {
    id: String(item.id),
    clover_item_id: String(item.id),
    name: item.name || 'Menu Item',
    description: item.description || '',
    price: Number.isFinite(priceCents) ? Number((priceCents / 100).toFixed(2)) : 0,
    price_cents: priceCents,
    priceType: item.priceType || 'FIXED',
    currency,
    sku: item.sku || item.code || null,
    category_id: primaryCategory ? String(primaryCategory.id) : 'uncategorized',
    category_name: primaryCategory ? (primaryCategory.name || 'Menu') : 'Menu',
    categories: categories.map((cat) => ({ id: String(cat.id), name: cat.name || 'Menu' })),
    is_vegetarian: false,
    spice_level: null,
    hidden: Boolean(item.hidden),
    available: item.available !== false,
    deleted: Boolean(item.deleted),
    modifierGroups: item.modifierGroups || null,
    tags: item.tags || null,
  };
}

function buildCategoriesFromItems(items) {
  const map = new Map();
  items.forEach((item) => {
    (item.categories || [{ id: item.category_id, name: item.category_name }]).forEach((cat) => {
      const id = String(cat.id || item.category_id || 'uncategorized');
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: cat.name || item.category_name || 'Menu',
          slug: slugify(cat.name || item.category_name || `category-${map.size + 1}`),
          sort_order: map.size + 1,
          item_ids: [],
        });
      }
      const entry = map.get(id);
      if (!entry.item_ids.includes(item.id)) entry.item_ids.push(item.id);
    });
  });
  return Array.from(map.values());
}

function registerCloverMenu(app, options = {}) {
  const {
    getDb,
    authMiddleware,
    locations = [],
    siteKey = 'site',
    jwtSecret = process.env.JWT_SECRET || 'masakali_secret_2024',
  } = options;

  const MENU_UPLOAD_DIR = path.join(__dirname, 'uploads', 'menu-items');
  if (!fs.existsSync(MENU_UPLOAD_DIR)) fs.mkdirSync(MENU_UPLOAD_DIR, { recursive: true });

  const menuImageUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, MENU_UPLOAD_DIR),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
      },
    }),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype || !file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image uploads are allowed'));
      }
      return cb(null, true);
    },
  });

  async function ensureTables() {
    const db = typeof getDb === 'function' ? getDb() : null;
    if (!db) return false;
    await db.query(`
      CREATE TABLE IF NOT EXISTS clover_credentials (
        location_key VARCHAR(64) PRIMARY KEY,
        location_name VARCHAR(255) NOT NULL,
        merchant_id VARCHAR(64) NOT NULL,
        api_token_encrypted TEXT NULL,
        environment VARCHAR(32) NOT NULL DEFAULT 'production',
        access_level VARCHAR(32) NOT NULL DEFAULT 'NOT_CONFIGURED',
        currency VARCHAR(8) NOT NULL DEFAULT 'CAD',
        last_sync_at DATETIME NULL,
        last_tested_at DATETIME NULL,
        last_error TEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS clover_menu_cache (
        location_key VARCHAR(64) PRIMARY KEY,
        payload LONGTEXT NOT NULL,
        item_count INT NOT NULL DEFAULT 0,
        category_count INT NOT NULL DEFAULT 0,
        synced_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS clover_item_images (
        location_key VARCHAR(64) NOT NULL,
        clover_item_id VARCHAR(64) NOT NULL,
        image_url TEXT NULL,
        uploaded_path VARCHAR(512) NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (location_key, clover_item_id)
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS clover_category_settings (
        location_key VARCHAR(64) NOT NULL,
        clover_category_id VARCHAR(64) NOT NULL,
        category_name VARCHAR(255) NOT NULL DEFAULT '',
        sort_order INT NOT NULL DEFAULT 9000,
        is_hidden TINYINT(1) NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (location_key, clover_category_id)
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS clover_item_visibility (
        location_key VARCHAR(64) NOT NULL,
        clover_item_id VARCHAR(64) NOT NULL,
        is_hidden TINYINT(1) NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (location_key, clover_item_id)
      )
    `);

    for (const loc of locations) {
      await db.query(
        `INSERT INTO clover_credentials (location_key, location_name, merchant_id, currency, access_level)
         VALUES (?, ?, ?, ?, 'NOT_CONFIGURED')
         ON DUPLICATE KEY UPDATE
           location_name = VALUES(location_name),
           merchant_id = IF(merchant_id IS NULL OR merchant_id = '', VALUES(merchant_id), merchant_id),
           currency = VALUES(currency)`,
        [loc.key, loc.label, loc.merchantId, loc.currency || 'CAD']
      );
    }
    return true;
  }

  const ensureInterval = setInterval(async () => {
    try {
      if (await ensureTables()) clearInterval(ensureInterval);
    } catch (_) { /* wait for DB */ }
  }, 2000);
  setTimeout(() => clearInterval(ensureInterval), 120000);

  async function getCredentialRow(locationKey) {
    const db = getDb();
    if (!db) return null;
    await ensureTables();
    const [rows] = await db.query('SELECT * FROM clover_credentials WHERE location_key = ? LIMIT 1', [locationKey]);
    return rows[0] || null;
  }

  async function detectAccessLevel(merchantId, token) {
    const read = await cloverFetch(merchantId, token, '/items?limit=1');
    if (!read.ok) {
      return { access_level: 'CONNECTION_ERROR', error: read.data?.message || `HTTP ${read.status}` };
    }
    const writeProbe = await cloverFetch(merchantId, token, '/items', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (writeProbe.status === 401 || writeProbe.status === 403) {
      return { access_level: 'READ_ONLY', error: null };
    }
    if (writeProbe.status === 400 || writeProbe.status === 422 || writeProbe.status === 405) {
      return { access_level: 'READ_WRITE', error: null };
    }
    return { access_level: 'ACCESS_UNVERIFIED', error: `Write probe HTTP ${writeProbe.status}` };
  }

  async function fetchAllCloverItems(merchantId, token) {
    const items = [];
    let offset = 0;
    const limit = 1000;
    for (let page = 0; page < 20; page += 1) {
      const result = await cloverFetch(
        merchantId,
        token,
        `/items?limit=${limit}&offset=${offset}&expand=categories,tags,modifierGroups,options`
      );
      if (!result.ok) {
        throw new Error(result.data?.message || `Clover items request failed (${result.status})`);
      }
      const batch = Array.isArray(result.data?.elements) ? result.data.elements : [];
      items.push(...batch);
      if (batch.length < limit) break;
      offset += limit;
    }
    return items;
  }

  async function getImageMap(locationKey) {
    const db = getDb();
    if (!db) return new Map();
    const [rows] = await db.query(
      'SELECT clover_item_id, image_url, uploaded_path FROM clover_item_images WHERE location_key = ?',
      [locationKey]
    );
    const map = new Map();
    rows.forEach((row) => {
      const url = row.uploaded_path
        ? `/uploads/menu-items/${path.basename(row.uploaded_path)}`
        : row.image_url;
      if (url) map.set(String(row.clover_item_id), url);
    });
    return map;
  }

  function mergeImages(items, imageMap) {
    return items.map((item) => {
      const imageUrl = imageMap.get(String(item.id)) || null;
      return {
        ...item,
        image_url: imageUrl,
        images: imageUrl ? [{ name: 'primary', source: imageUrl }] : [],
        has_local_image: Boolean(imageUrl),
      };
    });
  }

  async function getLocalSettings(locationKey) {
    const db = getDb();
    const categorySettings = new Map();
    const hiddenItems = new Set();
    if (!db) return { categorySettings, hiddenItems };

    const [catRows] = await db.query(
      'SELECT clover_category_id, category_name, sort_order, is_hidden FROM clover_category_settings WHERE location_key = ?',
      [locationKey]
    );
    catRows.forEach((row) => {
      categorySettings.set(String(row.clover_category_id), {
        category_name: row.category_name,
        sort_order: Number(row.sort_order) || 9000,
        is_hidden: Boolean(row.is_hidden),
      });
    });

    const [itemRows] = await db.query(
      'SELECT clover_item_id FROM clover_item_visibility WHERE location_key = ? AND is_hidden = 1',
      [locationKey]
    );
    itemRows.forEach((row) => hiddenItems.add(String(row.clover_item_id)));

    return { categorySettings, hiddenItems };
  }

  async function syncCategorySettings(locationKey, categories) {
    const db = getDb();
    if (!db || !Array.isArray(categories)) return;
    for (const cat of categories) {
      const sortOrder = defaultSortOrderForCategoryName(cat.name);
      await db.query(
        `INSERT INTO clover_category_settings
          (location_key, clover_category_id, category_name, sort_order, is_hidden)
         VALUES (?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)`,
        [locationKey, String(cat.id), cat.name || 'Menu', sortOrder]
      );
    }
  }

  function applyCategorySettings(categories, categorySettings) {
    return (categories || [])
      .map((cat) => {
        const settings = categorySettings.get(String(cat.id));
        const sortOrder = settings
          ? Number(settings.sort_order) || 9000
          : defaultSortOrderForCategoryName(cat.name);
        return {
          ...cat,
          sort_order: sortOrder,
          is_hidden: Boolean(settings?.is_hidden),
        };
      })
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }

  function applyItemVisibility(items, hiddenItems) {
    return (items || []).map((item) => ({
      ...item,
      is_locally_hidden: hiddenItems.has(String(item.id)),
    }));
  }

  function filterForPublic(categories, items) {
    const hiddenCategoryIds = new Set(
      (categories || []).filter((cat) => cat.is_hidden).map((cat) => String(cat.id))
    );
    const visibleItems = (items || []).filter((item) => {
      if (item.is_locally_hidden) return false;
      if (hiddenCategoryIds.has(String(item.category_id))) return false;
      const itemCats = item.categories || [];
      if (itemCats.length > 0 && itemCats.every((c) => hiddenCategoryIds.has(String(c.id)))) {
        return false;
      }
      return true;
    });
    const visibleItemIds = new Set(visibleItems.map((item) => String(item.id)));
    const visibleCategories = (categories || [])
      .filter((cat) => !cat.is_hidden)
      .map((cat) => ({
        ...cat,
        item_ids: (cat.item_ids || []).filter((id) => visibleItemIds.has(String(id))),
      }))
      .filter((cat) => (cat.item_ids || []).length > 0 || visibleItems.some(
        (item) => String(item.category_id) === String(cat.id)
          || (item.categories || []).some((c) => String(c.id) === String(cat.id))
      ));

    return { categories: visibleCategories, items: visibleItems };
  }

  async function readCache(locationKey) {
    const db = getDb();
    if (!db) return null;
    const [rows] = await db.query('SELECT * FROM clover_menu_cache WHERE location_key = ? LIMIT 1', [locationKey]);
    if (!rows[0]) return null;
    try {
      return {
        ...JSON.parse(rows[0].payload),
        synced_at: rows[0].synced_at,
      };
    } catch (_) {
      return null;
    }
  }

  async function writeCache(locationKey, payload) {
    const db = getDb();
    if (!db) return;
    await db.query(
      `INSERT INTO clover_menu_cache (location_key, payload, item_count, category_count, synced_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), item_count = VALUES(item_count),
         category_count = VALUES(category_count), synced_at = NOW()`,
      [locationKey, JSON.stringify(payload), payload.items?.length || 0, payload.categories?.length || 0]
    );
    await db.query('UPDATE clover_credentials SET last_sync_at = NOW(), last_error = NULL WHERE location_key = ?', [locationKey]);
  }

  async function syncLocation(locationKey) {
    const loc = locations.find((l) => l.key === locationKey);
    if (!loc) throw new Error('Unknown location');
    const row = await getCredentialRow(locationKey);
    const token = row?.api_token_encrypted ? decryptSecret(row.api_token_encrypted, jwtSecret) : null;
    if (!token) throw new Error('Clover API token is not configured');
    const merchantId = row?.merchant_id || loc.merchantId;
    const currency = row?.currency || loc.currency || 'CAD';

    const rawItems = await fetchAllCloverItems(merchantId, token);
    const publicItems = rawItems.filter(isPublicItem).map((item) => normalizeCloverItem(item, currency));
    const categories = buildCategoriesFromItems(publicItems);
    await syncCategorySettings(locationKey, categories);

    const payload = {
      location_key: locationKey,
      location_name: row?.location_name || loc.label,
      merchant_id: merchantId,
      currency,
      categories,
      items: publicItems,
      synced_at: new Date().toISOString(),
    };
    await writeCache(locationKey, payload);
    return payload;
  }

  async function getMenuPayload(locationKey, { forAdmin = false } = {}) {
    let cache = await readCache(locationKey);
    if (!cache) {
      try {
        cache = await syncLocation(locationKey);
      } catch (err) {
        return { error: err.message, categories: [], items: [], location_key: locationKey };
      }
    }

    const imageMap = await getImageMap(locationKey);
    const { categorySettings, hiddenItems } = await getLocalSettings(locationKey);
    let categories = applyCategorySettings(cache.categories || [], categorySettings);
    let items = applyItemVisibility(mergeImages(cache.items || [], imageMap), hiddenItems);

    if (!forAdmin) {
      const filtered = filterForPublic(categories, items);
      categories = filtered.categories;
      items = filtered.items.map(({ is_locally_hidden, ...rest }) => rest);
    }

    return {
      location_key: locationKey,
      location_name: cache.location_name,
      currency: cache.currency,
      synced_at: cache.synced_at,
      categories,
      items,
      source: 'clover_cache',
    };
  }

  async function getPublicMenu(locationKey) {
    return getMenuPayload(locationKey, { forAdmin: false });
  }

  // ---------------- Public routes ----------------
  app.get('/api/clover/public/locations', (_req, res) => {
    res.json(locations.map((loc) => ({
      key: loc.key,
      label: loc.label,
      currency: loc.currency,
      merchant_id: loc.merchantId,
    })));
  });

  app.get('/api/clover/public/menu', async (req, res) => {
    try {
      const locationKey = String(req.query.location || locations[0]?.key || '').trim();
      if (!locationKey || !locations.some((l) => l.key === locationKey)) {
        return res.status(400).json({ error: 'Invalid location' });
      }
      const menu = await getPublicMenu(locationKey);
      if (menu.error && !menu.items?.length) {
        return res.status(503).json({ error: menu.error, categories: [], items: [] });
      }
      return res.json(menu);
    } catch (err) {
      console.error('clover public menu', err);
      return res.status(500).json({ error: 'Failed to load menu' });
    }
  });

  app.get('/api/clover/public/menu/:itemId', async (req, res) => {
    try {
      const locationKey = String(req.query.location || locations[0]?.key || '').trim();
      if (!locationKey || !locations.some((l) => l.key === locationKey)) {
        return res.status(400).json({ error: 'Invalid location' });
      }
      const itemId = resolveCloverItemId(req.params.itemId);
      const menu = await getPublicMenu(locationKey);
      const item = (menu.items || []).find((entry) => String(entry.id) === String(itemId));
      if (!item) return res.status(404).json({ error: 'Menu item not found' });
      const related = (menu.items || [])
        .filter((entry) => entry.category_id === item.category_id && entry.id !== item.id)
        .slice(0, 6);
      return res.json({
        item,
        related,
        location_key: locationKey,
        currency: menu.currency,
        location_name: menu.location_name,
      });
    } catch (err) {
      console.error('clover public item', err);
      return res.status(500).json({ error: 'Failed to load menu item' });
    }
  });

  // ---------------- Admin routes ----------------
  app.get('/api/admin/clover/status', authMiddleware, async (_req, res) => {
    try {
      await ensureTables();
      const db = getDb();
      const [rows] = db ? await db.query('SELECT * FROM clover_credentials') : [[]];
      const byKey = new Map(rows.map((row) => [row.location_key, row]));
      const result = locations.map((loc) => {
        const row = byKey.get(loc.key);
        return {
          location_key: loc.key,
          location_name: row?.location_name || loc.label,
          merchant_id: row?.merchant_id || loc.merchantId,
          currency: row?.currency || loc.currency,
          access_level: row?.access_level || 'NOT_CONFIGURED',
          has_token: Boolean(row?.api_token_encrypted),
          token_masked: row?.api_token_encrypted ? maskToken(decryptSecret(row.api_token_encrypted, jwtSecret) || '') : '',
          last_sync_at: row?.last_sync_at || null,
          last_tested_at: row?.last_tested_at || null,
          last_error: row?.last_error || null,
          environment: row?.environment || 'production',
        };
      });
      return res.json({ siteKey, locations: result });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to load Clover status' });
    }
  });

  app.put('/api/admin/clover/config/:locationKey', authMiddleware, async (req, res) => {
    try {
      await ensureTables();
      const locationKey = req.params.locationKey;
      const loc = locations.find((l) => l.key === locationKey);
      if (!loc) return res.status(404).json({ error: 'Unknown location' });
      const db = getDb();
      if (!db) return res.status(503).json({ error: 'Database unavailable' });

      const merchantId = String(req.body.merchant_id || loc.merchantId).trim();
      const locationName = String(req.body.location_name || loc.label).trim();
      const environment = String(req.body.environment || 'production').trim();
      const currency = String(req.body.currency || loc.currency || 'CAD').trim().toUpperCase();
      const incomingToken = req.body.api_token;

      const existing = await getCredentialRow(locationKey);
      let encrypted = existing?.api_token_encrypted || null;
      if (typeof incomingToken === 'string' && incomingToken.trim() && !incomingToken.includes('••••')) {
        encrypted = encryptSecret(incomingToken.trim(), jwtSecret);
      }

      await db.query(
        `INSERT INTO clover_credentials
          (location_key, location_name, merchant_id, api_token_encrypted, environment, currency, access_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           location_name = VALUES(location_name),
           merchant_id = VALUES(merchant_id),
           api_token_encrypted = VALUES(api_token_encrypted),
           environment = VALUES(environment),
           currency = VALUES(currency)`,
        [locationKey, locationName, merchantId, encrypted, environment, currency, encrypted ? 'ACCESS_UNVERIFIED' : 'NOT_CONFIGURED']
      );

      return res.json({ ok: true, location_key: locationKey, has_token: Boolean(encrypted) });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to save Clover config' });
    }
  });

  app.post('/api/admin/clover/test/:locationKey', authMiddleware, async (req, res) => {
    try {
      await ensureTables();
      const locationKey = req.params.locationKey;
      const row = await getCredentialRow(locationKey);
      const token = row?.api_token_encrypted ? decryptSecret(row.api_token_encrypted, jwtSecret) : null;
      if (!token) return res.status(400).json({ error: 'Configure an API token first' });
      const merchantId = row.merchant_id;
      const detection = await detectAccessLevel(merchantId, token);
      const db = getDb();
      await db.query(
        'UPDATE clover_credentials SET access_level = ?, last_tested_at = NOW(), last_error = ? WHERE location_key = ?',
        [detection.access_level, detection.error, locationKey]
      );
      return res.json({
        ok: detection.access_level !== 'CONNECTION_ERROR',
        access_level: detection.access_level,
        error: detection.error,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Connection test failed' });
    }
  });

  app.post('/api/admin/clover/sync/:locationKey', authMiddleware, async (req, res) => {
    try {
      const locationKey = req.params.locationKey;
      const payload = await syncLocation(locationKey);
      return res.json({
        ok: true,
        location_key: locationKey,
        item_count: payload.items.length,
        category_count: payload.categories.length,
        synced_at: payload.synced_at,
      });
    } catch (err) {
      try {
        const db = getDb();
        if (db) {
          await db.query('UPDATE clover_credentials SET last_error = ? WHERE location_key = ?', [err.message, req.params.locationKey]);
        }
      } catch (_) { /* ignore */ }
      return res.status(502).json({ error: err.message || 'Sync failed' });
    }
  });

  app.get('/api/admin/clover/menu', authMiddleware, async (req, res) => {
    try {
      const locationKey = String(req.query.location || locations[0]?.key || '').trim();
      const menu = await getMenuPayload(locationKey, { forAdmin: true });
      const row = await getCredentialRow(locationKey);
      return res.json({
        ...menu,
        access_level: row?.access_level || 'NOT_CONFIGURED',
        default_category_order: DEFAULT_CATEGORY_ORDER,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to load admin menu' });
    }
  });

  app.put('/api/admin/clover/categories/:categoryId/visibility', authMiddleware, async (req, res) => {
    try {
      await ensureTables();
      const db = getDb();
      if (!db) return res.status(503).json({ error: 'Database unavailable' });
      const locationKey = String(req.body.location || locations[0]?.key || '').trim();
      const categoryId = String(req.params.categoryId);
      const isHidden = Boolean(req.body.is_hidden);
      const categoryName = String(req.body.category_name || '').trim();
      const sortOrder = Number.isFinite(Number(req.body.sort_order))
        ? Number(req.body.sort_order)
        : defaultSortOrderForCategoryName(categoryName);

      await db.query(
        `INSERT INTO clover_category_settings
          (location_key, clover_category_id, category_name, sort_order, is_hidden)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           is_hidden = VALUES(is_hidden),
           category_name = IF(VALUES(category_name) = '', category_name, VALUES(category_name)),
           sort_order = IF(VALUES(sort_order) IS NULL, sort_order, VALUES(sort_order))`,
        [locationKey, categoryId, categoryName || 'Menu', sortOrder, isHidden ? 1 : 0]
      );
      return res.json({ ok: true, clover_category_id: categoryId, is_hidden: isHidden });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update category visibility' });
    }
  });

  app.put('/api/admin/clover/categories/order', authMiddleware, async (req, res) => {
    try {
      await ensureTables();
      const db = getDb();
      if (!db) return res.status(503).json({ error: 'Database unavailable' });
      const locationKey = String(req.body.location || locations[0]?.key || '').trim();
      const order = Array.isArray(req.body.order) ? req.body.order : [];
      for (const entry of order) {
        const categoryId = String(entry.id || entry.clover_category_id || '');
        if (!categoryId) continue;
        const sortOrder = Number(entry.sort_order);
        if (!Number.isFinite(sortOrder)) continue;
        await db.query(
          `INSERT INTO clover_category_settings
            (location_key, clover_category_id, category_name, sort_order, is_hidden)
           VALUES (?, ?, ?, ?, 0)
           ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)`,
          [locationKey, categoryId, String(entry.name || entry.category_name || 'Menu'), sortOrder]
        );
      }
      return res.json({ ok: true, updated: order.length });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update category order' });
    }
  });

  app.put('/api/admin/clover/items/:itemId/visibility', authMiddleware, async (req, res) => {
    try {
      await ensureTables();
      const db = getDb();
      if (!db) return res.status(503).json({ error: 'Database unavailable' });
      const locationKey = String(req.body.location || locations[0]?.key || '').trim();
      const itemId = String(req.params.itemId);
      const isHidden = Boolean(req.body.is_hidden);
      await db.query(
        `INSERT INTO clover_item_visibility (location_key, clover_item_id, is_hidden)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE is_hidden = VALUES(is_hidden)`,
        [locationKey, itemId, isHidden ? 1 : 0]
      );
      return res.json({ ok: true, clover_item_id: itemId, is_hidden: isHidden });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update item visibility' });
    }
  });

  app.put('/api/admin/clover/items/:itemId/image', authMiddleware, async (req, res) => {
    try {
      await ensureTables();
      const locationKey = String(req.body.location || locations[0]?.key || '').trim();
      const itemId = String(req.params.itemId);
      const imageUrl = req.body.image_url === null || req.body.image_url === ''
        ? null
        : String(req.body.image_url || '').trim();
      if (imageUrl && !/^https?:\/\//i.test(imageUrl) && !imageUrl.startsWith('/uploads/')) {
        return res.status(400).json({ error: 'Image URL must be http(s) or a local /uploads path' });
      }
      const db = getDb();
      if (!db) return res.status(503).json({ error: 'Database unavailable' });
      if (!imageUrl) {
        await db.query('DELETE FROM clover_item_images WHERE location_key = ? AND clover_item_id = ?', [locationKey, itemId]);
        return res.json({ ok: true, image_url: null });
      }
      await db.query(
        `INSERT INTO clover_item_images (location_key, clover_item_id, image_url, uploaded_path)
         VALUES (?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE image_url = VALUES(image_url), uploaded_path = NULL`,
        [locationKey, itemId, imageUrl]
      );
      return res.json({ ok: true, image_url: imageUrl });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to save image URL' });
    }
  });

  app.post('/api/admin/clover/items/:itemId/upload-image', authMiddleware, (req, res) => {
    menuImageUpload.single('image')(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
      try {
        await ensureTables();
        const locationKey = String(req.body.location || locations[0]?.key || '').trim();
        const itemId = String(req.params.itemId);
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
        const publicUrl = `/uploads/menu-items/${req.file.filename}`;
        const db = getDb();
        await db.query(
          `INSERT INTO clover_item_images (location_key, clover_item_id, image_url, uploaded_path)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE image_url = VALUES(image_url), uploaded_path = VALUES(uploaded_path)`,
          [locationKey, itemId, publicUrl, req.file.path]
        );
        return res.json({ ok: true, image_url: publicUrl });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    });
  });

  app.put('/api/admin/clover/items/:itemId', authMiddleware, async (req, res) => {
    try {
      const locationKey = String(req.body.location || locations[0]?.key || '').trim();
      const row = await getCredentialRow(locationKey);
      if (!row || row.access_level !== 'READ_WRITE') {
        return res.status(403).json({ error: 'Clover credentials are read-only. Item fields cannot be edited.' });
      }
      const token = decryptSecret(row.api_token_encrypted, jwtSecret);
      const itemId = String(req.params.itemId);
      const body = {};
      if (req.body.name != null) body.name = String(req.body.name);
      if (req.body.description != null) body.description = String(req.body.description);
      if (req.body.price != null) {
        const dollars = Number(req.body.price);
        if (!Number.isFinite(dollars)) return res.status(400).json({ error: 'Invalid price' });
        body.price = Math.round(dollars * 100);
      }
      const result = await cloverFetch(row.merchant_id, token, `/items/${itemId}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!result.ok) {
        const putResult = await cloverFetch(row.merchant_id, token, `/items/${itemId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        if (!putResult.ok) {
          return res.status(putResult.status).json({ error: putResult.data?.message || 'Clover update failed' });
        }
      }
      await syncLocation(locationKey);
      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || 'Failed to update item' });
    }
  });

  return { ensureTables, syncLocation, getPublicMenu, locations, resolveCloverItemId };
}

module.exports = { registerCloverMenu, slugify, resolveCloverItemId, DEFAULT_CATEGORY_ORDER };
