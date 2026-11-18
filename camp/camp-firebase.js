// ═══════════════════════════════════════════════
// AFC Botswana — Camp Meeting · Supabase data layer
//
// One module every camp page (public + Manager / Secretary / Store Manager
// portals) talks to. It exposes a small collection/doc/query API so the pages
// stay simple, and stores each record as `data` JSONB plus a few indexed
// columns (see supabase/schema.sql and supabase/camp-portal-sync.sql).
//
// Same Supabase project as the main AFC Botswana site.
// ═══════════════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';

const SUPABASE_URL = 'https://jtcjglwshplladajayud.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Y2pnbHdzaHBsbGFkYWpheXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTEwMjIsImV4cCI6MjA5ODkyNzAyMn0.zwei8yot9yP6EfmqbpfYAZhlnbl9FaUXlwjVkPAc0Ks';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Kept so existing `import { db }` lines keep working. */
export const db = { _supabase: true };

// ── TABLE NAMES ──
export const CAMP_REGS = 'camp_registrations';
export const CAMP_ORDERS = 'camp_orders';
export const CAMP_ANN = 'camp_announcements';
export const CAMP_ATT = 'camp_attendance';
export const CAMP_PRAYERS = 'camp_prayers';
export const CAMP_JOURNAL = 'camp_journal';
export const CAMP_TESTIM = 'camp_testimonies';
export const STORE_PRODUCTS = 'store_products';
export const CAMP_SERVICE_ATT = 'camp_service_attendance';
export const CAMP_SCHEDULE = 'camp_schedule';
export const CAMP_CONFIG = 'camp_config';
export const SITE_REGS = 'site_registrations';

// Must match is_camp_manager() / is_store_or_secretary() in the SQL.
export const ROLE_EMAILS = {
  manager: 'bw.ycm.2024@gmail.com',
  store: 'bwstore2026@gmail.com',
  secretary: 'bwstore2026@gmail.com',
  mainsite: 'bw.ycm.2024@gmail.com',
};

// ═══════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════
export const auth = { currentUser: null };

const authListeners = new Set();

function mapAuthUser(sessionUser) {
  if (!sessionUser) return null;
  return { email: sessionUser.email, uid: sessionUser.id };
}

function notifyAuth(user) {
  auth.currentUser = user;
  authListeners.forEach((cb) => {
    try { cb(user); } catch (e) { console.error(e); }
  });
}

function throwAuthError(err) {
  const e = new Error(err.message || 'Authentication failed');
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) e.code = 'auth/invalid-credential';
  else if (msg.includes('email not confirmed')) e.code = 'auth/email-not-verified';
  else if (msg.includes('too many') || msg.includes('rate limit')) e.code = 'auth/too-many-requests';
  else if (msg.includes('invalid') && msg.includes('email')) e.code = 'auth/invalid-email';
  else e.code = 'auth/network-request-failed';
  throw e;
}

supabase.auth.onAuthStateChange((_event, session) => {
  notifyAuth(mapAuthUser(session?.user ?? null));
});

/**
 * Calls `callback(user)` once with the current session, then again only when
 * the signed-in user actually changes (sign-in / sign-out). Token refreshes do
 * not re-fire it, so page `initAll()` code never runs twice.
 */
export function onAuthStateChanged(_auth, callback) {
  let delivered = false;
  let lastUid;
  let stopped = false;

  const deliver = (user) => {
    const uid = user ? user.uid : null;
    if (delivered && uid === lastUid) return;
    delivered = true;
    lastUid = uid;
    try { callback(user); } catch (e) { console.error(e); }
  };

  supabase.auth.getSession().then(({ data }) => {
    if (!stopped) deliver(mapAuthUser(data.session?.user ?? null));
  });

  const listener = (user) => { if (!stopped && delivered) deliver(user); };
  authListeners.add(listener);

  return () => { stopped = true; authListeners.delete(listener); };
}

export async function signInWithEmailAndPassword(_auth, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throwAuthError(error);
  const user = mapAuthUser(data.user);
  notifyAuth(user);
  return { user };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throwAuthError(error);
  notifyAuth(null);
}

export async function sendPasswordResetEmail(_auth, email) {
  // Land back on the camp admin login page.
  const base = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, '')}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}adminlogin.html`,
  });
  if (error) throwAuthError(error);
}

// ═══════════════════════════════════════════════
//  DOCUMENT HELPERS
// ═══════════════════════════════════════════════

/** Fields stored as ISO strings in `data` that pages read back via .toDate()/.toMillis(). */
const TS_FIELDS = new Set([
  'createdAt', 'updatedAt', 'timestamp', 'markedAt',
  'depositApprovedAt', 'collectedAt',
]);

/** Real columns each table has (after supabase/camp-portal-sync.sql). */
const TABLE_COLS = {
  site_events:             ['start_date', 'created_at', 'updated_at'],
  site_config:             ['created_at', 'updated_at'],
  site_blocks:             ['page', 'block_key', 'block_type', 'created_at', 'updated_at'],
  site_registrations:      ['created_at'],
  camp_registrations:      ['created_at', 'timestamp'],
  camp_orders:             ['created_at'],
  camp_announcements:      ['created_at', 'timestamp'],
  camp_attendance:         ['session', 'registrant_id', 'created_at'],
  camp_prayers:            ['created_at', 'timestamp'],
  camp_journal:            ['created_at'],
  camp_testimonies:        ['published', 'created_at', 'timestamp'],
  store_products:          ['product_key', 'created_at', 'updated_at'],
  camp_service_attendance: ['service_date', 'created_at'],
  camp_schedule:           ['day_name', 'time_slot', 'created_at', 'updated_at'],
  camp_config:             ['updated_at'],
};

const hasCol = (table, col) => (TABLE_COLS[table] || []).includes(col);

/** Page field name  →  column name (for where / orderBy). */
const FIELD_TO_COL = {
  startDate: 'start_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  timestamp: 'timestamp',
  session: 'session',
  published: 'published',
  date: 'service_date',
  key: 'product_key',
  productKey: 'product_key',
  day: 'day_name',
  time: 'time_slot',
  registrantId: 'registrant_id',
  page: 'page',
  block_key: 'block_key',
};

/** Column name → page field name (for reading rows back). */
const COL_TO_FIELD = {
  start_date: 'startDate',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  timestamp: 'timestamp',
  session: 'session',
  published: 'published',
  service_date: 'date',
  product_key: 'key',
  day_name: 'day',
  time_slot: 'time',
  registrant_id: 'registrantId',
  page: 'page',
  block_key: 'block_key',
  block_type: 'block_type',
};

export function serverTimestamp() {
  return { _serverTimestamp: true };
}

function resolveValue(v) {
  if (v && typeof v === 'object' && v._serverTimestamp) return new Date().toISOString();
  return v;
}

function serializeData(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = resolveValue(v);
  }
  return out;
}

function makeTimestamp(val) {
  const d = val ? new Date(val) : new Date();
  if (Number.isNaN(d.getTime())) return val;
  return {
    toDate: () => d,
    toMillis: () => d.getTime(),
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
  };
}

/** Row from Supabase → plain page-shaped object. */
function rowToDoc(row) {
  if (!row) return {};
  const data = { ...(row.data || {}) };

  // Real columns win for the indexed fields (they are the source of truth).
  for (const [col, field] of Object.entries(COL_TO_FIELD)) {
    if (row[col] !== undefined && row[col] !== null) data[field] = row[col];
  }

  for (const f of TS_FIELDS) {
    if (data[f]) data[f] = makeTimestamp(data[f]);
  }
  return data;
}

/** Indexed columns derived from the fields present in `fields`. */
function columnsFromFields(table, fields) {
  const cols = {};
  const set = (col, val) => { if (hasCol(table, col)) cols[col] = val; };

  if (fields.startDate !== undefined) set('start_date', fields.startDate);
  if (fields.createdAt) set('created_at', fields.createdAt);
  if (fields.updatedAt) set('updated_at', fields.updatedAt);
  if (fields.timestamp) set('timestamp', fields.timestamp);
  if (fields.session !== undefined) set('session', fields.session);
  if (fields.published !== undefined) set('published', !!fields.published);
  if (fields.date !== undefined) set('service_date', fields.date || null);
  if (fields.key !== undefined) set('product_key', fields.key);
  if (fields.day !== undefined) set('day_name', fields.day);
  if (fields.time !== undefined) set('time_slot', fields.time);
  if (fields.registrantId !== undefined) set('registrant_id', fields.registrantId);
  if (fields.page !== undefined) set('page', fields.page);
  if (fields.block_key !== undefined) set('block_key', fields.block_key);
  if (fields.block_type !== undefined) set('block_type', fields.block_type);
  return cols;
}

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Fallback for very old browsers (RFC4122 v4)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function makeSnapshot(rows) {
  const docs = (rows || []).map((row) => ({
    id: row.id,
    data: () => rowToDoc(row),
  }));
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach(fn) { docs.forEach(fn); },
  };
}

// ═══════════════════════════════════════════════
//  QUERY BUILDING
// ═══════════════════════════════════════════════
export function collection(_db, table) {
  return { _table: table, _type: 'collection' };
}

export function doc(_db, tableOrCollection, id) {
  const table = typeof tableOrCollection === 'string' ? tableOrCollection : tableOrCollection._table;
  return { _table: table, _id: id, _type: 'doc' };
}

export function query(ref, ...constraints) {
  return { _table: ref._table, _constraints: constraints, _type: 'query' };
}

export function orderBy(field, direction = 'asc') {
  return { _type: 'orderBy', field, direction };
}

export function where(field, op, value) {
  return { _type: 'where', field, op, value };
}

function applyConstraints(builder, constraints = []) {
  let q = builder;
  let order = null;

  for (const c of constraints) {
    if (!c) continue;
    if (c._type === 'where') {
      if (c.op !== '==') throw new Error(`Unsupported where operator: ${c.op}`);
      if (c.field === 'key') {
        // Product docs are looked up by their `key` (stored in product_key)
        q = q.eq('product_key', c.value);
      } else {
        q = q.eq(FIELD_TO_COL[c.field] || c.field, c.value);
      }
    }
    if (c._type === 'orderBy') {
      order = { col: FIELD_TO_COL[c.field] || c.field, ascending: c.direction === 'asc' };
    }
  }

  if (order) q = q.order(order.col, { ascending: order.ascending });
  return q;
}

// ═══════════════════════════════════════════════
//  READ
// ═══════════════════════════════════════════════
export async function getDocs(ref) {
  let q = supabase.from(ref._table).select('*');
  q = applyConstraints(q, ref._constraints || []);
  const { data, error } = await q;
  if (error) throw error;
  return makeSnapshot(data || []);
}

export async function getDoc(docRef) {
  const { data, error } = await supabase
    .from(docRef._table)
    .select('*')
    .eq('id', docRef._id)
    .maybeSingle();
  if (error) throw error;
  return {
    exists: () => !!data,
    id: docRef._id,
    data: () => rowToDoc(data),
  };
}

// ═══════════════════════════════════════════════
//  WRITE
// ═══════════════════════════════════════════════

/**
 * Insert a record. The id is generated here and the row is NOT read back —
 * public visitors can insert testimonies / prayers / orders / registrations but
 * (by design) cannot SELECT them, and an insert-then-select would be rejected.
 */
export async function addDoc(colRef, rawData) {
  const table = colRef._table;
  const data = serializeData(rawData);
  const id = newId();
  const now = new Date().toISOString();

  const row = { id, data, ...columnsFromFields(table, data) };
  if (hasCol(table, 'created_at') && !row.created_at) row.created_at = now;
  if (hasCol(table, 'timestamp') && !row.timestamp) row.timestamp = row.created_at || now;

  const { error } = await supabase.from(table).insert(row);
  if (error) throw error;
  return { id };
}

/** Create or fully replace a record with a known id. */
export async function setDoc(docRef, rawData) {
  const table = docRef._table;
  const data = serializeData(rawData);
  const row = { id: docRef._id, data, ...columnsFromFields(table, data) };
  const { error } = await supabase.from(table).upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * Merge `rawData` into an existing record (like Firestore updateDoc).
 * Existing fields not mentioned are kept, and created_at is never touched.
 */
export async function updateDoc(docRef, rawData) {
  const table = docRef._table;
  const patch = serializeData(rawData);

  const { data: existing, error: readErr } = await supabase
    .from(table).select('data').eq('id', docRef._id).maybeSingle();
  if (readErr) throw readErr;
  if (!existing) throw new Error('Record not found, or you do not have permission to change it.');

  const row = {
    data: { ...(existing.data || {}), ...patch },
    ...columnsFromFields(table, patch),
  };

  const { data: updated, error } = await supabase
    .from(table).update(row).eq('id', docRef._id).select('id');
  if (error) throw error;
  if (!updated || !updated.length) throw new Error('Update was not permitted for this account.');
}

export async function deleteDoc(docRef) {
  const { data: removed, error } = await supabase
    .from(docRef._table).delete().eq('id', docRef._id).select('id');
  if (error) throw error;
  if (!removed || !removed.length) throw new Error('Delete was not permitted for this account.');
}

// ═══════════════════════════════════════════════
//  LIVE UPDATES
// ═══════════════════════════════════════════════
let listenerCount = 0;

/**
 * Calls `callback(snapshot)` now and again whenever the table changes.
 * Each listener owns its own realtime channel, and a 60s refresh is kept as a
 * safety net in case a realtime message is missed. Returns an unsubscribe fn.
 */
export function onSnapshot(ref, callback, onError) {
  const table = ref._table;
  let alive = true;
  let seq = 0;
  let timer = null;

  const run = async () => {
    const mine = ++seq;
    try {
      let snap;
      if (ref._type === 'doc') {
        const d = await getDoc(ref);
        snap = d;
      } else {
        snap = await getDocs(ref);
      }
      if (!alive || mine !== seq) return;   // a newer fetch superseded this one
      callback(snap);
    } catch (err) {
      if (!alive) return;
      if (onError) onError(err); else console.error(err);
    }
  };

  const soon = () => { clearTimeout(timer); timer = setTimeout(run, 150); };

  run();

  const channel = supabase
    .channel(`camp-${table}-${++listenerCount}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, soon)
    .subscribe();

  const poll = setInterval(() => { if (!document.hidden) run(); }, 60000);

  return () => {
    alive = false;
    clearTimeout(timer);
    clearInterval(poll);
    supabase.removeChannel(channel);
  };
}

// ═══════════════════════════════════════════════
//  PUBLIC COUNTS
// ═══════════════════════════════════════════════
/**
 * Registration + order totals for the public camp landing page.
 * Uses a SECURITY DEFINER function so visitors get counts only, never the
 * personal details inside the rows.
 */
export async function getCampStats() {
  const { data, error } = await supabase.rpc('camp_public_stats');
  if (error) throw error;
  return { registrations: Number(data?.registrations) || 0, orders: Number(data?.orders) || 0 };
}