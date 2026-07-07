// ═══════════════════════════════════════════════
// AFC Botswana — Supabase backend
// Firebase-compatible API for existing camp + site pages
// ═══════════════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';

const SUPABASE_URL = 'https://jtcjglwshplladajayud.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Y2pnbHdzaHBsbGFkYWpheXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTEwMjIsImV4cCI6MjA5ODkyNzAyMn0.zwei8yot9yP6EfmqbpfYAZhlnbl9FaUXlwjVkPAc0Ks';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** @deprecated Kept for import compatibility — use `supabase` instead */
export const db = { _supabase: true };

// ── TABLE NAMES (same as former Firestore collections) ──
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

export const ROLE_EMAILS = {
  manager: 'bw.ycm.2024@gmail.com',
  store: 'bwstore2026@gmail.com',
  secretary: 'bwstore2026@gmail.com',
  mainsite: 'bw.ycm.2024@gmail.com',
};

// ── AUTH (Firebase-shaped) ──
export const auth = { currentUser: null };

const authListeners = new Set();
let authReady = false;

function notifyAuth(user) {
  auth.currentUser = user;
  authListeners.forEach((cb) => {
    try { cb(user); } catch (e) { console.error(e); }
  });
}

function mapAuthUser(sessionUser) {
  if (!sessionUser) return null;
  return { email: sessionUser.email, uid: sessionUser.id };
}

function mapAuthError(err) {
  const e = new Error(err.message || 'Authentication failed');
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) e.code = 'auth/invalid-credential';
  else if (msg.includes('email not confirmed')) e.code = 'auth/user-not-found';
  else if (msg.includes('too many')) e.code = 'auth/too-many-requests';
  else e.code = 'auth/network-request-failed';
  throw e;
}

supabase.auth.onAuthStateChange((_event, session) => {
  notifyAuth(mapAuthUser(session?.user ?? null));
  authReady = true;
});

supabase.auth.getSession().then(({ data }) => {
  if (!authReady) notifyAuth(mapAuthUser(data.session?.user ?? null));
});

export function onAuthStateChanged(_auth, callback) {
  supabase.auth.getSession().then(({ data }) => {
    callback(mapAuthUser(data.session?.user ?? null));
  });
  authListeners.add(callback);
  return () => authListeners.delete(callback);
}

export async function signInWithEmailAndPassword(_auth, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) mapAuthError(error);
  const user = mapAuthUser(data.user);
  notifyAuth(user);
  return { user };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) mapAuthError(error);
  notifyAuth(null);
}

export async function sendPasswordResetEmail(_auth, email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, '')}admin.html`,
  });
  if (error) mapAuthError(error);
}

// ── FIRESTORE COMPAT HELPERS ──
const TS_FIELDS = new Set([
  'createdAt', 'updatedAt', 'timestamp', 'markedAt',
  'depositApprovedAt', 'collectedAt',
]);

const INDEX_COLS = {
  site_events: ['start_date', 'created_at'],
  site_registrations: ['created_at'],
  camp_registrations: ['created_at', 'timestamp'],
  camp_orders: ['created_at'],
  camp_announcements: ['timestamp'],
  camp_attendance: ['session'],
  camp_prayers: ['created_at'],
  camp_journal: ['created_at'],
  camp_testimonies: ['timestamp', 'published'],
  store_products: ['product_key'],
  camp_service_attendance: ['service_date', 'created_at'],
  camp_schedule: ['day_name', 'time_slot'],
};

const FIELD_TO_COL = {
  startDate: 'start_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  timestamp: 'timestamp',
  session: 'session',
  published: 'published',
  date: 'service_date',
  key: 'product_key',
  day: 'day_name',
  time: 'time_slot',
  registrantId: 'registrant_id',
  page: 'page',
  block_key: 'block_key',
};

const COL_TO_FIELD = Object.fromEntries(
  Object.entries(FIELD_TO_COL).map(([k, v]) => [v, k])
);

function serverTimestamp() {
  return { _serverTimestamp: true };
}

function resolveValue(v) {
  if (v && typeof v === 'object' && v._serverTimestamp) {
    return new Date().toISOString();
  }
  return v;
}

function serializeData(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
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
  };
}

function rowToDoc(row) {
  if (!row) return {};
  const data = { ...(row.data || {}) };
  for (const [col, field] of Object.entries(COL_TO_FIELD)) {
    if (row[col] !== undefined && row[col] !== null && data[field] === undefined) {
      data[field] = row[col];
    }
  }
  for (const f of TS_FIELDS) {
    const col = FIELD_TO_COL[f] || f;
    const raw = data[f] ?? row[col];
    if (raw) data[f] = makeTimestamp(raw);
  }
  if (row.published !== undefined && row.published !== null) {
    data.published = row.published;
  }
  if (row.session) data.session = row.session;
  if (row.registrant_id) data.registrantId = row.registrant_id;
  if (row.page) data.page = row.page;
  if (row.block_key) data.block_key = row.block_key;
  if (row.block_type) data.block_type = row.block_type;
  return data;
}

function buildRowPayload(rawData, existingId) {
  const data = serializeData(rawData);
  const row = { data };

  if (existingId) row.id = existingId;

  if (data.startDate !== undefined) row.start_date = data.startDate;
  if (data.createdAt) row.created_at = data.createdAt;
  else if (!existingId) row.created_at = new Date().toISOString();
  if (data.updatedAt) row.updated_at = data.updatedAt;
  if (data.timestamp) row.timestamp = data.timestamp;
  else if (data.createdAt && !data.timestamp) row.timestamp = data.createdAt;
  if (data.session !== undefined) row.session = data.session;
  if (data.published !== undefined) row.published = !!data.published;
  if (data.date !== undefined) row.service_date = data.date;
  if (data.key !== undefined) row.product_key = data.key;
  if (data.day !== undefined) row.day_name = data.day;
  if (data.time !== undefined) row.time_slot = data.time;
  if (data.registrantId !== undefined) row.registrant_id = data.registrantId;
  if (data.page !== undefined) row.page = data.page;
  if (data.block_key !== undefined) row.block_key = data.block_key;
  if (data.block_type !== undefined) row.block_type = data.block_type;

  return { data, row };
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

export function collection(_db, table) {
  return { _table: table, _type: 'collection' };
}

export function doc(_db, tableOrCollection, id) {
  const table = typeof tableOrCollection === 'string'
    ? tableOrCollection
    : tableOrCollection._table;
  return { _table: table, _id: id, _type: 'doc' };
}

export function query(ref, ...constraints) {
  return {
    _table: ref._table,
    _constraints: constraints,
    _type: 'query',
  };
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
      const col = FIELD_TO_COL[c.field] || c.field;
      if (c.field === 'key') {
        q = q.or(`id.eq.${c.value},data->>key.eq.${c.value}`);
      } else if (c.field === 'productKey') {
        q = q.eq('product_key', c.value);
      } else {
        q = q.eq(col, c.value);
      }
    }
    if (c._type === 'orderBy') {
      const col = FIELD_TO_COL[c.field] || c.field;
      order = { col, ascending: c.direction === 'asc' };
    }
  }

  if (order) q = q.order(order.col, { ascending: order.ascending });
  return q;
}

async function fetchRows(table, constraints = []) {
  let q = supabase.from(table).select('*');
  q = applyConstraints(q, constraints);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getDocs(ref) {
  const table = ref._table;
  const constraints = ref._constraints || [];
  const rows = await fetchRows(table, constraints);
  return makeSnapshot(rows);
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

export async function addDoc(colRef, rawData) {
  const { row } = buildRowPayload(rawData);
  const { data, error } = await supabase
    .from(colRef._table)
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function setDoc(docRef, rawData) {
  const { row } = buildRowPayload(rawData, docRef._id);
  row.id = docRef._id;
  const { error } = await supabase.from(docRef._table).upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function updateDoc(docRef, rawData) {
  const { row } = buildRowPayload(rawData);
  delete row.id;
  const { error } = await supabase.from(docRef._table).update(row).eq('id', docRef._id);
  if (error) throw error;
}

export async function deleteDoc(docRef) {
  const { error } = await supabase.from(docRef._table).delete().eq('id', docRef._id);
  if (error) throw error;
}

const realtimeChannels = new Map();

export function onSnapshot(ref, callback, onError) {
  const table = ref._table;
  const constraints = ref._constraints || [];
  const channelKey = `${table}:${JSON.stringify(constraints)}`;

  const refresh = async () => {
    try {
      const snap = await getDocs(ref);
      callback(snap);
    } catch (err) {
      if (onError) onError(err);
      else console.error(err);
    }
  };

  refresh();

  if (!realtimeChannels.has(channelKey)) {
    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => refresh())
      .subscribe();
    realtimeChannels.set(channelKey, channel);
  }

  return () => {
    const ch = realtimeChannels.get(channelKey);
    if (ch) {
      supabase.removeChannel(ch);
      realtimeChannels.delete(channelKey);
    }
  };
}

export {
  serverTimestamp,
  INDEX_COLS,
};
