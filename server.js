require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
  SPREADSHEET_ID: process.env.SHEET_ID || '1jbyn7Fka8EbXudEG9qe9YHBqAkP3Bx45TMcL_4uUjfE',
  SHEET_NAME:     process.env.SHEET_NAME || 'Sheet1',
  PORT:           parseInt(process.env.PORT, 10) || 3000,
  SA_FILE:        path.join(__dirname, 'service-account.json'),
  CACHE_TTL_MS:   5 * 60 * 1000, // 5 minutes
};

// ─── In-memory cache ──────────────────────────────────────────────────────────
let cache = { ts: 0, data: null };

// ─── Google Sheets Auth ───────────────────────────────────────────────────────
function getAuth() {
  return new google.auth.GoogleAuth({
    keyFile: CONFIG.SA_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

// ─── Timestamp parser (handles AppSheet locale formats + ISO) ─────────────────
function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  // Try M/D/YYYY HH:MM:SS format from AppSheet
  const m = String(str).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (m) return new Date(`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}T${m[4].padStart(2,'0')}:${m[5]}:${m[6]}`);
  return null;
}

// ─── Fetch & transform sheet data ─────────────────────────────────────────────
async function fetchSheetData() {
  const auth  = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    range: `${CONFIG.SHEET_NAME}`,
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return [];

  // Map by column name from header row — robust against column reordering
  const headers = rows[0].map(h => String(h).trim());
  const records = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]).trim() : ''; });

    // Normalise date fields to ISO strings for reliable client-side parsing
    const ts = parseDate(obj['Timestamp']);
    const vd = parseDate(obj['Visit Date']);
    if (ts) obj['Timestamp'] = ts.toISOString();
    if (vd) obj['Visit Date'] = vd.toISOString();

    return obj;
  });

  return records;
}

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/data', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === '1';
    const now = Date.now();
    if (!forceRefresh && cache.data && (now - cache.ts) < CONFIG.CACHE_TTL_MS) {
      return res.json(cache.data);
    }
    const data = await fetchSheetData();
    cache = { ts: now, data };
    res.json(data);
  } catch (err) {
    console.error('Sheets API error:', err.message);
    const status = err.code === 403 ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
});

// Serve analytics.html and other static files in the repo root
app.use(express.static(__dirname));

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(CONFIG.PORT, () => {
  console.log(`Aqua Analytics  →  http://localhost:${CONFIG.PORT}/analytics.html`);
});
