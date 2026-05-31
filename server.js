const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Server: SocketIOServer } = require('socket.io');
const multer = require('multer');

let mysql;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  console.log('mysql2 not available');
}

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'resumes');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

try { require('dotenv').config(); } catch (e) { }

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: true, credentials: true } });
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'masakali_secret_2024';
const IP_API_BASE_URL = 'http://ip-api.com/json';

// =====================================================
// Middleware
// =====================================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', true);

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Serve logo files
app.use('/logo', express.static(path.join(__dirname, 'logo')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

io.on('connection', (socket) => {
  socket.on('admin:join', (payload = {}) => {
    const rid = Number(payload.restaurant_id || payload.restaurantId || 0);
    socket.join('admin:all');
    if (rid > 0) socket.join('admin:' + rid);
  });
});

// =====================================================
// Database Connection
// =====================================================
let db = null;

async function initDB() {
  if (!mysql) return;
  try {
    db = await mysql.createPool({
      host: process.env.DB_HOST || 'sv63.ifastnet12.org',
      user: process.env.DB_USER || 'masakali_kiran',
      password: process.env.DB_PASS || 'K143iran',
      database: process.env.DB_NAME || 'masakali_rangde',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '8000', 10),
      waitForConnections: true,
      connectionLimit: 10,
    });
    const [rows] = await db.query('SELECT 1');
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('super_admin', 'branch_admin', 'staff') DEFAULT 'staff',
        restaurant_id INT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS homepage_featured_dishes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        menu_item_key VARCHAR(120) NOT NULL,
        sort_order INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_menu_item_key (menu_item_key)
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        rating TINYINT NOT NULL DEFAULT 5,
        branch VARCHAR(255) DEFAULT NULL,
        sort_order INT NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_notification_settings (
        id TINYINT PRIMARY KEY,
        reservations_email VARCHAR(255) DEFAULT NULL,
        contact_email VARCHAR(255) DEFAULT NULL,
        catering_email VARCHAR(255) DEFAULT NULL,
        hiring_email VARCHAR(255) DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.query(
      `INSERT INTO email_notification_settings (id, reservations_email, contact_email, catering_email, hiring_email)
       VALUES (1, NULL, NULL, NULL, NULL)
       ON DUPLICATE KEY UPDATE id = id`
    );
    try {
      await db.query('ALTER TABLE email_notification_settings ADD COLUMN IF NOT EXISTS hiring_email VARCHAR(255) DEFAULT NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS geolocation_latitude DECIMAL(10, 8) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS geolocation_longitude DECIMAL(11, 8) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS geolocation_accuracy_meters DECIMAL(10, 2) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS geolocation_captured_at DATETIME NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS geolocation_source VARCHAR(50) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS request_ip VARCHAR(45) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS request_user_agent TEXT NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS request_browser VARCHAR(120) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS request_os VARCHAR(120) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS request_device_type VARCHAR(30) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_lookup_status VARCHAR(20) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_lookup_message VARCHAR(255) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_country VARCHAR(100) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_region VARCHAR(100) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_city VARCHAR(100) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_zip VARCHAR(20) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_latitude DECIMAL(10, 8) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_longitude DECIMAL(11, 8) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_timezone VARCHAR(80) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_isp VARCHAR(150) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_org VARCHAR(150) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_as VARCHAR(150) NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_mobile BOOLEAN NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_proxy BOOLEAN NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ip_hosting BOOLEAN NULL');

      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS request_ip VARCHAR(45) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS request_user_agent TEXT NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS request_browser VARCHAR(120) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS request_os VARCHAR(120) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS request_device_type VARCHAR(30) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_lookup_status VARCHAR(20) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_lookup_message VARCHAR(255) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_country VARCHAR(100) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_region VARCHAR(100) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_city VARCHAR(100) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_zip VARCHAR(20) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_latitude DECIMAL(10, 8) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_longitude DECIMAL(11, 8) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_timezone VARCHAR(80) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_isp VARCHAR(150) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_org VARCHAR(150) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_as VARCHAR(150) NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_mobile BOOLEAN NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_proxy BOOLEAN NULL');
      await db.query('ALTER TABLE catering_requests ADD COLUMN IF NOT EXISTS ip_hosting BOOLEAN NULL');

      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS request_ip VARCHAR(45) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS request_user_agent TEXT NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS request_browser VARCHAR(120) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS request_os VARCHAR(120) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS request_device_type VARCHAR(30) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_lookup_status VARCHAR(20) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_lookup_message VARCHAR(255) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_country VARCHAR(100) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_region VARCHAR(100) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_city VARCHAR(100) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_zip VARCHAR(20) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_latitude DECIMAL(10, 8) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_longitude DECIMAL(11, 8) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_timezone VARCHAR(80) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_isp VARCHAR(150) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_org VARCHAR(150) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_as VARCHAR(150) NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_mobile BOOLEAN NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_proxy BOOLEAN NULL');
      await db.query('ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS ip_hosting BOOLEAN NULL');
    } catch (migrationErr) {
      console.log('Reservation geolocation columns migration skipped:', migrationErr.message);
    }
    // Reservation settings table (Tuesday toggle, etc.)
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS reservation_settings (
          id TINYINT PRIMARY KEY DEFAULT 1,
          tuesday_disabled BOOLEAN NOT NULL DEFAULT TRUE,
          reservations_paused BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      await db.query(
        `INSERT INTO reservation_settings (id, tuesday_disabled, reservations_paused) VALUES (1, TRUE, FALSE)
         ON DUPLICATE KEY UPDATE id = id`
      );
      // Ensure reservations_paused column exists for older tables
      try {
        await db.query('ALTER TABLE reservation_settings ADD COLUMN IF NOT EXISTS reservations_paused BOOLEAN NOT NULL DEFAULT FALSE');
      } catch (_) { /* column already exists */ }
    } catch (settingsErr) {
      console.log('Reservation settings migration skipped:', settingsErr.message);
    }
    // Hiring banner tables
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS hiring_banner_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          is_enabled TINYINT(1) DEFAULT 1,
          banner_text VARCHAR(255) NOT NULL,
          cta_text VARCHAR(100) DEFAULT 'Apply Now',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      await db.query(
        `INSERT INTO hiring_banner_settings (id, is_enabled, banner_text, cta_text)
         VALUES (1, 1, 'JOIN OUR TEAM: NOW HIRING ✨ RangDe Now Open! ✨', 'Apply Now')
         ON DUPLICATE KEY UPDATE id = id`
      );
      await db.query(`
        CREATE TABLE IF NOT EXISTS hiring_applications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(150) NOT NULL,
          phone_number VARCHAR(30) NOT NULL,
          email VARCHAR(150) NOT NULL,
          resume_file VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (hiringErr) {
      console.log('Hiring tables migration skipped:', hiringErr.message);
    }
    // Smart calendar + notifications tables
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS location_capacity_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          restaurant_id INT NOT NULL,
          service_period ENUM('lunch', 'dinner') NOT NULL,
          total_seats INT NOT NULL DEFAULT 0,
          avg_duration_minutes INT NOT NULL DEFAULT 90,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_capacity_rest_period (restaurant_id, service_period),
          CONSTRAINT fk_capacity_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS reservation_blockouts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          restaurant_id INT NOT NULL,
          block_date DATE NOT NULL,
          service_period ENUM('all_day', 'lunch', 'dinner') NOT NULL DEFAULT 'all_day',
          reason VARCHAR(255) DEFAULT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_by INT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_blockout (restaurant_id, block_date, service_period),
          CONSTRAINT fk_blockout_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
          CONSTRAINT fk_blockout_admin FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS admin_notifications (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          type ENUM('reservation', 'contact', 'catering', 'system') NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT DEFAULT NULL,
          entity_type VARCHAR(50) DEFAULT NULL,
          entity_id INT DEFAULT NULL,
          restaurant_id INT DEFAULT NULL,
          payload_json JSON DEFAULT NULL,
          is_read TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_admin_notifications_read_created (is_read, created_at),
          INDEX idx_admin_notifications_restaurant (restaurant_id),
          CONSTRAINT fk_admin_notifications_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS reservation_table_assignments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          reservation_id INT NOT NULL,
          table_label VARCHAR(80) NOT NULL,
          seats INT DEFAULT NULL,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          assigned_by INT DEFAULT NULL,
          UNIQUE KEY uniq_reservation_table (reservation_id),
          CONSTRAINT fk_table_assignment_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
          CONSTRAINT fk_table_assignment_admin FOREIGN KEY (assigned_by) REFERENCES admins(id) ON DELETE SET NULL
        )
      `);
      await db.query("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS service_period ENUM('lunch', 'dinner') DEFAULT NULL");
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_vip TINYINT(1) NOT NULL DEFAULT 0');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS seated_at DATETIME NULL');
      await db.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS table_assigned VARCHAR(80) DEFAULT NULL');
    } catch (calendarErr) {
      console.log('Calendar tables migration skipped:', calendarErr.message);
    }
    console.log('✓ MySQL database connected');
  } catch (err) {
    console.log('✗ Database not available, using mock data:', err.message);
    db = null;
  }
}

// =====================================================
// Mock Data (fallback when no DB)
// =====================================================
const mockRestaurants = [
  { id: 1, name: 'Masakali Indian Cuisine – Wellington', slug: 'wellington', brand: 'Masakali Indian Cuisine', address: '1111 Wellington St. W', city: 'Ottawa', province_state: 'Ontario', country: 'Canada', phone: '(613) 792-9777', email: 'wellington@masakali.ca', website: 'https://masakaliottawa.ca', is_active: true },
  { id: 2, name: 'Masakali Indian Cuisine – Stittsville', slug: 'stittsville', brand: 'Masakali Indian Cuisine', address: '5507 Hazeldean Rd Unit C3-1', city: 'Stittsville', province_state: 'Ontario', country: 'Canada', phone: '(613) 878-3939', email: 'stittsville@masakali.ca', website: 'https://masakaliottawa.ca', is_active: true },
  { id: 3, name: 'Masakali Indian Cuisine – Montreal', slug: 'montreal', brand: 'Masakali Indian Cuisine', address: '1015 Sherbrooke St W', city: 'Montreal', province_state: 'Quebec', country: 'Canada', phone: '(514) 228-6777', email: 'montreal@masakali.ca', website: 'https://masakalimontreal.ca', is_active: true },
  { id: 4, name: 'RangDe Indian Cuisine', slug: 'rangde', brand: 'RangDe Indian Cuisine', address: '700 March Rd Unit H', city: 'Kanata', province_state: 'Ontario', country: 'Canada', phone: '(613) 595-0777', email: 'info@rangdeottawa.com', website: 'https://rangdeottawa.com', is_active: true },
  { id: 5, name: 'Masakali Indian Resto Bar', slug: 'restobar', brand: 'Masakali Restobar', address: '97 Clarence St.', city: 'Ottawa', province_state: 'Ontario', country: 'Canada', phone: '(613) 789-6777', email: 'info@masakalirestrobar.ca', website: 'https://masakalirestrobar.ca', is_active: true },
  { id: 6, name: 'Masakali Indian Cuisine – California', slug: 'california', brand: 'Masakali Indian Cuisine', address: '10310 S De Anza Blvd', city: 'Cupertino', province_state: 'California', country: 'USA', phone: '(408) 352-5097', email: 'contact@masakalicalifornia.com', website: 'https://masakalicalifornia.com', is_active: true },
];

function normalizeSpiceLevel(value) {
  const normalized = String(value || '').toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'mild' || normalized === 'medium' || normalized === 'hot' || normalized === 'extra_hot') {
    return normalized;
  }
  return 'medium';
}

function numericId(value, fallbackSeed) {
  const raw = String(value ?? '').trim();
  if (/^\d+$/.test(raw)) return Number(raw);

  const source = raw || String(fallbackSeed || '0');
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash) + 1;
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return Object.values(value);
  return [];
}

function parseReservationGeolocation(geolocation) {
  if (!geolocation || typeof geolocation !== 'object') return null;

  const latitude = Number(geolocation.latitude);
  const longitude = Number(geolocation.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  const accuracy = Number(geolocation.accuracy);
  const capturedAtRaw = geolocation.captured_at || geolocation.capturedAt;
  const capturedAtDate = capturedAtRaw ? new Date(capturedAtRaw) : null;

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? Math.max(accuracy, 0) : null,
    captured_at: capturedAtDate && !Number.isNaN(capturedAtDate.getTime())
      ? capturedAtDate.toISOString().slice(0, 19).replace('T', ' ')
      : null,
    source: String(geolocation.source || 'browser_geolocation').slice(0, 50),
  };
}

function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfIp = req.headers['cf-connecting-ip'];
  const remoteIp = req.socket?.remoteAddress;
  const candidate = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]
    || (Array.isArray(realIp) ? realIp[0] : realIp)
    || (Array.isArray(cfIp) ? cfIp[0] : cfIp)
    || remoteIp
    || req.ip
    || '';

  const cleaned = String(candidate).trim().replace(/^::ffff:/, '');
  return cleaned || null;
}

function isPrivateIp(ip) {
  if (!ip) return true;
  const value = String(ip).toLowerCase();
  if (value === '::1' || value === '127.0.0.1' || value === 'localhost') return true;
  if (value.startsWith('10.') || value.startsWith('192.168.') || value.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(value)) return true;
  if (value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:')) return true;
  return false;
}

function parseUserAgent(ua) {
  const source = String(ua || '').toLowerCase();

  let browser = 'Unknown';
  if (source.includes('edg/')) browser = 'Edge';
  else if (source.includes('opr/') || source.includes('opera')) browser = 'Opera';
  else if (source.includes('chrome/')) browser = 'Chrome';
  else if (source.includes('safari/') && !source.includes('chrome/')) browser = 'Safari';
  else if (source.includes('firefox/')) browser = 'Firefox';

  let os = 'Unknown';
  if (source.includes('windows nt')) os = 'Windows';
  else if (source.includes('mac os x')) os = 'macOS';
  else if (source.includes('android')) os = 'Android';
  else if (source.includes('iphone') || source.includes('ipad') || source.includes('ios')) os = 'iOS';
  else if (source.includes('linux')) os = 'Linux';

  let deviceType = 'desktop';
  if (source.includes('ipad') || source.includes('tablet')) deviceType = 'tablet';
  else if (source.includes('mobile') || source.includes('iphone') || source.includes('android')) deviceType = 'mobile';
  if (source.includes('bot') || source.includes('crawler') || source.includes('spider')) deviceType = 'bot';

  return { browser, os, deviceType };
}

async function lookupIpDetails(ip) {
  if (!ip || isPrivateIp(ip)) {
    return {
      ip_lookup_status: 'skipped',
      ip_lookup_message: 'private_or_missing_ip',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const fields = 'status,message,country,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting';
    const url = `${IP_API_BASE_URL}/${encodeURIComponent(ip)}?fields=${fields}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return {
        ip_lookup_status: 'error',
        ip_lookup_message: `http_${response.status}`,
      };
    }

    const payload = await response.json();
    return {
      ip_lookup_status: payload.status || 'error',
      ip_lookup_message: payload.message || null,
      ip_country: payload.country || null,
      ip_region: payload.regionName || null,
      ip_city: payload.city || null,
      ip_zip: payload.zip || null,
      ip_latitude: Number.isFinite(Number(payload.lat)) ? Number(payload.lat) : null,
      ip_longitude: Number.isFinite(Number(payload.lon)) ? Number(payload.lon) : null,
      ip_timezone: payload.timezone || null,
      ip_isp: payload.isp || null,
      ip_org: payload.org || null,
      ip_as: payload.as || null,
      ip_mobile: typeof payload.mobile === 'boolean' ? payload.mobile : null,
      ip_proxy: typeof payload.proxy === 'boolean' ? payload.proxy : null,
      ip_hosting: typeof payload.hosting === 'boolean' ? payload.hosting : null,
    };
  } catch (err) {
    return {
      ip_lookup_status: 'error',
      ip_lookup_message: err.name === 'AbortError' ? 'timeout' : 'lookup_failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function collectRequestContext(req) {
  const requestIp = extractClientIp(req);
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 1000);
  const ua = parseUserAgent(userAgent);
  const ipDetails = await lookupIpDetails(requestIp);

  return {
    request_ip: requestIp,
    request_user_agent: userAgent || null,
    request_browser: ua.browser,
    request_os: ua.os,
    request_device_type: ua.deviceType,
    ...ipDetails,
  };
}

async function fetchTempMenuData() {
  if (!db) throw new Error('Database not connected');

  const [categoryRows] = await db.query(
    `SELECT id, name, sort_order
      FROM temp_categories_stittsville
     ORDER BY sort_order ASC, name ASC`
  );

  const categories = categoryRows.map((row, index) => ({
    id: String(row.id),
    name: row.name || 'Menu',
    slug: String(row.name || `category-${index + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    sort_order: Number(row.sort_order ?? index + 1),
  }));

  const [rows] = await db.query(
    `SELECT
       c.id AS category_id,
       c.name AS category_name,
       c.sort_order,
       i.id AS item_id,
       i.name AS item_name,
       i.description,
       i.price,
       i.available,
       img.image_type,
       img.image_url
        FROM temp_category_items_stittsville ci
        JOIN temp_categories_stittsville c ON ci.category_id = c.id
        JOIN temp_items_stittsville i ON ci.item_id = i.id
        LEFT JOIN temp_item_images_stittsville img ON img.item_id = i.id
     WHERE i.available = 1
     ORDER BY c.sort_order ASC, c.name ASC, i.name ASC`
  );

  const byCompositeKey = new Map();

  rows.forEach((row) => {
    const categoryId = String(row.category_id);
    const itemId = String(row.item_id);
    const compositeKey = `${categoryId}::${itemId}`;

    if (!byCompositeKey.has(compositeKey)) {
      const priceCents = Number(row.price || 0);
      byCompositeKey.set(compositeKey, {
        id: itemId,
        source_id: itemId,
        name: row.item_name || 'Menu Item',
        description: row.description || '',
        price: Number.isFinite(priceCents) ? Number((priceCents / 100).toFixed(2)) : 0,
        image_url: row.image_url || null,
        images: [],
        category_id: categoryId,
        category_name: row.category_name || 'Menu',
        is_vegetarian: false,
        spice_level: 'medium',
        is_featured: false,
      });
    }

    if (row.image_url) {
      const item = byCompositeKey.get(compositeKey);
      const alreadyIncluded = item.images.some((image) => image.source === row.image_url);
      if (!alreadyIncluded) {
        item.images.push({
          name: row.image_type || 'default',
          source: row.image_url,
        });
      }
      if (!item.image_url) item.image_url = row.image_url;
    }
  });

  return {
    categories,
    items: Array.from(byCompositeKey.values()),
  };
}

function normalizeMenuCategoryId(categoryId) {
  const value = String(categoryId ?? '').trim();
  return value || null;
}

function toPriceCents(price) {
  const numeric = Number(price);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.round(numeric * 100);
}

function generateTempMenuItemId() {
  return Math.random().toString(36).slice(2, 12).toUpperCase();
}

async function createTempMenuItem(payload) {
  const categoryId = normalizeMenuCategoryId(payload.category_id);
  const priceCents = toPriceCents(payload.price);
  const name = String(payload.name || '').trim();
  const description = String(payload.description || '').trim();

  if (!name || !categoryId || priceCents === null) {
    const err = new Error('name, category_id and valid price are required');
    err.statusCode = 400;
    throw err;
  }

  const [categoryRows] = await db.query('SELECT id, name FROM temp_categories_stittsville WHERE id = ? LIMIT 1', [categoryId]);
  if (!categoryRows.length) {
    const err = new Error('Category not found');
    err.statusCode = 400;
    throw err;
  }

  let itemId = generateTempMenuItemId();
  // Guard against collisions.
  for (let i = 0; i < 5; i += 1) {
    const [exists] = await db.query('SELECT id FROM temp_items_stittsville WHERE id = ? LIMIT 1', [itemId]);
    if (!exists.length) break;
    itemId = generateTempMenuItemId();
  }

  await db.query(
    'INSERT INTO temp_items_stittsville (id, name, description, price, available, age_restricted) VALUES (?, ?, ?, ?, 1, 0)',
    [itemId, name, description, priceCents]
  );
  await db.query('INSERT INTO temp_category_items_stittsville (category_id, item_id) VALUES (?, ?)', [categoryId, itemId]);

  const tempMenu = await fetchTempMenuData();
  const created = tempMenu.items.find((item) => String(item.id) === String(itemId));
  if (!created) {
    return {
      id: itemId,
      source_id: itemId,
      name,
      description,
      price: Number((priceCents / 100).toFixed(2)),
      image_url: null,
      images: [],
      category_id: categoryId,
      category_name: categoryRows[0].name,
      is_vegetarian: Boolean(payload.is_vegetarian),
      spice_level: normalizeSpiceLevel(payload.spice_level),
      is_featured: Boolean(payload.is_featured),
    };
  }

  return {
    ...created,
    is_vegetarian: Boolean(payload.is_vegetarian),
    spice_level: normalizeSpiceLevel(payload.spice_level),
    is_featured: Boolean(payload.is_featured),
  };
}

async function updateTempMenuItem(itemId, payload) {
  const categoryId = normalizeMenuCategoryId(payload.category_id);
  const priceCents = toPriceCents(payload.price);
  const name = String(payload.name || '').trim();
  const description = String(payload.description || '').trim();

  if (!name || !categoryId || priceCents === null) {
    const err = new Error('name, category_id and valid price are required');
    err.statusCode = 400;
    throw err;
  }

  const [categoryRows] = await db.query('SELECT id, name FROM temp_categories_stittsville WHERE id = ? LIMIT 1', [categoryId]);
  if (!categoryRows.length) {
    const err = new Error('Category not found');
    err.statusCode = 400;
    throw err;
  }

  const [updateResult] = await db.query(
    'UPDATE temp_items_stittsville SET name = ?, description = ?, price = ? WHERE id = ?',
    [name, description, priceCents, itemId]
  );

  if (!updateResult.affectedRows) {
    const err = new Error('Menu item not found');
    err.statusCode = 404;
    throw err;
  }

  await db.query('DELETE FROM temp_category_items_stittsville WHERE item_id = ?', [itemId]);
  await db.query('INSERT INTO temp_category_items_stittsville (category_id, item_id) VALUES (?, ?)', [categoryId, itemId]);

  const tempMenu = await fetchTempMenuData();
  const updated = tempMenu.items.find((item) => String(item.id) === String(itemId));
  if (!updated) {
    return {
      id: String(itemId),
      source_id: String(itemId),
      name,
      description,
      price: Number((priceCents / 100).toFixed(2)),
      image_url: null,
      images: [],
      category_id: categoryId,
      category_name: categoryRows[0].name,
      is_vegetarian: Boolean(payload.is_vegetarian),
      spice_level: normalizeSpiceLevel(payload.spice_level),
      is_featured: Boolean(payload.is_featured),
    };
  }

  return {
    ...updated,
    is_vegetarian: Boolean(payload.is_vegetarian),
    spice_level: normalizeSpiceLevel(payload.spice_level),
    is_featured: Boolean(payload.is_featured),
  };
}

async function deleteTempMenuItem(itemId) {
  await db.query('DELETE FROM homepage_featured_dishes WHERE menu_item_key = ?', [String(itemId)]);
  await db.query('DELETE FROM temp_item_images_stittsville WHERE item_id = ?', [itemId]);
  await db.query('DELETE FROM temp_category_items_stittsville WHERE item_id = ?', [itemId]);
  const [result] = await db.query('DELETE FROM temp_items_stittsville WHERE id = ?', [itemId]);
  return Boolean(result.affectedRows);
}

let mockReservations = [
  { id: 1, restaurant_id: 1, name: 'John Smith', email: 'john@example.com', phone: '613-555-1234', date: '2026-03-10', time: '19:00', persons: 4, special_requests: 'Window seat please', status: 'confirmed', confirmation_code: 'MAS-001', created_at: '2026-03-05T10:00:00' },
  { id: 2, restaurant_id: 2, name: 'Sarah Johnson', email: 'sarah@example.com', phone: '613-555-5678', date: '2026-03-10', time: '20:00', persons: 2, status: 'pending', confirmation_code: 'MAS-002', created_at: '2026-03-05T12:00:00' },
  { id: 3, restaurant_id: 5, name: 'Mike Chen', email: 'mike@example.com', phone: '613-555-9012', date: '2026-03-11', time: '18:30', persons: 6, special_requests: 'Birthday celebration', status: 'confirmed', confirmation_code: 'MAS-003', created_at: '2026-03-06T09:00:00' },
  { id: 4, restaurant_id: 1, name: 'Priya Patel', email: 'priya@example.com', phone: '613-555-3456', date: '2026-03-12', time: '19:30', persons: 3, status: 'confirmed', confirmation_code: 'MAS-004', created_at: '2026-03-06T14:00:00' },
  { id: 5, restaurant_id: 4, name: 'David Wilson', email: 'david@example.com', phone: '613-555-7890', date: '2026-03-08', time: '20:00', persons: 8, special_requests: 'Anniversary dinner', status: 'completed', confirmation_code: 'MAS-005', created_at: '2026-03-04T11:00:00' },
  { id: 6, restaurant_id: 2, name: 'Emily Brown', email: 'emily@example.com', phone: '613-555-2345', date: '2026-03-09', time: '18:00', persons: 2, status: 'cancelled', confirmation_code: 'MAS-006', created_at: '2026-03-04T16:00:00' },
  { id: 7, restaurant_id: 3, name: 'Raj Sharma', email: 'raj@example.com', phone: '514-555-6789', date: '2026-03-13', time: '19:00', persons: 5, status: 'pending', confirmation_code: 'MAS-007', created_at: '2026-03-07T08:00:00' },
  { id: 8, restaurant_id: 6, name: 'Lisa Anderson', email: 'lisa@example.com', phone: '310-555-0123', date: '2026-03-14', time: '20:30', persons: 4, status: 'confirmed', confirmation_code: 'MAS-008', created_at: '2026-03-07T10:00:00' },
];

let mockCateringRequests = [
  { id: 1, name: 'Corporate Events Inc', email: 'events@corp.com', phone: '613-555-1111', event_date: '2026-04-15', guests: 100, event_location: 'Ottawa Convention Center', event_type: 'Corporate', notes: 'Full Indian buffet needed', status: 'quoted', created_at: '2026-03-01T10:00:00' },
  { id: 2, name: 'Anita Desai', email: 'anita@example.com', phone: '613-555-2222', event_date: '2026-05-20', guests: 200, event_location: 'Hilton Garden Inn', event_type: 'Wedding', notes: 'Vegetarian and non-vegetarian options', status: 'new', created_at: '2026-03-05T14:00:00' },
];

let mockContactInquiries = [
  { id: 1, name: 'Alex Martin', email: 'alex@example.com', phone: '14375550111', subject: 'reservation', message: 'Can we seat 12 people together?', restaurant_id: 6, is_read: false, created_at: '2026-03-09T10:20:00' },
  { id: 2, name: 'Priyanka Shah', email: 'priyanka@example.com', phone: '15145559876', subject: 'feedback', message: 'Loved the butter chicken!', restaurant_id: 6, is_read: true, created_at: '2026-03-10T08:15:00' },
];

let mockFeaturedDishKeys = [];

let mockTestimonials = [
  { id: 1, name: 'Sarah M.', text: 'The best Indian food in Ottawa! Butter chicken is absolutely divine. The ambiance is perfect for date night.', rating: 5, branch: 'Wellington', sort_order: 1, is_active: true },
  { id: 2, name: 'James K.', text: 'Incredible biryani and tandoori. Every dish bursts with authentic flavors. We order catering regularly.', rating: 5, branch: 'Stittsville', sort_order: 2, is_active: true },
  { id: 3, name: 'Priya S.', text: 'Feels like home cooking elevated to fine dining. The lamb chops are a must-try. Exceptional service every time.', rating: 5, branch: 'Restobar', sort_order: 3, is_active: true },
];

let mockEmailNotificationSettings = {
  reservations_email: '',
  contact_email: '',
  catering_email: '',
  hiring_email: '',
};

let mockReservationSettings = {
  tuesday_disabled: true,
  reservations_paused: false,
};

let mockHiringBannerSettings = {
  id: 1,
  is_enabled: 1,
  banner_text: 'JOIN OUR TEAM: NOW HIRING ✨ RangDe Now Open! ✨',
  cta_text: 'Apply Now',
};
let mockHiringApplications = [];
let nextHiringApplicationId = 1;
let mockCapacitySettings = [];
let mockReservationBlockouts = [];
let mockAdminNotifications = [];
let nextAdminNotificationId = 1;
let nextBlockoutId = 1;

let nextReservationId = 9;
let nextCateringId = 3;
let nextContactId = 3;
let nextTestimonialId = 4;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeReservationPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return digits;
}

function reservationPhonesMatch(left, right) {
  const normalizedLeft = normalizeReservationPhone(left);
  const normalizedRight = normalizeReservationPhone(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight;
}

function sortReservationsNewestFirst(rows) {
  return [...rows].sort((a, b) => {
    const aCreated = Date.parse(a.created_at || '');
    const bCreated = Date.parse(b.created_at || '');

    if (!Number.isNaN(aCreated) && !Number.isNaN(bCreated) && aCreated !== bCreated) {
      return bCreated - aCreated;
    }

    if ((a.date || '') !== (b.date || '')) return String(b.date || '').localeCompare(String(a.date || ''));
    if ((a.time || '') !== (b.time || '')) return String(b.time || '').localeCompare(String(a.time || ''));
    return Number(b.id || 0) - Number(a.id || 0);
  });
}

function buildCustomerReservationUpdatePayload(input) {
  const updates = {};

  if (typeof input.name === 'string' && input.name.trim()) {
    updates.name = input.name.trim();
  }

  if (typeof input.email === 'string' && input.email.trim()) {
    updates.email = normalizeEmail(input.email);
  }

  if (input.phone !== undefined) {
    const normalizedPhone = normalizeReservationPhone(input.phone);
    if (normalizedPhone) updates.phone = normalizedPhone;
  }

  if (typeof input.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    updates.date = input.date;
  }

  if (typeof input.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(input.time)) {
    updates.time = input.time;
  }

  if (input.persons !== undefined) {
    const parsedPersons = parseInt(input.persons, 10);
    if (Number.isFinite(parsedPersons) && parsedPersons > 0 && parsedPersons <= 30) {
      updates.persons = parsedPersons;
    }
  }

  if (input.special_requests !== undefined) {
    updates.special_requests = String(input.special_requests || '').trim() || null;
  }

  return updates;
}

// =====================================================
// Email Transporter
// =====================================================
const SMTP_HOST = process.env.EMAIL_SMTP_HOST || process.env.EMAIL_HOST || 'mail.rangdeottawa.ca';
const SMTP_PORT = parseInt(process.env.EMAIL_SMTP_PORT || process.env.EMAIL_PORT || '465', 10);

function createEmailTransporter(user, pass) {
  if (!user || !pass) return null;
  try {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: { user, pass },
    });
  } catch (err) {
    console.log('Email transporter not configured for user:', user, err.message);
    return null;
  }
}

const reservationEmailUser = process.env.RESERVATION_EMAIL_USER || 'reservations@rangdeottawa.ca';
const reservationEmailPass = process.env.RESERVATION_EMAIL_PASS || 'K143iran';
const contactEmailUser = process.env.CONTACT_EMAIL_USER || 'contact@rangdeottawa.ca';
const contactEmailPass = process.env.CONTACT_EMAIL_PASS || 'K143iran';
const WEBSITE_BASE_URL = String(
  process.env.WEBSITE_BASE_URL
  || process.env.PUBLIC_SITE_URL
  || process.env.SITE_URL
  || 'https://rangdeottawa.ca'
).replace(/\/+$/, '');
const MANAGE_RESERVATIONS_URL = `${WEBSITE_BASE_URL}/manage-reservations`;
const EMAIL_LOGO_URL = process.env.EMAIL_LOGO_URL || `${WEBSITE_BASE_URL}/logo/RangDe-Indian-Cuisine.png`;

const reservationTransporter = createEmailTransporter(reservationEmailUser, reservationEmailPass);
const contactTransporter = createEmailTransporter(contactEmailUser, contactEmailPass);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatReservationDate(value) {
  if (!value) return '';

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [year, month, day] = value.trim().split('-').map((part) => Number(part));
    const dateOnly = new Date(year, month - 1, day);
    if (!Number.isNaN(dateOnly.getTime())) {
      return dateOnly.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function reservationInfoBlockHtml(reservation, restaurantName, options = {}) {
  const includePrevious = Boolean(options.previousDetails);
  const includeUpdated = Boolean(options.updatedDetails);
  const formattedDate = formatReservationDate(reservation.date);

  const rows = [
    ['Name', reservation.name],
    ['Email', reservation.email || 'N/A'],
    ['Date', formattedDate || reservation.date || 'N/A'],
    ['Time', reservation.time ? reservation.time.replace(/:00$/, '') : 'N/A'],
    ['Phone', reservation.phone ? reservation.phone.replace(/^1/, '') : 'N/A'],
    ['Guests', reservation.persons],
    ['Restaurant', restaurantName],
  ]
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;color:#111827;font-size:14px;font-weight:600;width:170px;">${escapeHtml(label)}</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;color:#111827;font-size:14px;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  return `
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin:18px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${rows}</table>
      ${reservation.special_requests ? `<p style="margin:0 0 10px 0;color:#111827;font-size:14px;"><strong>Special Requests:</strong> ${escapeHtml(reservation.special_requests)}</p>` : ''}
      ${includePrevious ? `<p style="margin:0 0 10px 0;color:#111827;font-size:14px;"><strong>Previous Details:</strong> ${escapeHtml(options.previousDetails)}</p>` : ''}
      ${includeUpdated ? `<p style="margin:0;color:#111827;font-size:14px;"><strong>Updated Details:</strong> ${escapeHtml(options.updatedDetails)}</p>` : ''}
    </div>
  `;
}

function brandFooterHtml() {
  return `
    <div style="margin-top:26px;padding-top:18px;border-top:1px solid #e5e7eb;color:#4b5563;">
      <p style="margin:0 0 10px 0;font-size:13px;line-height:1.5;">Warm regards,<br><strong>RangDe Reservations Team</strong></p>
      <img src="${escapeHtml(EMAIL_LOGO_URL)}" alt="RangDe Indian Cuisine" style="display:block;width:140px;max-width:100%;height:auto;margin:4px 0 10px 0;" />
      <p style="margin:0;font-size:12px;line-height:1.6;">
        Website: <a href="${escapeHtml(WEBSITE_BASE_URL)}" style="color:#b45309;text-decoration:none;">${escapeHtml(WEBSITE_BASE_URL)}</a><br>
        Manage Reservation: <a href="${escapeHtml(MANAGE_RESERVATIONS_URL)}" style="color:#b45309;text-decoration:none;">${escapeHtml(MANAGE_RESERVATIONS_URL)}</a>
      </p>
    </div>
  `;
}

function buildReservationCustomerEmailHtml({ title, intro, reservation, restaurantName, previousDetails, updatedDetails }) {
  return `
    <div style="background:#f3f4f6;padding:26px 14px;font-family:Verdana, Geneva, Tahoma, sans-serif;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#111827 0%,#1f2937 100%);padding:22px 24px;text-align:left;">
          <img src="${escapeHtml(EMAIL_LOGO_URL)}" alt="RangDe Indian Cuisine" style="display:block;width:170px;max-width:100%;height:auto;" />
          <h1 style="margin:14px 0 0 0;color:#f3f4f6;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 12px 0;color:#111827;font-size:15px;line-height:1.6;">${escapeHtml(intro)}</p>
          <p style="margin:0 0 4px 0;color:#111827;font-size:15px;line-height:1.6;">Thank you for choosing RangDe Indian Cuisine.</p>
          ${reservationInfoBlockHtml(reservation, restaurantName, { previousDetails, updatedDetails })}
          <div style="margin:20px 0 6px 0;">
            <a href="${escapeHtml(MANAGE_RESERVATIONS_URL)}" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 18px;border-radius:8px;font-size:14px;">Manage Reservation</a>
          </div>
          <p style="margin:8px 0 0 0;color:#4b5563;font-size:13px;line-height:1.5;">
            Need to change, update, or edit your reservation? Use this page:
            <a href="${escapeHtml(MANAGE_RESERVATIONS_URL)}" style="color:#b45309;text-decoration:none;">${escapeHtml(MANAGE_RESERVATIONS_URL)}</a>
          </p>
          ${brandFooterHtml()}
        </div>
      </div>
    </div>
  `;
}

function buildReservationAdminEmailHtml({ title, reservation, restaurantName, details }) {
  const detailLines = details
    .map((line) => `<li style="margin:0 0 6px 0;">${escapeHtml(line)}</li>`)
    .join('');

  return `
    <div style="background:#f3f4f6;padding:20px 12px;font-family:Verdana, Geneva, Tahoma, sans-serif;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
        ${reservationInfoBlockHtml(reservation, restaurantName)}
        ${details.length > 0 ? `
        <p style="margin:0 0 8px 0;color:#111827;font-size:14px;"><strong>Quick Summary:</strong></p>
        <ul style="margin:0;padding-left:20px;color:#111827;font-size:14px;line-height:1.5;">
          ${detailLines}
        </ul>
        ` : ''}
        ${brandFooterHtml()}
      </div>
    </div>
  `;
}

function splitRecipientEmails(value) {
  return String(value || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeRecipientSetting(value) {
  return splitRecipientEmails(value).join(', ');
}

function emitAdminEvent(eventName, payload = {}, restaurantId = null) {
  const eventPayload = {
    event: eventName,
    restaurant_id: restaurantId || null,
    ...payload,
    emitted_at: new Date().toISOString(),
  };
  io.to('admin:all').emit(eventName, eventPayload);
  if (restaurantId) io.to('admin:' + restaurantId).emit(eventName, eventPayload);
}

function deriveServicePeriodFromTime(timeValue) {
  const normalized = String(timeValue || '').trim();
  const hour = parseInt(normalized.slice(0, 2), 10);
  if (!Number.isFinite(hour)) return 'dinner';
  return hour < 16 ? 'lunch' : 'dinner';
}

function dateRangeInclusive(startDate, endDate) {
  const from = new Date(`${startDate}T00:00:00`);
  const to = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return [];
  const out = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

async function createAdminNotification(notificationInput = {}) {
  const payload = {
    type: String(notificationInput.type || 'system'),
    title: String(notificationInput.title || 'Notification'),
    message: notificationInput.message ? String(notificationInput.message) : null,
    entity_type: notificationInput.entity_type ? String(notificationInput.entity_type) : null,
    entity_id: notificationInput.entity_id ? Number(notificationInput.entity_id) : null,
    restaurant_id: notificationInput.restaurant_id ? Number(notificationInput.restaurant_id) : null,
    payload_json: notificationInput.payload_json || null,
    is_read: 0,
    created_at: new Date().toISOString(),
  };

  if (db) {
    try {
      const [result] = await db.query(
        `INSERT INTO admin_notifications
          (type, title, message, entity_type, entity_id, restaurant_id, payload_json, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          payload.type,
          payload.title,
          payload.message,
          payload.entity_type,
          payload.entity_id,
          payload.restaurant_id,
          payload.payload_json ? JSON.stringify(payload.payload_json) : null,
        ]
      );
      payload.id = result.insertId;
    } catch (err) {
      console.error('Failed to persist admin notification:', err.message);
      return null;
    }
  } else {
    payload.id = nextAdminNotificationId++;
    mockAdminNotifications.unshift(payload);
  }

  emitAdminEvent('admin.notification.created', { notification: payload }, payload.restaurant_id || null);
  return payload;
}

function reservationServicePeriodFromTime(timeValue) {
  const hour = parseInt(String(timeValue || '00:00').slice(0, 2), 10);
  if (!Number.isFinite(hour)) return 'dinner';
  return hour < 16 ? 'lunch' : 'dinner';
}

async function isReservationBlocked({ restaurantId, date, time }) {
  const period = reservationServicePeriodFromTime(time);
  if (!restaurantId || !date) return false;

  if (db) {
    try {
      const [rows] = await db.query(
        `SELECT id FROM reservation_blockouts
         WHERE restaurant_id = ?
           AND block_date = ?
           AND is_active = 1
           AND (service_period = 'all_day' OR service_period = ?)
         LIMIT 1`,
        [Number(restaurantId), String(date), period]
      );
      return rows.length > 0;
    } catch (err) {
      console.error('Blockout check failed:', err.message);
      return false;
    }
  }

  return mockReservationBlockouts.some((row) => (
    Number(row.restaurant_id) === Number(restaurantId)
    && String(row.block_date) === String(date)
    && Number(row.is_active) === 1
    && (row.service_period === 'all_day' || row.service_period === period)
  ));
}

async function createAdminNotification(notificationInput = {}) {
  const payload = {
    type: String(notificationInput.type || 'system'),
    title: String(notificationInput.title || 'Notification'),
    message: notificationInput.message ? String(notificationInput.message) : null,
    entity_type: notificationInput.entity_type ? String(notificationInput.entity_type) : null,
    entity_id: notificationInput.entity_id ? Number(notificationInput.entity_id) : null,
    restaurant_id: notificationInput.restaurant_id ? Number(notificationInput.restaurant_id) : null,
    payload_json: notificationInput.payload_json || null,
    is_read: 0,
    created_at: new Date().toISOString(),
  };

  if (db) {
    try {
      const [result] = await db.query(
        `INSERT INTO admin_notifications
          (type, title, message, entity_type, entity_id, restaurant_id, payload_json, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          payload.type,
          payload.title,
          payload.message,
          payload.entity_type,
          payload.entity_id,
          payload.restaurant_id,
          payload.payload_json ? JSON.stringify(payload.payload_json) : null,
        ]
      );
      payload.id = result.insertId;
    } catch (err) {
      console.error('Failed to persist admin notification:', err.message);
      return null;
    }
  } else {
    payload.id = nextAdminNotificationId++;
    mockAdminNotifications.unshift(payload);
  }

  emitAdminEvent('admin.notification.created', { notification: payload }, payload.restaurant_id || null);
  return payload;
}

async function getEmailNotificationSettings() {
  if (db) {
    try {
      const [rows] = await db.query(
        'SELECT reservations_email, contact_email, catering_email, hiring_email FROM email_notification_settings WHERE id = 1 LIMIT 1'
      );
      if (rows.length) {
        return {
          reservations_email: normalizeRecipientSetting(rows[0].reservations_email),
          contact_email: normalizeRecipientSetting(rows[0].contact_email),
          catering_email: normalizeRecipientSetting(rows[0].catering_email),
          hiring_email: normalizeRecipientSetting(rows[0].hiring_email),
        };
      }
    } catch (err) {
      console.error('Unable to read email notification settings:', err.message);
    }
  }

  return {
    reservations_email: normalizeRecipientSetting(mockEmailNotificationSettings.reservations_email),
    contact_email: normalizeRecipientSetting(mockEmailNotificationSettings.contact_email),
    catering_email: normalizeRecipientSetting(mockEmailNotificationSettings.catering_email),
    hiring_email: normalizeRecipientSetting(mockEmailNotificationSettings.hiring_email),
  };
}

async function saveEmailNotificationSettings(input) {
  const nextSettings = {
    reservations_email: normalizeRecipientSetting(input?.reservations_email),
    contact_email: normalizeRecipientSetting(input?.contact_email),
    catering_email: normalizeRecipientSetting(input?.catering_email),
    hiring_email: normalizeRecipientSetting(input?.hiring_email),
  };

  if (db) {
    await db.query(
      `INSERT INTO email_notification_settings (id, reservations_email, contact_email, catering_email, hiring_email)
       VALUES (1, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         reservations_email = VALUES(reservations_email),
         contact_email = VALUES(contact_email),
         catering_email = VALUES(catering_email),
         hiring_email = VALUES(hiring_email)`,
      [nextSettings.reservations_email || null, nextSettings.contact_email || null, nextSettings.catering_email || null, nextSettings.hiring_email || null]
    );
  } else {
    mockEmailNotificationSettings = { ...nextSettings };
  }

  return nextSettings;
}

async function sendReservationEmails(reservation, restaurant) {
  const settings = await getEmailNotificationSettings();
  const adminRecipients = splitRecipientEmails(settings.reservations_email);

  if (!reservationTransporter) {
    console.log('Reservation email skipped (reservation mailbox not configured). Reservation:', reservation.confirmation_code);
    return;
  }

  const restaurantName = restaurant?.name || 'RangDe Indian Cuisine';
  const formattedDate = formatReservationDate(reservation.date) || reservation.date;
  const adminReservationLabel = `New Reservation - RangDe Indian Cuisine - ${restaurantName.replace(/^RangDe\s+/, '')}`;

  try {
    // Customer confirmation
    await reservationTransporter.sendMail({
      from: `"RangDe Reservations" <${reservationEmailUser}>`,
      to: reservation.email,
      replyTo: reservationEmailUser,
      subject: `Reservation Confirmed - ${reservation.confirmation_code}`,
      html: buildReservationCustomerEmailHtml({
        title: 'Reservation Confirmation',
        intro: 'Your reservation has been confirmed and we look forward to hosting you.',
        reservation,
        restaurantName,
      }),
      text: `Thank you for choosing RangDe Indian Cuisine.

Reservation confirmed.
Code: ${reservation.confirmation_code}
Name: ${reservation.name}
    Email: ${reservation.email || 'N/A'}
Restaurant: ${restaurantName}
    Date: ${formattedDate}
Time: ${reservation.time}
    Phone: ${reservation.phone || 'N/A'}
Guests: ${reservation.persons}
${reservation.special_requests ? `Special Requests: ${reservation.special_requests}\n` : ''}
If you need to change, update, or edit your reservation, visit: ${MANAGE_RESERVATIONS_URL}`,
    });

    if (adminRecipients.length) {
      await reservationTransporter.sendMail({
        from: `"RangDe Reservations" <${reservationEmailUser}>`,
        to: adminRecipients.join(', '),
        replyTo: reservation.email || reservationEmailUser,
        subject: adminReservationLabel,
        html: buildReservationAdminEmailHtml({
          title: adminReservationLabel,
          reservation,
          restaurantName,
          details: [],
        }),
        text: `New reservation:\nConfirmation Code: ${reservation.confirmation_code}\nName: ${reservation.name}\nEmail: ${reservation.email || 'N/A'}\nDate: ${formattedDate}\nTime: ${reservation.time}\nPhone: ${reservation.phone || 'N/A'}\nBranch: ${restaurantName}\nGuests: ${reservation.persons}`,
      });
    } else {
      console.log('Admin reservation notification skipped (no admin recipient configured). Reservation:', reservation.confirmation_code);
    }
  } catch (err) {
    console.error('Reservation email error:', err.message);
  }
}

async function sendReservationUpdateEmails(previousReservation, updatedReservation, restaurant) {
  const settings = await getEmailNotificationSettings();
  const adminRecipients = splitRecipientEmails(settings.reservations_email);

  if (!reservationTransporter) {
    console.log('Reservation update email skipped (reservation mailbox not configured). Reservation:', updatedReservation.confirmation_code);
    return;
  }

  const oldDetails = `Date: ${formatReservationDate(previousReservation.date) || previousReservation.date}, Time: ${previousReservation.time}, Guests: ${previousReservation.persons}`;
  const newDetails = `Date: ${formatReservationDate(updatedReservation.date) || updatedReservation.date}, Time: ${updatedReservation.time}, Guests: ${updatedReservation.persons}`;
  const restaurantName = restaurant?.name || 'RangDe Indian Cuisine';

  try {
    await reservationTransporter.sendMail({
      from: `"RangDe Reservations" <${reservationEmailUser}>`,
      to: updatedReservation.email,
      replyTo: reservationEmailUser,
      subject: `Reservation Updated - ${updatedReservation.confirmation_code}`,
      html: buildReservationCustomerEmailHtml({
        title: 'Reservation Updated',
        intro: 'Your reservation details were updated successfully.',
        reservation: updatedReservation,
        restaurantName,
        previousDetails: oldDetails,
        updatedDetails: newDetails,
      }),
      text: `Your reservation has been updated.

Code: ${updatedReservation.confirmation_code}
Name: ${updatedReservation.name}
Restaurant: ${restaurantName}
Updated Details: ${newDetails}
Previous Details: ${oldDetails}
${updatedReservation.special_requests ? `Special Requests: ${updatedReservation.special_requests}\n` : ''}
Need to change, update, or edit again? Visit: ${MANAGE_RESERVATIONS_URL}`,
    });

    if (adminRecipients.length) {
      await reservationTransporter.sendMail({
        from: `"RangDe Reservations" <${reservationEmailUser}>`,
        to: adminRecipients.join(', '),
        replyTo: updatedReservation.email || reservationEmailUser,
        subject: `Reservation Updated - ${updatedReservation.confirmation_code}`,
        html: buildReservationAdminEmailHtml({
          title: `Reservation Updated - ${updatedReservation.confirmation_code}`,
          reservation: updatedReservation,
          restaurantName,
          details: [
            `Guest Email: ${updatedReservation.email || 'N/A'}`,
            `Guest Phone: ${updatedReservation.phone || 'N/A'}`,
            `Previous: ${oldDetails}`,
            `Updated: ${newDetails}`,
          ],
        }),
        text: `Reservation updated:\nCode: ${updatedReservation.confirmation_code}\nName: ${updatedReservation.name}\nEmail: ${updatedReservation.email}\nPhone: ${updatedReservation.phone}\nBranch: ${restaurant?.name || 'RangDe Indian Cuisine'}\nPrevious: ${oldDetails}\nUpdated: ${newDetails}`,
      });
    } else {
      console.log('Admin reservation update notification skipped (no admin recipient configured). Reservation:', updatedReservation.confirmation_code);
    }
  } catch (err) {
    console.error('Reservation update email error:', err.message);
  }
}

async function sendCateringNotification(requestPayload) {
  const settings = await getEmailNotificationSettings();
  const recipients = splitRecipientEmails(settings.catering_email);
  if (!recipients.length || !contactTransporter) return;

  try {
    await contactTransporter.sendMail({
      from: `"RangDe Contact" <${contactEmailUser}>`,
      to: recipients.join(', '),
      subject: 'New Catering Request',
      text: `New catering request:\nName: ${requestPayload.name}\nEmail: ${requestPayload.email}\nPhone: ${requestPayload.phone}\nEvent Date: ${requestPayload.event_date || 'N/A'}\nGuests: ${requestPayload.guests || 'N/A'}\nLocation: ${requestPayload.event_location || 'N/A'}\nType: ${requestPayload.event_type || 'N/A'}\nNotes: ${requestPayload.notes || 'N/A'}`,
    });
  } catch (err) {
    console.error('Catering notification email error:', err.message);
  }
}

async function sendHiringApplicationNotification(application) {
  const settings = await getEmailNotificationSettings();
  const hiringRecipients = splitRecipientEmails(settings.hiring_email);

  if (!contactTransporter) {
    console.log('Hiring application email skipped (contact mailbox not configured).');
    return;
  }

  if (!hiringRecipients.length) {
    console.log('Hiring application email skipped (no hiring recipient configured).');
    return;
  }

  const submittedAt = application?.created_at ? new Date(application.created_at).toLocaleString('en-US') : new Date().toLocaleString('en-US');
  const resumeValue = application?.resume_file || 'Not uploaded';

  try {
    await contactTransporter.sendMail({
      from: `"Hiring Notifications" <${contactEmailUser}>`,
      to: hiringRecipients.join(', '),
      replyTo: application?.email || contactEmailUser,
      subject: 'New Join Our Team Application',
      html: `
        <div style="font-family:Verdana, Geneva, Tahoma, sans-serif;background:#f3f4f6;padding:20px;">
          <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
            <h2 style="margin:0 0 14px 0;color:#111827;">New Join Our Team Application</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">Full Name</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(application?.full_name || '')}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">Phone Number</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(application?.phone_number || '')}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">Email</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(application?.email || '')}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">Resume</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(resumeValue)}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">Submitted</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(submittedAt)}</td></tr>
            </table>
          </div>
        </div>
      `,
      text: `New Join Our Team Application\n\nFull Name: ${application?.full_name || ''}\nPhone Number: ${application?.phone_number || ''}\nEmail: ${application?.email || ''}\nResume: ${resumeValue}\nSubmitted: ${submittedAt}`,
    });
  } catch (err) {
    console.error('Hiring application notification email error:', err.message);
  }
}

async function sendContactNotification(inquiry) {
  const settings = await getEmailNotificationSettings();
  const recipients = splitRecipientEmails(settings.contact_email);
  if (!recipients.length || !contactTransporter) return;

  try {
    await contactTransporter.sendMail({
      from: `"RangDe Contact" <${contactEmailUser}>`,
      to: recipients.join(', '),
      subject: 'New Contact Form Submission',
      text: `New contact inquiry:\nName: ${inquiry.name}\nEmail: ${inquiry.email}\nPhone: ${inquiry.phone || 'N/A'}\nSubject: ${inquiry.subject || 'N/A'}\nMessage: ${inquiry.message}`,
    });
  } catch (err) {
    console.error('Contact notification email error:', err.message);
  }
}

// =====================================================
// Auth Middleware
// =====================================================
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function getMenuItemKey(item) {
  if (!item) return null;
  const key = item.source_id ?? item.id;
  if (key === undefined || key === null) return null;
  return String(key);
}

function normalizeFeaturedDishKeys(input) {
  if (!Array.isArray(input)) return [];
  const trimmed = input
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return [...new Set(trimmed)].slice(0, 6);
}

function clampRating(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(5, Math.round(parsed)));
}

function isTableMissingError(err) {
  return err && err.code === 'ER_NO_SUCH_TABLE';
}

async function ensureHomepageContentTables() {
  if (!db) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS homepage_featured_dishes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      menu_item_key VARCHAR(120) NOT NULL,
      sort_order INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_menu_item_key (menu_item_key)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      text TEXT NOT NULL,
      rating TINYINT NOT NULL DEFAULT 5,
      branch VARCHAR(255) DEFAULT NULL,
      sort_order INT NOT NULL DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function getAllMenuItems() {
  if (db) {
    try {
      const [rows] = await db.query(
        `SELECT mi.*, mc.name as category_name
         FROM menu_items mi
         JOIN menu_categories mc ON mi.category_id = mc.id
         WHERE mi.is_active = 1
         ORDER BY mc.sort_order, mi.name`
      );
      return rows;
    } catch (err) {
      // In some deployments local menu tables may not exist yet.
      if (!isTableMissingError(err)) throw err;

      try {
        const tempMenu = await fetchTempMenuData();
        return tempMenu.items;
      } catch (tempErr) {
        if (!isTableMissingError(tempErr)) throw tempErr;
      }
    }
  }

  return [];
}

async function getFeaturedDishesResolved() {
  const menuItems = await getAllMenuItems();

  if (db) {
    await ensureHomepageContentTables();
    const [rows] = await db.query('SELECT menu_item_key, sort_order FROM homepage_featured_dishes ORDER BY sort_order ASC, id ASC');
    const selectedKeys = rows.map((row) => String(row.menu_item_key));
    const keyToItem = new Map(menuItems.map((item) => [getMenuItemKey(item), item]));
    const selectedItems = selectedKeys.map((key) => keyToItem.get(key)).filter(Boolean);

    if (selectedItems.length) {
      return selectedItems.slice(0, 6);
    }
  }

  if (mockFeaturedDishKeys.length) {
    const keyToItem = new Map(menuItems.map((item) => [getMenuItemKey(item), item]));
    return mockFeaturedDishKeys
      .map((key) => keyToItem.get(String(key)))
      .filter(Boolean)
      .slice(0, 6);
  }

  return menuItems.filter((item) => Boolean(item.is_featured)).slice(0, 6);
}

function sanitizeTestimonialPayload(body = {}) {
  return {
    name: String(body.name || '').trim(),
    text: String(body.text || '').trim(),
    branch: String(body.branch || '').trim() || null,
    rating: clampRating(body.rating),
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 1,
    is_active: typeof body.is_active === 'boolean' ? body.is_active : true,
  };
}

// =====================================================
// API Routes
// =====================================================

// --- Auth ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!db) {
    return res.status(503).json({ error: 'Database not connected. Login requires MySQL.' });
  }

  try {
    const [admins] = await db.query('SELECT * FROM admins WHERE email = ? AND is_active = 1 LIMIT 1', [email]);
    if (!admins.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = admins[0];
    const passwordMatches = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await db.query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role, name: admin.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Unable to authenticate at the moment' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ admin: req.admin });
});

// --- Restaurants ---
app.get('/api/restaurants', async (req, res) => {
  if (db) {
    try {
      const [rows] = await db.query('SELECT * FROM restaurants WHERE is_active = 1 ORDER BY id');
      return res.json(rows);
    } catch (err) { console.error(err); }
  }
  res.json(mockRestaurants);
});

app.get('/api/restaurants/:slug', async (req, res) => {
  if (db) {
    try {
      const [rows] = await db.query('SELECT * FROM restaurants WHERE slug = ?', [req.params.slug]);
      if (rows.length) return res.json(rows[0]);
    } catch (err) { console.error(err); }
  }
  const r = mockRestaurants.find(r => r.slug === req.params.slug);
  r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});

// --- Menu ---
app.get('/api/categories', async (req, res) => {
  if (db) {
    try {
      const [rows] = await db.query('SELECT * FROM menu_categories WHERE is_active = 1 ORDER BY sort_order');
      return res.json(rows);
    } catch (err) {
      if (!isTableMissingError(err)) {
        console.error(err);
      } else {
        try {
          const tempMenu = await fetchTempMenuData();
          return res.json(tempMenu.categories);
        } catch (tempErr) {
          if (!isTableMissingError(tempErr)) {
            console.error(tempErr);
          }
        }
      }
    }
  }

  return res.status(503).json({ error: 'Menu categories are unavailable because MySQL is not connected.' });
});

app.get('/api/menu', async (req, res) => {
  const { category, branch, featured } = req.query;
  if (featured === 'true') {
    try {
      let featuredItems = await getFeaturedDishesResolved();
      if (category) {
        featuredItems = featuredItems.filter((item) => String(item.category_id) === String(category));
      }
      return res.json(featuredItems);
    } catch (err) {
      console.error('Featured dishes fetch failed:', err.message);
      return res.status(502).json({ error: 'Failed to fetch featured dishes' });
    }
  }

  if (db) {
    try {
      let query = 'SELECT mi.*, mc.name as category_name FROM menu_items mi JOIN menu_categories mc ON mi.category_id = mc.id WHERE mi.is_active = 1';
      const params = [];
      if (category) { query += ' AND mi.category_id = ?'; params.push(category); }
      query += ' ORDER BY mc.sort_order, mi.name';
      const [rows] = await db.query(query, params);
      return res.json(rows);
    } catch (err) {
      if (!isTableMissingError(err)) {
        console.error(err);
      } else {
        try {
          const tempMenu = await fetchTempMenuData();
          let items = [...tempMenu.items];
          if (category) {
            items = items.filter((item) => String(item.category_id) === String(category));
          }
          return res.json(items);
        } catch (tempErr) {
          if (!isTableMissingError(tempErr)) console.error(tempErr);
        }
      }
    }
  }

  return res.status(503).json({ error: 'Menu data is unavailable because MySQL is not connected.' });
});

app.get('/api/menu/:id', async (req, res) => {
  if (db) {
    try {
      const [rows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
      if (rows.length) return res.json(rows[0]);
    } catch (err) {
      if (!isTableMissingError(err)) {
        console.error(err);
      } else {
        try {
          const tempMenu = await fetchTempMenuData();
          const item = tempMenu.items.find((menuItem) => String(menuItem.id) === String(req.params.id));
          if (item) return res.json(item);
        } catch (tempErr) {
          if (!isTableMissingError(tempErr)) console.error(tempErr);
        }
      }
    }
  }

  return res.status(503).json({ error: 'Menu data is unavailable because MySQL is not connected.' });
});

app.post('/api/menu', authMiddleware, async (req, res) => {
  const { name, description, price, category_id, is_vegetarian, spice_level, is_featured } = req.body;
  if (db) {
    try {
      const [result] = await db.query(
        'INSERT INTO menu_items (name, description, price, category_id, is_vegetarian, spice_level, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, description, price, category_id, is_vegetarian || false, spice_level || 'medium', is_featured || false]
      );
      const [rows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [result.insertId]);
      return res.json(rows[0]);
    } catch (err) {
      if (!isTableMissingError(err)) {
        console.error(err);
      } else {
        try {
          const created = await createTempMenuItem(req.body || {});
          return res.json(created);
        } catch (tempErr) {
          if (tempErr.statusCode) {
            return res.status(tempErr.statusCode).json({ error: tempErr.message });
          }
          console.error(tempErr);
          return res.status(500).json({ error: 'Failed to create menu item' });
        }
      }
    }
  }
  return res.status(503).json({ error: 'Menu is unavailable because MySQL is not connected.' });
});

app.put('/api/menu/:id', authMiddleware, async (req, res) => {
  const { name, description, price, category_id, is_vegetarian, spice_level, is_featured } = req.body;
  if (db) {
    try {
      await db.query(
        'UPDATE menu_items SET name=?, description=?, price=?, category_id=?, is_vegetarian=?, spice_level=?, is_featured=? WHERE id=?',
        [name, description, price, category_id, is_vegetarian, spice_level, is_featured, req.params.id]
      );
      const [rows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
      return res.json(rows[0]);
    } catch (err) {
      if (!isTableMissingError(err)) {
        console.error(err);
      } else {
        try {
          const updated = await updateTempMenuItem(req.params.id, req.body || {});
          return res.json(updated);
        } catch (tempErr) {
          if (tempErr.statusCode) {
            return res.status(tempErr.statusCode).json({ error: tempErr.message });
          }
          console.error(tempErr);
          return res.status(500).json({ error: 'Failed to update menu item' });
        }
      }
    }
  }
  return res.status(503).json({ error: 'Menu is unavailable because MySQL is not connected.' });
});

app.delete('/api/menu/:id', authMiddleware, async (req, res) => {
  if (db) {
    try {
      await db.query('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
      return res.json({ success: true });
    } catch (err) {
      if (!isTableMissingError(err)) {
        console.error(err);
      } else {
        try {
          const removed = await deleteTempMenuItem(req.params.id);
          if (!removed) return res.status(404).json({ error: 'Not found' });
          return res.json({ success: true });
        } catch (tempErr) {
          console.error(tempErr);
          return res.status(500).json({ error: 'Failed to delete menu item' });
        }
      }
    }
  }
  return res.status(503).json({ error: 'Menu is unavailable because MySQL is not connected.' });
});

// --- Homepage Content ---
app.get('/api/featured-dishes', async (req, res) => {
  try {
    const items = await getFeaturedDishesResolved();
    return res.json(items.slice(0, 6));
  } catch (err) {
    console.error('Featured dishes endpoint error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch featured dishes' });
  }
});

app.put('/api/admin/featured-dishes', authMiddleware, async (req, res) => {
  const keys = normalizeFeaturedDishKeys(req.body?.itemKeys);
  if (keys.length > 6) {
    return res.status(400).json({ error: 'You can feature a maximum of 6 dishes' });
  }

  try {
    const menuItems = await getAllMenuItems();
    const validKeys = new Set(menuItems.map((item) => getMenuItemKey(item)).filter(Boolean));
    const invalidKeys = keys.filter((key) => !validKeys.has(key));
    if (invalidKeys.length) {
      return res.status(400).json({ error: 'Some selected dishes are invalid or no longer available' });
    }

    if (db) {
      await ensureHomepageContentTables();
      await db.query('DELETE FROM homepage_featured_dishes');
      for (let i = 0; i < keys.length; i += 1) {
        await db.query('INSERT INTO homepage_featured_dishes (menu_item_key, sort_order) VALUES (?, ?)', [keys[i], i + 1]);
      }
    } else {
      mockFeaturedDishKeys = [...keys];
    }

    const selected = await getFeaturedDishesResolved();
    return res.json({ success: true, items: selected.slice(0, 6) });
  } catch (err) {
    console.error('Save featured dishes failed:', err.message);
    return res.status(500).json({ error: 'Failed to save featured dishes' });
  }
});

app.get('/api/testimonials', async (req, res) => {
  if (db) {
    try {
      await ensureHomepageContentTables();
      const [rows] = await db.query(
        'SELECT * FROM testimonials WHERE is_active = 1 ORDER BY sort_order ASC, id DESC'
      );
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
  }

  return res.json(
    mockTestimonials
      .filter((item) => item.is_active)
      .sort((a, b) => (a.sort_order - b.sort_order) || (b.id - a.id))
  );
});

app.get('/api/admin/testimonials', authMiddleware, async (req, res) => {
  if (db) {
    try {
      await ensureHomepageContentTables();
      const [rows] = await db.query('SELECT * FROM testimonials ORDER BY sort_order ASC, id DESC');
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
  }

  return res.json([...mockTestimonials].sort((a, b) => (a.sort_order - b.sort_order) || (b.id - a.id)));
});

app.post('/api/admin/testimonials', authMiddleware, async (req, res) => {
  const payload = sanitizeTestimonialPayload(req.body);
  if (!payload.name || !payload.text) {
    return res.status(400).json({ error: 'Name and testimonial text are required' });
  }

  if (db) {
    try {
      await ensureHomepageContentTables();
      const [result] = await db.query(
        'INSERT INTO testimonials (name, text, rating, branch, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [payload.name, payload.text, payload.rating, payload.branch, payload.sort_order, payload.is_active]
      );
      const [rows] = await db.query('SELECT * FROM testimonials WHERE id = ?', [result.insertId]);
      return res.json(rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create testimonial' });
    }
  }

  const newTestimonial = {
    id: nextTestimonialId++,
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockTestimonials.unshift(newTestimonial);
  return res.json(newTestimonial);
});

app.put('/api/admin/testimonials/:id', authMiddleware, async (req, res) => {
  const payload = sanitizeTestimonialPayload(req.body);
  if (!payload.name || !payload.text) {
    return res.status(400).json({ error: 'Name and testimonial text are required' });
  }

  if (db) {
    try {
      await ensureHomepageContentTables();
      await db.query(
        `UPDATE testimonials
         SET name = ?,
             text = ?,
             rating = ?,
             branch = ?,
             sort_order = ?,
             is_active = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [payload.name, payload.text, payload.rating, payload.branch, payload.sort_order, payload.is_active, req.params.id]
      );
      const [rows] = await db.query('SELECT * FROM testimonials WHERE id = ?', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      return res.json(rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update testimonial' });
    }
  }

  const idx = mockTestimonials.findIndex((item) => item.id === parseInt(req.params.id, 10));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  mockTestimonials[idx] = { ...mockTestimonials[idx], ...payload, updated_at: new Date().toISOString() };
  return res.json(mockTestimonials[idx]);
});

app.delete('/api/admin/testimonials/:id', authMiddleware, async (req, res) => {
  if (db) {
    try {
      await ensureHomepageContentTables();
      await db.query('DELETE FROM testimonials WHERE id = ?', [req.params.id]);
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete testimonial' });
    }
  }

  const idx = mockTestimonials.findIndex((item) => item.id === parseInt(req.params.id, 10));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  mockTestimonials.splice(idx, 1);
  return res.json({ success: true });
});

// --- Admin Email Notification Settings ---
app.get('/api/admin/notification-emails', authMiddleware, async (req, res) => {
  try {
    const settings = await getEmailNotificationSettings();
    return res.json(settings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load notification email settings' });
  }
});

app.put('/api/admin/notification-emails', authMiddleware, async (req, res) => {
  const { reservations_email, contact_email, catering_email, hiring_email } = req.body || {};

  try {
    const settings = await saveEmailNotificationSettings({
      reservations_email,
      contact_email,
      catering_email,
      hiring_email,
    });
    return res.json(settings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update notification email settings' });
  }
});

// --- Reservation Settings (Tuesday toggle) ---
app.get('/api/reservation-settings', async (req, res) => {
  if (db) {
    try {
      const [rows] = await db.query('SELECT * FROM reservation_settings WHERE id = 1');
      if (rows.length) return res.json(rows[0]);
    } catch (err) {
      console.error('Failed to fetch reservation settings:', err.message);
    }
  }
  return res.json(mockReservationSettings);
});

app.put('/api/admin/reservation-settings', authMiddleware, async (req, res) => {
  const body = req.body || {};
  const tuesdayValue = body.tuesday_disabled === true || body.tuesday_disabled === 'true' || body.tuesday_disabled === 1;
  const pausedValue = body.reservations_paused === true || body.reservations_paused === 'true' || body.reservations_paused === 1;

  if (db) {
    try {
      await db.query(
        `INSERT INTO reservation_settings (id, tuesday_disabled, reservations_paused) VALUES (1, ?, ?)
         ON DUPLICATE KEY UPDATE tuesday_disabled = VALUES(tuesday_disabled), reservations_paused = VALUES(reservations_paused)`,
        [tuesdayValue, pausedValue]
      );
      const [rows] = await db.query('SELECT * FROM reservation_settings WHERE id = 1');
      return res.json(rows[0]);
    } catch (err) {
      console.error('Failed to update reservation settings:', err.message);
      return res.status(500).json({ error: 'Failed to update reservation settings' });
    }
  }

  mockReservationSettings.tuesday_disabled = tuesdayValue;
  mockReservationSettings.reservations_paused = pausedValue;
  return res.json(mockReservationSettings);
});

app.get('/api/reservation-availability', async (req, res) => {
  const restaurantId = Number(req.query.restaurant_id || 0);
  const date = String(req.query.date || '').trim();
  const time = String(req.query.time || '19:00').trim();
  if (!restaurantId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Valid restaurant_id and date are required' });
  }

  let isPaused = false;
  let tuesdayBlocked = true;
  if (db) {
    try {
      const [rows] = await db.query('SELECT tuesday_disabled, reservations_paused FROM reservation_settings WHERE id = 1');
      if (rows.length) {
        isPaused = !!rows[0].reservations_paused;
        tuesdayBlocked = !!rows[0].tuesday_disabled;
      }
    } catch (_) {}
  } else {
    isPaused = !!mockReservationSettings.reservations_paused;
    tuesdayBlocked = !!mockReservationSettings.tuesday_disabled;
  }

  const d = new Date(`${date}T00:00:00`);
  const isTuesdayBlocked = d.getDay() === 2 && tuesdayBlocked;
  const isBlockedByAdmin = await isReservationBlocked({ restaurantId, date, time });
  return res.json({
    available: !(isPaused || isTuesdayBlocked || isBlockedByAdmin),
    reasons: {
      paused: isPaused,
      tuesday_blocked: isTuesdayBlocked,
      blockout: isBlockedByAdmin,
    },
  });
});

// --- Admin Capacity Management ---
app.get('/api/admin/capacity-settings', authMiddleware, async (req, res) => {
  if (db) {
    try {
      const [rows] = await db.query(
        `SELECT id, restaurant_id, service_period, total_seats, avg_duration_minutes, is_active, updated_at
         FROM location_capacity_settings
         ORDER BY restaurant_id ASC, service_period ASC`
      );
      return res.json({ settings: rows });
    } catch (err) {
      console.error('Failed to fetch capacity settings:', err.message);
      return res.status(500).json({ error: 'Failed to fetch capacity settings' });
    }
  }
  return res.json({ settings: mockCapacitySettings });
});

app.put('/api/admin/capacity-settings', authMiddleware, async (req, res) => {
  const items = Array.isArray(req.body?.settings) ? req.body.settings : [];
  if (!items.length) return res.status(400).json({ error: 'settings array is required' });
  try {
    if (db) {
      for (const item of items) {
        const restaurantId = Number(item.restaurant_id || 0);
        const servicePeriod = item.service_period === 'lunch' ? 'lunch' : 'dinner';
        const totalSeats = Math.max(0, parseInt(item.total_seats, 10) || 0);
        const avgDurationMinutes = Math.max(30, Math.min(300, parseInt(item.avg_duration_minutes, 10) || 90));
        const isActive = item.is_active === false ? 0 : 1;
        if (!restaurantId) continue;
        await db.query(
          `INSERT INTO location_capacity_settings (restaurant_id, service_period, total_seats, avg_duration_minutes, is_active)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             total_seats = VALUES(total_seats),
             avg_duration_minutes = VALUES(avg_duration_minutes),
             is_active = VALUES(is_active)`,
          [restaurantId, servicePeriod, totalSeats, avgDurationMinutes, isActive]
        );
      }
      const [rows] = await db.query(
        `SELECT id, restaurant_id, service_period, total_seats, avg_duration_minutes, is_active, updated_at
         FROM location_capacity_settings
         ORDER BY restaurant_id ASC, service_period ASC`
      );
      return res.json({ settings: rows });
    }

    for (const item of items) {
      const restaurantId = Number(item.restaurant_id || 0);
      const servicePeriod = item.service_period === 'lunch' ? 'lunch' : 'dinner';
      const totalSeats = Math.max(0, parseInt(item.total_seats, 10) || 0);
      const avgDurationMinutes = Math.max(30, Math.min(300, parseInt(item.avg_duration_minutes, 10) || 90));
      const isActive = item.is_active === false ? 0 : 1;
      if (!restaurantId) continue;

      const idx = mockCapacitySettings.findIndex((row) => row.restaurant_id === restaurantId && row.service_period === servicePeriod);
      const nextRow = { restaurant_id: restaurantId, service_period: servicePeriod, total_seats: totalSeats, avg_duration_minutes: avgDurationMinutes, is_active: isActive, updated_at: new Date().toISOString() };
      if (idx >= 0) mockCapacitySettings[idx] = { ...mockCapacitySettings[idx], ...nextRow };
      else mockCapacitySettings.push({ id: mockCapacitySettings.length + 1, ...nextRow });
    }
    return res.json({ settings: mockCapacitySettings });
  } catch (err) {
    console.error('Failed to save capacity settings:', err.message);
    return res.status(500).json({ error: 'Failed to save capacity settings' });
  }
});

// --- Admin Blockout Dates ---
app.get('/api/admin/reservation-blockouts', authMiddleware, async (req, res) => {
  const { start, end, restaurant_id } = req.query || {};
  if (db) {
    try {
      let query = `SELECT * FROM reservation_blockouts WHERE is_active = 1`;
      const params = [];
      if (restaurant_id) { query += ` AND restaurant_id = ?`; params.push(Number(restaurant_id)); }
      if (start) { query += ` AND block_date >= ?`; params.push(String(start)); }
      if (end) { query += ` AND block_date <= ?`; params.push(String(end)); }
      query += ` ORDER BY block_date ASC, restaurant_id ASC`;
      const [rows] = await db.query(query, params);
      return res.json({ blockouts: rows });
    } catch (err) {
      console.error('Failed to fetch blockouts:', err.message);
      return res.status(500).json({ error: 'Failed to fetch blockouts' });
    }
  }
  let rows = [...mockReservationBlockouts].filter((item) => item.is_active === 1);
  if (restaurant_id) rows = rows.filter((item) => item.restaurant_id === Number(restaurant_id));
  if (start) rows = rows.filter((item) => String(item.block_date) >= String(start));
  if (end) rows = rows.filter((item) => String(item.block_date) <= String(end));
  return res.json({ blockouts: rows });
});

app.post('/api/admin/reservation-blockouts', authMiddleware, async (req, res) => {
  const { restaurant_id, start_date, end_date, service_period, reason } = req.body || {};
  const restaurantId = Number(restaurant_id || 0);
  const fromDate = String(start_date || '').trim();
  const toDate = String(end_date || start_date || '').trim();
  const period = ['all_day', 'lunch', 'dinner'].includes(service_period) ? service_period : 'all_day';
  const note = String(reason || '').trim().slice(0, 255) || null;
  if (!restaurantId || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    return res.status(400).json({ error: 'Valid restaurant_id, start_date, and end_date are required' });
  }
  const dates = dateRangeInclusive(fromDate, toDate);
  if (!dates.length) return res.status(400).json({ error: 'Invalid date range' });
  try {
    if (db) {
      for (const blockDate of dates) {
        await db.query(
          `INSERT INTO reservation_blockouts (restaurant_id, block_date, service_period, reason, is_active, created_by)
           VALUES (?, ?, ?, ?, 1, ?)
           ON DUPLICATE KEY UPDATE reason = VALUES(reason), is_active = 1, updated_at = CURRENT_TIMESTAMP`,
          [restaurantId, blockDate, period, note, req.admin?.id || null]
        );
      }
      const [rows] = await db.query(
        `SELECT * FROM reservation_blockouts
         WHERE restaurant_id = ? AND block_date BETWEEN ? AND ? AND service_period = ?
         ORDER BY block_date ASC`,
        [restaurantId, fromDate, toDate, period]
      );
      emitAdminEvent('blockout.updated', { restaurant_id: restaurantId, dates, service_period: period }, restaurantId);
      return res.json({ success: true, blockouts: rows });
    }
    const saved = [];
    for (const blockDate of dates) {
      const idx = mockReservationBlockouts.findIndex(
        (row) => row.restaurant_id === restaurantId && row.block_date === blockDate && row.service_period === period
      );
      const nextRow = {
        id: idx >= 0 ? mockReservationBlockouts[idx].id : nextBlockoutId++,
        restaurant_id: restaurantId,
        block_date: blockDate,
        service_period: period,
        reason: note,
        is_active: 1,
        created_by: req.admin?.id || null,
        updated_at: new Date().toISOString(),
      };
      if (idx >= 0) mockReservationBlockouts[idx] = { ...mockReservationBlockouts[idx], ...nextRow };
      else mockReservationBlockouts.push({ ...nextRow, created_at: new Date().toISOString() });
      saved.push(nextRow);
    }
    emitAdminEvent('blockout.updated', { restaurant_id: restaurantId, dates, service_period: period }, restaurantId);
    return res.json({ success: true, blockouts: saved });
  } catch (err) {
    console.error('Failed to save blockouts:', err.message);
    return res.status(500).json({ error: 'Failed to save blockouts' });
  }
});

app.delete('/api/admin/reservation-blockouts/:id', authMiddleware, async (req, res) => {
  const blockoutId = Number(req.params.id || 0);
  if (!blockoutId) return res.status(400).json({ error: 'Valid blockout id is required' });
  if (db) {
    try {
      const [rows] = await db.query('SELECT id, restaurant_id FROM reservation_blockouts WHERE id = ?', [blockoutId]);
      if (!rows.length) return res.status(404).json({ error: 'Blockout not found' });
      await db.query('UPDATE reservation_blockouts SET is_active = 0 WHERE id = ?', [blockoutId]);
      emitAdminEvent('blockout.updated', { id: blockoutId, is_active: 0 }, rows[0].restaurant_id || null);
      return res.json({ success: true });
    } catch (err) {
      console.error('Failed to delete blockout:', err.message);
      return res.status(500).json({ error: 'Failed to delete blockout' });
    }
  }

  const idx = mockReservationBlockouts.findIndex((item) => item.id === blockoutId);
  if (idx === -1) return res.status(404).json({ error: 'Blockout not found' });
  mockReservationBlockouts[idx].is_active = 0;
  emitAdminEvent('blockout.updated', { id: blockoutId, is_active: 0 }, mockReservationBlockouts[idx].restaurant_id || null);
  return res.json({ success: true });
});

// --- Admin Notifications ---
app.get('/api/admin/notifications', authMiddleware, async (req, res) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  if (db) {
    try {
      const [rows] = await db.query(
        `SELECT id, type, title, message, entity_type, entity_id, restaurant_id, payload_json, is_read, created_at
         FROM admin_notifications
         ORDER BY created_at DESC
         LIMIT ?`,
        [limit]
      );
      return res.json({ notifications: rows });
    } catch (err) {
      console.error('Failed to fetch notifications:', err.message);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }
  return res.json({ notifications: mockAdminNotifications.slice(0, limit) });
});

app.put('/api/admin/notifications/:id/read', authMiddleware, async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: 'Valid notification id is required' });
  if (db) {
    try {
      await db.query('UPDATE admin_notifications SET is_read = 1 WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (err) {
      console.error('Failed to update notification:', err.message);
      return res.status(500).json({ error: 'Failed to update notification' });
    }
  }
  const item = mockAdminNotifications.find((row) => row.id === id);
  if (!item) return res.status(404).json({ error: 'Notification not found' });
  item.is_read = 1;
  return res.json({ success: true });
});

app.put('/api/admin/notifications/read-all', authMiddleware, async (_req, res) => {
  if (db) {
    try {
      await db.query('UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0');
      return res.json({ success: true });
    } catch (err) {
      console.error('Failed to mark notifications read:', err.message);
      return res.status(500).json({ error: 'Failed to mark notifications read' });
    }
  }
  mockAdminNotifications = mockAdminNotifications.map((item) => ({ ...item, is_read: 1 }));
  return res.json({ success: true });
});

// --- Admin Calendar Summary ---
app.get('/api/admin/calendar/summary', authMiddleware, async (req, res) => {
  const start = String(req.query.start || '').trim();
  const end = String(req.query.end || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return res.status(400).json({ error: 'Valid start and end query params are required (YYYY-MM-DD)' });
  }

  if (db) {
    try {
      const [reservations] = await db.query(
        `SELECT date, restaurant_id, COUNT(*) AS reservation_count, SUM(persons) AS covers
         FROM reservations
         WHERE date BETWEEN ? AND ?
         GROUP BY date, restaurant_id`,
        [start, end]
      );
      const [contacts] = await db.query(
        `SELECT DATE(created_at) AS date, COALESCE(restaurant_id, 0) AS restaurant_id, COUNT(*) AS contact_count
         FROM contact_inquiries
         WHERE DATE(created_at) BETWEEN ? AND ?
         GROUP BY DATE(created_at), COALESCE(restaurant_id, 0)`,
        [start, end]
      );
      const [catering] = await db.query(
        `SELECT event_date AS date, 0 AS restaurant_id, COUNT(*) AS catering_count
         FROM catering_requests
         WHERE event_date BETWEEN ? AND ?
         GROUP BY event_date`,
        [start, end]
      );
      const [capacityRows] = await db.query(
        `SELECT restaurant_id, service_period, total_seats, avg_duration_minutes, is_active
         FROM location_capacity_settings`
      );

      const keyOf = (date, restaurantId) => `::`;
      const map = new Map();
      for (const row of reservations) {
        const rid = Number(row.restaurant_id || 0);
        const key = keyOf(row.date, rid);
        map.set(key, {
          date: row.date,
          restaurant_id: rid,
          reservation_count: Number(row.reservation_count || 0),
          covers: Number(row.covers || 0),
          contact_count: 0,
          catering_count: 0,
        });
      }
      for (const row of contacts) {
        const rid = Number(row.restaurant_id || 0);
        const key = keyOf(row.date, rid);
        const item = map.get(key) || { date: row.date, restaurant_id: rid, reservation_count: 0, covers: 0, contact_count: 0, catering_count: 0 };
        item.contact_count += Number(row.contact_count || 0);
        map.set(key, item);
      }
      for (const row of catering) {
        const rid = Number(row.restaurant_id || 0);
        const key = keyOf(row.date, rid);
        const item = map.get(key) || { date: row.date, restaurant_id: rid, reservation_count: 0, covers: 0, contact_count: 0, catering_count: 0 };
        item.catering_count += Number(row.catering_count || 0);
        map.set(key, item);
      }

      const capacityByRestaurant = {};
      for (const row of capacityRows) {
        const rid = Number(row.restaurant_id || 0);
        if (!capacityByRestaurant[rid]) capacityByRestaurant[rid] = { lunch: 0, dinner: 0 };
        if (row.is_active) capacityByRestaurant[rid][row.service_period] = Number(row.total_seats || 0);
      }

      const entries = Array.from(map.values()).map((item) => {
        const restCap = capacityByRestaurant[item.restaurant_id] || { lunch: 0, dinner: 0 };
        const combinedCapacity = Number(restCap.lunch || 0) + Number(restCap.dinner || 0);
        const occupancy_pct = combinedCapacity > 0 ? Math.min(100, Number(((item.covers / combinedCapacity) * 100).toFixed(2))) : 0;
        return { ...item, occupancy_pct };
      }).sort((a, b) => String(a.date).localeCompare(String(b.date)) || Number(a.restaurant_id) - Number(b.restaurant_id));

      return res.json({ entries });
    } catch (err) {
      console.error('Failed to fetch calendar summary:', err.message);
      return res.status(500).json({ error: 'Failed to fetch calendar summary' });
    }
  }

  const entries = [];
  for (const item of mockReservations) {
    if (item.date < start || item.date > end) continue;
    const key = `::`;
    const found = entries.find((row) => `::` === key);
    if (!found) {
      entries.push({
        date: item.date,
        restaurant_id: item.restaurant_id,
        reservation_count: 1,
        covers: Number(item.persons || 0),
        contact_count: 0,
        catering_count: 0,
        occupancy_pct: 0,
      });
    } else {
      found.reservation_count += 1;
      found.covers += Number(item.persons || 0);
    }
  }
  return res.json({ entries });
});

// --- Reservations ---

app.get('/api/reservations', authMiddleware, async (req, res) => {
  const { branch, date, status } = req.query;
  if (db) {
    try {
      let query = 'SELECT r.*, rest.name as restaurant_name FROM reservations r JOIN restaurants rest ON r.restaurant_id = rest.id WHERE 1=1';
      const params = [];
      if (branch) { query += ' AND r.restaurant_id = ?'; params.push(branch); }
      if (date) { query += ' AND r.date = ?'; params.push(date); }
      if (status) { query += ' AND r.status = ?'; params.push(status); }
      query += ' ORDER BY r.date DESC, r.time DESC';
      const [rows] = await db.query(query, params);
      return res.json(rows);
    } catch (err) { console.error(err); }
  }
  let reservations = [...mockReservations];
  if (branch) reservations = reservations.filter(r => r.restaurant_id === parseInt(branch));
  if (date) reservations = reservations.filter(r => r.date === date);
  if (status) reservations = reservations.filter(r => r.status === status);
  reservations = reservations.map(r => ({ ...r, restaurant_name: mockRestaurants.find(rest => rest.id === r.restaurant_id)?.name }));
  res.json(reservations);
});

app.post('/api/reservations', async (req, res) => {
  const { restaurant_id, name, email, phone, date, time, persons, special_requests, geolocation } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizeReservationPhone(phone);
  const parsedGeolocation = parseReservationGeolocation(geolocation);
  const requestContext = await collectRequestContext(req);
  const confirmation_code = 'MAS-' + String(Date.now()).slice(-6);

  if (!normalizedEmail || !normalizedPhone) {
    return res.status(400).json({ error: 'Valid email and phone are required.' });
  }

  // Server-side pause check
  let isPaused = false;
  if (db) {
    try {
      const [settingsRows] = await db.query('SELECT reservations_paused FROM reservation_settings WHERE id = 1');
      if (settingsRows.length) isPaused = !!settingsRows[0].reservations_paused;
    } catch (e) { /* default to not paused */ }
  } else {
    isPaused = !!mockReservationSettings.reservations_paused;
  }
  if (isPaused) {
    return res.status(400).json({ error: 'Reservations are currently paused for today. Please try again later or contact us directly.' });
  }

  if (restaurant_id && date) {
    const blocked = await isReservationBlocked({ restaurantId: restaurant_id, date, time });
    if (blocked) {
      return res.status(400).json({ error: 'Reservations are closed for the selected day/service period.' });
    }
  }

  // Server-side Tuesday validation
  if (date) {
    const reservationDate = new Date(date + 'T00:00:00');
    if (reservationDate.getDay() === 2) {
      // Check if Tuesday is disabled
      let tuesdayBlocked = true;
      if (db) {
        try {
          const [settingsRows] = await db.query('SELECT tuesday_disabled FROM reservation_settings WHERE id = 1');
          if (settingsRows.length) tuesdayBlocked = !!settingsRows[0].tuesday_disabled;
        } catch (e) { /* default to blocked */ }
      } else {
        tuesdayBlocked = mockReservationSettings.tuesday_disabled;
      }
      if (tuesdayBlocked) {
        return res.status(400).json({ error: 'Sorry, reservations are not available on Tuesdays.' });
      }
    }
  }

  if (db) {
    try {
      const [result] = await db.query(
        `INSERT INTO reservations (
          restaurant_id,
          name,
          email,
          phone,
          date,
          time,
          persons,
          special_requests,
          geolocation_latitude,
          geolocation_longitude,
          geolocation_accuracy_meters,
          geolocation_captured_at,
          geolocation_source,
          request_ip,
          request_user_agent,
          request_browser,
          request_os,
          request_device_type,
          ip_lookup_status,
          ip_lookup_message,
          ip_country,
          ip_region,
          ip_city,
          ip_zip,
          ip_latitude,
          ip_longitude,
          ip_timezone,
          ip_isp,
          ip_org,
          ip_as,
          ip_mobile,
          ip_proxy,
          ip_hosting,
          confirmation_code,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          restaurant_id,
          name,
          normalizedEmail,
          normalizedPhone,
          date,
          time,
          persons,
          special_requests || null,
          parsedGeolocation?.latitude || null,
          parsedGeolocation?.longitude || null,
          parsedGeolocation?.accuracy || null,
          parsedGeolocation?.captured_at || null,
          parsedGeolocation?.source || null,
          requestContext.request_ip,
          requestContext.request_user_agent,
          requestContext.request_browser,
          requestContext.request_os,
          requestContext.request_device_type,
          requestContext.ip_lookup_status,
          requestContext.ip_lookup_message,
          requestContext.ip_country,
          requestContext.ip_region,
          requestContext.ip_city,
          requestContext.ip_zip,
          requestContext.ip_latitude,
          requestContext.ip_longitude,
          requestContext.ip_timezone,
          requestContext.ip_isp,
          requestContext.ip_org,
          requestContext.ip_as,
          requestContext.ip_mobile,
          requestContext.ip_proxy,
          requestContext.ip_hosting,
          confirmation_code,
          'confirmed',
        ]
      );
      const [rows] = await db.query('SELECT * FROM reservations WHERE id = ?', [result.insertId]);
      const [restaurants] = await db.query('SELECT * FROM restaurants WHERE id = ?', [restaurant_id]);
      sendReservationEmails(rows[0], restaurants[0] || null);
      emitAdminEvent('reservation.created', { reservation: rows[0] }, rows[0].restaurant_id);
      createAdminNotification({
        type: 'reservation',
        title: 'New reservation',
        message: 'New request submitted',
        entity_type: 'reservation',
        entity_id: rows[0].id,
        restaurant_id: rows[0].restaurant_id,
        payload_json: { reservation_id: rows[0].id, service_period: deriveServicePeriodFromTime(rows[0].time) },
      });
      return res.json(rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create reservation.' });
    }
  }

  const newReservation = {
    id: nextReservationId++,
    restaurant_id: parseInt(restaurant_id),
    name,
    email: normalizedEmail,
    phone: normalizedPhone,
    date,
    time,
    persons: parseInt(persons),
    special_requests: special_requests || null,
    geolocation_latitude: parsedGeolocation?.latitude || null,
    geolocation_longitude: parsedGeolocation?.longitude || null,
    geolocation_accuracy_meters: parsedGeolocation?.accuracy || null,
    geolocation_captured_at: parsedGeolocation?.captured_at || null,
    geolocation_source: parsedGeolocation?.source || null,
    ...requestContext,
    status: 'confirmed',
    confirmation_code,
    created_at: new Date().toISOString(),
  };
  mockReservations.push(newReservation);
  const restaurant = mockRestaurants.find(r => r.id === parseInt(restaurant_id));
  sendReservationEmails(newReservation, restaurant || null);
  emitAdminEvent('reservation.created', { reservation: newReservation }, newReservation.restaurant_id);
  createAdminNotification({
    type: 'reservation',
    title: 'New reservation',
    message: 'New request submitted',
    entity_type: 'reservation',
    entity_id: newReservation.id,
    restaurant_id: newReservation.restaurant_id,
    payload_json: { reservation_id: newReservation.id, service_period: deriveServicePeriodFromTime(newReservation.time) },
  });
  res.json(newReservation);
});

app.post('/api/reservations/manage', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const phone = normalizeReservationPhone(req.body?.phone);

  if (!email || !phone) {
    return res.status(400).json({ error: 'Email and phone are required.' });
  }

  if (db) {
    try {
      const [rows] = await db.query(
        `SELECT r.*, rest.name as restaurant_name
         FROM reservations r
         JOIN restaurants rest ON r.restaurant_id = rest.id
         WHERE LOWER(r.email) = ?
         ORDER BY r.created_at DESC, r.id DESC`,
        [email]
      );

      const matches = rows.filter((row) => reservationPhonesMatch(row.phone, phone));
      return res.json(matches);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to load reservations.' });
    }
  }

  const matches = sortReservationsNewestFirst(
    mockReservations
      .filter((row) => normalizeEmail(row.email) === email && reservationPhonesMatch(row.phone, phone))
      .map((row) => ({
        ...row,
        restaurant_name: mockRestaurants.find((rest) => rest.id === row.restaurant_id)?.name,
      }))
  );

  return res.json(matches);
});

app.put('/api/reservations/manage/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const lookupEmail = normalizeEmail(req.body?.lookup_email);
  const lookupPhone = normalizeReservationPhone(req.body?.lookup_phone);
  const updates = buildCustomerReservationUpdatePayload(req.body || {});

  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid reservation id.' });
  if (!lookupEmail || !lookupPhone) {
    return res.status(400).json({ error: 'Lookup email and phone are required.' });
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No valid fields provided for update.' });
  }

  if (db) {
    try {
      const [existingRows] = await db.query(
        `SELECT r.*, rest.name as restaurant_name
         FROM reservations r
         JOIN restaurants rest ON r.restaurant_id = rest.id
         WHERE r.id = ?
         LIMIT 1`,
        [id]
      );

      const existing = existingRows[0];
      if (!existing) return res.status(404).json({ error: 'Reservation not found.' });

      if (normalizeEmail(existing.email) !== lookupEmail || !reservationPhonesMatch(existing.phone, lookupPhone)) {
        return res.status(403).json({ error: 'Reservation verification failed.' });
      }

      const updateFields = Object.keys(updates);
      const updateValues = updateFields.map((field) => updates[field]);
      const setClause = updateFields.map((field) => `${field} = ?`).join(', ');

      await db.query(`UPDATE reservations SET ${setClause} WHERE id = ?`, [...updateValues, id]);

      const [updatedRows] = await db.query(
        `SELECT r.*, rest.name as restaurant_name
         FROM reservations r
         JOIN restaurants rest ON r.restaurant_id = rest.id
         WHERE r.id = ?
         LIMIT 1`,
        [id]
      );

      const updated = updatedRows[0];
      sendReservationUpdateEmails(existing, updated, {
        id: updated.restaurant_id,
        name: updated.restaurant_name,
      });

      return res.json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update reservation.' });
    }
  }

  const idx = mockReservations.findIndex((row) => row.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Reservation not found.' });

  const existing = mockReservations[idx];
  if (normalizeEmail(existing.email) !== lookupEmail || !reservationPhonesMatch(existing.phone, lookupPhone)) {
    return res.status(403).json({ error: 'Reservation verification failed.' });
  }

  const updated = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  mockReservations[idx] = updated;

  const restaurant = mockRestaurants.find((rest) => rest.id === updated.restaurant_id);
  const updatedResponse = {
    ...updated,
    restaurant_name: restaurant?.name,
  };

  sendReservationUpdateEmails(existing, updatedResponse, restaurant || null);
  return res.json(updatedResponse);
});

app.put('/api/reservations/:id', authMiddleware, async (req, res) => {
  const { status } = req.body;
  if (db) {
    try {
      await db.query('UPDATE reservations SET status = ? WHERE id = ?', [status, req.params.id]);
      const [rows] = await db.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
      return res.json(rows[0]);
    } catch (err) { console.error(err); }
  }
  const idx = mockReservations.findIndex(r => r.id === parseInt(req.params.id));
  if (idx !== -1) {
    mockReservations[idx] = { ...mockReservations[idx], ...req.body };
    return res.json(mockReservations[idx]);
  }
  res.status(404).json({ error: 'Not found' });
});

app.post('/api/admin/reservations/:id/action', authMiddleware, async (req, res) => {
  const reservationId = Number(req.params.id || 0);
  const action = String(req.body?.action || '').trim().toLowerCase();
  const tableLabel = String(req.body?.table_label || '').trim().slice(0, 80);

  if (!reservationId || !action) {
    return res.status(400).json({ error: 'Valid reservation id and action are required' });
  }

  const allowed = new Set(['confirm', 'cancel', 'seat', 'assign_table', 'mark_vip', 'unmark_vip', 'send_email']);
  if (!allowed.has(action)) {
    return res.status(400).json({ error: 'Unsupported action' });
  }

  const buildActionUpdate = () => {
    if (action === 'confirm') return { status: 'confirmed' };
    if (action === 'cancel') return { status: 'cancelled' };
    if (action === 'seat') return { status: 'completed', seated_at: new Date() };
    if (action === 'assign_table') return { table_assigned: tableLabel || null };
    if (action === 'mark_vip') return { is_vip: 1 };
    if (action === 'unmark_vip') return { is_vip: 0 };
    return {};
  };

  const updates = buildActionUpdate();

  if (db) {
    try {
      const [foundRows] = await db.query('SELECT * FROM reservations WHERE id = ?', [reservationId]);
      if (!foundRows.length) return res.status(404).json({ error: 'Reservation not found' });

      if (action === 'send_email') {
        const reservation = foundRows[0];
        const [restaurants] = await db.query('SELECT * FROM restaurants WHERE id = ?', [reservation.restaurant_id]);
        await sendReservationEmails(reservation, restaurants[0] || null);
      } else if (Object.keys(updates).length > 0) {
        const fields = [];
        const values = [];
        Object.entries(updates).forEach(([key, value]) => {
          fields.push(`${key} = ?`);
          values.push(value);
        });
        values.push(reservationId);
        await db.query(`UPDATE reservations SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      if (action === 'assign_table' && tableLabel) {
        await db.query(
          `INSERT INTO reservation_table_assignments (reservation_id, table_label, assigned_by)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE table_label = VALUES(table_label), assigned_by = VALUES(assigned_by), assigned_at = CURRENT_TIMESTAMP`,
          [reservationId, tableLabel, req.admin?.id || null]
        );
      }

      const [rows] = await db.query('SELECT * FROM reservations WHERE id = ?', [reservationId]);
      const row = rows[0];
      emitAdminEvent('reservation.updated', { reservation: row, action }, row.restaurant_id || null);
      await createAdminNotification({
        type: 'reservation',
        title: `Reservation ${action.replace('_', ' ')}`,
        message: `${row.name} · ${row.date} ${row.time}`,
        entity_type: 'reservation',
        entity_id: row.id,
        restaurant_id: row.restaurant_id || null,
        payload_json: { reservation_id: row.id, action },
      });
      return res.json({ success: true, reservation: row });
    } catch (err) {
      console.error('Failed reservation action:', err.message);
      return res.status(500).json({ error: 'Failed to apply reservation action' });
    }
  }

  const idx = mockReservations.findIndex((r) => r.id === reservationId);
  if (idx === -1) return res.status(404).json({ error: 'Reservation not found' });
  if (action === 'send_email') {
    const reservation = mockReservations[idx];
    const restaurant = mockRestaurants.find((rest) => rest.id === reservation.restaurant_id);
    sendReservationEmails(reservation, restaurant || null);
  } else {
    mockReservations[idx] = {
      ...mockReservations[idx],
      ...updates,
      ...(action === 'seat' ? { seated_at: new Date().toISOString() } : {}),
      ...(action === 'assign_table' ? { table_assigned: tableLabel || null } : {}),
    };
  }
  emitAdminEvent('reservation.updated', { reservation: mockReservations[idx], action }, mockReservations[idx].restaurant_id || null);
  createAdminNotification({
    type: 'reservation',
    title: `Reservation ${action.replace('_', ' ')}`,
    message: `${mockReservations[idx].name} · ${mockReservations[idx].date} ${mockReservations[idx].time}`,
    entity_type: 'reservation',
    entity_id: mockReservations[idx].id,
    restaurant_id: mockReservations[idx].restaurant_id || null,
    payload_json: { reservation_id: mockReservations[idx].id, action },
  });
  return res.json({ success: true, reservation: mockReservations[idx] });
});

app.delete('/api/reservations/:id', authMiddleware, async (req, res) => {
  if (db) {
    try {
      await db.query('DELETE FROM reservations WHERE id = ?', [req.params.id]);
      return res.json({ success: true });
    } catch (err) { console.error(err); }
  }
  const idx = mockReservations.findIndex(r => r.id === parseInt(req.params.id));
  if (idx !== -1) { mockReservations.splice(idx, 1); return res.json({ success: true }); }
  res.status(404).json({ error: 'Not found' });
});

// --- Catering ---
app.post('/api/catering', async (req, res) => {
  const { name, email, phone, event_date, guests, event_location, event_type, notes } = req.body;
  const requestContext = await collectRequestContext(req);
  if (db) {
    try {
      const [result] = await db.query(
        `INSERT INTO catering_requests (
          name,
          email,
          phone,
          event_date,
          guests,
          event_location,
          event_type,
          notes,
          request_ip,
          request_user_agent,
          request_browser,
          request_os,
          request_device_type,
          ip_lookup_status,
          ip_lookup_message,
          ip_country,
          ip_region,
          ip_city,
          ip_zip,
          ip_latitude,
          ip_longitude,
          ip_timezone,
          ip_isp,
          ip_org,
          ip_as,
          ip_mobile,
          ip_proxy,
          ip_hosting
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          email,
          phone,
          event_date,
          guests,
          event_location,
          event_type,
          notes,
          requestContext.request_ip,
          requestContext.request_user_agent,
          requestContext.request_browser,
          requestContext.request_os,
          requestContext.request_device_type,
          requestContext.ip_lookup_status,
          requestContext.ip_lookup_message,
          requestContext.ip_country,
          requestContext.ip_region,
          requestContext.ip_city,
          requestContext.ip_zip,
          requestContext.ip_latitude,
          requestContext.ip_longitude,
          requestContext.ip_timezone,
          requestContext.ip_isp,
          requestContext.ip_org,
          requestContext.ip_as,
          requestContext.ip_mobile,
          requestContext.ip_proxy,
          requestContext.ip_hosting,
        ]
      );
      const [rows] = await db.query('SELECT * FROM catering_requests WHERE id = ?', [result.insertId]);
      sendCateringNotification(rows[0]);
      emitAdminEvent('catering.created', { request: rows[0] }, rows[0].restaurant_id || null);
      createAdminNotification({
        type: 'catering',
        title: 'New catering request',
        message: 'New request submitted',
        entity_type: 'catering_request',
        entity_id: rows[0].id,
        restaurant_id: rows[0].restaurant_id || null,
        payload_json: { catering_request_id: rows[0].id },
      });
      return res.json(rows[0]);
    } catch (err) { console.error(err); }
  }
  const newRequest = {
    id: nextCateringId++,
    name,
    email,
    phone,
    event_date,
    guests: parseInt(guests),
    event_location,
    event_type,
    notes,
    ...requestContext,
    status: 'new',
    created_at: new Date().toISOString(),
  };
  mockCateringRequests.push(newRequest);
  sendCateringNotification(newRequest);
  emitAdminEvent('catering.created', { request: newRequest }, newRequest.restaurant_id || null);
  createAdminNotification({
    type: 'catering',
    title: 'New catering request',
    message: 'New request submitted',
    entity_type: 'catering_request',
    entity_id: newRequest.id,
    restaurant_id: newRequest.restaurant_id || null,
    payload_json: { catering_request_id: newRequest.id },
  });
  res.json(newRequest);
});

app.get('/api/catering', authMiddleware, async (req, res) => {
  if (db) {
    try {
      const [rows] = await db.query('SELECT * FROM catering_requests ORDER BY created_at DESC');
      return res.json(rows);
    } catch (err) { console.error(err); }
  }
  res.json(mockCateringRequests);
});

app.put('/api/catering/:id', authMiddleware, async (req, res) => {
  const { status, event_date, guests, event_location, event_type, notes } = req.body;
  if (db) {
    try {
      await db.query(
        `UPDATE catering_requests
         SET status = COALESCE(?, status),
             event_date = COALESCE(?, event_date),
             guests = COALESCE(?, guests),
             event_location = COALESCE(?, event_location),
             event_type = COALESCE(?, event_type),
             notes = COALESCE(?, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status || null, event_date || null, guests || null, event_location || null, event_type || null, notes || null, req.params.id]
      );
      const [rows] = await db.query('SELECT * FROM catering_requests WHERE id = ?', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      return res.json(rows[0]);
    } catch (err) { console.error(err); }
  }

  const idx = mockCateringRequests.findIndex(c => c.id === parseInt(req.params.id, 10));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  mockCateringRequests[idx] = {
    ...mockCateringRequests[idx],
    ...(status ? { status } : {}),
    ...(event_date ? { event_date } : {}),
    ...(guests ? { guests: parseInt(guests, 10) } : {}),
    ...(event_location ? { event_location } : {}),
    ...(event_type ? { event_type } : {}),
    ...(notes ? { notes } : {}),
  };
  return res.json(mockCateringRequests[idx]);
});

app.delete('/api/catering/:id', authMiddleware, async (req, res) => {
  if (db) {
    try {
      await db.query('DELETE FROM catering_requests WHERE id = ?', [req.params.id]);
      return res.json({ success: true });
    } catch (err) { console.error(err); }
  }

  const idx = mockCateringRequests.findIndex(c => c.id === parseInt(req.params.id, 10));
  if (idx !== -1) {
    mockCateringRequests.splice(idx, 1);
    return res.json({ success: true });
  }
  return res.status(404).json({ error: 'Not found' });
});

// --- Contact ---
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message, restaurant_id } = req.body;
  const requestContext = await collectRequestContext(req);
  if (db) {
    try {
      const [result] = await db.query(
        `INSERT INTO contact_inquiries (
          name,
          email,
          phone,
          subject,
          message,
          restaurant_id,
          request_ip,
          request_user_agent,
          request_browser,
          request_os,
          request_device_type,
          ip_lookup_status,
          ip_lookup_message,
          ip_country,
          ip_region,
          ip_city,
          ip_zip,
          ip_latitude,
          ip_longitude,
          ip_timezone,
          ip_isp,
          ip_org,
          ip_as,
          ip_mobile,
          ip_proxy,
          ip_hosting
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          email,
          phone,
          subject,
          message,
          restaurant_id || null,
          requestContext.request_ip,
          requestContext.request_user_agent,
          requestContext.request_browser,
          requestContext.request_os,
          requestContext.request_device_type,
          requestContext.ip_lookup_status,
          requestContext.ip_lookup_message,
          requestContext.ip_country,
          requestContext.ip_region,
          requestContext.ip_city,
          requestContext.ip_zip,
          requestContext.ip_latitude,
          requestContext.ip_longitude,
          requestContext.ip_timezone,
          requestContext.ip_isp,
          requestContext.ip_org,
          requestContext.ip_as,
          requestContext.ip_mobile,
          requestContext.ip_proxy,
          requestContext.ip_hosting,
        ]
      );
      const [rows] = await db.query('SELECT * FROM contact_inquiries WHERE id = ?', [result.insertId]);
      if (rows.length) {
        sendContactNotification(rows[0]);
        emitAdminEvent('contact.created', { inquiry: rows[0] }, rows[0].restaurant_id || null);
        createAdminNotification({
          type: 'contact',
          title: 'New contact inquiry',
          message: 'New contact request submitted',
          entity_type: 'contact_inquiry',
          entity_id: rows[0].id,
          restaurant_id: rows[0].restaurant_id || null,
          payload_json: { contact_inquiry_id: rows[0].id },
        });
      }
      return res.json({ success: true, id: result.insertId });
    } catch (err) { console.error(err); }
  }
  const newInquiry = {
    id: nextContactId++,
    name,
    email,
    phone: phone || null,
    subject: subject || null,
    message,
    restaurant_id: restaurant_id || null,
    is_read: false,
    ...requestContext,
    created_at: new Date().toISOString(),
  };
  mockContactInquiries.push(newInquiry);
  sendContactNotification(newInquiry);
  emitAdminEvent('contact.created', { inquiry: newInquiry }, newInquiry.restaurant_id || null);
  createAdminNotification({
    type: 'contact',
    title: 'New contact inquiry',
    message: 'New contact request submitted',
    entity_type: 'contact_inquiry',
    entity_id: newInquiry.id,
    restaurant_id: newInquiry.restaurant_id || null,
    payload_json: { contact_inquiry_id: newInquiry.id },
  });
  res.json({ success: true, id: newInquiry.id });
});

app.get('/api/contact', authMiddleware, async (req, res) => {
  if (db) {
    try {
      const [rows] = await db.query('SELECT * FROM contact_inquiries ORDER BY created_at DESC');
      return res.json(rows);
    } catch (err) { console.error(err); }
  }
  return res.json(mockContactInquiries);
});

app.put('/api/contact/:id', authMiddleware, async (req, res) => {
  const { is_read, subject, message } = req.body;
  if (db) {
    try {
      await db.query(
        `UPDATE contact_inquiries
         SET is_read = COALESCE(?, is_read),
             subject = COALESCE(?, subject),
             message = COALESCE(?, message)
         WHERE id = ?`,
        [typeof is_read === 'boolean' ? is_read : null, subject || null, message || null, req.params.id]
      );
      const [rows] = await db.query('SELECT * FROM contact_inquiries WHERE id = ?', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      return res.json(rows[0]);
    } catch (err) { console.error(err); }
  }

  const idx = mockContactInquiries.findIndex(c => c.id === parseInt(req.params.id, 10));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  mockContactInquiries[idx] = {
    ...mockContactInquiries[idx],
    ...(typeof is_read === 'boolean' ? { is_read } : {}),
    ...(subject ? { subject } : {}),
    ...(message ? { message } : {}),
  };
  return res.json(mockContactInquiries[idx]);
});

app.delete('/api/contact/:id', authMiddleware, async (req, res) => {
  if (db) {
    try {
      await db.query('DELETE FROM contact_inquiries WHERE id = ?', [req.params.id]);
      return res.json({ success: true });
    } catch (err) { console.error(err); }
  }

  const idx = mockContactInquiries.findIndex(c => c.id === parseInt(req.params.id, 10));
  if (idx !== -1) {
    mockContactInquiries.splice(idx, 1);
    return res.json({ success: true });
  }
  return res.status(404).json({ error: 'Not found' });
});

// --- Analytics ---
app.get('/api/analytics/overview', authMiddleware, async (req, res) => {
  if (db) {
    try {
      const [totalRes] = await db.query('SELECT COUNT(*) as count FROM reservations');
      const [confirmedRes] = await db.query("SELECT COUNT(*) as count FROM reservations WHERE status = 'confirmed'");
      const [todayRes] = await db.query("SELECT COUNT(*) as count FROM reservations WHERE date = CURDATE()");
      const [totalCatering] = await db.query('SELECT COUNT(*) as count FROM catering_requests');
      let totalMenuItemsCount = 0;
      try {
        const [totalMenuItems] = await db.query('SELECT COUNT(*) as count FROM menu_items WHERE is_active = 1');
        totalMenuItemsCount = Number(totalMenuItems?.[0]?.count || 0);
      } catch (err) {
        if (!isTableMissingError(err)) throw err;
        const tempMenu = await fetchTempMenuData();
        totalMenuItemsCount = (tempMenu.items || []).length;
      }
      const [branchStats] = await db.query('SELECT r.name, COUNT(res.id) as count FROM restaurants r LEFT JOIN reservations res ON r.id = res.restaurant_id GROUP BY r.id, r.name');
      return res.json({
        totalReservations: totalRes[0].count,
        confirmedReservations: confirmedRes[0].count,
        todayReservations: todayRes[0].count,
        totalCateringRequests: totalCatering[0].count,
        totalMenuItems: totalMenuItemsCount,
        branchStats,
      });
    } catch (err) { console.error(err); }
  }
  // Mock analytics
  const branchStats = mockRestaurants.map(r => ({
    name: r.name.replace('Masakali Indian Cuisine – ', '').replace('Masakali ', '').replace('RangDe ', ''),
    count: mockReservations.filter(res => res.restaurant_id === r.id).length,
  }));
  let totalMenuItems = 0;
  // Keep as 0 in mock mode. Menu is sourced from MySQL in connected environments.

  res.json({
    totalReservations: mockReservations.length,
    confirmedReservations: mockReservations.filter(r => r.status === 'confirmed').length,
    todayReservations: mockReservations.filter(r => r.date === new Date().toISOString().split('T')[0]).length,
    totalCateringRequests: mockCateringRequests.length,
    totalMenuItems,
    branchStats,
    peakDays: [
      { day: 'Friday', reservations: 45 },
      { day: 'Saturday', reservations: 62 },
      { day: 'Sunday', reservations: 38 },
      { day: 'Thursday', reservations: 28 },
      { day: 'Wednesday', reservations: 20 },
      { day: 'Tuesday', reservations: 15 },
      { day: 'Monday', reservations: 12 },
    ],
    groupSizeDistribution: [
      { size: '1-2', count: 35 },
      { size: '3-4', count: 45 },
      { size: '5-6', count: 25 },
      { size: '7-8', count: 12 },
      { size: '9+', count: 5 },
    ],
    monthlyTrend: [
      { month: 'Oct', reservations: 120 },
      { month: 'Nov', reservations: 145 },
      { month: 'Dec', reservations: 190 },
      { month: 'Jan', reservations: 135 },
      { month: 'Feb', reservations: 155 },
      { month: 'Mar', reservations: 170 },
    ],
    revenueEstimate: {
      avgSpendPerGuest: 45,
      totalGuests: 850,
      estimatedRevenue: 38250,
      monthlyGrowth: 12.5,
    },
    recommendations: [
      { type: 'promotion', text: 'Run promotions on Monday & Tuesday to increase weekday traffic by an estimated 30%.' },
      { type: 'staffing', text: 'Increase staffing on Friday & Saturday evenings — peak reservation hours are 7:00–9:00 PM.' },
      { type: 'expansion', text: 'Montreal and California branches show high demand growth — consider expanding seating capacity.' },
      { type: 'menu', text: 'Butter Chicken and Biryani are top sellers. Consider creating combo deals around these items.' },
      { type: 'catering', text: 'Catering requests spike in April–June. Prepare catering packages for wedding season.' },
    ],
  });
});


// =====================================================
// Hiring Banner & Applications
// =====================================================

// Multer config for resume uploads
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `resume-${uniqueSuffix}${ext}`);
  },
});

const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  },
});

app.get('/api/hiring-banner', async (req, res) => {
  if (db) {
    try {
      const [rows] = await db.query('SELECT * FROM hiring_banner_settings WHERE id = 1 LIMIT 1');
      if (rows.length) return res.json(rows[0]);
    } catch (err) {
      console.error('Failed to fetch hiring banner settings:', err.message);
    }
  }
  return res.json(mockHiringBannerSettings);
});

app.get('/api/admin/hiring-banner', authMiddleware, async (req, res) => {
  if (db) {
    try {
      const [rows] = await db.query('SELECT * FROM hiring_banner_settings WHERE id = 1 LIMIT 1');
      if (rows.length) return res.json(rows[0]);
    } catch (err) {
      console.error('Failed to fetch hiring banner settings:', err.message);
    }
  }
  return res.json(mockHiringBannerSettings);
});

app.put('/api/admin/hiring-banner', authMiddleware, async (req, res) => {
  const { is_enabled, banner_text, cta_text } = req.body || {};
  const enabledValue = is_enabled === true || is_enabled === 1 || is_enabled === '1' ? 1 : 0;
  const textValue = String(banner_text || '').trim().slice(0, 255);
  const ctaValue = String(cta_text || 'Apply Now').trim().slice(0, 100);

  if (!textValue) return res.status(400).json({ error: 'Banner text is required' });

  if (db) {
    try {
      await db.query(
        `INSERT INTO hiring_banner_settings (id, is_enabled, banner_text, cta_text)
         VALUES (1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), banner_text = VALUES(banner_text), cta_text = VALUES(cta_text)`,
        [enabledValue, textValue, ctaValue]
      );
      const [rows] = await db.query('SELECT * FROM hiring_banner_settings WHERE id = 1 LIMIT 1');
      return res.json(rows[0]);
    } catch (err) {
      console.error('Failed to update hiring banner settings:', err.message);
      return res.status(500).json({ error: 'Failed to update hiring banner settings' });
    }
  }

  mockHiringBannerSettings = { ...mockHiringBannerSettings, is_enabled: enabledValue, banner_text: textValue, cta_text: ctaValue };
  return res.json(mockHiringBannerSettings);
});

app.post('/api/hiring-applications', (req, res) => {
  resumeUpload.single('resume')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Resume file must be under 5MB' });
      return res.status(400).json({ error: uploadErr.message || 'File upload error' });
    }

    const { full_name, phone_number, email } = req.body || {};
    const name = String(full_name || '').trim();
    const phone = String(phone_number || '').trim();
    const emailVal = String(email || '').trim().toLowerCase();

    if (!name || !phone || !emailVal) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
      return res.status(400).json({ error: 'Full name, phone number, and email are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
      return res.status(400).json({ error: 'Please provide a valid phone number' });
    }

    const resumeFile = req.file ? req.file.filename : null;

    if (db) {
      try {
        const [result] = await db.query(
          'INSERT INTO hiring_applications (full_name, phone_number, email, resume_file) VALUES (?, ?, ?, ?)',
          [name, phone, emailVal, resumeFile]
        );
        const [rows] = await db.query('SELECT * FROM hiring_applications WHERE id = ?', [result.insertId]);
        const application = rows[0];
        sendHiringApplicationNotification(application);
        return res.json({ success: true, application });
      } catch (err) {
        console.error('Failed to save hiring application:', err.message);
        return res.status(500).json({ error: 'Failed to submit application' });
      }
    }

    const newApp = {
      id: nextHiringApplicationId++,
      full_name: name,
      phone_number: phone,
      email: emailVal,
      resume_file: resumeFile,
      created_at: new Date().toISOString(),
    };
    mockHiringApplications.push(newApp);
    sendHiringApplicationNotification(newApp);
    return res.json({ success: true, application: newApp });
  });
});

app.get('/api/admin/hiring-applications', authMiddleware, async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  if (db) {
    try {
      let query = 'SELECT * FROM hiring_applications WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as total FROM hiring_applications WHERE 1=1';
      const params = [];
      const countParams = [];

      if (search) {
        const searchTerm = `%${search}%`;
        query += ' AND (full_name LIKE ? OR email LIKE ? OR phone_number LIKE ?)';
        countQuery += ' AND (full_name LIKE ? OR email LIKE ? OR phone_number LIKE ?)';
        params.push(searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limitNum, offset);

      const [rows] = await db.query(query, params);
      const [countRows] = await db.query(countQuery, countParams);
      const total = countRows[0]?.total || 0;

      return res.json({
        applications: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      console.error('Failed to fetch hiring applications:', err.message);
      return res.status(500).json({ error: 'Failed to fetch applications' });
    }
  }

  let filtered = [...mockHiringApplications];
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter((a) => a.full_name.toLowerCase().includes(s) || a.email.toLowerCase().includes(s) || a.phone_number.includes(s));
  }
  filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limitNum);

  return res.json({
    applications: paginated,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

app.delete('/api/admin/hiring-applications/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  if (db) {
    try {
      const [rows] = await db.query('SELECT * FROM hiring_applications WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'Application not found' });

      if (rows[0].resume_file) {
        const filePath = path.join(UPLOADS_DIR, rows[0].resume_file);
        try { fs.unlinkSync(filePath); } catch (_) {}
      }

      await db.query('DELETE FROM hiring_applications WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (err) {
      console.error('Failed to delete hiring application:', err.message);
      return res.status(500).json({ error: 'Failed to delete application' });
    }
  }

  const idx = mockHiringApplications.findIndex((a) => a.id === parseInt(id, 10));
  if (idx === -1) return res.status(404).json({ error: 'Application not found' });

  const app_ = mockHiringApplications[idx];
  if (app_.resume_file) {
    const filePath = path.join(UPLOADS_DIR, app_.resume_file);
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
  mockHiringApplications.splice(idx, 1);
  return res.json({ success: true });
});

app.get('/api/admin/hiring-applications/:id/resume', authMiddleware, async (req, res) => {
  const { id } = req.params;

  let resumeFile = null;
  if (db) {
    try {
      const [rows] = await db.query('SELECT resume_file FROM hiring_applications WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'Application not found' });
      resumeFile = rows[0].resume_file;
    } catch (err) {
      console.error('Failed to fetch resume:', err.message);
      return res.status(500).json({ error: 'Failed to fetch resume' });
    }
  } else {
    const app_ = mockHiringApplications.find((a) => a.id === parseInt(id, 10));
    if (!app_) return res.status(404).json({ error: 'Application not found' });
    resumeFile = app_.resume_file;
  }

  if (!resumeFile) return res.status(404).json({ error: 'No resume uploaded for this application' });

  const filePath = path.join(UPLOADS_DIR, resumeFile);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Resume file not found on server' });

  return res.download(filePath, resumeFile);
});

// =====================================================
// SPA Catch-All (must be last)
// =====================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// =====================================================
// Start Server
// =====================================================
httpServer.listen(PORT, () => {
  console.log(`\n🍛 RangDe Indian Cuisine Server`);
  console.log(`   Running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('   Database: Initializing...\n');
});

(async () => {
  try {
    await initDB();
  } catch (err) {
    console.log(`✗ Database init failed, using mock data: ${err.message}`);
    db = null;
  }
  console.log(`   Database Mode: ${db ? 'MySQL Connected' : 'Mock Data Mode'}`);
})();
