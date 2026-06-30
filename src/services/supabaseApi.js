// =====================================================================
//  SUPABASE DATA-ACCESS LAYER  (real backend)
//
//  This file mirrors the function signatures and RETURN SHAPES of the
//  mock layer in ./api.js, so a component can switch from mock → real by
//  changing a single import line. It is intentionally NOT wired in by
//  default — the app keeps running on ./api.js until you opt a module in.
//
//  WORKED EXAMPLE: Leads. To migrate the Leads module, open
//  src/components/common/LeadsModule.jsx and change:
//     import { getLeads, createLead, ... } from '../../services/api';
//  to:
//     import { getLeads, createLead, ... } from '../../services/supabaseApi';
//
//  Use the same pattern for the other modules against the schema tables.
// =====================================================================
import { supabase } from './supabaseClient';

// ----- helpers --------------------------------------------------------

// Mirror the mock's resolved shape: every call resolves to { data }.
const wrap = (data) => ({ data });

// Map a DB leads row (snake_case + joined branch) to the camelCase shape
// the existing UI components already expect.
const mapLead = (row) => ({
  id: row.id,
  name: row.full_name,
  phone: row.phone,
  email: row.email,
  branch: row.branch?.name ?? null,
  referralSource: row.referral_source,
  product: row.product,
  status: row.status,
  addedBy: row.added_by_name,
  addedAt: row.created_at,
  notes: row.notes,
});

// Branch name → id cache (the UI works with branch names; the DB uses ids).
let _branchCache = null;
const loadBranchMap = async () => {
  if (_branchCache) return _branchCache;
  const { data, error } = await supabase
    .from('branches')
    .select('id, name');
  if (error) throw error;
  _branchCache = new Map((data ?? []).map((b) => [b.name, b.id]));
  return _branchCache;
};
const branchIdByName = async (name) => {
  if (!name) return null;
  const map = await loadBranchMap();
  return map.get(name) ?? null;
};

// =====================================================================
//  AUTH  (replaces the mock login() once you adopt real auth)
// =====================================================================
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return wrap(data);
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return wrap({ message: 'Signed out' });
};

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return wrap(data.session);
};

// Subscribe to auth changes. Returns the unsubscribe function.
export const onAuthChange = (callback) => {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
};

// Current user's profile row (role, branch, etc.).
export const getMyProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return wrap(null);
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return wrap(data);
};

// =====================================================================
//  BRANCHES
// =====================================================================
export const getBranches = async () => {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return wrap(data ?? []);
};

// =====================================================================
//  LEADS  (worked example — full CRUD + bulk import)
// =====================================================================
export const getLeads = async () => {
  const { data, error } = await supabase
    .from('leads')
    .select('*, branch:branches(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapLead));
};

export const createLead = async (payload = {}) => {
  const branch_id = await branchIdByName(payload.branch);
  const row = {
    full_name: payload.name,
    phone: payload.phone,
    email: payload.email || null,
    branch_id,
    referral_source: payload.referralSource || null,
    product: payload.product || null,
    notes: payload.notes || null,
    status: 'New',
    added_by_name: payload.addedBy || null,
  };
  const { data, error } = await supabase
    .from('leads')
    .insert(row)
    .select('*, branch:branches(name)')
    .single();
  if (error) throw error;
  return wrap({ message: 'Potential client created', lead: mapLead(data) });
};

export const updateLeadStatus = async (id, status) => {
  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Lead status updated', id, status });
};

export const convertLead = async (id) => {
  const { error } = await supabase
    .from('leads')
    .update({ status: 'Converted' })
    .eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Lead converted to customer', id });
};

// Bulk import from a parsed spreadsheet. Validates name+phone, de-dups by
// phone (digits only) against existing rows and within the batch, then
// inserts the valid, unique rows. Returns the same summary shape the mock
// returned so the import modal works unchanged.
export const importLeads = async (rows = [], addedBy = 'Import') => {
  const norm = (s) => String(s ?? '').trim();
  const digits = (s) => norm(s).replace(/\D/g, '');

  // existing phones already in the table
  const { data: existing, error: exErr } = await supabase
    .from('leads')
    .select('phone');
  if (exErr) throw exErr;
  const existingPhones = new Set((existing ?? []).map((l) => digits(l.phone)).filter(Boolean));
  const seenPhones = new Set();

  const branchMap = await loadBranchMap();
  const toInsert = [];
  const duplicates = [];
  const invalid = [];

  rows.forEach((raw, i) => {
    const name = norm(raw.name);
    const phone = norm(raw.phone);
    const phoneKey = digits(phone);
    if (!name || !phone) {
      invalid.push({ row: i + 1, reason: 'Missing name or phone', data: raw });
      return;
    }
    if (phoneKey && (existingPhones.has(phoneKey) || seenPhones.has(phoneKey))) {
      duplicates.push({ row: i + 1, name, phone });
      return;
    }
    if (phoneKey) seenPhones.add(phoneKey);
    toInsert.push({
      full_name: name,
      phone,
      branch_id: branchMap.get(norm(raw.branch) || 'Gaborone') ?? null,
      product: norm(raw.product) || 'General Enquiry',
      referral_source: norm(raw.referralSource) || 'Spreadsheet Import',
      notes: norm(raw.notes),
      status: 'New',
      added_by_name: addedBy,
    });
  });

  let importedLeads = [];
  if (toInsert.length) {
    const { data, error } = await supabase
      .from('leads')
      .insert(toInsert)
      .select('*, branch:branches(name)');
    if (error) throw error;
    importedLeads = (data ?? []).map(mapLead);
  }

  return wrap({
    message: `${importedLeads.length} potential client(s) imported`,
    summary: {
      received: rows.length,
      imported: importedLeads.length,
      duplicates: duplicates.length,
      invalid: invalid.length,
    },
    importedLeads,
    duplicates,
    invalid,
  });
};
