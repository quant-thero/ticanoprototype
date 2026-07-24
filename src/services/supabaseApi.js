// SUPABASE DATA-ACCESS LAYER (real backend)
//
// This file mirrors the function signatures and RETURN SHAPES of the
// mock layer in ./api.js, so a component can switch from mock → real by
// changing a single import line. It is intentionally NOT wired in by
// default, the app keeps running on ./api.js until you opt a module in.
//
// WORKED EXAMPLE: Leads. To migrate the Leads module, open
// src/components/common/LeadsModule.jsx and change:
// import { getLeads, createLead... } from '../../services/api';
// to:
// import { getLeads, createLead... } from '../../services/supabaseApi';
//
// Use the same pattern for the other modules against the schema tables.
import { supabase } from './supabaseClient';
import { COMPANY_PROFILE, COMPANY_MISSION, COMPANY_VISION, BRANCHES, AGING_BUCKETS, SLA_BREACH_DAYS } from '../utils/constants';

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
  referralSource: row.referral_source?.name || row.referral_source_text || null,
  product: row.product,
  status: row.status,
  addedBy: row.added_by_name,
  addedAt: row.created_at,
  applicationDate: row.created_at,
  notes: row.notes,
  assignedPmId: row.assigned_pm_id ?? null,
  assignedPmName: row.assigned_pm?.full_name ?? null,
  // Application-context fields (migration 015), so a PM has full context
  // on the "Potential Clients" list without opening another profile page.
  companyName: row.company_name ?? null,
  industry: row.industry ?? null,
  projectScope: row.project_scope ?? null,
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

let _referralSourceCache = null;
const loadReferralSourceMap = async () => {
  if (_referralSourceCache) return _referralSourceCache;
  const { data, error } = await supabase.from('referral_sources').select('id, name');
  if (error) throw error;
  _referralSourceCache = new Map((data ?? []).map((r) => [r.name, r.id]));
  return _referralSourceCache;
};
const referralSourceIdByName = async (name) => {
  if (!name) return null;
  const map = await loadReferralSourceMap();
  return map.get(name) ?? null;
};

// Several tables (homepage_promos.image_url, blog_posts.image_url,
// job_applications.cv_url) expect a real Storage URL, but editor UIs in
// this app capture uploads as base64 data URLs for instant preview. This
// converts a data URL to a Blob and uploads it. For public buckets it
// returns a public URL; for private buckets (like `cvs`) it returns the
// storage PATH instead, a public URL wouldn't actually be accessible for
// a private bucket, so callers must generate a signed URL to view it
// (see getSignedCvUrl).
async function uploadDataUrlToStorage(bucket, dataUrl, pathPrefix = '', isPrivate = false) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl; // already a URL/path, or empty
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = (blob.type.split('/')[1] || 'jpg').split('+')[0];
  const path = `${pathPrefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  if (isPrivate) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// AUTH (replaces the mock login() once you adopt real auth)
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // Only meaningfully logged for staff, customers logging in isn't a
  // security-relevant event the same way, and RLS only allows an
  // authenticated staff session to write to system_audit_log anyway.
  logSystemEvent('Security', 'Logged in', email).catch(() => {});
  return wrap(data);
};

export const signOut = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  logSystemEvent('Security', 'Logged out', user?.email || 'unknown').catch(() => {});
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

// Current user's profile, joins users + client_profiles/staff_profiles via
// auth_user_id (see supabase/migrations/001_auth_link_and_rls.sql).
// Returns a camelCase shape matching what AuthContext/the rest of the app
// already expects: { id, name, email, role, branch, clientType... }
export const getMyProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return wrap(null);

  const { data: appUser, error } = await supabase
    .from('users')
    .select('id, full_name, email, whatsapp_number, avatar_url, role, is_active, must_change_password, branch:branches(name)')
    .eq('auth_user_id', user.id)
    .single();
  if (error) throw error;
  if (!appUser) return wrap(null);

  // Notification/theme prefs apply to every role, so fetch once here.
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('notify_email, notify_whatsapp, notify_in_app, dark_mode')
    .eq('user_id', appUser.id)
    .maybeSingle();

  const base = {
    id: appUser.id,
    name: appUser.full_name,
    email: appUser.email,
    whatsappNumber: appUser.whatsapp_number,
    mobile: appUser.whatsapp_number,
    avatar: appUser.avatar_url ?? null,
    role: appUser.role,
    branch: appUser.branch?.name ?? null,
    isActive: appUser.is_active,
    mustChangePassword: appUser.must_change_password,
    notifyEmail: prefs?.notify_email ?? true,
    notifyWhatsApp: prefs?.notify_whatsapp ?? true,
    notifyInApp: prefs?.notify_in_app ?? true,
  };

  if (appUser.role === 'customer') {
    const { data: clientProfile } = await supabase
      .from('client_profiles')
      .select('client_code, client_type, industry, preferred_branch_id, assigned_pm_id, created_at, location_sharing_opt_in, base_location, physical_address, city, marital_status, gender, nationality, occupation, emergency_contact_name, emergency_contact_number, birthday_messages_opt_in, date_of_birth, tender_notifications_opt_in')
      .eq('user_id', appUser.id)
      .maybeSingle();

    // Two separate lookups instead of embedding both in the query above
    // client_profiles has TWO foreign keys into users (user_id for the
    // client's own row, assigned_pm_id for their PM), which makes a
    // single embedded `assigned_pm:users!assigned_pm_id(...)` join
    // ambiguous for PostgREST to resolve reliably. This is the same class
    // of fragile-embedded-join bug found and fixed in
    // getUnassignedCustomers(), separate, plain queries are predictable.
    const [branchResult, pmResult] = await Promise.all([
      clientProfile?.preferred_branch_id
        ? supabase.from('branches').select('name').eq('id', clientProfile.preferred_branch_id).maybeSingle()
        : Promise.resolve({ data: null }),
      clientProfile?.assigned_pm_id
        ? supabase.from('users').select('full_name').eq('id', clientProfile.assigned_pm_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return wrap({
      ...base,
      clientId: clientProfile?.client_code ?? null,
      clientType: clientProfile?.client_type ?? 'new',
      preferredBranch: branchResult.data?.name ?? null,
      assignedPmId: clientProfile?.assigned_pm_id ?? null,
      assignedPmName: pmResult.data?.full_name ?? null,
      assignmentStatus: clientProfile?.assigned_pm_id ? 'assigned' : 'unassigned',
      createdAt: clientProfile?.created_at ?? null,
      locationSharingOptIn: clientProfile?.location_sharing_opt_in ?? true,
      baseLocation: clientProfile?.base_location ?? null,
      address: clientProfile?.physical_address ?? '',
      city: clientProfile?.city ?? '',
      maritalStatus: clientProfile?.marital_status ?? '',
      gender: clientProfile?.gender ?? '',
      nationality: clientProfile?.nationality ?? 'Motswana',
      occupation: clientProfile?.occupation ?? '',
      emergencyName: clientProfile?.emergency_contact_name ?? '',
      emergencyNumber: clientProfile?.emergency_contact_number ?? '',
      birthdayMessagesOptIn: clientProfile?.birthday_messages_opt_in ?? false,
      birthday: clientProfile?.date_of_birth ?? null,
      dob: clientProfile?.date_of_birth ?? null,
      tenderNotificationsOptIn: clientProfile?.tender_notifications_opt_in ?? false,
    });
  }

  const { data: staffProfile } = await supabase
    .from('staff_profiles')
    .select('staff_code, job_title, category_strengths')
    .eq('user_id', appUser.id)
    .maybeSingle();
  return wrap({
    ...base,
    staffId: staffProfile?.staff_code ?? null,
    jobTitle: staffProfile?.job_title ?? null,
    categoryStrengths: staffProfile?.category_strengths ?? [],
  });
};

// Self-service profile update, this is the piece the client app was
// missing entirely. Splits the incoming patch across `users` (name,
// mobile, avatar), `client_profiles` (customer-only fields), and
// `user_preferences` (notification toggles/dark mode, both roles), then
// re-reads the full profile so the caller always gets back what's
// actually now in the database.
export const updateMyProfile = async (patch = {}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: appUser, error: findErr } = await supabase
    .from('users').select('id, role').eq('auth_user_id', user.id).single();
  if (findErr) throw findErr;
  if (!appUser) throw new Error('No matching profile found for this account');

  // -- users table --
  const usersPatch = {};
  if (patch.name !== undefined) usersPatch.full_name = patch.name;
  if (patch.whatsappNumber !== undefined) usersPatch.whatsapp_number = patch.whatsappNumber;
  else if (patch.mobile !== undefined) usersPatch.whatsapp_number = patch.mobile;
  if (patch.avatarDataUrl !== undefined) {
    usersPatch.avatar_url = await uploadDataUrlToStorage('avatars', patch.avatarDataUrl, `users/${appUser.id}/`);
  }
  if (Object.keys(usersPatch).length) {
    const { error } = await supabase.from('users').update(usersPatch).eq('id', appUser.id);
    if (error) throw error;
  }

  // -- client_profiles table (customers only) --
  if (appUser.role === 'customer') {
    const fieldMap = {
      address: 'physical_address', city: 'city', baseLocation: 'base_location',
      maritalStatus: 'marital_status', gender: 'gender', nationality: 'nationality',
      occupation: 'occupation', emergencyName: 'emergency_contact_name', emergencyNumber: 'emergency_contact_number',
      locationSharingOptIn: 'location_sharing_opt_in', birthdayMessagesOptIn: 'birthday_messages_opt_in',
      tenderNotificationsOptIn: 'tender_notifications_opt_in',
    };
    const cpPatch = {};
    for (const [key, col] of Object.entries(fieldMap)) {
      if (patch[key] !== undefined) cpPatch[col] = patch[key];
    }
    if (patch.dob !== undefined) cpPatch.date_of_birth = patch.dob || null;
    else if (patch.birthday !== undefined) cpPatch.date_of_birth = patch.birthday || null;
    if (Object.keys(cpPatch).length) {
      const { error } = await supabase.from('client_profiles').upsert({ user_id: appUser.id, ...cpPatch }, { onConflict: 'user_id' });
      if (error) throw error;
    }
  }

  // -- user_preferences table (both roles) --
  const prefMap = { notifyEmail: 'notify_email', notifyWhatsApp: 'notify_whatsapp', notifyInApp: 'notify_in_app', darkMode: 'dark_mode' };
  const prefPatch = {};
  for (const [key, col] of Object.entries(prefMap)) {
    if (patch[key] !== undefined) prefPatch[col] = patch[key];
  }
  if (Object.keys(prefPatch).length) {
    const { error } = await supabase.from('user_preferences').upsert({ user_id: appUser.id, ...prefPatch }, { onConflict: 'user_id' });
    if (error) throw error;
  }

  return getMyProfile();
};

// Self-service password change (Profile › Password tab). Unlike
// updatePassword() above, which runs after a recovery-link or forced
// first-login flow where the person is already freshly authenticated
// this one re-verifies the CURRENT password first, since Supabase's
// updateUser({password}) call otherwise has no way to check it.
export const changeMyPassword = async (currentPassword, newPassword) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Not signed in');
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (verifyError) {
    const e = new Error('Current password is incorrect');
    e.response = { status: 400, data: { message: 'Current password is incorrect' } };
    throw e;
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return wrap({ message: 'Password updated' });
};

// Customer self-registration: creates the Supabase Auth account, then the
// matching `users` + `client_profiles` rows. RLS (users_insert_self /
// client_profiles_insert_self) only allows a freshly authenticated user to
// insert their OWN row, and only with role='customer', so this can never
// be used to create staff accounts.
// Creates the users + client_profiles rows for a newly (or just-confirmed)
// authenticated customer, using whichever fields are available. Shared by
// signUp() (immediate case, email confirmation off) and
// completePendingSignup() (deferred case, confirmation was required).
async function createCustomerProfile(authUserId, fields) {
  const { name, email, whatsappNumber, preferredBranch, referralSource, referredByName, industry,
    clientType, birthday, birthdayMessagesOptIn, locationSharingOptIn,
    tenderNotificationsOptIn, baseLocation } = fields;

  const branchId = await branchIdByName(preferredBranch);
  const referralSourceId = await referralSourceIdByName(referralSource);

  const { data: appUser, error: userError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUserId,
      full_name: name,
      email,
      whatsapp_number: whatsappNumber,
      role: 'customer',
      branch_id: branchId,
    })
    .select('id, full_name, role')
    .single();
  if (userError) throw userError;

  const { error: clientError } = await supabase.from('client_profiles').insert({
    user_id: appUser.id,
    client_type: clientType === 'existing' ? 'existing' : 'new',
    preferred_branch_id: branchId,
    industry: industry || null,
    location_sharing_opt_in: Boolean(locationSharingOptIn),
    birthday_messages_opt_in: Boolean(birthdayMessagesOptIn),
    date_of_birth: birthdayMessagesOptIn ? birthday : null,
    base_location: locationSharingOptIn ? baseLocation : null,
    tender_notifications_opt_in: Boolean(tenderNotificationsOptIn),
    referral_source_id: referralSourceId,
    referral_other_text: referralSourceId ? null : (referralSource || null),
    referred_by_name: referredByName || null,
  });
  if (clientError) throw clientError;
  // Note: assigned_pm_id on client_profiles is deliberately left NULL here
  // every self-registered client (new or existing) lands on the Service
  // Manager's "Unassigned" list, to be assigned (or auto-assigned) a PM for
  // ongoing support from there. See getUnassignedCustomers/autoAssignCustomers.

  // A client who tells us they're NEW to Ticano (not existing) is a sales
  // lead that needs a PM to reach out, route that lead now to whichever
  // active PM in their preferred branch currently has the lightest load.
  // This is separate from the support-assignment above: it's what makes
  // the client show up on that PM's (and the Service Manager's)
  // "Potential Clients" / Leads tab right away.
  //
  // This runs through a SECURITY DEFINER RPC rather than a direct insert
  // here, because a brand-new customer's own session can only see their
  // own users/client_profiles row under RLS, it has no way to read PM
  // headcount or current lead load to balance against. See
  // assign_signup_lead() in migrations/013_leads_pm_assignment_and_signup_fixes.sql.
  if (clientType !== 'existing') {
    const { error: rpcError } = await supabase.rpc('assign_signup_lead', { p_customer_user_id: appUser.id });
    if (rpcError) {
      // Never let lead-routing trouble block account creation itself.
      console.error('[createCustomerProfile] assign_signup_lead failed:', rpcError);
    }
  }

  // Tell the Service Manager (and Director) a new client just registered
  // and is sitting unassigned, without this, the only way they'd ever
  // find out is by remembering to check the Unassigned tab. Runs through
  // a SECURITY DEFINER RPC (migration 014) because the brand-new
  // customer's own session can't insert a staff-audience notification row
  // directly (notifications_insert_staff requires is_staff()).
  const { error: notifyError } = await supabase.rpc('notify_new_client_signup', { p_customer_user_id: appUser.id });
  if (notifyError) {
    console.error('[createCustomerProfile] notify_new_client_signup failed:', notifyError);
  }

  return { id: appUser.id, name: appUser.full_name, role: appUser.role, branch: preferredBranch };
}

export const signUp = async (payload = {}) => {
  const { email, password, ...profileFields } = payload;

  // Stash every registration field as auth user metadata, this survives
  // regardless of whether email confirmation is required, since it lives
  // on the auth.users row itself, not something we control the timing of.
  // Without this, a project with confirmation ON would silently lose all
  // of the person's registration details (branch, referral source,
  // birthday, etc.) by the time they actually confirm and log in.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email, password,
    options: { data: { ...profileFields, email, pending_customer_signup: true } },
  });
  if (authError) throw authError;

  if (!authData.session) {
    // Email confirmation is required before a session exists (authData.user
    // is truthy even in this case, checking that alone is the classic bug
    // here). Without a session, auth.uid() is null for any insert we try
    // right now, which RLS would reject. The users/client_profiles rows get
    // created on first real sign-in instead, see completePendingSignup(),
    // called automatically from AuthContext once a session actually exists.
    return wrap({ pendingEmailConfirmation: true });
  }

  const profile = await createCustomerProfile(authData.user.id, { email, ...profileFields });
  return wrap(profile);
};

// Called once, automatically, the first time a customer who signed up
// under email-confirmation-required actually gets a real session (i.e.
// right after they confirm and log in). Reads back the registration data
// stashed in auth user metadata and finishes creating their profile.
export const completePendingSignup = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.user_metadata?.pending_customer_signup) return null;

  const { data: existing } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle();
  if (existing) return null; // already created, nothing to do

  const profile = await createCustomerProfile(user.id, user.user_metadata);
  // Clear the flag so this never re-runs for this account.
  await supabase.auth.updateUser({ data: { pending_customer_signup: false } });
  return profile;
};

// BRANCHES
const mapBranch = (row) => ({
  id: row.id, name: row.name, isActive: row.is_active, address: row.address, city: row.city,
  country: row.country, phone: row.phone, email: row.email, manager: row.manager_name,
  openHours: row.open_hours, region: row.region, lat: row.latitude, lng: row.longitude,
});

export const getBranches = async () => {
  const { data, error } = await supabase.from('branches').select('*').order('name', { ascending: true });
  if (error) throw error;
  return wrap((data ?? []).map(mapBranch));
};

// Active branches that have map coordinates, the single source the map,
// listings and search all read from.
export const getMapBranches = async () => {
  const { data, error } = await supabase.from('branches').select('*').eq('is_active', true).not('latitude', 'is', null).not('longitude', 'is', null);
  if (error) throw error;
  return wrap((data ?? []).map(mapBranch));
};

export const createBranch = async (payload = {}) => {
  const { data, error } = await supabase.from('branches').insert({
    name: (payload.name || '').trim() || 'New Branch',
    is_active: payload.isActive !== false,
    address: payload.address || null, city: payload.city || payload.name || null,
    country: payload.country || 'Botswana', phone: payload.phone || null,
    email: payload.email || null, manager_name: payload.manager || null,
    open_hours: payload.openHours || 'Mon-Fri 08:00-17:00, Sat 09:00-12:00',
    region: payload.region || null,
    latitude: typeof payload.lat === 'number' ? payload.lat : null,
    longitude: typeof payload.lng === 'number' ? payload.lng : null,
  }).select().single();
  if (error) throw error;
  logSystemEvent('Branches', 'Created branch', 'Admin', payload.name).catch(() => {});
  return wrap({ message: 'Branch created', branch: mapBranch(data) });
};

export const updateBranch = async (id, payload = {}) => {
  const patch = {};
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;
  if (payload.address !== undefined) patch.address = payload.address;
  if (payload.city !== undefined) patch.city = payload.city;
  if (payload.country !== undefined) patch.country = payload.country;
  if (payload.phone !== undefined) patch.phone = payload.phone;
  if (payload.email !== undefined) patch.email = payload.email;
  if (payload.manager !== undefined) patch.manager_name = payload.manager;
  if (payload.openHours !== undefined) patch.open_hours = payload.openHours;
  if (payload.region !== undefined) patch.region = payload.region;
  if (payload.lat !== undefined) patch.latitude = payload.lat;
  if (payload.lng !== undefined) patch.longitude = payload.lng;

  const { data, error } = await supabase.from('branches').update(patch).eq('id', id).select().single();
  if (error) throw error;
  logSystemEvent('Branches', 'Updated branch', 'Admin', data.name).catch(() => {});
  return wrap({ message: 'Branch updated', branch: mapBranch(data) });
};

// Branches with existing complaints (branch_id is NOT NULL / ON DELETE
// RESTRICT there) can't be hard-deleted, Postgres will raise a foreign-key
// violation (23503). Surface that as a friendly message rather than a raw
// DB error, other tables (users, feedback, leads...) just SET NULL so they
// don't block deletion.
export const deleteBranch = async (id) => {
  const { data: branch } = await supabase.from('branches').select('name').eq('id', id).maybeSingle();
  const { error } = await supabase.from('branches').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') {
      throw new Error('This branch has existing complaints or other records tied to it and can\u2019t be deleted. Deactivate it instead to hide it from staff and clients.');
    }
    throw error;
  }
  logSystemEvent('Branches', 'Deleted branch', 'Admin', branch?.name || `#${id}`).catch(() => {});
  return wrap({ message: 'Branch deleted', id });
};

// LEADS (worked example, full CRUD + bulk import)
export const getLeads = async () => {
  const { id: userId, role } = await getCurrentAppUser();

  let query = supabase
    .from('leads')
    .select('*, branch:branches(name), referral_source:referral_sources(name), assigned_pm:users!assigned_pm_id(full_name)')
    .order('created_at', { ascending: false });

  if (role === 'portfolio_manager' && userId) {
    query = query.or(`assigned_pm_id.eq.${userId},added_by_user_id.eq.${userId}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return wrap((data ?? []).map(mapLead));
};

export const createLead = async (payload = {}) => {
  const branch_id = await branchIdByName(payload.branch);
  const referral_source_id = await referralSourceIdByName(payload.referralSource);
  const { id: userId, role, name: userName } = await getCurrentAppUser();
  const row = {
    full_name: payload.name,
    phone: payload.phone,
    email: payload.email || null,
    branch_id,
    referral_source_id,
    referral_source_text: payload.referralSource || null,
    product: payload.product || null,
    company_name: payload.companyName || null,
    industry: payload.industry || null,
    project_scope: payload.projectScope || null,
    notes: payload.notes || null,
    status: 'New',
    added_by_user_id: userId,
    added_by_name: payload.addedBy || userName || null,
    // A PM capturing their own walk-in/enquiry owns it from the start, so
    // it immediately shows up on their "Potential Clients" tab rather than
    // sitting unrouted until someone manually assigns it.
    assigned_pm_id: role === 'portfolio_manager' ? userId : null,
  };
  const { data, error } = await supabase
    .from('leads')
    .insert(row)
    .select('*, branch:branches(name), referral_source:referral_sources(name), assigned_pm:users!assigned_pm_id(full_name)')
    .single();
  if (error) {
    // uq_leads_phone_digits, this phone number (any formatting) already
    // belongs to another lead. Postgres' own message here is a cryptic
    // constraint name, not something to show someone filling out a form.
    if (error.code === '23505' && error.message?.includes('uq_leads_phone_digits')) {
      const err = new Error('This phone number is already registered to another potential client.');
      err.code = 'duplicate_phone';
      throw err;
    }
    throw error;
  }
  return wrap({ message: 'Potential client created', lead: mapLead(data) });
};

export const getActivePms = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, branch:branches(name)')
    .eq('role', 'portfolio_manager')
    .eq('is_active', true)
    .order('full_name', { ascending: true });
  if (error) throw error;
  return wrap((data ?? []).map((p) => ({ id: p.id, name: p.full_name, branch: p.branch?.name ?? null })));
};

// Assigns a single lead to a PM. If no pmId is given, the server picks the
// least-loaded active PM in the lead's branch (falling back org-wide) and
// notifies them, see assign_lead_to_pm() in migration 014.
export const assignLead = async (leadId, pmId = null) => {
  const { data, error } = await supabase.rpc('assign_lead_to_pm', { p_lead_id: leadId, p_pm_id: pmId });
  if (error) throw error;
  return wrap({ message: 'Potential client assigned', leadId, pmId: data });
};

// Bulk load-balanced assignment of every currently-unassigned lead, see
// auto_assign_leads() in migration 014.
export const autoAssignLeads = async () => {
  const { data, error } = await supabase.rpc('auto_assign_leads');
  if (error) throw error;
  return wrap({ message: `${data} potential client(s) assigned`, count: data });
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
      referral_source_text: norm(raw.referralSource) || 'Spreadsheet Import',
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
      .select('*, branch:branches(name), referral_source:referral_sources(name)');
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

// COMPLAINTS (core workflow)
// Mirrors the mock layer's camelCase shape (ticket, customerId,
// assignedPmName, etc.) so existing dashboard render code keeps working
// once the import line is switched from ./api to ./supabaseApi.
const OPEN_COMPLAINT_STATUSES = ['created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated'];

const COMPLAINT_SELECT = `
  id, ticket, customer_id, customer_name, client_type, anonymous, anonymous_code,
  journey_stage, category_name, severity, priority, sentiment, status, description,
  branch_id, assigned_pm_id, root_cause_group, root_cause, root_cause_notes,
  created_at, resolved_at, closed_at, updated_at,
  voice_note_path, voice_note_duration_seconds, voice_note_uploaded_at,
  branch:branches(name),
  assigned_pm:users!assigned_pm_id(full_name),
  complaint_satisfaction(rating, comments, submitted_at),
  complaint_escalations(escalated_by, escalated_to, reason, escalated_at, resolved_at)
`;

const mapComplaint = (row) => ({
  id: row.id,
  ticket: row.ticket,
  customerId: row.customer_id,
  customerName: row.customer_name,
  clientType: row.client_type,
  anonymous: row.anonymous,
  anonymousCode: row.anonymous_code,
  journeyStage: row.journey_stage,
  category: row.category_name,
  severity: row.severity,
  priority: row.priority,
  sentiment: row.sentiment,
  status: row.status,
  description: row.description,
  branch: row.branch?.name ?? null,
  assignedPmId: row.assigned_pm_id,
  assignedPmName: row.assigned_pm?.full_name ?? null,
  rootCause: row.root_cause ? { group: row.root_cause_group, cause: row.root_cause, notes: row.root_cause_notes } : null,
  createdAt: row.created_at,
  resolvedAt: row.resolved_at,
  closedAt: row.closed_at,
  updatedAt: row.updated_at,
  satisfaction: row.complaint_satisfaction?.[0]
    ? { rating: row.complaint_satisfaction[0].rating, comments: row.complaint_satisfaction[0].comments, submittedAt: row.complaint_satisfaction[0].submitted_at }
    : null,
  escalation: row.complaint_escalations?.length
    ? (() => {
        const latest = [...row.complaint_escalations].sort((a, b) => new Date(b.escalated_at) - new Date(a.escalated_at))[0];
        return { at: latest.escalated_at, by: latest.escalated_by, to: latest.escalated_to, reason: latest.reason, resolvedAt: latest.resolved_at };
      })()
    : null,
  hasVoiceNote: Boolean(row.voice_note_path),
  voiceNotePath: row.voice_note_path,
  voiceNoteDuration: row.voice_note_duration_seconds,
  voiceNoteUploadedAt: row.voice_note_uploaded_at,
});

// Converts a base64 data URL (what MediaRecorder produces client-side)
// into a Blob for upload, without needing an extra library.
function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'audio/webm';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export const submitComplaint = async (data = {}) => {
  const branchId = await branchIdByName(data.branch);
  const isAnon = Boolean(data.anonymous);

  const { data: inserted, error } = await supabase
    .from('complaints')
    .insert({
      customer_id: isAnon ? null : data.customerId,
      customer_name: isAnon ? 'Anonymous' : (data.customerName || 'Customer'),
      anonymous: isAnon,
      client_type: data.clientType || 'existing',
      journey_stage: data.journeyStage,
      category_name: data.category,
      severity: data.severity || 'moderate',
      priority: data.priority || 'medium',
      sentiment: data.sentiment || 'neutral',
      status: 'created',
      description: data.description,
      branch_id: branchId,
    })
    .select(COMPLAINT_SELECT)
    .single();
  if (error) throw error;

  // Voice note: uploaded AFTER the complaint exists, since the storage
  // path convention ('<complaint_id>/<file>') is what the playback RLS
  // policy uses to tie a recording back to who's allowed to hear it.
  let voiceNoteFailed = false;
  let voiceNoteError = null;
  console.log('[VOICE] submitComplaint: data.voiceNote present:', Boolean(data.voiceNote), 'length:', data.voiceNote?.length ?? 'null');
  if (data.voiceNote) {
    try {
      const blob = dataUrlToBlob(data.voiceNote);
      console.log('[VOICE] submitComplaint: blob created for upload, size:', blob.size, 'type:', blob.type);
      const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
      const path = `${inserted.id}/recording.${ext}`;
      console.log('[VOICE] submitComplaint: uploading to path:', path);
      const { error: uploadError } = await supabase.storage.from('voice-notes').upload(path, blob, { contentType: blob.type });
      if (uploadError) {
        console.error('[VOICE] submitComplaint: upload FAILED:', uploadError);
        // Distinct prefix so this is unambiguous in logs/toasts, was
        // previously indistinguishable from an attach failure below.
        throw new Error(`upload: ${uploadError.message || uploadError.error || JSON.stringify(uploadError)}`);
      }
      console.log('[VOICE] submitComplaint: upload succeeded, calling attach_voice_note RPC');

      // A direct UPDATE here would be rejected by RLS, customers can't
      // update their own complaint row (so they can't tamper with
      // status/assignment either). attach_voice_note (migration 026) is
      // a narrow, purpose-built exception that can only ever touch the
      // voice-note columns, on a complaint they actually own.
      const { error: attachError } = await supabase.rpc('attach_voice_note', {
        p_complaint_id: inserted.id,
        p_path: path,
        p_duration_seconds: data.voiceNoteDuration || null,
      });
      if (attachError) {
        console.error('[VOICE] submitComplaint: attach RPC FAILED:', attachError);
        throw new Error(`attach: ${attachError.message || JSON.stringify(attachError)}`);
      }
      console.log('[VOICE] submitComplaint: attach RPC succeeded, voice note fully attached');
    } catch (err) {
      // The complaint itself is already submitted successfully, a voice
      // note failure shouldn't undo that or block the customer. But it
      // must not be silently invisible either (that's exactly how this
      // broke unnoticed before), surfaced via the return value with the
      // real underlying reason, not just a generic "failed" flag.
      console.error('[submitComplaint] voice note attach failed:', err);
      voiceNoteFailed = true;
      voiceNoteError = err?.message || String(err);
    }
  }

  return wrap({ message: 'Complaint submitted', complaint: mapComplaint(inserted), voiceNoteFailed, voiceNoteError });
};

export const getMyComplaints = async (customerId) => {
  if (!customerId) return wrap([]);
  const { data, error } = await supabase
    .from('complaints')
    .select(COMPLAINT_SELECT)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapComplaint));
};

// Short-lived signed URL for streaming a voice note, never a permanent
// public link. Whether this succeeds at all is gated by storage RLS
// (voice_notes_role_gated_read, migration 024): assigned PM, Service
// Manager, Director only if escalated to them, Admin. Anyone else's
// request is rejected before a URL is ever generated.
export const getVoiceNoteSignedUrl = async (voiceNotePath) => {
  const { data, error } = await supabase.storage.from('voice-notes').createSignedUrl(voiceNotePath, 300); // 5 minutes
  if (error) throw error;
  return wrap({ url: data.signedUrl });
};

export const getComplaintById = async (idOrTicket) => {
  const isNumeric = /^\d+$/.test(String(idOrTicket));
  const query = supabase.from('complaints').select(COMPLAINT_SELECT);
  const { data, error } = isNumeric
    ? await query.eq('id', Number(idOrTicket)).maybeSingle()
    : await query.eq('ticket', idOrTicket).maybeSingle();
  if (error) throw error;
  if (!data) return wrap(null);

  const complaintId = data.id;
  const [{ data: timelineRows }, { data: noteRows }, { data: escalationRows }, { data: satisfactionRow }] = await Promise.all([
    supabase.from('complaint_timeline').select('event, status, actor, occurred_at').eq('complaint_id', complaintId).order('occurred_at', { ascending: true }),
    supabase.from('complaint_notes').select('note_type, author, body, created_at').eq('complaint_id', complaintId).order('created_at', { ascending: true }),
    supabase.from('complaint_escalations').select('escalated_by, escalated_to, reason, escalated_at, resolved_at').eq('complaint_id', complaintId).order('escalated_at', { ascending: false }).limit(1),
    supabase.from('complaint_satisfaction').select('*').eq('complaint_id', complaintId).maybeSingle(),
  ]);

  const notes = noteRows ?? [];
  const complaint = {
    ...mapComplaint(data),
    timeline: (timelineRows ?? []).map((t) => ({ at: t.occurred_at, event: t.event, status: t.status, actor: t.actor })),
    internalNotes: notes.filter((n) => n.note_type === 'internal').map((n) => ({ at: n.created_at, author: n.author, text: n.body })),
    customerNotes: notes.filter((n) => n.note_type === 'customer').map((n) => ({ at: n.created_at, author: n.author, text: n.body })),
    escalation: escalationRows?.[0] ? { at: escalationRows[0].escalated_at, by: escalationRows[0].escalated_by, to: escalationRows[0].escalated_to, reason: escalationRows[0].reason } : null,
    satisfaction: satisfactionRow || null,
  };
  return wrap(complaint);
};

export const getComplaints = async (filters = {}) => {
  let query = supabase.from('complaints').select(COMPLAINT_SELECT).order('created_at', { ascending: false });
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.assignedPmId) query = query.eq('assigned_pm_id', filters.assignedPmId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.journeyStage) query = query.eq('journey_stage', filters.journeyStage);
  if (filters.branch) {
    const branchId = await branchIdByName(filters.branch);
    if (branchId) query = query.eq('branch_id', branchId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return wrap((data ?? []).map(mapComplaint));
};

const addTimelineEntry = async (complaintId, event, status, actor) => {
  await supabase.from('complaint_timeline').insert({ complaint_id: complaintId, event, status, actor: actor || 'Staff' });
};

export const updateComplaintStatus = async (complaintId, data = {}) => {
  const { data: before } = await supabase.from('complaints').select('ticket, status').eq('id', Number(complaintId)).maybeSingle();
  const { error } = await supabase
    .from('complaints')
    .update({ status: data.status, resolved_at: data.status === 'resolved' ? new Date().toISOString() : undefined, closed_at: data.status === 'closed' ? new Date().toISOString() : undefined })
    .eq('id', Number(complaintId));
  if (error) throw error;
  await addTimelineEntry(complaintId, data.event || data.status, data.status, data.actor);
  logSystemEvent('Complaints', `Status changed: ${before?.status || '?'} → ${data.status}`, data.actor, before?.ticket).catch(() => {});
  return wrap({ message: 'Complaint status updated', complaintId, ...data });
};

// Staff can adjust a complaint's priority (e.g. escalating urgency after
// review), the queue re-sorts around this automatically (never stored
// position, always computed), and migration 037's trigger handles the
// timeline entry + customer notification on its own.
export const updateComplaintPriority = async (complaintId, priority, actor) => {
  const { data: before } = await supabase.from('complaints').select('ticket, priority').eq('id', Number(complaintId)).maybeSingle();
  const { error } = await supabase.from('complaints').update({ priority }).eq('id', Number(complaintId));
  if (error) throw error;
  logSystemEvent('Complaints', `Priority changed: ${before?.priority || '?'} → ${priority}`, actor, before?.ticket).catch(() => {});
  return wrap({ message: 'Priority updated', complaintId, priority });
};

export const assignComplaint = async (complaintId, data = {}) => {
  const { data: before } = await supabase.from('complaints').select('ticket').eq('id', Number(complaintId)).maybeSingle();
  const { error } = await supabase
    .from('complaints')
    .update({ assigned_pm_id: data.pmId, status: 'assigned' })
    .eq('id', Number(complaintId));
  if (error) throw error;
  await addTimelineEntry(complaintId, `Assigned to ${data.pmName || 'a Portfolio Manager'}`, 'assigned', data.assignedBy);
  logSystemEvent('Complaints', `Assigned to ${data.pmName || 'PM #' + data.pmId}`, data.assignedBy, before?.ticket).catch(() => {});
  return wrap({ message: 'Complaint assigned', complaintId });
};

export const escalateComplaint = async (complaintId, data = {}) => {
  if (!data.reason) {
    const err = new Error('Escalation reason required');
    err.response = { status: 400, data: { message: 'Escalation reason is required' } };
    throw err;
  }
  const { error: updError } = await supabase.from('complaints').update({
    status: 'escalated', ...(data.priority ? { priority: data.priority } : {}),
  }).eq('id', Number(complaintId));
  if (updError) throw updError;

  const { error: escError } = await supabase.from('complaint_escalations').insert({
    complaint_id: Number(complaintId),
    escalated_by: data.by || 'PM',
    escalated_to: data.escalatedTo || 'service_manager',
    reason: data.reason,
  });
  if (escError) throw escError;

  await addTimelineEntry(complaintId, 'Escalated to Management', 'escalated', data.by);
  logSystemEvent('Complaints', `Escalated to ${data.escalatedTo || 'service_manager'}`, data.by, data.reason).catch(() => {});
  return wrap({ message: 'Complaint escalated', complaintId });
};

// Service Manager sends an escalated complaint back to the assigned PM
// resolves the escalation record and drops the complaint's status back
// to assigned, so it reappears as a normal open case on the PM's side.
// SM returning exits the escalation tier entirely (the PM handles it
// directly again). Director returning does NOT skip past the Service
// Manager back to the PM, it goes back exactly one level, the same way
// it went up, by inserting a fresh escalation targeting service_manager
// so it shows up in their escalations list using the exact same
// "esc.to === my role" logic that already governs who can act on it.
export const returnComplaintToPm = async (complaintId, note, actor, actorRole = 'service_manager') => {
  const { data: complaint } = await supabase.from('complaints').select('ticket, assigned_pm_id, branch_id').eq('id', Number(complaintId)).maybeSingle();

  if (actorRole === 'director') {
    await supabase.from('complaint_escalations')
      .update({ resolved_at: new Date().toISOString() })
      .eq('complaint_id', Number(complaintId))
      .eq('escalated_to', 'director')
      .is('resolved_at', null);

    const { error: escError } = await supabase.from('complaint_escalations').insert({
      complaint_id: Number(complaintId), escalated_by: actor || 'Director',
      escalated_to: 'service_manager', reason: note ? `Returned by Director: ${note}` : 'Returned by Director for further action.',
    });
    if (escError) throw escError;

    await addTimelineEntry(complaintId, note ? `Returned to Service Manager: ${note}` : 'Returned to Service Manager', 'escalated', actor);
    logSystemEvent('Complaints', 'Returned to Service Manager', actor, note).catch(() => {});

    // No single "the" Service Manager for a complaint the way there's a
    // single assigned PM, every Service Manager is notified, same as
    // when a complaint is first escalated to the role broadly.
    createNotification({
      audienceRole: 'service_manager', type: 'complaint',
      title: `${complaint?.ticket} returned by Director`,
      body: note ? `Sent back for further action: ${note}` : 'Sent back by the Director for further action.',
      tab: `complaints:${complaintId}`,
    }).catch(() => {});

    return wrap({ message: 'Complaint returned to Service Manager', complaintId });
  }

  const { error: updError } = await supabase.from('complaints').update({ status: 'assigned' }).eq('id', Number(complaintId));
  if (updError) throw updError;

  await supabase.from('complaint_escalations')
    .update({ resolved_at: new Date().toISOString() })
    .eq('complaint_id', Number(complaintId))
    .is('resolved_at', null);

  await addTimelineEntry(complaintId, note ? `Returned to PM: ${note}` : 'Returned to PM', 'assigned', actor);
  logSystemEvent('Complaints', 'Returned to PM', actor, note).catch(() => {});

  if (complaint?.assigned_pm_id) {
    createNotification({
      userId: complaint.assigned_pm_id, type: 'complaint',
      title: `${complaint.ticket} returned to you`,
      body: note ? `Sent back by your Service Manager: ${note}` : 'Sent back by your Service Manager for further action.',
      tab: `complaints:${complaintId}`,
    }).catch(() => {});
  }

  return wrap({ message: 'Complaint returned to PM', complaintId });
};

export const getComplaintTimeline = async (complaintId) => {
  const { data, error } = await supabase
    .from('complaint_timeline')
    .select('event, status, actor, occurred_at')
    .eq('complaint_id', Number(complaintId))
    .order('occurred_at', { ascending: true });
  if (error) throw error;
  return wrap((data ?? []).map((t) => ({ at: t.occurred_at, event: t.event, status: t.status, actor: t.actor })));
};

export const getQueuePosition = async (complaintId) => {
  const { data, error } = await supabase.rpc('get_queue_position', { p_complaint_id: Number(complaintId) });
  if (error) throw error;
  const row = data?.[0];
  return wrap({
    complaintId: Number(complaintId),
    position: row?.queue_position ?? null,
    totalInQueue: row?.total_in_queue ?? 0,
    status: row?.status || 'unknown',
    priority: row?.priority || null,
    ahead: row?.queue_position ? row.queue_position - 1 : 0,
    lastUpdated: new Date().toISOString(), // always freshly computed, never cached/stored
  });
};

// Staff-facing: full active queue in order (PM dashboard queue view,
// and the basis for Service Manager's queue stats).
export const getQueueOverview = async () => {
  const { data, error } = await supabase.rpc('get_queue_overview');
  if (error) throw error;
  return wrap((data ?? []).map((r) => ({
    position: r.queue_position, complaintId: r.complaint_id, ticket: r.ticket,
    customerName: r.customer_name, priority: r.priority, status: r.status,
    branch: r.branch_name, assignedPmName: r.assigned_pm_name,
    createdAt: r.created_at, waitingMinutes: r.waiting_minutes,
  })));
};

// Service Manager: total waiting, breakdown by priority, longest wait.
export const getQueueStats = async () => {
  const { data, error } = await supabase.rpc('get_queue_stats');
  if (error) throw error;
  const row = data?.[0] || {};
  return wrap({
    totalWaiting: row.total_waiting ?? 0,
    byPriority: { urgent: row.urgent_count ?? 0, high: row.high_count ?? 0, medium: row.medium_count ?? 0, low: row.low_count ?? 0 },
    longestWaiting: row.longest_waiting_ticket ? { ticket: row.longest_waiting_ticket, minutes: row.longest_waiting_minutes } : null,
  });
};

// Real aggregate analytics, computed from actual complaint rows, not
// canned numbers. Returns 0/empty values honestly when there's no data
// yet (schema-only / freshly connected database).
export const getComplaintAnalytics = async () => {
  const [{ data, error }, { data: feedbackRows, error: fErr }] = await Promise.all([
    supabase.from('complaints').select('id, status, category_name, branch:branches(name), created_at, resolved_at'),
    supabase.from('feedback').select('rating'),
  ]);
  if (error) throw error;
  if (fErr) throw fErr;
  const rows = data ?? [];

  const total = rows.length;
  const open = rows.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length;
  const resolved = rows.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
  const escalated = rows.filter((c) => c.status === 'escalated').length;
  const escalationRate = total > 0 ? Math.round((escalated / total) * 1000) / 10 : 0;

  const ratings = (feedbackRows ?? []).map((f) => f.rating);
  const avgSatisfaction = ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : 0;

  const resolutionTimes = rows
    .filter((c) => c.resolved_at)
    .map((c) => (new Date(c.resolved_at) - new Date(c.created_at)) / 3600000); // hours
  const avgResolutionHours = resolutionTimes.length
    ? Math.round((resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length) * 10) / 10
    : 0;

  const byCategory = {};
  rows.forEach((c) => { byCategory[c.category_name] = (byCategory[c.category_name] || 0) + 1; });
  const byBranch = {};
  rows.forEach((c) => { const b = c.branch?.name || 'Unassigned'; byBranch[b] = (byBranch[b] || 0) + 1; });

  return wrap({
    total, open, resolved, escalated, escalationRate, avgResolutionHours, avgSatisfaction,
    byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
    byBranch: Object.entries(byBranch).map(([branch, count]) => ({ branch, count })),
  });
};

// Real per-branch performance, same idea as getBranchComparison in the
// mock layer, but computed from actual complaints (avgRating stays 0
// until the `feedback`/`complaint_satisfaction` tables have real rows
// that's a separate module from Complaints, not yet migrated).
export const getBranchComparison = async () => {
  const [{ data: branches, error: bErr }, { data: complaints, error: cErr }, { data: feedbackRows, error: fErr }] = await Promise.all([
    supabase.from('branches').select('id, name').order('name'),
    supabase.from('complaints').select('branch_id, status'),
    supabase.from('feedback').select('branch_id, rating'),
  ]);
  if (bErr) throw bErr;
  if (cErr) throw cErr;
  if (fErr) throw fErr;

  return wrap((branches ?? []).map((b) => {
    const rows = (complaints ?? []).filter((c) => c.branch_id === b.id);
    const openComplaints = rows.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length;
    const resolvedComplaints = rows.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
    const escalated = rows.filter((c) => c.status === 'escalated').length;
    const ratings = (feedbackRows ?? []).filter((f) => f.branch_id === b.id).map((f) => f.rating);
    const avgRating = ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : 0;
    return {
      branch: b.name,
      avgRating,
      totalInteractions: rows.length,
      openComplaints,
      resolvedComplaints,
      escalationRate: rows.length ? Math.round((escalated / rows.length) * 1000) / 10 : 0,
    };
  }));
};

export const reassignComplaint = async (complaintId, data = {}) =>
  assignComplaint(complaintId, { ...data, assignedBy: data.assignedBy || 'Service Manager (reassign)' });

export const reassignComplaintToNew = async (complaintId, newPmId, newPmName, reason) => {
  const { error } = await supabase.from('complaints').update({ assigned_pm_id: newPmId }).eq('id', Number(complaintId));
  if (error) throw error;
  await addTimelineEntry(complaintId, `Reassigned to ${newPmName}`, undefined, 'Service Manager');
  await supabase.from('complaint_notes').insert({
    complaint_id: Number(complaintId), note_type: 'internal', author: 'Service Manager',
    body: `Reason for reassignment: ${reason}`,
  });
  return wrap({ message: `Complaint reassigned to ${newPmName}`, complaintId });
};

export const addInternalNote = async (complaintId, data = {}) => {
  const { error } = await supabase.from('complaint_notes').insert({
    complaint_id: Number(complaintId), note_type: 'internal', author: data.author || 'Staff', body: data.text,
  });
  if (error) throw error;
  return wrap({ message: 'Internal note added', complaintId });
};

export const addCustomerNote = async (complaintId, data = {}) => {
  const { data: complaint } = await supabase.from('complaints').select('ticket, customer_id').eq('id', Number(complaintId)).maybeSingle();

  const { error } = await supabase.from('complaint_notes').insert({
    complaint_id: Number(complaintId), note_type: 'customer', author: data.author || 'Staff', body: data.text,
  });
  if (error) throw error;

  // This is what actually makes the update visible to the client, it
  // previously only ever landed in complaint_notes, which nothing in the
  // client-facing UI reads, and nobody was ever notified it happened.
  await addTimelineEntry(complaintId, data.text, undefined, data.author || 'Your Portfolio Manager');

  if (complaint?.customer_id) {
    createNotification({
      userId: complaint.customer_id, type: 'complaint',
      title: `New update on ${complaint.ticket}`,
      body: data.text,
      tab: `complaints:${complaintId}`,
    }).catch(() => {});
  }

  return wrap({ message: 'Customer update sent', complaintId });
};

export const getComplaintNotes = async (complaintId) => {
  const { data, error } = await supabase
    .from('complaint_notes')
    .select('note_type, author, body, created_at')
    .eq('complaint_id', Number(complaintId))
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  return wrap({
    internalNotes: rows.filter((n) => n.note_type === 'internal').map((n) => ({ at: n.created_at, author: n.author, text: n.body })),
    customerNotes: rows.filter((n) => n.note_type === 'customer').map((n) => ({ at: n.created_at, author: n.author, text: n.body })),
  });
};

export const updateSentiment = async (complaintId, sentiment, actor) => {
  const { error } = await supabase.from('complaints').update({ sentiment }).eq('id', Number(complaintId));
  if (error) throw error;
  await addTimelineEntry(complaintId, `Sentiment tagged: ${sentiment}`, undefined, actor);
  return wrap({ message: 'Sentiment tag updated', complaintId, sentiment });
};

export const resolveComplaint = async (complaintId, data = {}) => {
  const now = new Date().toISOString();
  const { error } = await supabase.from('complaints').update({ status: 'resolved', resolved_at: now }).eq('id', Number(complaintId));
  if (error) throw error;
  if (data.resolutionNotes) {
    await supabase.from('complaint_notes').insert({
      complaint_id: Number(complaintId), note_type: 'customer', author: data.author || 'Staff',
      body: `Resolution: ${data.resolutionNotes}`,
    });
  }
  await addTimelineEntry(complaintId, 'Resolved', 'resolved', data.author);
  logSystemEvent('Complaints', 'Marked resolved', data.author).catch(() => {});
  return wrap({ message: 'Complaint resolved, customer notified', complaintId });
};

export const closeComplaint = async (complaintId, data = {}) => {
  if (!data?.rootCause?.cause) {
    const err = new Error('Root cause required');
    err.response = { status: 400, data: { message: 'A root cause is required to close a complaint.' } };
    throw err;
  }
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('complaints')
    .update({
      status: 'closed',
      closed_at: now,
      root_cause_group: data.rootCause.group,
      root_cause: data.rootCause.cause,
      root_cause_notes: data.rootCause.notes || '',
    })
    .eq('id', Number(complaintId));
  if (error) throw error;
  await addTimelineEntry(complaintId, 'Closed', 'closed', data.author);
  logSystemEvent('Complaints', `Closed, root cause: ${data.rootCause.cause}`, data.author).catch(() => {});
  return wrap({ message: 'Complaint closed', complaintId });
};

// PM workload recommendation, real workload + category/branch match from
// real data. Satisfaction/avg-resolution-time factors from the mock
// version are omitted until the Feedback module (separate from
// Complaints) is migrated and has real rows to score against.
export const recommendPm = async (complaintId) => {
  const { data: complaint, error: cErr } = await supabase
    .from('complaints')
    .select('id, branch_id, category_name, branch:branches(name)')
    .eq('id', Number(complaintId))
    .maybeSingle();
  if (cErr) throw cErr;
  if (!complaint) return wrap({ recommendations: [] });

  const { data: pms, error: pErr } = await supabase
    .from('users')
    .select('id, full_name, branch_id, branch:branches(name), staff_profiles(category_strengths)')
    .eq('role', 'portfolio_manager')
    .eq('is_active', true);
  if (pErr) throw pErr;

  const { data: openComplaints, error: oErr } = await supabase
    .from('complaints')
    .select('assigned_pm_id')
    .in('status', OPEN_COMPLAINT_STATUSES);
  if (oErr) throw oErr;

  const workloadByPm = {};
  (openComplaints ?? []).forEach((c) => { if (c.assigned_pm_id) workloadByPm[c.assigned_pm_id] = (workloadByPm[c.assigned_pm_id] || 0) + 1; });

  const ranked = (pms ?? []).map((pm) => {
    const active = workloadByPm[pm.id] || 0;
    const branchMatch = pm.branch_id === complaint.branch_id ? 1 : 0;
    const strengths = pm.staff_profiles?.[0]?.category_strengths || pm.staff_profiles?.category_strengths || [];
    const categoryMatch = strengths.includes(complaint.category_name) ? 1 : 0;
    const score = active * 10 - (branchMatch * 8) - (categoryMatch * 4);
    return {
      pmId: pm.id, pmName: pm.full_name, branch: pm.branch?.name ?? null,
      activeComplaints: active, branchMatch: Boolean(branchMatch), categoryMatch: Boolean(categoryMatch),
      score: Number(score.toFixed(2)),
    };
  }).sort((a, b) => a.score - b.score);

  return wrap({ recommendations: ranked.slice(0, 3) });
};

export const getAuditTrail = async (filters = {}) => {
  let query = supabase.from('complaint_audit_log').select('*').order('occurred_at', { ascending: false });
  if (filters.complaintId) query = query.eq('complaint_id', Number(filters.complaintId));
  if (filters.action) query = query.eq('action', filters.action);
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []).map((r) => ({
    complaintId: r.complaint_id, ticket: r.ticket, user: r.performed_by, action: r.action,
    previousValue: r.previous_value, newValue: r.new_value, at: r.occurred_at,
  }));
  if (filters.user) rows = rows.filter((r) => r.user?.toLowerCase().includes(String(filters.user).toLowerCase()));
  return wrap(rows);
};

// ADMIN, staff account management
// Creating a staff account requires the service-role key (to call the
// Auth Admin API), which must never reach the browser, so this goes
// through the admin-create-staff Edge Function rather than a direct
// Supabase call. Listing/deactivating staff is a normal RLS-scoped
// query, since is_management() already grants admins full read access
// to the users table (see migration 001).
export const adminCreateStaff = async (payload = {}) => {
  const { data, error } = await supabase.functions.invoke('admin-create-staff', { body: payload });
  if (error) {
    // supabase-js wraps non-2xx responses in a generic error; try to surface
    // the Edge Function's own message if the response body has one.
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return wrap(data);
};

export const getStaffUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, is_active, created_at, branch:branches(name), staff_profiles(job_title)')
    .neq('role', 'customer')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map((u) => ({
    id: u.id, name: u.full_name, email: u.email, role: u.role,
    branch: u.branch?.name ?? null, jobTitle: u.staff_profiles?.[0]?.job_title ?? null,
    isActive: u.is_active, createdAt: u.created_at,
  })));
};

export const adminDeactivateStaff = async (userId) => {
  const { error } = await supabase.from('users').update({ is_active: false }).eq('id', userId);
  if (error) throw error;
  logSystemEvent('User Management', 'Deactivated staff account', 'Admin', `User #${userId}`).catch(() => {});
  return wrap({ message: 'Staff account deactivated', userId });
};

export const adminReactivateStaff = async (userId) => {
  const { error } = await supabase.from('users').update({ is_active: true }).eq('id', userId);
  if (error) throw error;
  logSystemEvent('User Management', 'Reactivated staff account', 'Admin', `User #${userId}`).catch(() => {});
  return wrap({ message: 'Staff account reactivated', userId });
};

export const adminUpdateStaff = async (userId, data = {}) => {
  const branchId = data.branch ? await branchIdByName(data.branch) : null;
  const { error } = await supabase
    .from('users')
    .update({
      full_name: data.name,
      role: data.role,
      branch_id: branchId,
      is_active: data.isActive !== false,
    })
    .eq('id', userId);
  if (error) throw error;
  return wrap({ message: 'Staff account updated', userId });
};

export const adminResetUserPassword = async (userId) => {
  const { data, error } = await supabase.functions.invoke('admin-reset-password', { body: { userId } });
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return wrap(data);
};

// Self-service reset for clients/staff, sends a real email via Supabase
// Auth with a link back to /reset-password, where updatePassword() below
// finishes the job.
export const requestPasswordReset = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
  return wrap({ message: 'If an account exists for that email, a password reset link has been sent.', email });
};

// Called from the /reset-password page once Supabase has established a
// recovery session (the person arrived via the emailed link).
export const updatePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return wrap({ message: 'Password updated' });
};

// Called from the prompt every staff member sees on first login (see
// ForcePasswordChangeModal). Sets a real password they chose themselves,
// then clears the flag so the prompt never reappears.
export const completeForcedPasswordChange = async (newPassword) => {
  const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
  if (pwError) throw pwError;

  const { data: { user } } = await supabase.auth.getUser();
  const { error: dbError } = await supabase
    .from('users')
    .update({ must_change_password: false })
    .eq('auth_user_id', user.id);
  if (dbError) throw dbError;

  return wrap({ message: 'Password updated' });
};
export const getSmartInsights = async () => {
  const { data, error } = await supabase
    .from('complaints')
    .select('category_name, root_cause, sentiment, branch:branches(name), created_at');
  if (error) throw error;
  const rows = data ?? [];

  const catCounts = {};
  rows.forEach((c) => { catCounts[c.category_name] = (catCounts[c.category_name] || 0) + 1; });
  const topIssues = Object.entries(catCounts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  const causeCounts = {};
  rows.filter((c) => c.root_cause).forEach((c) => { causeCounts[c.root_cause] = (causeCounts[c.root_cause] || 0) + 1; });
  const topRootCauses = Object.entries(causeCounts).map(([cause, count]) => ({ cause, count })).sort((a, b) => b.count - a.count);

  const sentimentCounts = {};
  rows.forEach((c) => { sentimentCounts[c.sentiment] = (sentimentCounts[c.sentiment] || 0) + 1; });

  const branchCounts = {};
  rows.forEach((c) => { const b = c.branch?.name || 'Unassigned'; branchCounts[b] = (branchCounts[b] || 0) + 1; });

  return wrap({
    topIssues,
    topRootCauses,
    sentimentDistribution: Object.entries(sentimentCounts).map(([sentiment, count]) => ({ sentiment, count })),
    branchTrends: Object.entries(branchCounts).map(([branch, count]) => ({ branch, complaintsThisMonth: count, complaintsLastMonth: 0, trend: count })),
  });
};

// HOMEPAGE PROMOTIONS
const mapPromo = (row) => ({
  id: row.id, enabled: row.enabled, mode: row.mode, title: row.title, message: row.message,
  ctaLabel: row.cta_label, ctaLink: row.cta_link, theme: row.theme, image: row.image_url,
  updatedBy: row.updated_by, updatedAt: row.updated_at,
  reviewedBy: row.reviewed_by, reviewedAt: row.reviewed_at,
});

// Public, the landing page only needs the one currently-live promo.
export const getHomepagePromo = async () => {
  const { data, error } = await supabase.from('homepage_promos').select('*').eq('enabled', true).neq('mode', 'none').maybeSingle();
  if (error) throw error;
  return wrap(data ? mapPromo(data) : { enabled: false, mode: 'banner', title: '', message: '', ctaLabel: '', ctaLink: '', theme: 'red', image: null });
};

export const getHomepagePromos = async () => {
  const { data, error } = await supabase.from('homepage_promos').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapPromo));
};

export const createHomepagePromo = async (payload, user = 'Marketing') => {
  const image_url = await uploadDataUrlToStorage('marketing-images', payload.image, 'promos/');
  const { data, error } = await supabase.from('homepage_promos').insert({
    enabled: false, mode: payload.mode, title: payload.title, message: payload.message,
    cta_label: payload.ctaLabel, cta_link: payload.ctaLink, theme: payload.theme, image_url,
    updated_by: user,
  }).select().single();
  if (error) throw error;
  return wrap({ message: 'Promotion created', promo: mapPromo(data) });
};

export const updateHomepagePromo = async (id, payload, user = 'Marketing') => {
  const image_url = await uploadDataUrlToStorage('marketing-images', payload.image, 'promos/');
  const { data, error } = await supabase.from('homepage_promos').update({
    mode: payload.mode, title: payload.title, message: payload.message,
    cta_label: payload.ctaLabel, cta_link: payload.ctaLink, theme: payload.theme, image_url,
    updated_by: user, updated_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  if (error) throw error;
  return wrap({ message: 'Promotion updated', promo: mapPromo(data) });
};

export const publishHomepagePromo = async (id, user = 'Marketing') => {
  // Only one promo live at a time, unpublish everything else first.
  await supabase.from('homepage_promos').update({ enabled: false }).neq('id', id);
  const { data, error } = await supabase.from('homepage_promos').update({ enabled: true, updated_by: user, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  logSystemEvent('Marketing', `Published homepage promotion: ${data.title || '(untitled)'}`, user).catch(() => {});
  return wrap({ message: 'Promotion published, now live on the homepage', promo: mapPromo(data) });
};

export const unpublishHomepagePromo = async (id, user = 'Marketing') => {
  const { data, error } = await supabase.from('homepage_promos').update({ enabled: false, updated_by: user, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  logSystemEvent('Marketing', `Unpublished homepage promotion: ${data.title || '(untitled)'}`, user).catch(() => {});
  return wrap({ message: 'Promotion unpublished, removed from the homepage', promo: mapPromo(data) });
};

export const deleteHomepagePromo = async (id) => {
  const { error } = await supabase.from('homepage_promos').delete().eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Promotion deleted' });
};

export const duplicateHomepagePromo = async (id, user = 'Marketing') => {
  const { data: source, error: fErr } = await supabase.from('homepage_promos').select('*').eq('id', id).single();
  if (fErr) throw fErr;
  const { data, error } = await supabase.from('homepage_promos').insert({
    enabled: false, mode: source.mode, title: `${source.title} (copy)`, message: source.message,
    cta_label: source.cta_label, cta_link: source.cta_link, theme: source.theme, image_url: source.image_url,
    updated_by: user,
  }).select().single();
  if (error) throw error;
  return wrap({ message: 'Promotion duplicated as a new draft', promo: mapPromo(data) });
};

// TESTIMONIALS
const mapTestimonial = (row) => ({
  id: row.id, name: row.name, company: row.company, rating: row.rating, comment: row.comment,
  branch: row.branch?.name ?? null, enabled: row.enabled, source: row.source, createdAt: row.created_at,
  reviewStatus: row.review_status ?? (row.enabled ? 'published' : 'pending'),
  photoUrl: row.photo_url ?? null, industry: row.industry ?? null, fullStory: row.full_story ?? null,
  showOnJourney: Boolean(row.show_on_journey),
});

export const getPublicTestimonials = async () => {
  const { data, error } = await supabase.from('testimonials').select('*, branch:branches(name)').eq('enabled', true).order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapTestimonial));
};

export const getAllTestimonials = async () => {
  const { data, error } = await supabase.from('testimonials').select('*, branch:branches(name)').order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapTestimonial));
};

export const createTestimonial = async (payload) => {
  const branch_id = await branchIdByName(payload.branch);
  const { data, error } = await supabase.from('testimonials').insert({
    name: payload.name, company: payload.company || null, rating: payload.rating || 5,
    comment: payload.comment, branch_id, enabled: payload.enabled !== false, source: 'manual',
    photo_url: payload.photoUrl || null, industry: payload.industry || null,
    full_story: payload.fullStory || null, show_on_journey: Boolean(payload.showOnJourney),
  }).select('*, branch:branches(name)').single();
  if (error) throw error;
  return wrap({ message: 'Testimonial added', testimonial: mapTestimonial(data) });
};

export const updateTestimonial = async (id, payload) => {
  const branch_id = payload.branch !== undefined ? await branchIdByName(payload.branch) : undefined;
  const patch = { name: payload.name, company: payload.company, rating: payload.rating, comment: payload.comment, enabled: payload.enabled };
  if (branch_id !== undefined) patch.branch_id = branch_id;
  if (payload.photoUrl !== undefined) patch.photo_url = payload.photoUrl;
  if (payload.industry !== undefined) patch.industry = payload.industry;
  if (payload.fullStory !== undefined) patch.full_story = payload.fullStory;
  if (payload.showOnJourney !== undefined) patch.show_on_journey = payload.showOnJourney;
  const { data, error } = await supabase.from('testimonials').update(patch).eq('id', id).select('*, branch:branches(name)').single();
  if (error) throw error;
  return wrap({ message: 'Testimonial updated', testimonial: mapTestimonial(data) });
};

export const setTestimonialEnabled = async (id, enabled) => {
  const { error } = await supabase.from('testimonials').update({ enabled }).eq('id', id);
  if (error) throw error;
  logSystemEvent('Marketing', enabled ? 'Testimonial shown on homepage' : 'Testimonial hidden from homepage', 'Marketing', `Testimonial #${id}`).catch(() => {});
  return wrap({ message: enabled ? 'Testimonial shown on homepage' : 'Testimonial hidden', id, enabled });
};

// Outstanding Reviews queue, 5-star ratings land here automatically
// (see migration 019) and stay invisible to the public until Marketing
// explicitly acts on them.
export const getPendingTestimonials = async () => {
  const { data, error } = await supabase.from('testimonials').select('*, branch:branches(name)').eq('review_status', 'pending').order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapTestimonial));
};

export const setTestimonialReviewStatus = async (id, status) => {
  const { error } = await supabase.rpc('set_testimonial_review_status', { p_id: id, p_status: status });
  if (error) throw error;
  const labels = { published: 'Published to homepage', rejected: 'Rejected', archived: 'Archived', pending: 'Moved back to pending' };
  logSystemEvent('Marketing', `${labels[status] || status}: testimonial`, 'Marketing', `Testimonial #${id}`).catch(() => {});
  return wrap({ message: labels[status] || 'Updated', id, status });
};

export const deleteTestimonial = async (id) => {
  const { error } = await supabase.from('testimonials').delete().eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Testimonial deleted' });
};

// BLOG POSTS
const mapBlogPost = (row) => ({
  id: row.id, title: row.title, excerpt: row.excerpt, content: row.content, category: row.category,
  author: row.author, status: row.status, pinned: row.pinned, image: row.image_url,
  scheduledFor: row.scheduled_for, publishedAt: row.published_at, createdAt: row.created_at, updatedAt: row.updated_at,
});

export const getBlogPosts = async () => {
  const { data, error } = await supabase.from('blog_posts').select('*').order('published_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapBlogPost));
};

export const getPublicBlogPosts = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('blog_posts').select('*')
    .eq('status', 'published').or(`scheduled_for.is.null,scheduled_for.lte.${today}`)
    .order('pinned', { ascending: false }).order('published_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapBlogPost));
};

export const createBlogPost = async (payload, user = 'Marketing') => {
  const image_url = await uploadDataUrlToStorage('marketing-images', payload.image, 'blog/');
  const { data, error } = await supabase.from('blog_posts').insert({
    title: payload.title, excerpt: payload.excerpt, content: payload.content || null,
    category: payload.category || null, author: payload.author || user, status: payload.status || 'published',
    pinned: Boolean(payload.pinned), image_url, scheduled_for: payload.scheduledFor || null,
  }).select().single();
  if (error) throw error;
  return wrap({ message: 'Blog post created', post: mapBlogPost(data) });
};

export const updateBlogPost = async (id, payload) => {
  const patch = { title: payload.title, excerpt: payload.excerpt, content: payload.content, category: payload.category, status: payload.status, pinned: payload.pinned, scheduled_for: payload.scheduledFor };
  if (payload.image !== undefined) patch.image_url = await uploadDataUrlToStorage('marketing-images', payload.image, 'blog/');
  const { data, error } = await supabase.from('blog_posts').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return wrap({ message: 'Blog post updated', post: mapBlogPost(data) });
};

export const deleteBlogPost = async (id) => {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Blog post deleted' });
};

// CAREERS + JOB APPLICATIONS
const mapCareer = (row) => ({
  id: row.id, title: row.title, type: row.type, location: row.location, department: row.department,
  description: row.description, requirements: row.requirements, closingDate: row.closing_date,
  active: row.is_active, publishedAt: row.published_at,
  isExpired: Boolean(row.closing_date && new Date(row.closing_date) < new Date()),
});

export const getCareers = async () => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('careers')
    .select('*')
    .eq('is_active', true)
    .or(`closing_date.is.null,closing_date.gte.${now}`)
    .order('published_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapCareer));
};

export const getAllCareers = async () => {
  const { data, error } = await supabase.from('careers').select('*').order('published_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapCareer));
};

export const createCareer = async (payload) => {
  const { data, error } = await supabase.from('careers').insert({
    title: payload.title, type: payload.type || 'Full-time', location: payload.location || null,
    department: payload.department || null, description: payload.description, requirements: payload.requirements || null,
    closing_date: payload.closingDate || null, is_active: true,
  }).select().single();
  if (error) throw error;
  return wrap({ message: 'Job listing created', career: mapCareer(data) });
};

export const updateCareer = async (id, payload) => {
  const { data, error } = await supabase.from('careers').update({
    title: payload.title, type: payload.type, location: payload.location, department: payload.department,
    description: payload.description, requirements: payload.requirements, closing_date: payload.closingDate,
  }).eq('id', id).select().single();
  if (error) throw error;
  return wrap({ message: 'Job listing updated', career: mapCareer(data) });
};

export const setCareerActive = async (id, active) => {
  const { error } = await supabase.from('careers').update({ is_active: active }).eq('id', id);
  if (error) throw error;
  return wrap({ message: active ? 'Listing published' : 'Listing hidden', id, active });
};

export const deleteCareer = async (id) => {
  const { error } = await supabase.from('careers').delete().eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Job listing deleted' });
};

const mapApplication = (row) => ({
  id: row.id, careerId: row.career_id, position: row.position, applicantName: row.applicant_name,
  email: row.email, phone: row.phone, coverNote: row.cover_note, cvFileName: row.cv_file_name,
  cvUrl: row.cv_url, status: row.status, appliedAt: row.applied_at,
});

// Public, applicant may not have an account. CV is uploaded to the
// private `cvs` bucket; only staff can read it back (see migration 004).
export const submitJobApplication = async (payload) => {
  let cv_url = null;
  if (payload.cvDataUrl) {
    cv_url = await uploadDataUrlToStorage('cvs', payload.cvDataUrl, 'applications/', true);
  }
  // No .select() here on purpose, a public/anonymous applicant has no
  // SELECT access to job_applications (only Marketing does, by design),
  // so asking PostgREST to return the inserted row via RETURNING would
  // itself get filtered by RLS and fail, even once the INSERT itself
  // succeeds. The confirmation shown to the applicant is built from the
  // payload we already have client-side instead.
  const { error } = await supabase.from('job_applications').insert({
    career_id: payload.careerId || null, position: payload.position, applicant_name: payload.applicantName,
    email: payload.email, phone: payload.phone || null, cover_note: payload.coverNote || null,
    cv_file_name: payload.cvFileName || null, cv_mime_type: payload.cvType || null,
    cv_size_bytes: payload.cvSize || null, cv_url, status: 'New',
  });
  if (error) throw error;
  return wrap({
    message: 'Application submitted successfully',
    application: { position: payload.position, applicantName: payload.applicantName, email: payload.email, status: 'New' },
  });
};

export const getJobApplications = async (filters = {}) => {
  let query = supabase.from('job_applications').select('*').order('applied_at', { ascending: false });
  if (filters.status && filters.status !== 'All') query = query.eq('status', filters.status);
  if (filters.careerId) query = query.eq('career_id', filters.careerId);
  const { data, error } = await query;
  if (error) throw error;
  return wrap((data ?? []).map(mapApplication));
};

export const getJobApplication = async (id) => {
  const { data, error } = await supabase.from('job_applications').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return wrap(data ? mapApplication(data) : null);
};

export const updateApplicationStatus = async (id, status) => {
  const { error } = await supabase.from('job_applications').update({ status }).eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Application status updated', id, status });
};

// The cvs bucket is private, cv_url on the row is a storage PATH, not a
// usable link. Generate a short-lived signed URL on demand when staff
// actually want to view/download a CV.
export const getSignedCvUrl = async (id, forceDownload = false) => {
  console.log('📄[CV] getSignedCvUrl called for application id:', id, 'forceDownload:', forceDownload);
  const { data: app, error } = await supabase.from('job_applications').select('cv_url, cv_file_name').eq('id', id).single();
  if (error) {
    console.error('📄[CV] failed to fetch job_applications row:', error);
    throw error;
  }
  console.log('📄[CV] job_applications row fetched. cv_url:', app.cv_url, 'cv_file_name:', app.cv_file_name);
  if (!app.cv_url) {
    console.warn('📄[CV] cv_url is empty/null, no file was ever recorded against this application');
    return wrap(null);
  }
  // Supabase's own `download` option sets Content-Disposition on the
  // server side, the HTML5 <a download> attribute alone is unreliable
  // for cross-origin URLs (which a signed storage URL always is), so
  // browsers were opening/previewing the file instead of downloading it.
  const { data, error: signErr } = await supabase.storage.from('cvs')
    .createSignedUrl(app.cv_url, 300, forceDownload ? { download: app.cv_file_name || true } : undefined);
  if (signErr) {
    console.error('📄[CV] createSignedUrl FAILED:', signErr);
    throw signErr;
  }
  console.log('📄[CV] signed URL created successfully');
  return wrap({ url: data.signedUrl, fileName: app.cv_file_name });
};

// TENDERS, broadcasts + subscriber list
const mapTenderBroadcast = (row) => ({
  id: row.id, title: row.title, body: row.body, channels: row.channels,
  filterBranch: row.filter_branch, filterClientType: row.filter_client_type,
  filterIndustry: row.filter_industry, filterStatus: row.filter_status,
  recipientCount: row.recipient_count, sentBy: row.sent_by, sentAt: row.sent_at,
});

export const getTenderBroadcasts = async (query = '') => {
  const { data, error } = await supabase.from('tender_broadcasts').select('*').order('sent_at', { ascending: false });
  if (error) throw error;
  let rows = (data ?? []).map(mapTenderBroadcast);
  if (query) rows = rows.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));
  return wrap(rows);
};

export const createTenderBroadcast = async (payload, user = 'Marketing') => {
  // Recipient count is an honest count of currently-subscribed people
  // filters beyond that (branch/client type/industry) need the Client
  // Portfolio module migrated before they can be applied for real.
  const { count } = await supabase.from('tender_subscribers').select('id', { count: 'exact', head: true }).is('unsubscribed_at', null);
  const { data, error } = await supabase.from('tender_broadcasts').insert({
    title: payload.title, body: payload.body, channels: payload.channels || ['dashboard'],
    filter_branch: payload.filterBranch || 'All', filter_client_type: payload.filterClientType || 'All',
    filter_industry: payload.filterIndustry || 'All', filter_status: payload.filterStatus || 'All',
    recipient_count: count || 0, sent_by: user,
  }).select().single();
  if (error) throw error;
  return wrap({ message: `Broadcast sent to ${count || 0} recipient(s)`, broadcast: mapTenderBroadcast(data) });
};

export const deleteTenderBroadcast = async (id) => {
  const { error } = await supabase.from('tender_broadcasts').delete().eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Broadcast deleted' });
};

export const getPublicTenders = async () => {
  const { data, error } = await supabase.from('tender_broadcasts').select('id, title, body, sent_at')
    .contains('channels', ['dashboard']).order('sent_at', { ascending: false }).limit(10);
  if (error) throw error;
  return wrap((data ?? []).map((r) => ({ id: r.id, title: r.title, body: r.body, sentAt: r.sent_at })));
};

export const subscribeTenderNotifications = async ({ email, phone } = {}) => {
  const { error } = await supabase.from('tender_subscribers').upsert(
    { email, phone: phone || null, unsubscribed_at: null },
    { onConflict: 'email' },
  );
  if (error) throw error;
  return wrap({ message: 'Subscribed to tender alerts' });
};

export const unsubscribeTenderNotifications = async (email) => {
  const { error } = await supabase.from('tender_subscribers').update({ unsubscribed_at: new Date().toISOString() }).eq('email', email);
  if (error) throw error;
  return wrap({ message: 'Unsubscribed from tender alerts' });
};

export const getTenderSubscribers = async () => {
  const { data, error } = await supabase.from('tender_subscribers').select('*').order('subscribed_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map((r) => ({ id: r.id, email: r.email, phone: r.phone, subscribedAt: r.subscribed_at, unsubscribedAt: r.unsubscribed_at })));
};

// QUESTIONNAIRES (questionnaires + questions + responses + answers)
const mapQuestionnaire = (row) => ({
  id: row.id, title: row.title, description: row.description, status: row.status,
  author: row.author, createdAt: row.created_at, updatedAt: row.updated_at,
  questions: (row.questionnaire_questions ?? []).sort((a, b) => a.sort_order - b.sort_order).map((q) => ({
    id: q.id, key: q.question_key, type: q.type, text: q.text, options: q.options || [],
  })),
});

export const getQuestionnaires = async () => {
  const { data, error } = await supabase.from('questionnaires').select('*, questionnaire_questions(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapQuestionnaire));
};

export const getPublishedQuestionnaires = async () => {
  const { data, error } = await supabase.from('questionnaires').select('*, questionnaire_questions(*)').eq('status', 'published').order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapQuestionnaire));
};

// Which questionnaires the current client has already answered, used to
// permanently hide a survey once completed, instead of just for the
// current session (local component state resets on every page load).
export const getMyAnsweredQuestionnaireIds = async () => {
  const appUser = await getCurrentAppUser();
  if (!appUser.id) return wrap([]);
  const { data, error } = await supabase.from('questionnaire_responses').select('questionnaire_id').eq('client_id', appUser.id);
  if (error) throw error;
  return wrap([...new Set((data ?? []).map((r) => r.questionnaire_id))]);
};

const getQuestionnaireById = async (id) => {
  const { data, error } = await supabase.from('questionnaires').select('*, questionnaire_questions(*)').eq('id', id).single();
  if (error) throw error;
  return wrap({ message: 'Questionnaire created', questionnaire: mapQuestionnaire(data) });
};

export const createQuestionnaire = async (payload, user = 'Marketing') => {
  const { data: q, error } = await supabase.from('questionnaires').insert({
    title: payload.title, description: payload.description || null, status: 'draft', author: user,
  }).select().single();
  if (error) throw error;

  if (payload.questions?.length) {
    const rows = payload.questions.map((qq, i) => ({
      questionnaire_id: q.id, question_key: qq.key || `q${i + 1}`, type: qq.type,
      text: qq.text, options: qq.options || null, sort_order: i,
    }));
    const { error: qErr } = await supabase.from('questionnaire_questions').insert(rows);
    if (qErr) throw qErr;
  }
  return getQuestionnaireById(q.id);
};

export const updateQuestionnaire = async (id, payload) => {
  const { error } = await supabase.from('questionnaires').update({ title: payload.title, description: payload.description }).eq('id', id);
  if (error) throw error;
  if (payload.questions) {
    await supabase.from('questionnaire_questions').delete().eq('questionnaire_id', id);
    const rows = payload.questions.map((qq, i) => ({
      questionnaire_id: id, question_key: qq.key || `q${i + 1}`, type: qq.type,
      text: qq.text, options: qq.options || null, sort_order: i,
    }));
    if (rows.length) await supabase.from('questionnaire_questions').insert(rows);
  }
  return wrap({ message: 'Questionnaire updated' });
};

export const setQuestionnaireStatus = async (id, status) => {
  const { error } = await supabase.from('questionnaires').update({ status }).eq('id', id);
  if (error) throw error;
  return wrap({ message: status === 'published' ? 'Questionnaire published' : 'Questionnaire unpublished', id, status });
};

export const deleteQuestionnaire = async (id) => {
  const { error } = await supabase.from('questionnaires').delete().eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Questionnaire deleted' });
};

export const submitQuestionnaireResponse = async (questionnaireId, payload) => {
  const answers = {};
  Object.entries(payload.answers || {}).forEach(([questionId, answer]) => { answers[questionId] = String(answer); });

  // p_client_name is a legacy parameter the function still accepts but no
  // longer stores anywhere, responses are anonymous by design.
  const { error } = await supabase.rpc('submit_questionnaire_response', {
    p_questionnaire_id: questionnaireId,
    p_client_name: null,
    p_answers: answers,
  });
  if (error) throw error;
  return wrap({ message: 'Thank you for your feedback!' });
};

export const getQuestionnaireAnalytics = async (questionnaireId) => {
  const { data, error } = await supabase.rpc('get_questionnaire_analytics', { p_questionnaire_id: Number(questionnaireId) });
  if (error) throw error;
  return wrap({
    questionnaireId: data.questionnaireId,
    responseCount: data.responseCount,
    completionRate: data.completionRate,
    perQuestion: data.perQuestion || [],
  });
};

// SITE SETTINGS (namespaced JSONB blobs, one row per top-level key)
const legalDoc = (content) => ({ published: content, draft: content, revisions: [], updatedAt: new Date().toISOString() });

const SITE_SETTINGS_DEFAULTS = {
  // Admin "take the system down" switch. This used to live only in
  // localStorage (see the old MaintenanceMode.jsx), which is why it never
  // applied to any device/session other than the one that flipped it.
  // It's a normal site_settings row now, so it's DB-backed and, via the
  // realtime subscription in MaintenanceMode.jsx, applies instantly to
  // every open session.
  maintenance: { active: false, message: '', startTime: null, endTime: null, services: [], initiatedBy: null, activatedAt: null },
  contactEmail: COMPANY_PROFILE.email,
  contactPhone: COMPANY_PROFILE.phone,
  mission: COMPANY_MISSION,
  vision: COMPANY_VISION,
  social: {
    facebook: { url: 'https://www.facebook.com/ticanosmefinance', enabled: true },
    instagram: { url: '', enabled: false },
    linkedin: { url: 'https://bw.linkedin.com/company/ticano-sme-finance', enabled: true },
    twitter: { url: '', enabled: false },
    whatsapp: { url: 'https://wa.me/26731818888', enabled: true },
    youtube: { url: '', enabled: false },
    tiktok: { url: 'https://www.tiktok.com/tag/ticanogroup', enabled: true },
  },
  branchContacts: [
    { name: 'Gaborone', phone: '+267 77 416 877', placeholder: false },
    { name: 'Francistown', phone: '+267 77 342 979', placeholder: false },
    { name: 'Maun', phone: '+267 71 000 003', placeholder: false },
    { name: 'Selebi-Phikwe', phone: '+267 73 884 215', placeholder: false },
    { name: 'Palapye', phone: '+267 75 209 463', placeholder: false },
  ],
  homepage: {
    heroTitle: 'Purchase order financing and invoice discounting for businesses across Botswana.',
    heroSubtitle: "We help SMEs access the capital they need to fulfil orders and grow.",
    heroQuote: 'No one should be small forever. No amount is too big or too small for us.',
    ctaPrimary: 'Get Started',
    ctaSecondary: 'Our Services',
    stat2Value: '5', stat2Label: 'Branch locations',
    stat3Value: '99.8%', stat3Label: 'Uptime',
    aboutHeading: 'The Ticano Difference',
    services: [
      { title: 'Purchase Order Financing', desc: 'We pay your suppliers so you can fulfil confirmed orders, without waiting for your own cash. Ideal for businesses with large orders and limited working capital.', highlight: 'Up to 80% of PO value', long: 'Purchase Order Financing lets you accept and deliver on large confirmed orders even when you don\u2019t have the upfront cash to pay suppliers. Ticano settles your supplier directly so production or delivery can begin, then recovers the amount plus an agreed margin once your customer pays. Because we look at the strength of the order and the creditworthiness of your buyer, not just your balance sheet, growing SMEs qualify where traditional lenders say no.' },
      { title: 'Invoice Discounting', desc: 'Unlock cash tied up in unpaid invoices immediately. Stop waiting 30, 60, or 90 days for clients to pay. Get your money when you need it.', highlight: 'Fast access to capital', long: 'Invoice Discounting turns your unpaid invoices into immediate working capital. Instead of waiting 30, 60 or 90 days for your customers to settle, Ticano advances you a large portion of the invoice value now, and you receive the balance (less our fee) once the invoice is paid. It keeps your cash flow steady so you can take on the next job without delay.' },
      { title: 'Contract Financing', desc: 'Funding to help you deliver on confirmed contracts with government, parastatals, and large corporates, so cash flow never stands between you and a signed deal.', highlight: 'Deliver with confidence', long: 'Contract Financing supports businesses that have won contracts with government, parastatals, or large corporates but need capital to execute them. We structure funding around the contract\u2019s milestones and payment terms so you can mobilise, deliver, and grow your track record with confidence.' },
      { title: 'SME Advisory', desc: 'Our experienced Portfolio Managers provide personalised trade finance advice, helping your business structure deals, understand risks, and scale confidently.', highlight: 'Expert guidance', long: 'Beyond funding, Ticano\u2019s Portfolio Managers work with you to structure deals, understand risk, and plan for growth. Whether you\u2019re pricing a tender, negotiating supplier terms, or planning expansion, you get practical, Botswana-focused advice from a team that understands the SME journey.' },
    ],
  },
  loginPage: {
    brandSubtitle: 'Purchase Order Financing Specialists',
    heroTitle: 'Purchase order financing and invoice discounting.',
    heroSubtitle: "Botswana's champion for Purchase Order Financing and Invoice Discounting.",
    welcomeTitle: 'Welcome back',
    welcomeSubtitle: 'Sign in to your workspace',
  },
  legal: {
    privacy: legalDoc('Ticano Group respects your privacy. We collect only the personal information necessary to assess and service your financing applications, and we process it in line with Botswana data-protection requirements and NBFIRA regulation. We never sell your data. You may request access to, or correction of, your information by contacting info@ticanogroup.co.bw.'),
    terms: legalDoc('These Terms of Service govern your use of the Ticano platform. Financing products such as Purchase Order Financing and Invoice Discounting are subject to eligibility assessment, documentation, and approval. Approved facilities are governed by the signed facility agreement. Ticano Group (Pty) Ltd is regulated by NBFIRA.'),
    cookie: legalDoc('This website uses cookies to keep you signed in, remember your preferences, and understand how the site is used so we can improve it. Essential cookies are always on; non-essential cookies are used only with your consent. You can manage cookies in your browser settings at any time.'),
  },
};

const logSiteAudit = async (field, previousValue, newValue, user) => {
  await supabase.from('site_audit_log').insert({
    area: 'site_settings', field,
    previous_value: typeof previousValue === 'string' ? previousValue : JSON.stringify(previousValue),
    new_value: typeof newValue === 'string' ? newValue : JSON.stringify(newValue),
    changed_by: user,
  });
};

export const getSiteSettings = async () => {
  const { data, error } = await supabase.from('site_settings').select('key, value');
  if (error) throw error;
  const fromDb = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return wrap({ ...SITE_SETTINGS_DEFAULTS, ...fromDb });
};

export const updateSiteSettings = async (patch = {}, user = 'Admin') => {
  const { data: current } = await getSiteSettings();

  for (const [key, value] of Object.entries(patch)) {
    let nextValue = value;

    if (key === 'legal') {
      // Preserve revision history: archive the old published text whenever
      // new published content comes in, same as the mock used to.
      const legal = { ...current.legal };
      Object.entries(value).forEach(([docKey, doc]) => {
        const existing = legal[docKey] || legalDoc('');
        const next = { ...existing, ...doc };
        if (doc.published !== undefined && doc.published !== existing.published) {
          next.revisions = [{ content: existing.published, at: existing.updatedAt, by: user }, ...(existing.revisions || [])].slice(0, 20);
          next.updatedAt = new Date().toISOString();
          logSiteAudit(`Legal: ${docKey}`, existing.published, doc.published, user).catch(() => {});
        }
        legal[docKey] = next;
      });
      nextValue = legal;
    } else if (key === 'social') {
      const social = { ...current.social };
      Object.entries(value).forEach(([platform, v]) => {
        social[platform] = { ...(current.social[platform] || { url: '', enabled: false }), ...v };
      });
      nextValue = social;
      logSiteAudit('Social links', current.social, social, user).catch(() => {});
    } else if (key === 'homepage' || key === 'loginPage') {
      nextValue = { ...current[key], ...value };
      logSiteAudit(key === 'homepage' ? 'Homepage content' : 'Login page content', current[key], nextValue, user).catch(() => {});
    } else {
      logSiteAudit(key, current[key], value, user).catch(() => {});
    }

    const { error } = await supabase.from('site_settings').upsert(
      { key, value: nextValue, updated_by: user, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
    if (error) throw error;
  }

  const { data: settings } = await getSiteSettings();
  return wrap({ message: 'Landing page content updated', settings });
};

// Convenience wrapper used by the Director-quote photo widget on the
// landing page and in Admin > Site Settings. Uploads the new photo (if a
// data URL was passed) and merges it into homepage.directorPhoto.
export const updateDirectorQuote = async (payload = {}, user = 'Marketing') => {
  const homepage = {};
  if (payload.photo) {
    homepage.directorPhoto = await uploadDataUrlToStorage('marketing-images', payload.photo, 'director/');
  }
  if (payload.quote !== undefined) homepage.directorQuote = payload.quote;
  if (payload.name !== undefined) homepage.directorName = payload.name;

  return updateSiteSettings({ homepage }, user);
};

export const getSiteAudit = async () => {
  const { data, error } = await supabase.from('site_audit_log').select('*').eq('area', 'site_settings').order('changed_at', { ascending: false }).limit(100);
  if (error) throw error;
  return wrap((data ?? []).map((r) => ({ field: r.field, previousValue: r.previous_value, newValue: r.new_value, changedBy: r.changed_by, changedAt: r.changed_at })));
};

// HOMEPAGE ANNOUNCEMENT (Director), single row, latest wins
export const getHomepageAnnouncement = async () => {
  const { data, error } = await supabase.from('homepage_announcements').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return wrap(data ? { enabled: data.enabled, title: data.title, message: data.message, updatedBy: data.updated_by, updatedAt: data.updated_at } : { enabled: false, title: '', message: '' });
};

export const setHomepageAnnouncement = async (payload, user = 'Director') => {
  const { data: existing } = await supabase.from('homepage_announcements').select('id').order('updated_at', { ascending: false }).limit(1).maybeSingle();
  const row = { enabled: payload.enabled, title: payload.title, message: payload.message, updated_by: user, updated_at: new Date().toISOString() };
  const { data, error } = existing
    ? await supabase.from('homepage_announcements').update(row).eq('id', existing.id).select().single()
    : await supabase.from('homepage_announcements').insert(row).select().single();
  if (error) throw error;

  // Also publish to News/Blog, a Director announcement is genuine news,
  // and shouldn't only live in the small homepage banner that disappears
  // the moment it's turned off. Only fires when actually publishing
  // (enabled + a real title), not for every toggle/edit.
  if (payload.enabled && payload.title?.trim()) {
    try {
      await createBlogPost({
        title: payload.title,
        excerpt: payload.message?.slice(0, 200) || payload.title,
        content: payload.message || payload.title,
        category: 'Announcement',
        status: 'published',
      }, user);
    } catch (err) {
      // The homepage announcement itself already saved successfully
      // don't let a blog-post failure undo that.
      console.error('[setHomepageAnnouncement] failed to also publish to blog:', err);
    }
  }

  return wrap({ message: 'Homepage announcement updated', announcement: { enabled: data.enabled, title: data.title, message: data.message, updatedBy: data.updated_by, updatedAt: data.updated_at } });
};

// WHATSAPP TEMPLATES
export const WA_TEMPLATE_ROLES = ['portfolio_manager', 'service_manager', 'director', 'admin'];

const deriveWaVariables = (body = '') => {
  const found = [];
  const re = /\[([A-Za-z0-9 _]+)\]/g;
  let m;
  while ((m = re.exec(body))) if (!found.includes(m[1])) found.push(m[1]);
  return found;
};

const mapWaTemplate = (row) => ({
  id: row.id, role: row.role, name: row.name, key: row.template_key, body: row.body,
  variables: row.variables || [], active: row.is_active, lastUpdated: row.updated_at,
});

export const getWaTemplates = async (role) => {
  let query = supabase.from('wa_templates').select('*').eq('is_active', true);
  if (role) query = query.eq('role', role);
  const { data, error } = await query;
  if (error) throw error;
  return wrap((data ?? []).map(mapWaTemplate));
};

export const getAllWaTemplates = async () => {
  const { data, error } = await supabase.from('wa_templates').select('*').order('role').order('name');
  if (error) throw error;
  return wrap((data ?? []).map(mapWaTemplate));
};

export const createWaTemplate = async (payload) => {
  const variables = payload.variables?.length ? payload.variables : deriveWaVariables(payload.body);
  const { data, error } = await supabase.from('wa_templates').insert({
    role: payload.role || 'portfolio_manager', name: payload.name, template_key: payload.key || payload.name?.toLowerCase().replace(/\s+/g, '_'),
    body: payload.body, variables, is_active: payload.active !== false,
  }).select().single();
  if (error) throw error;
  return wrap({ message: 'Template created', template: mapWaTemplate(data) });
};

export const updateWaTemplate = async (id, payload) => {
  const patch = { name: payload.name, body: payload.body, role: payload.role };
  if (payload.body !== undefined && (!payload.variables || !payload.variables.length)) {
    patch.variables = deriveWaVariables(payload.body);
  } else if (payload.variables) {
    patch.variables = payload.variables;
  }
  const { data, error } = await supabase.from('wa_templates').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return wrap({ message: 'Template updated', template: mapWaTemplate(data) });
};

export const setWaTemplateActive = async (id, active) => {
  const { error } = await supabase.from('wa_templates').update({ is_active: active }).eq('id', id);
  if (error) throw error;
  return wrap({ message: active ? 'Template reactivated' : 'Template taken offline', id, active });
};

export const deleteWaTemplate = async (id) => {
  const { error } = await supabase.from('wa_templates').delete().eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Template deleted', id });
};

// SYSTEM AUDIT TRAIL
export const SYSTEM_AUDIT_MODULES = ['Security', 'User Management', 'Branches', 'Content', 'Complaints', 'Client Portfolio', 'Marketing'];

const logSystemEvent = async (module, action, user, details = '') => {
  await supabase.from('system_audit_log').insert({ module, action, performed_by: user || 'system', details });
};

export const getSystemAuditTrail = async (filters = {}) => {
  let query = supabase.from('system_audit_log').select('*').order('occurred_at', { ascending: false }).limit(200);
  if (filters.module && filters.module !== 'all') query = query.eq('module', filters.module);
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []).map((r) => ({ id: r.id, module: r.module, action: r.action, user: r.performed_by, details: r.details, at: r.occurred_at }));
  if (filters.user) rows = rows.filter((r) => r.user.toLowerCase().includes(String(filters.user).toLowerCase()));
  return wrap(rows);
};

// KNOWLEDGE BASE
const mapKbArticle = (row) => ({
  id: row.id, category: row.category, title: row.title, body: row.body,
  author: row.author, archived: row.archived, updatedAt: row.updated_at,
});

export const getKnowledgeBase = async (filters = {}) => {
  let query = supabase.from('kb_articles').select('*').eq('archived', false).order('updated_at', { ascending: false });
  if (filters.category) query = query.eq('category', filters.category);
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []).map(mapKbArticle);
  if (filters.q) {
    const q = String(filters.q).toLowerCase();
    rows = rows.filter((a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q));
  }
  return wrap(rows);
};

export const createKbArticle = async (payload, user = 'Admin') => {
  const { data, error } = await supabase.from('kb_articles').insert({
    category: payload.category, title: payload.title, body: payload.body, author: payload.author || user, archived: false,
  }).select().single();
  if (error) throw error;
  return wrap({ message: 'Article created', article: mapKbArticle(data) });
};

export const updateKbArticle = async (id, payload) => {
  const { error } = await supabase.from('kb_articles').update({ category: payload.category, title: payload.title, body: payload.body }).eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Article updated', id });
};

export const archiveKbArticle = async (id) => {
  const { error } = await supabase.from('kb_articles').update({ archived: true }).eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Article archived', id });
};

// FEEDBACK / RATINGS
const mapFeedback = (row) => ({
  id: row.id, rating: row.rating, comment: row.comment, branch: row.branch?.name ?? null,
  serviceType: row.service_type, source: row.source, createdAt: row.created_at,
});

export const getMyFeedback = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return wrap([]);
  const { data: appUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle();
  if (!appUser) return wrap([]);
  const { data, error } = await supabase.from('feedback').select('*, branch:branches(name)').eq('customer_id', appUser.id).order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapFeedback));
};

export const submitRating = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: appUser } = user ? await supabase.from('users').select('id, branch_id').eq('auth_user_id', user.id).maybeSingle() : { data: null };
  const { data: profile } = appUser ? await supabase.from('client_profiles').select('assigned_pm_id').eq('user_id', appUser.id).maybeSingle() : { data: null };
  const { error } = await supabase.from('feedback').insert({
    customer_id: appUser?.id ?? null, branch_id: appUser?.branch_id ?? null,
    staff_id: profile?.assigned_pm_id ?? null,
    rating: payload.rating, comment: payload.comment || null, source: 'client_portal',
  });
  if (error) throw error;
  return wrap({ message: 'Thank you for your feedback!' });
};

// ---- Feedback (public review-link form) ----
// IMPROVEMENT FEEDBACK ("How can we improve?")
const mapImprovementFeedback = (row) => ({
  id: row.id, category: row.category, text: row.body,
  author: row.is_anonymous ? 'Anonymous' : (row.author_name || 'Customer'),
  branch: row.branch?.name ?? null, createdAt: row.created_at,
});

export const submitImprovementFeedback = async (payload) => {
  const branch_id = payload.branch ? await branchIdByName(payload.branch) : null;
  // No .select() here on purpose, a customer has no SELECT access to
  // improvement_feedback (staff/marketing only, by design), so asking
  // PostgREST to return the inserted row via RETURNING gets filtered by
  // RLS and fails, even though the INSERT itself succeeds. This is the
  // same bug class as submitJobApplication's fix above, the confirmation
  // is built from the payload we already have instead of a re-fetch.
  const { error } = await supabase.from('improvement_feedback').insert({
    category: payload.category, body: payload.text,
    author_name: payload.anonymous ? null : (payload.author || 'Customer'),
    is_anonymous: Boolean(payload.anonymous), branch_id,
  });
  if (error) throw error;
  return wrap({
    message: 'Thank you for helping us improve!',
    feedback: { category: payload.category, body: payload.text, branch: payload.branch || null, isAnonymous: Boolean(payload.anonymous) },
  });
};

export const getImprovementFeedback = async (filters = {}) => {
  let query = supabase.from('improvement_feedback').select('*, branch:branches(name)').order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []).map(mapImprovementFeedback);
  if (filters.branch) rows = rows.filter((r) => r.branch === filters.branch);
  if (filters.category) rows = rows.filter((r) => r.category === filters.category);
  return wrap(rows);
};

export const getImprovementFeedbackSummary = async () => {
  const { data, error } = await supabase.from('improvement_feedback').select('*, branch:branches(name)').order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []).map(mapImprovementFeedback);
  const byCategory = {};
  rows.forEach((f) => { byCategory[f.category] = (byCategory[f.category] || 0) + 1; });
  return wrap({
    total: rows.length,
    byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
    recent: rows.slice(0, 5),
  });
};

// NOTIFICATIONS
// Rows are either addressed to one person (user_id) or broadcast to a
// whole role (audience_role), e.g. the sla-check Edge Function notifies
// a specific assigned PM plus the whole service_manager/director
// audience for a branch. Read/cleared state is tracked per-user in
// notification_dismissals, NOT on the shared notification row itself
// otherwise one person reading a role-wide notification would mark it
// read for everyone else in that role too, and "clearing" would have
// nowhere real to persist to.
const mapNotification = (row, dismissedMap) => {
  const d = dismissedMap.get(row.id);
  return {
    id: row.id, type: row.type, title: row.title, body: row.body,
    tab: row.link_tab, read: Boolean(d), time: row.created_at,
  };
};

async function getCurrentAppUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { id: null, role: null, name: null, createdAt: null };
  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name, created_at')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  return { id: appUser?.id ?? null, role: appUser?.role ?? null, name: appUser?.full_name ?? null, createdAt: appUser?.created_at ?? null };
}

export const getMyNotifications = async () => {
  const appUser = await getCurrentAppUser();
  if (!appUser.id) return wrap([]);

  const [{ data: rows, error }, { data: dismissals, error: dErr }] = await Promise.all([
    supabase.from('notifications').select('*').or(`user_id.eq.${appUser.id},audience_role.eq.${appUser.role}`).order('created_at', { ascending: false }).limit(50),
    supabase.from('notification_dismissals').select('notification_id, read_only').eq('user_id', appUser.id),
  ]);
  if (error) throw error;
  if (dErr) throw dErr;

  const dismissedMap = new Map((dismissals ?? []).map((d) => [d.notification_id, d]));
  // "Cleared" (read_only = false) notifications are hidden entirely for
  // this user, that's the whole point of clearing them. "Read" ones
  // (read_only = true) still show, just not bolded/unread.
  const visible = (rows ?? []).filter((r) => {
    const d = dismissedMap.get(r.id);
    if (d && !d.read_only) return false;
    // A role-wide broadcast (audience_role match, not addressed to this
    // specific user) from before this account existed isn't relevant to
    // them, e.g. a brand-new customer shouldn't see "another client
    // registered" announcements from before they signed up.
    if (!r.user_id && appUser.createdAt && new Date(r.created_at) < new Date(appUser.createdAt)) return false;
    return true;
  });
  return wrap(visible.map((r) => mapNotification(r, dismissedMap)));
};

export const markNotificationRead = async (id) => {
  const appUser = await getCurrentAppUser();
  if (!appUser.id) return wrap({ message: 'Not signed in' });
  const { error } = await supabase.from('notification_dismissals')
    .upsert({ user_id: appUser.id, notification_id: id, read_only: true }, { onConflict: 'user_id,notification_id' });
  if (error) throw error;
  return wrap({ message: 'Marked read', id });
};

export const markAllNotificationsRead = async () => {
  const appUser = await getCurrentAppUser();
  if (!appUser.id) return wrap({ message: 'Nothing to update' });
  const { data: rows } = await supabase.from('notifications').select('id').or(`user_id.eq.${appUser.id},audience_role.eq.${appUser.role}`);
  if (rows?.length) {
    const { error } = await supabase.from('notification_dismissals')
      .upsert(rows.map((r) => ({ user_id: appUser.id, notification_id: r.id, read_only: true })), { onConflict: 'user_id,notification_id' });
    if (error) throw error;
  }
  return wrap({ message: 'All marked read' });
};

// "Clear", actually persists now, unlike before. Hides these
// notifications for this user specifically, permanently, without
// touching the underlying shared row (so it stays visible to anyone
// else it's still addressed to).
export const clearAllNotifications = async () => {
  const appUser = await getCurrentAppUser();
  if (!appUser.id) return wrap({ message: 'Nothing to clear' });
  const { data: rows } = await supabase.from('notifications').select('id').or(`user_id.eq.${appUser.id},audience_role.eq.${appUser.role}`);
  if (rows?.length) {
    const { error } = await supabase.from('notification_dismissals')
      .upsert(rows.map((r) => ({ user_id: appUser.id, notification_id: r.id, read_only: false })), { onConflict: 'user_id,notification_id' });
    if (error) throw error;
  }
  return wrap({ message: 'Cleared' });
};

export const createNotification = async (payload) => {
  const { error } = await supabase.from('notifications').insert({
    user_id: payload.userId || null, audience_role: payload.audienceRole || null,
    type: payload.type || 'system', title: payload.title, body: payload.body || null, link_tab: payload.tab || null,
  });
  if (error) throw error;
  return wrap({ message: 'Notification created' });
};

// REALTIME, live sync across sessions/devices
//
// Supabase Realtime streams row-level Postgres changes over a websocket.
// This helper wraps `supabase.channel(...).on('postgres_changes'...)`
// so screens (notifications bell, complaint queues, site settings/
// maintenance banner) can subscribe with one call instead of everyone
// hand-rolling channel setup/teardown. Requires the target table to be
// added to the `supabase_realtime` publication, see
// supabase/migrations/007_realtime.sql.
//
// Usage:
// useEffect(() => subscribeToTable('complaints', {}, () => reload()), []);
// Returns an unsubscribe function, call it from the effect's cleanup.
export const subscribeToTable = (table, { event = '*', filter, schema = 'public' } = {}, callback) => {
  const channelName = `rt:${table}:${filter || 'all'}:${Math.random().toString(36).slice(2, 8)}`;
  const config = { event, schema, table };
  if (filter) config.filter = filter;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', config, (payload) => callback(payload))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// CLIENT PORTFOLIO, Portfolio Manager CRM
export const CONTACT_METHODS = ['Phone', 'WhatsApp', 'Email', 'Physical visit'];
export const ASSISTANCE_STATUSES = ['Funded', 'Completed', 'Cancelled', 'Expired'];
export const INDUSTRIES = ['Retail', 'Construction', 'Agriculture', 'Logistics', 'Manufacturing', 'Services', 'Wholesale', 'Hospitality', 'Other'];

const wasContactedRecently = (lastContactDate, months = 3) => {
  if (!lastContactDate) return false;
  const cutoff = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
  return new Date(lastContactDate).getTime() >= cutoff;
};

const PORTFOLIO_CLIENT_SELECT = `
  id, client_code, company_name, reg_number, contact_person, phone, email, industry,
  last_contact_date, next_follow_up_date, contact_status_notes, preferred_contact_method,
  notes, created_at,
  branch:branches(name),
  pm:users!pm_id(id, full_name)
`;

const mapPortfolioClient = (row, assistanceCount = 0) => ({
  id: row.id,
  clientId: row.client_code,
  companyName: row.company_name,
  regNumber: row.reg_number,
  contactPerson: row.contact_person,
  phone: row.phone,
  email: row.email,
  branch: row.branch?.name ?? null,
  industry: row.industry,
  pmId: row.pm?.id ?? null,
  pmName: row.pm?.full_name ?? null,
  lastContactDate: row.last_contact_date,
  nextFollowUpDate: row.next_follow_up_date,
  contactStatusNotes: row.contact_status_notes,
  preferredContactMethod: row.preferred_contact_method,
  notes: row.notes,
  createdAt: row.created_at,
  assistanceCount,
  contactedRecently: wasContactedRecently(row.last_contact_date),
});

// filters: pmId (scope to one PM), orgWide (SM/Director, ignore pmId scoping
// unless also provided), branch, search, timeRange ('all'|days), frequency
// (number or '10+'), contactStatus ('recent'|'stale').
export const getPortfolioClients = async (filters = {}) => {
  let query = supabase.from('portfolio_clients').select(PORTFOLIO_CLIENT_SELECT).order('created_at', { ascending: false });
  if (filters.pmId && !filters.orgWide) query = query.eq('pm_id', filters.pmId);
  if (filters.branch && filters.branch !== 'All') {
    const branchId = await branchIdByName(filters.branch);
    if (branchId) query = query.eq('branch_id', branchId);
  }
  if (filters.search) {
    const q = filters.search;
    query = query.or(`company_name.ilike.%${q}%,contact_person.ilike.%${q}%,client_code.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw error;

  const ids = (data ?? []).map((c) => c.id);
  const counts = {};
  if (ids.length) {
    const { data: assistRows } = await supabase.from('assistance_records').select('portfolio_client_id, assistance_date').in('portfolio_client_id', ids);
    (assistRows ?? []).forEach((a) => { counts[a.portfolio_client_id] = (counts[a.portfolio_client_id] || 0) + 1; });

    var assistDatesByClient = {};
    (assistRows ?? []).forEach((a) => {
      (assistDatesByClient[a.portfolio_client_id] ||= []).push(a.assistance_date);
    });
  }

  let rows = (data ?? []).map((c) => mapPortfolioClient(c, counts[c.id] || 0));

  if (filters.timeRange && filters.timeRange !== 'all') {
    const days = Number(filters.timeRange);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    rows = rows.filter((c) => (assistDatesByClient?.[c.id] || []).some((d) => new Date(d).getTime() >= cutoff));
  }
  if (filters.frequency) {
    if (filters.frequency === '10+') rows = rows.filter((c) => c.assistanceCount >= 10);
    else rows = rows.filter((c) => c.assistanceCount === Number(filters.frequency));
  }
  if (filters.contactStatus === 'recent') rows = rows.filter((c) => c.contactedRecently);
  if (filters.contactStatus === 'stale') rows = rows.filter((c) => !c.contactedRecently);

  return wrap(rows);
};

export const getPortfolioClient = async (id) => {
  const { data: c, error } = await supabase.from('portfolio_clients').select(PORTFOLIO_CLIENT_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!c) return wrap(null);
  const { data: historyRows } = await supabase.from('assistance_records').select('*').eq('portfolio_client_id', id).order('assistance_date', { ascending: false });
  const history = (historyRows ?? []).map(mapAssistanceRecord);
  return wrap({ ...mapPortfolioClient(c, history.length), history });
};

export const createPortfolioClient = async (data, pm) => {
  const branch_id = await branchIdByName(data.branch || pm?.branch);
  const { data: inserted, error } = await supabase.from('portfolio_clients').insert({
    company_name: (data.companyName || '').trim() || 'Unnamed Client',
    reg_number: data.regNumber || null, contact_person: data.contactPerson || null,
    phone: data.phone || null, email: data.email || null, branch_id, industry: data.industry || null,
    pm_id: pm?.id, last_contact_date: data.lastContactDate || null, next_follow_up_date: data.nextFollowUpDate || null,
    contact_status_notes: data.contactStatusNotes || null, preferred_contact_method: data.preferredContactMethod || 'Phone',
    notes: data.notes || null,
  }).select(PORTFOLIO_CLIENT_SELECT).single();
  if (error) throw error;
  logSystemEvent('Client Portfolio', `Added client: ${inserted.company_name}`, pm?.name).catch(() => {});
  return wrap({ message: 'Client added to portfolio', client: mapPortfolioClient(inserted, 0) });
};

export const updatePortfolioClient = async (id, data) => {
  const patch = {};
  if (data.companyName !== undefined) patch.company_name = data.companyName;
  if (data.regNumber !== undefined) patch.reg_number = data.regNumber;
  if (data.contactPerson !== undefined) patch.contact_person = data.contactPerson;
  if (data.phone !== undefined) patch.phone = data.phone;
  if (data.email !== undefined) patch.email = data.email;
  if (data.industry !== undefined) patch.industry = data.industry;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.branch !== undefined) patch.branch_id = await branchIdByName(data.branch);
  const { data: updated, error } = await supabase.from('portfolio_clients').update(patch).eq('id', id).select(PORTFOLIO_CLIENT_SELECT).single();
  if (error) throw error;
  const { count } = await supabase.from('assistance_records').select('id', { count: 'exact', head: true }).eq('portfolio_client_id', id);
  return wrap({ message: 'Client updated', client: mapPortfolioClient(updated, count || 0) });
};

export const updatePortfolioClientContact = async (id, data) => {
  const patch = {};
  if (data.lastContactDate !== undefined) patch.last_contact_date = data.lastContactDate;
  if (data.nextFollowUpDate !== undefined) patch.next_follow_up_date = data.nextFollowUpDate;
  if (data.contactStatusNotes !== undefined) patch.contact_status_notes = data.contactStatusNotes;
  if (data.preferredContactMethod !== undefined) patch.preferred_contact_method = data.preferredContactMethod;
  const { data: updated, error } = await supabase.from('portfolio_clients').update(patch).eq('id', id).select(PORTFOLIO_CLIENT_SELECT).single();
  if (error) throw error;
  const { count } = await supabase.from('assistance_records').select('id', { count: 'exact', head: true }).eq('portfolio_client_id', id);
  return wrap({ message: 'Contact record updated', client: mapPortfolioClient(updated, count || 0) });
};

const mapAssistanceRecord = (row) => ({
  id: row.id, clientId: row.portfolio_client_id, assistanceDate: row.assistance_date,
  poNumber: row.po_number, buyerName: row.buyer_name, goodsDescription: row.goods_description,
  poValue: Number(row.po_value), amountFinanced: Number(row.amount_financed), clientContribution: Number(row.client_contribution),
  industry: row.industry, fundingInstitution: row.funding_institution, status: row.status,
  notes: row.notes, attachments: row.attachment_urls || [], pmId: row.pm_id, createdAt: row.created_at,
});

export const addAssistanceRecord = async (clientId, data, actor) => {
  const { data: client } = await supabase.from('portfolio_clients').select('branch_id, industry, pm_id').eq('id', clientId).maybeSingle();
  const { data: inserted, error } = await supabase.from('assistance_records').insert({
    portfolio_client_id: Number(clientId),
    assistance_date: data.assistanceDate || new Date().toISOString().slice(0, 10),
    po_number: data.poNumber || null, buyer_name: data.buyerName || null, goods_description: data.goodsDescription || null,
    po_value: Number(data.poValue) || 0, amount_financed: Number(data.amountFinanced) || 0, client_contribution: Number(data.clientContribution) || 0,
    industry: data.industry || client?.industry || null, funding_institution: data.fundingInstitution || null,
    branch_id: client?.branch_id || null, status: data.status || 'Funded', notes: data.notes || null,
    attachment_urls: data.attachments || [], pm_id: client?.pm_id || null,
  }).select().single();
  if (error) throw error;
  return wrap({ message: 'Assistance recorded', record: mapAssistanceRecord(inserted) });
};

export const updateAssistanceRecord = async (id, data) => {
  const patch = {};
  const fieldMap = { assistanceDate: 'assistance_date', poNumber: 'po_number', buyerName: 'buyer_name', goodsDescription: 'goods_description', poValue: 'po_value', amountFinanced: 'amount_financed', clientContribution: 'client_contribution', industry: 'industry', fundingInstitution: 'funding_institution', status: 'status', notes: 'notes' };
  for (const [key, col] of Object.entries(fieldMap)) if (data[key] !== undefined) patch[col] = data[key];
  const { data: updated, error } = await supabase.from('assistance_records').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return wrap({ message: 'Assistance record updated', record: mapAssistanceRecord(updated) });
};

export const deleteAssistanceRecord = async (id) => {
  const { error } = await supabase.from('assistance_records').delete().eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Assistance record deleted', id });
};

// Bulk Excel/CSV import, de-dupes by client_code, then reg number, then phone/email.
export const importPortfolioClients = async (rows, pm) => {
  const summary = { received: rows.length, newClients: 0, updated: 0, duplicates: 0, invalid: 0 };
  const invalidRows = [];
  const { data: existingClients } = await supabase.from('portfolio_clients').select('id, client_code, reg_number, phone, email, company_name');

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const companyName = (r.companyName || '').trim();
    if (!companyName) { summary.invalid++; invalidRows.push({ row: idx + 1, reason: 'Missing company name' }); continue; }

    let existing = null;
    if (r.clientId) existing = (existingClients ?? []).find((c) => c.client_code === String(r.clientId).trim().toUpperCase());
    if (!existing && r.regNumber) existing = (existingClients ?? []).find((c) => c.reg_number && c.reg_number === String(r.regNumber).trim());
    if (!existing && (r.phone || r.email)) {
      existing = (existingClients ?? []).find((c) =>
        (r.phone && c.phone && c.phone === String(r.phone).trim()) ||
        (r.email && c.email && c.email.toLowerCase() === String(r.email).trim().toLowerCase()));
    }

    const branch_id = await branchIdByName(r.branch || pm?.branch);
    if (existing) {
      await supabase.from('portfolio_clients').update({
        company_name: companyName, reg_number: r.regNumber || existing.reg_number, contact_person: r.contactPerson,
        phone: r.phone, email: r.email, branch_id, industry: r.industry, notes: r.notes,
      }).eq('id', existing.id);
      summary.updated++;
    } else {
      await supabase.from('portfolio_clients').insert({
        company_name: companyName, reg_number: r.regNumber || null, contact_person: r.contactPerson || null,
        phone: r.phone || null, email: r.email || null, branch_id, industry: r.industry || null,
        pm_id: pm?.id, last_contact_date: r.lastContactDate || null, preferred_contact_method: r.preferredContactMethod || 'Phone',
        notes: r.notes || null,
      });
      summary.newClients++;
    }
  }

  return wrap({
    message: `Import complete, ${summary.newClients} new, ${summary.updated} updated, ${summary.invalid} skipped`,
    summary, invalidRows,
  });
};

// Dashboard insight layer, top clients, at-risk clients, repeat conversion.
export const getPortfolioInsights = async (filters = {}) => {
  const { data } = await getPortfolioClients(filters);
  const clients = data;
  const topClients = [...clients].sort((a, b) => b.assistanceCount - a.assistanceCount).slice(0, 5)
    .map((c) => ({ clientId: c.clientId, companyName: c.companyName, assistanceCount: c.assistanceCount }));
  const atRisk = clients.filter((c) => !c.contactedRecently)
    .map((c) => ({ clientId: c.clientId, companyName: c.companyName, lastContactDate: c.lastContactDate, pmName: c.pmName }));
  const repeatClients = clients.filter((c) => c.assistanceCount > 1).length;
  const repeatRate = clients.length ? Math.round((repeatClients / clients.length) * 100) : 0;
  const totalAssistanceEvents = clients.reduce((sum, c) => sum + c.assistanceCount, 0);
  return wrap({ topClients, atRisk, repeatRate, totalClients: clients.length, totalAssistanceEvents });
};

// Submitted once, right after a complaint is closed (see ClientDashboard's
// "closed && !satisfaction" prompt). Writes to complaint_satisfaction,
// which PM rating stats below are computed from.
export const submitSatisfactionSurvey = async (complaintId, data) => {
  const { error } = await supabase.from('complaint_satisfaction').upsert({
    complaint_id: Number(complaintId),
    issue_resolved: Boolean(data.issueResolved),
    communication_satisfactory: Boolean(data.communicationSatisfactory),
    pm_professional: Boolean(data.pmProfessional),
    rating: Number(data.rating) || 0,
    comments: data.comments || '',
  }, { onConflict: 'complaint_id' });
  if (error) throw error;
  return wrap({ message: 'Thank you for your feedback!' });
};

// Real per-PM rating stats, replaces what used to be a locally hardcoded
// "RATING_TREND" array in PmDashboard.jsx. Ratings come from
// complaint_satisfaction, joined through complaints.assigned_pm_id so this
// reflects satisfaction with THIS PM specifically, not the branch overall.
export const getPmRatingStats = async (pmId) => {
  const { data: complaints } = await supabase.from('complaints').select('id').eq('assigned_pm_id', pmId);
  const complaintIds = (complaints ?? []).map((c) => c.id);

  const [{ data: satisfactionRows, error: sErr }, { data: feedbackRows, error: fErr }, { data: requestRows, error: rErr }] = await Promise.all([
    complaintIds.length
      ? supabase.from('complaint_satisfaction').select('rating, submitted_at').in('complaint_id', complaintIds)
      : Promise.resolve({ data: [] }),
    supabase.from('feedback').select('rating, created_at').eq('staff_id', pmId),
    supabase.from('feedback_requests').select('rating, completed_at').eq('staff_id', pmId).eq('status', 'completed'),
  ]);
  if (sErr) throw sErr;
  if (fErr) throw fErr;
  if (rErr) throw rErr;

  const rows = [
    ...(satisfactionRows ?? []).map((r) => ({ rating: r.rating, at: r.submitted_at })), ...(feedbackRows ?? []).map((r) => ({ rating: r.rating, at: r.created_at })), ...(requestRows ?? []).map((r) => ({ rating: r.rating, at: r.completed_at })),
  ];
  if (!rows.length) return wrap({ avgRating: 0, totalRatings: 0, positiveCount: 0, neutralCount: 0, negativeCount: 0, trend: [] });

  const avgRating = Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10;
  const positiveCount = rows.filter((r) => r.rating >= 4).length;
  const neutralCount = rows.filter((r) => r.rating === 3).length;
  const negativeCount = rows.filter((r) => r.rating <= 2).length;

  const byMonth = {};
  rows.forEach((r) => {
    const month = new Date(r.at).toLocaleDateString('en-GB', { month: 'short' });
    (byMonth[month] ||= []).push(r.rating);
  });
  const trend = Object.entries(byMonth).map(([month, vals]) => ({
    month, avgRating: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
  }));

  return wrap({ avgRating, totalRatings: rows.length, positiveCount, neutralCount, negativeCount, trend });
};

// Real CSAT trend, combines direct client-portal ratings (feedback table)
// and post-complaint satisfaction surveys (complaint_satisfaction table)
// into one weekly average, since both represent genuine customer
// satisfaction signals. Replaces the mock version that always returned
// an empty trend regardless of how much real rating data existed.
export const getCsatTrend = async () => {
  const [{ data: feedbackRows, error: fErr }, { data: satisfactionRows, error: sErr }, { data: requestRows, error: rErr }] = await Promise.all([
    supabase.from('feedback').select('rating, created_at'),
    supabase.from('complaint_satisfaction').select('rating, submitted_at'),
    supabase.from('feedback_requests').select('rating, completed_at').eq('status', 'completed'),
  ]);
  if (fErr) throw fErr;
  if (sErr) throw sErr;
  if (rErr) throw rErr;

  const all = [
    ...(feedbackRows ?? []).map((r) => ({ rating: r.rating, at: r.created_at })), ...(satisfactionRows ?? []).map((r) => ({ rating: r.rating, at: r.submitted_at })), ...(requestRows ?? []).map((r) => ({ rating: r.rating, at: r.completed_at })),
  ].filter((r) => r.rating != null && r.at);

  if (!all.length) return wrap({ trend: [] });

  // Bucket into ISO week-of-year so multiple years don't collide, then
  // present the last 12 weeks with real data, oldest first.
  const weekKey = (d) => {
    const date = new Date(d);
    const firstJan = new Date(date.getFullYear(), 0, 1);
    const week = Math.ceil((((date - firstJan) / 86400000) + firstJan.getDay() + 1) / 7);
    return { key: `${date.getFullYear()}-W${week}`, label: `W${week}` };
  };

  const byWeek = {};
  all.forEach((r) => {
    const { key, label } = weekKey(r.at);
    (byWeek[key] ||= { label, ratings: [] }).ratings.push(r.rating);
  });

  const trend = Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([, { label, ratings }]) => ({
      week: label,
      avgRating: Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10,
    }));

  return wrap({ trend });
};

// Real Branch Health Score, replaces the mock version that computed its
// composite score (including the CSAT component) from the empty in-memory
// COMPLAINTS array. Same formula: Resolution(40) + Escalation-inverse(15)
// + Satisfaction(25) + SLA compliance(15) + Volume(5) = 100.
export const getBranchHealthScores = async () => {
  const [{ data: branches, error: bErr }, { data: complaints, error: cErr }, { data: feedbackRows, error: fErr }, { data: satisfactionRows, error: sErr }, { data: requestRows, error: rErr }] = await Promise.all([
    supabase.from('branches').select('id, name'),
    supabase.from('complaints').select('id, branch_id, status, created_at'),
    supabase.from('feedback').select('branch_id, rating'),
    supabase.from('complaint_satisfaction').select('rating, complaint_id, complaints!inner(branch_id)'),
    supabase.from('feedback_requests').select('branch_id, rating').eq('status', 'completed'),
  ]);
  if (bErr) throw bErr;
  if (cErr) throw cErr;
  if (fErr) throw fErr;
  if (sErr) throw sErr;
  if (rErr) throw rErr;

  const data = (branches ?? []).map((b) => {
    const branchComplaints = (complaints ?? []).filter((c) => c.branch_id === b.id);
    const total = branchComplaints.length || 1;
    const resolved = branchComplaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
    const escalated = branchComplaints.filter((c) => c.status === 'escalated').length;
    const slaBreaches = branchComplaints.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status) && (Date.now() - new Date(c.created_at).getTime()) / 86400000 > 14).length;

    const ratings = [
      ...(feedbackRows ?? []).filter((f) => f.branch_id === b.id).map((f) => f.rating), ...(satisfactionRows ?? []).filter((s) => s.complaints?.branch_id === b.id).map((s) => s.rating), ...(requestRows ?? []).filter((r) => r.branch_id === b.id).map((r) => r.rating),
    ];
    const avgCsat = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;

    const resolutionPart = (resolved / total) * 40;
    const escalationPart = (1 - escalated / total) * 15;
    const csatPart = (avgCsat / 5) * 25;
    const slaPart = Math.max(0, (1 - slaBreaches / Math.max(total, 1))) * 15;
    const volumePart = 5; // simplified, full impl would normalize by population
    const score = Math.round(resolutionPart + escalationPart + csatPart + slaPart + volumePart);

    return {
      branchId: b.id,
      branch: b.name,
      score,
      grade: score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 65 ? 'C' : score >= 55 ? 'D' : 'F',
      breakdown: {
        resolutionRate: Number((resolved / total * 100).toFixed(1)),
        escalationRate: Number((escalated / total * 100).toFixed(1)),
        avgCsat: Number(avgCsat.toFixed(2)),
        slaBreaches,
        total: branchComplaints.length,
      },
    };
  });
  return wrap(data);
};

// Director-authored notes on a branch's Health Scorecard (context for a
// score, a mitigation plan already underway, etc.). Same shape as
// complaint_notes; RLS restricts read/write to director/admin.
export const getBranchHealthNotes = async (branchId) => {
  const { data, error } = await supabase
    .from('branch_health_notes')
    .select('id, author, body, created_at')
    .eq('branch_id', Number(branchId))
    .order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map((n) => ({ id: n.id, author: n.author, text: n.body, at: n.created_at })));
};

export const addBranchHealthNote = async (branchId, data = {}) => {
  const { data: appUser } = await supabase.from('users').select('id').eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id).maybeSingle();
  const { data: inserted, error } = await supabase.from('branch_health_notes').insert({
    branch_id: Number(branchId), author: data.author || 'Director', author_user_id: appUser?.id || null, body: data.text,
  }).select('id, author, body, created_at').single();
  if (error) throw error;
  return wrap({ message: 'Note added', note: { id: inserted.id, author: inserted.author, text: inserted.body, at: inserted.created_at } });
};

// Real Active Client Analytics, replaces the mock version that always
// returned all-zero totals disconnected from the real customer base.
// "New" vs "existing" comes from client_profiles.client_type, which is
// set at registration (asked whether they've had a Ticano facility before).
export const getActiveClientAnalytics = async () => {
  const { data: profiles, error } = await supabase
    .from('client_profiles')
    .select('client_type, created_at, preferred_branch:branches!preferred_branch_id(name)');
  if (error) throw error;
  const rows = profiles ?? [];

  const newClients = rows.filter((r) => r.client_type === 'new').length;
  const existingClients = rows.filter((r) => r.client_type === 'existing').length;

  const byMonth = {};
  rows.forEach((r) => {
    const month = new Date(r.created_at).toLocaleDateString('en-GB', { month: 'short' });
    (byMonth[month] ||= { newClients: 0, existingClients: 0 });
    if (r.client_type === 'new') byMonth[month].newClients++; else byMonth[month].existingClients++;
  });
  const months = Object.keys(byMonth);
  const newClientsTrend = months.map((month) => ({ month, count: byMonth[month].newClients }));
  const existingClientsTrend = months.map((month) => ({ month, count: byMonth[month].existingClients }));

  const byBranch = {};
  rows.forEach((r) => {
    const b = r.preferred_branch?.name || 'Unassigned';
    (byBranch[b] ||= { newClients: 0, existingClients: 0 });
    if (r.client_type === 'new') byBranch[b].newClients++; else byBranch[b].existingClients++;
  });

  return wrap({
    totals: { newClients, existingClients, totalActive: rows.length },
    newClientsTrend, existingClientsTrend,
    conversionRate: 0, // needs the Leads module linked to conversions to compute honestly
    retentionRate: rows.length ? Math.round((existingClients / rows.length) * 1000) / 10 : 0,
    byBranch: BRANCHES.map((b) => ({ branch: b, ...(byBranch[b] || { newClients: 0, existingClients: 0 }) })),
  });
};

// Real Marketing Summary, replaces the mock all-zero version. Computed
// from real customer signups (users + client_profiles).
export const getMarketingSummary = async () => {
  const { data: profiles, error } = await supabase
    .from('client_profiles')
    .select('created_at, referral_source_id, preferred_branch:branches!preferred_branch_id(name)');
  if (error) throw error;
  const rows = profiles ?? [];

  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;
  const newThisWeek = rows.filter((r) => new Date(r.created_at).getTime() >= weekAgo).length;
  const newThisMonth = rows.filter((r) => new Date(r.created_at).getTime() >= monthAgo).length;
  const withReferral = rows.filter((r) => r.referral_source_id != null).length;

  const byMonth = {};
  rows.forEach((r) => {
    const month = new Date(r.created_at).toLocaleDateString('en-GB', { month: 'short' });
    byMonth[month] = (byMonth[month] || 0) + 1;
  });
  const acquisitionTrend = Object.entries(byMonth).map(([month, count]) => ({ month, count }));

  const byBranch = {};
  rows.forEach((r) => { const b = r.preferred_branch?.name || 'Unassigned'; byBranch[b] = (byBranch[b] || 0) + 1; });

  return wrap({
    totalCustomers: rows.length,
    newThisWeek, newThisMonth,
    referralConversionRate: rows.length ? Math.round((withReferral / rows.length) * 1000) / 10 : 0,
    acquisitionTrend,
    branchAcquisition: BRANCHES.map((b) => ({ branch: b, customers: byBranch[b] || 0 })),
  });
};

// Real referral source breakdown, from referral_sources + client_profiles.
export const getReferralSources = async () => {
  const [{ data: sources, error: srcErr }, { data: profiles, error: profErr }] = await Promise.all([
    supabase.from('referral_sources').select('id, name'),
    supabase.from('client_profiles').select('referral_source_id, referral_other_text'),
  ]);
  if (srcErr) throw srcErr;
  if (profErr) throw profErr;

  const counts = {};
  (profiles ?? []).forEach((p) => {
    const src = (sources ?? []).find((s) => s.id === p.referral_source_id);
    const label = src?.name || (p.referral_other_text ? 'Other' : null);
    if (label) counts[label] = (counts[label] || 0) + 1;
  });
  const otherDetails = (profiles ?? []).filter((p) => p.referral_other_text).map((p) => p.referral_other_text);

  return wrap({
    sources: Object.entries(counts).map(([source, count]) => ({ source, count })),
    otherDetails,
  });
};

// Real lead conversion funnel, from the leads table's status field.
export const getLeadFunnel = async () => {
  const { data: leadRows, error } = await supabase.from('leads').select('status, branch:branches(name), added_by_name');
  if (error) throw error;
  const rows = leadRows ?? [];

  // Honest interpretation: without stage-history tracking, we can only show
  // the current status distribution, not a true progressive funnel.
  const byStatus = {};
  rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
  const realFunnel = ['New', 'Contacted', 'Interested', 'Converted', 'Lost'].map((stage) => ({ stage, count: byStatus[stage] || 0 }));

  const byBranchMap = {};
  rows.forEach((r) => {
    const b = r.branch?.name || 'Unassigned';
    (byBranchMap[b] ||= { leads: 0, converted: 0 });
    byBranchMap[b].leads++;
    if (r.status === 'Converted') byBranchMap[b].converted++;
  });
  const byBranch = BRANCHES.map((b) => {
    const d = byBranchMap[b] || { leads: 0, converted: 0 };
    return { branch: b, leads: d.leads, converted: d.converted, conversionRate: d.leads ? Math.round((d.converted / d.leads) * 1000) / 10 : 0 };
  });

  const byPmMap = {};
  rows.forEach((r) => {
    const pm = r.added_by_name || 'Unknown';
    (byPmMap[pm] ||= { created: 0, converted: 0 });
    byPmMap[pm].created++;
    if (r.status === 'Converted') byPmMap[pm].converted++;
  });
  const byPm = Object.entries(byPmMap).map(([pm, d]) => ({ pm, created: d.created, converted: d.converted, rate: d.created ? Math.round((d.converted / d.created) * 1000) / 10 : 0 }));

  return wrap({ funnel: realFunnel, byBranch, byPm });
};

// Real demographics, birthdays and age groups from client_profiles.date_of_birth
// (only populated for clients who opted in to birthday messages).
export const getDemographics = async () => {
  const { data: profiles, error } = await supabase.from('client_profiles').select('date_of_birth').not('date_of_birth', 'is', null);
  if (error) throw error;
  const rows = profiles ?? [];

  const now = new Date();
  const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
  let birthdaysThisWeek = 0, birthdaysThisMonth = 0;

  rows.forEach((r) => {
    const dob = new Date(r.date_of_birth);
    const age = now.getFullYear() - dob.getFullYear();
    if (age <= 25) ageGroups['18-25']++;
    else if (age <= 35) ageGroups['26-35']++;
    else if (age <= 45) ageGroups['36-45']++;
    else if (age <= 55) ageGroups['46-55']++;
    else ageGroups['56+']++;

    const nextBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    const daysUntil = (nextBday - now) / 86400000;
    if (daysUntil >= 0 && daysUntil <= 7) birthdaysThisWeek++;
    if (nextBday.getMonth() === now.getMonth()) birthdaysThisMonth++;
  });

  return wrap({
    byAgeGroup: Object.entries(ageGroups).map(([group, count]) => ({ group, count })),
    birthdaysThisMonth, birthdaysThisWeek,
  });
};

// Real customer location breakdown, from client_profiles.base_location
// (only populated for clients who opted in to location sharing).
export const getLocationAnalytics = async () => {
  const { data: profiles, error } = await supabase.from('client_profiles').select('base_location').not('base_location', 'is', null);
  if (error) throw error;
  const counts = {};
  (profiles ?? []).forEach((p) => { counts[p.base_location] = (counts[p.base_location] || 0) + 1; });
  return wrap({ locations: Object.entries(counts).map(([location, count]) => ({ location, count })) });
};

// Real report data generator, replaces the mock version that always
// returned all-zero summary stats regardless of report type or filters.
// Shares the same real-data approach as PDFReportGenerator's loader.
export const generateReport = async (type, params = {}) => {
  const [{ data: analytics }, { data: branchRows }, { data: marketing }] = await Promise.all([
    getComplaintAnalytics(),
    getBranchComparison(),
    getMarketingSummary(),
  ]);

  const topIssue = analytics.byCategory?.length
    ? [...analytics.byCategory].sort((a, b) => b.count - a.count)[0].category
    : null;

  const branchFilter = params.branch && params.branch !== 'All'
    ? branchRows.find((b) => b.branch === params.branch)
    : null;

  return wrap({
    reportId: 'RPT-' + Date.now(),
    type, params,
    generatedAt: new Date().toISOString(),
    message: `${type} report generated successfully`,
    summary: {
      period: params.period ? `Last ${params.period} days` : 'Last 30 days',
      branch: params.branch || 'All branches',
      totalComplaints: branchFilter ? branchFilter.openComplaints + branchFilter.resolvedComplaints : analytics.total,
      resolved: branchFilter ? branchFilter.resolvedComplaints : analytics.resolved,
      escalated: analytics.escalated,
      avgCsat: branchFilter ? branchFilter.avgRating : analytics.avgSatisfaction,
      slaBreaches: 0, // needs a dedicated SLA-breach query; not yet built
      topIssue,
      totalCustomers: marketing.totalCustomers,
      newThisMonth: marketing.newThisMonth,
      referralConversionRate: marketing.referralConversionRate,
    },
  });
};

// Real feedback word cloud, extracts word frequency from actual customer
// comments (feedback + improvement_feedback), replacing the mock version
// that always returned an empty list regardless of how much text existed.
const STOPWORDS = new Set(['the','a','an','and','or','but','is','are','was','were','be','been','to','of','in','on','at','for','with','this','that','it','i','my','we','our','you','your','they','their','he','she','his','her','as','by','from','not','no','so','very','just','than','then','also','have','has','had','will','would','could','should','can','if','about','me','us','them','it\'s','im','am']);

export const getWordCloud = async () => {
  const [{ data: feedbackRows, error: fErr }, { data: impRows, error: iErr }] = await Promise.all([
    supabase.from('feedback').select('comment').not('comment', 'is', null),
    supabase.from('improvement_feedback').select('body'),
  ]);
  if (fErr) throw fErr;
  if (iErr) throw iErr;

  const allText = [...(feedbackRows ?? []).map((r) => r.comment), ...(impRows ?? []).map((r) => r.body)].join(' ');
  const counts = {};
  allText
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    .forEach((w) => { counts[w] = (counts[w] || 0) + 1; });

  const words = Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  return wrap({ words });
};

// Real referral trends over time + by branch, replaces the mock version's
// permanently-empty trend. Uses whatever referral source NAMES actually
// exist in the data as dynamic chart series, rather than hardcoding
// specific source names that could silently stop matching real data.
export const getReferralTrends = async () => {
  const { data: profiles, error } = await supabase
    .from('client_profiles')
    .select('created_at, referral_source:referral_sources(name), preferred_branch:branches!preferred_branch_id(name)')
    .not('referral_source_id', 'is', null);
  if (error) throw error;
  const rows = (profiles ?? []).filter((r) => r.referral_source?.name);

  const byMonth = {};
  rows.forEach((r) => {
    const month = new Date(r.created_at).toLocaleDateString('en-GB', { month: 'short' });
    const src = r.referral_source.name;
    (byMonth[month] ||= {})[src] = (byMonth[month][src] || 0) + 1;
  });
  const trend = Object.entries(byMonth).map(([month, sources]) => ({ month, ...sources }));

  const byBranchMap = {};
  rows.forEach((r) => {
    const b = r.preferred_branch?.name || 'Unassigned';
    const src = r.referral_source.name;
    (byBranchMap[b] ||= {})[src] = (byBranchMap[b][src] || 0) + 1;
  });
  const byBranch = BRANCHES.map((b) => ({ branch: b, ...(byBranchMap[b] || {}) }));

  return wrap({ trend, byBranch });
};

// Real referral network stats. topReferrers (individual customers who
// brought in the most new business) is honestly empty, the schema
// tracks WHERE a client heard about Ticano (referral_sources), not WHICH
// existing client referred them, so there's no "referred_by" chain to
// rank. totalReferralCustomers/conversionFromReferrals are fully real.
export const getReferralNetwork = async () => {
  try {
    const { count: total, error: tErr } = await supabase.from('client_profiles').select('id', { count: 'exact', head: true });
    if (tErr) throw tErr;
    const { count: referred, error: rErr } = await supabase.from('client_profiles').select('id', { count: 'exact', head: true }).not('referral_source_id', 'is', null);
    if (rErr) throw rErr;

    // Named referrers, only meaningful for "Friend or Family Referral"
    // signups where the client named who referred them (an optional
    // field). Grouped by name since one person can refer several clients.
    const { data: namedRows } = await supabase.from('client_profiles').select('referred_by_name').not('referred_by_name', 'is', null);
    const counts = {};
    (namedRows ?? []).forEach((r) => {
      const name = r.referred_by_name.trim();
      if (name) counts[name] = (counts[name] || 0) + 1;
    });
    const topReferrers = Object.entries(counts)
      .map(([name, referrals]) => ({ name, referrals }))
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 10);

    return wrap({
      topReferrers,
      totalReferralCustomers: referred || 0,
      conversionFromReferrals: total ? Math.round(((referred || 0) / total) * 1000) / 10 : 0,
    });
  } catch (err) {
    console.error('[getReferralNetwork] failed, returning safe defaults:', err);
    return wrap({ topReferrers: [], totalReferralCustomers: 0, conversionFromReferrals: 0 });
  }
};

// Real data for the "Advanced Charts" explorer, replaces five separate
// hardcoded sample datasets (monthly complaint trend, branch comparison,
// category breakdown, day/hour heatmap, and CSAT distribution) with the
// same shapes computed from real complaints/feedback/satisfaction data.
export const getAdvancedChartsData = async () => {
  const [{ data: complaints, error: cErr }, { data: branchRows }, { data: feedbackRows }, { data: satisfactionRows }] = await Promise.all([
    supabase.from('complaints').select('status, category_name, branch:branches(name), created_at, resolved_at'),
    getBranchComparison(),
    supabase.from('feedback').select('rating'),
    supabase.from('complaint_satisfaction').select('rating'),
  ]);
  if (cErr) throw cErr;
  const rows = complaints ?? [];

  // Monthly open/resolved/escalated trend.
  const byMonth = {};
  rows.forEach((c) => {
    const month = new Date(c.created_at).toLocaleDateString('en-GB', { month: 'short' });
    (byMonth[month] ||= { open: 0, resolved: 0, escalated: 0 });
    if (OPEN_COMPLAINT_STATUSES.includes(c.status)) byMonth[month].open++;
    if (c.status === 'resolved' || c.status === 'closed') byMonth[month].resolved++;
    if (c.status === 'escalated') byMonth[month].escalated++;
  });
  const complaintTrend = Object.entries(byMonth).map(([month, v]) => ({ month, ...v }));

  // Branch comparison (csat/complaints/health), reuse real branch data.
  const branchBar = branchRows.map((b) => ({
    branch: b.branch, csat: b.avgRating, complaints: b.openComplaints + b.resolvedComplaints,
    health: Math.max(0, Math.round(100 - b.escalationRate * 5)),
  }));

  // Category distribution.
  const categoryCounts = {};
  rows.forEach((c) => { categoryCounts[c.category_name] = (categoryCounts[c.category_name] || 0) + 1; });
  const categoryPie = Object.entries(categoryCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  // Day-of-week × hour-of-day complaint volume heatmap.
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hourBuckets = ['8am', '10am', '12pm', '2pm', '4pm'];
  const heatmap = {};
  dayNames.slice(1, 6).forEach((d) => { heatmap[d] = { day: d, '8am': 0, '10am': 0, '12pm': 0, '2pm': 0, '4pm': 0 }; });
  rows.forEach((c) => {
    const d = new Date(c.created_at);
    const dayName = dayNames[d.getDay()];
    if (!heatmap[dayName]) return; // weekend, not shown, matches original 5-day layout
    const hour = d.getHours();
    const bucket = hour < 9 ? '8am' : hour < 11 ? '10am' : hour < 13 ? '12pm' : hour < 15 ? '2pm' : '4pm';
    heatmap[dayName][bucket]++;
  });
  const heatmapData = Object.values(heatmap);

  // CSAT star distribution, combining both rating sources.
  const allRatings = [...(feedbackRows ?? []).map((r) => r.rating), ...(satisfactionRows ?? []).map((r) => r.rating)];
  const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  allRatings.forEach((r) => { if (starCounts[r] !== undefined) starCounts[r]++; });
  const csatDist = [1, 2, 3, 4, 5].map((n) => ({ stars: ''.repeat(n) + ` ${n}`, count: starCounts[n] }));

  return wrap({ complaintTrend, branchBar, categoryPie, heatmapData, csatDist });
};

// Real PM workload, replaces the mock version that always returned [].
// This is what powers the "branch staff" preview on Service Manager's
// Unassigned Customers tab, so an empty array here made it look like no
// staff existed at all.
export const getPmWorkload = async (branchName = null) => {
  const branchId = branchName ? await branchIdByName(branchName) : null;
  let staffQuery = supabase.from('users').select('id, full_name, branch_id').eq('role', 'portfolio_manager').eq('is_active', true);
  if (branchId) staffQuery = staffQuery.eq('branch_id', branchId);
  const { data: pms, error: pErr } = await staffQuery;
  if (pErr) throw pErr;
  if (!pms.length) return wrap([]);

  const pmIds = pms.map((p) => p.id);
  const [{ data: clients }, { data: complaints }] = await Promise.all([
    supabase.from('portfolio_clients').select('pm_id').in('pm_id', pmIds),
    supabase.from('complaints').select('assigned_pm_id, status').in('assigned_pm_id', pmIds),
  ]);

  return wrap(pms.map((pm) => ({
    pmId: pm.id,
    pmName: pm.full_name,
    assignedCustomers: (clients ?? []).filter((c) => c.pm_id === pm.id).length,
    openComplaints: (complaints ?? []).filter((c) => c.assigned_pm_id === pm.id && OPEN_COMPLAINT_STATUSES.includes(c.status)).length,
  })));
};

// Real staff performance table, replaces the mock version that always
// returned []. Covers PMs and Service Managers (the two staff roles a
// Service Manager dashboard reasonably reviews); ratings combine direct
// feedback and post-complaint satisfaction surveys tied to that person.
export const getStaffPerformance = async (branchName = null) => {
  const branchId = branchName ? await branchIdByName(branchName) : null;
  let staffQuery = supabase.from('users').select('id, full_name, role, branch_id').in('role', ['portfolio_manager', 'service_manager']).eq('is_active', true);
  if (branchId) staffQuery = staffQuery.eq('branch_id', branchId);
  const { data: staffRows, error: sErr } = await staffQuery;
  if (sErr) throw sErr;
  if (!staffRows.length) return wrap([]);

  const staffIds = staffRows.map((s) => s.id);
  const [{ data: complaints }, { data: feedbackRows }, { data: satisfactionRows }, { data: requestRows }] = await Promise.all([
    supabase.from('complaints').select('id, assigned_pm_id, status'),
    supabase.from('feedback').select('staff_id, rating'),
    supabase.from('complaint_satisfaction').select('rating, complaints!inner(assigned_pm_id)'),
    supabase.from('feedback_requests').select('staff_id, rating').eq('status', 'completed'),
  ]);

  return wrap(staffRows.map((s) => {
    const myComplaints = (complaints ?? []).filter((c) => c.assigned_pm_id === s.id);
    const resolvedComplaints = myComplaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
    const openComplaints = myComplaints.filter((c) => OPEN_COMPLAINT_STATUSES.includes(c.status)).length;
    const ratings = [
      ...(feedbackRows ?? []).filter((f) => f.staff_id === s.id).map((f) => f.rating), ...(satisfactionRows ?? []).filter((r) => r.complaints?.assigned_pm_id === s.id).map((r) => r.rating), ...(requestRows ?? []).filter((r) => r.staff_id === s.id).map((r) => r.rating),
    ];
    const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
    return {
      staffId: s.id, name: s.full_name, role: s.role,
      avgRating, totalInteractions: myComplaints.length, feedbackCount: ratings.length,
      resolvedComplaints, openComplaints,
    };
  }));
};

// CUSTOMER LIFECYCLE, unassigned → potential client → portfolio client
// New customer signs up (client_profiles.assigned_pm_id is null) →
// appears in Service Manager's Unassigned list. Once a PM is assigned
// (by a Service Manager or auto-assign), they become a "potential
// client" visible to that PM, not yet a real portfolio_clients row.
// The PM converts them explicitly, which is what actually creates the
// portfolio_clients record (starting at zero assists) linked back to
// this same customer via customer_user_id.
const mapUnassignedCustomer = (row) => ({
  id: row.id,
  name: row.full_name,
  whatsappNumber: row.whatsapp_number,
  email: row.email,
  preferredBranch: row.branch?.name ?? null,
  preferredBranchId: row.branch_id,
  clientType: row.client_profiles?.[0]?.client_type ?? 'new',
  createdAt: row.created_at,
});

export const getUnassignedCustomers = async () => {
  // Two straightforward queries instead of one query that filters through
  // an embedded/joined resource (users -> client_profiles), that pattern
  // depends on PostgREST correctly inferring the relationship and embed
  // filter syntax, which is easy to get subtly wrong. This is simpler and
  // more predictable: fetch customer profiles with no PM yet, then fetch
  // the matching user records.
  const { data: profiles, error: profErr } = await supabase
    .from('client_profiles')
    .select('user_id, client_type')
    .is('assigned_pm_id', null);
  if (profErr) throw profErr;
  if (!profiles?.length) return wrap([]);

  const userIds = profiles.map((p) => p.user_id);
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, full_name, whatsapp_number, email, branch_id, created_at, branch:branches(name)')
    .in('id', userIds)
    .eq('role', 'customer');
  if (userErr) throw userErr;

  const clientTypeById = new Map(profiles.map((p) => [p.user_id, p.client_type]));
  return wrap(
    (users ?? [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((u) => mapUnassignedCustomer({ ...u, client_profiles: [{ client_type: clientTypeById.get(u.id) }] }))
  );
};

// All customers who DO have a PM, the counterpart to getUnassignedCustomers,
// used for the Service Manager's "Assigned Clients" roster (grouped by
// branch, then PM, in the UI). Same two-step query shape for the same
// reason: predictable, no embedded-filter guesswork.
export const getAssignedCustomers = async () => {
  const { data: profiles, error: profErr } = await supabase
    .from('client_profiles')
    .select('user_id, client_type, assigned_pm_id, assigned_pm:users!assigned_pm_id(full_name)')
    .not('assigned_pm_id', 'is', null);
  if (profErr) throw profErr;
  if (!profiles?.length) return wrap([]);

  const userIds = profiles.map((p) => p.user_id);
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, full_name, whatsapp_number, email, branch_id, created_at, branch:branches(name)')
    .in('id', userIds)
    .eq('role', 'customer');
  if (userErr) throw userErr;

  const profileById = new Map(profiles.map((p) => [p.user_id, p]));
  return wrap(
    (users ?? [])
      .sort((a, b) => (a.branch?.name || '').localeCompare(b.branch?.name || ''))
      .map((u) => {
        const p = profileById.get(u.id);
        return {
          id: u.id,
          name: u.full_name,
          whatsappNumber: u.whatsapp_number,
          email: u.email,
          preferredBranch: u.branch?.name ?? null,
          clientType: p?.client_type ?? 'new',
          assignedPmId: p?.assigned_pm_id ?? null,
          assignedPmName: p?.assigned_pm?.full_name ?? null,
          createdAt: u.created_at,
        };
      })
  );
};

// portfolio clients combined), used both for one-click "Assign" and for
// "Auto-assign all".
async function pickLeastLoadedPm(branchId) {
  // Branch-only, no org-wide fallback, a customer should only ever be
  // assigned a PM from their own preferred branch. If they somehow have
  // no branch on file, there's nothing safe to pick from.
  if (!branchId) return null;
  const { data: pms } = await supabase.from('users').select('id, full_name').eq('role', 'portfolio_manager').eq('is_active', true).eq('branch_id', branchId);
  if (!pms?.length) return null;
  if (pms.length === 1) return pms[0];

  const pmIds = pms.map((p) => p.id);
  const [{ data: potential }, { data: portfolio }] = await Promise.all([
    supabase.from('client_profiles').select('assigned_pm_id').in('assigned_pm_id', pmIds),
    supabase.from('portfolio_clients').select('pm_id').in('pm_id', pmIds),
  ]);
  const loadCount = {};
  pmIds.forEach((id) => { loadCount[id] = 0; });
  (potential ?? []).forEach((r) => { loadCount[r.assigned_pm_id]++; });
  (portfolio ?? []).forEach((r) => { loadCount[r.pm_id]++; });
  return pms.reduce((least, pm) => (loadCount[pm.id] < loadCount[least.id] ? pm : least), pms[0]);
}

export const assignCustomer = async ({ customerId, pmId }) => {
  const { data: customer } = await supabase.from('users').select('branch_id, full_name').eq('id', customerId).maybeSingle();
  let targetPmId = pmId;
  let pmName = null;
  if (!targetPmId) {
    const pm = await pickLeastLoadedPm(customer?.branch_id);
    if (!pm) throw new Error('No active Portfolio Manager available to assign to' + (customer?.branch_id ? ' in this branch' : ''));
    targetPmId = pm.id;
    pmName = pm.full_name;
  }
  const { error } = await supabase.from('client_profiles').update({ assigned_pm_id: targetPmId }).eq('user_id', customerId);
  if (error) throw error;
  logSystemEvent('Client Portfolio', `Assigned ${customer?.full_name || 'customer'} to ${pmName || 'PM #' + targetPmId}`, 'Service Manager').catch(() => {});
  return wrap({ message: 'Customer assigned successfully', customerId, pmId: targetPmId });
};

export const autoAssignCustomers = async () => {
  const { data: unassigned } = await getUnassignedCustomers();
  let count = 0;
  for (const customer of unassigned) {
    try {
      await assignCustomer({ customerId: customer.id, pmId: null });
      count++;
    } catch { /* skip customers whose branch has no active PM, continue with the rest */ }
  }
  return wrap({ message: `${count} customer(s) assigned`, count });
};

// A PM's "potential clients", assigned to them but not yet converted
// into a real portfolio_clients record.
export const getPotentialClients = async (pmId) => {
  const { data, error } = await supabase
    .from('client_profiles')
    .select('user_id, client_type, industry, created_at, user:users!user_id(full_name, whatsapp_number, email, branch:branches(name))')
    .eq('assigned_pm_id', pmId);
  if (error) throw error;
  if (!data.length) return wrap([]);

  // Query by pm_id (this PM's own portfolio) rather than an indirect
  // customer_user_id IN (...) lookup, simpler, and matches the RLS
  // policy's own condition directly rather than relying on a separate
  // access path that has to independently line up.
  const { data: myPortfolio, error: pErr } = await supabase.from('portfolio_clients').select('customer_user_id').eq('pm_id', pmId);
  if (pErr) throw pErr;
  const convertedIds = new Set((myPortfolio ?? []).map((c) => c.customer_user_id).filter((id) => id != null));

  return wrap(
    data
      .filter((r) => !convertedIds.has(r.user_id))
      .map((r) => ({
        id: r.user_id, name: r.user?.full_name, whatsappNumber: r.user?.whatsapp_number,
        email: r.user?.email, branch: r.user?.branch?.name ?? null, clientType: r.client_type,
        industry: r.industry, assignedAt: r.created_at,
      }))
  );
};

// PM converts a potential client into a real portfolio client, this is
// what actually creates the portfolio_clients row, starting at zero
// assists. Company/contact details can be supplied by the PM (a
// customer's own signup doesn't include company info, since they signed
// up as an individual, not a business).
export const convertToClient = async (customerId, data = {}) => {
  const { data: customer, error: cErr } = await supabase
    .from('users')
    .select('full_name, whatsapp_number, email, branch_id')
    .eq('id', customerId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!customer) throw new Error('Customer not found');

  const { data: profile } = await supabase.from('client_profiles').select('assigned_pm_id, industry').eq('user_id', customerId).maybeSingle();
  if (!profile?.assigned_pm_id) throw new Error('This customer must be assigned to a Portfolio Manager before converting');

  const { data: inserted, error } = await supabase.from('portfolio_clients').insert({
    customer_user_id: customerId,
    company_name: data.companyName || customer.full_name,
    reg_number: data.regNumber || null,
    contact_person: data.contactPerson || customer.full_name,
    phone: data.phone || customer.whatsapp_number,
    email: data.email || customer.email,
    branch_id: customer.branch_id,
    industry: data.industry || profile.industry || null,
    pm_id: profile.assigned_pm_id,
    preferred_contact_method: data.preferredContactMethod || 'Phone',
    notes: data.notes || null,
  }).select(PORTFOLIO_CLIENT_SELECT).single();
  if (error) throw error;

  logSystemEvent('Client Portfolio', `Converted potential client: ${inserted.company_name}`, 'PM').catch(() => {});
  return wrap({ message: 'Client converted, now in your portfolio', client: mapPortfolioClient(inserted, 0) });
};

// Onboarding checklist, once every step is done (or the client dismisses
// it), it should never come back, even if some underlying condition later
// reads as "incomplete" again (e.g. they change their WhatsApp number).
export const getOnboardingDismissed = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return wrap(false);
  const { data: appUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle();
  if (!appUser) return wrap(false);
  const { data } = await supabase.from('client_onboarding_state').select('user_id').eq('user_id', appUser.id).maybeSingle();
  return wrap(Boolean(data));
};

export const dismissOnboarding = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: appUser } = user ? await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle() : { data: null };
  if (!appUser) return wrap({ message: 'Not signed in' });
  const { error } = await supabase.from('client_onboarding_state').upsert({ user_id: appUser.id }, { onConflict: 'user_id' });
  if (error) throw error;
  return wrap({ message: 'Onboarding dismissed' });
};

// BRANCH CHANGE REQUESTS
const mapBranchChangeRequest = (row) => ({
  id: row.id,
  customerId: row.customer_id,
  customerName: row.customer?.full_name ?? null,
  currentBranch: row.current_branch?.name ?? null,
  requestedBranch: row.requested_branch?.name ?? null,
  reason: row.reason,
  status: row.status,
  decidedBy: row.decided_by,
  decisionNote: row.decision_note,
  requestedAt: row.requested_at,
  decidedAt: row.decided_at,
});

const BRANCH_CHANGE_SELECT = `
  id, customer_id, current_branch_id, requested_branch_id, reason, status,
  decided_by, decision_note, requested_at, decided_at,
  customer:users!customer_id(full_name),
  current_branch:branches!current_branch_id(name),
  requested_branch:branches!requested_branch_id(name)
`;

export const requestBranchChange = async (requestedBranchName, reason) => {
  const appUser = await getCurrentAppUser();
  if (!appUser.id) throw new Error('Not signed in');

  const { data: profile } = await supabase.from('client_profiles').select('preferred_branch_id').eq('user_id', appUser.id).maybeSingle();
  const requestedBranchId = await branchIdByName(requestedBranchName);
  if (!requestedBranchId) throw new Error('Please select a valid branch');
  if (requestedBranchId === profile?.preferred_branch_id) throw new Error('That is already your current branch');

  const { error } = await supabase.from('branch_change_requests').insert({
    customer_id: appUser.id,
    current_branch_id: profile?.preferred_branch_id ?? null,
    requested_branch_id: requestedBranchId,
    reason: reason || null,
  });
  if (error) {
    if (error.code === '23505') throw new Error('You already have a pending branch change request');
    throw error;
  }
  return wrap({ message: 'Branch change request submitted, your Service Manager will review it shortly' });
};

export const getMyBranchChangeRequests = async () => {
  const appUser = await getCurrentAppUser();
  if (!appUser.id) return wrap([]);
  const { data, error } = await supabase.from('branch_change_requests').select(BRANCH_CHANGE_SELECT).eq('customer_id', appUser.id).order('requested_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapBranchChangeRequest));
};

export const getBranchChangeRequests = async (status = null) => {
  let query = supabase.from('branch_change_requests').select(BRANCH_CHANGE_SELECT).order('requested_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return wrap((data ?? []).map(mapBranchChangeRequest));
};

export const decideBranchChangeRequest = async (requestId, approve, note = null) => {
  const { error } = await supabase.rpc('decide_branch_change_request', { p_request_id: requestId, p_approve: approve, p_note: note });
  if (error) throw error;
  logSystemEvent('Client Portfolio', `Branch change ${approve ? 'approved' : 'rejected'}`, 'Service Manager').catch(() => {});
  return wrap({ message: approve ? 'Branch change approved' : 'Request rejected' });
};

// TESTIMONIAL PHOTOS, image-based (customer/employee photos + story),
// separate from the text-review "testimonials" table above.
const mapTestimonialPhoto = (row) => ({
  id: row.id, imageUrl: row.image_url, name: row.name, roleLabel: row.role_label,
  caption: row.caption, enabled: row.enabled, uploadedBy: row.uploaded_by, createdAt: row.created_at,
});

export const getPublicTestimonialPhotos = async () => {
  const { data, error } = await supabase.from('testimonial_photos').select('*').eq('enabled', true).order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapTestimonialPhoto));
};

export const getAllTestimonialPhotos = async () => {
  const { data, error } = await supabase.from('testimonial_photos').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapTestimonialPhoto));
};

export const createTestimonialPhoto = async (payload) => {
  const imageUrl = await uploadDataUrlToStorage('testimonial-photos', payload.imageDataUrl, 'photos/', false);
  const { error } = await supabase.from('testimonial_photos').insert({
    image_url: imageUrl, name: payload.name?.trim() || null, role_label: payload.roleLabel || null,
    caption: payload.caption || null, uploaded_by: payload.uploadedBy || 'Marketing',
  });
  if (error) throw error;
  logSystemEvent('Marketing', `Added testimonial photo${payload.name ? ': ' + payload.name : ''}`, payload.uploadedBy || 'Marketing').catch(() => {});
  return wrap({ message: 'Testimonial photo added' });
};

export const setTestimonialPhotoEnabled = async (id, enabled) => {
  const { error } = await supabase.from('testimonial_photos').update({ enabled }).eq('id', id);
  if (error) throw error;
  return wrap({ message: enabled ? 'Shown on homepage' : 'Hidden from homepage', id, enabled });
};

export const deleteTestimonialPhoto = async (id) => {
  const { error } = await supabase.from('testimonial_photos').delete().eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Testimonial photo removed', id });
};

// OUR JOURNEY, one generic content table serves timeline, projects,
// team, community impact, milestones, and the bottom gallery. Customer
// Success Stories reuses testimonials (see createTestimonial/
// updateTestimonial above, extended, not duplicated). Branch Journey
// extends the real branches table directly.
const mapJourneyItem = (row) => ({
  id: row.id, section: row.section, imageUrl: row.image_url, title: row.title,
  subtitle: row.subtitle, description: row.description, meta: row.meta,
  linkUrl: row.link_url, order: row.display_order, enabled: row.enabled, createdAt: row.created_at,
  extraImages: row.extra_images || [],
});

// Public, only enabled items for one section, in display order.
export const getJourneyContent = async (section) => {
  const { data, error } = await supabase.from('journey_content').select('*').eq('section', section).eq('enabled', true).order('display_order', { ascending: true });
  if (error) throw error;
  return wrap((data ?? []).map(mapJourneyItem));
};

// Marketing, everything for one section (including disabled), for the
// admin list. Pass no section to get everything across all sections.
export const getAllJourneyContent = async (section = null) => {
  let query = supabase.from('journey_content').select('*').order('section').order('display_order', { ascending: true });
  if (section) query = query.eq('section', section);
  const { data, error } = await query;
  if (error) throw error;
  return wrap((data ?? []).map(mapJourneyItem));
};

// Uploads any new data: URLs in the array, leaves existing https:// URLs
// untouched, and returns the final list of real storage URLs. This is
// what lets the album field mix "keep this existing photo" and "here's
// a newly-added one" in a single save.
const resolveExtraImages = async (section, images) => {
  if (!Array.isArray(images)) return [];
  const resolved = [];
  for (const img of images) {
    if (typeof img === 'string' && img.startsWith('data:')) {
      resolved.push(await uploadDataUrlToStorage('journey-images', img, `${section || 'misc'}/`, false));
    } else if (img) {
      resolved.push(img);
    }
  }
  return resolved;
};

// A missing extra_images column (migration 055 not yet run) surfaces as
// a raw, cryptic Postgres error otherwise, this turns it into something
// that actually points at the fix.
const rethrowIfMissingAlbumColumn = (error) => {
  if (error?.code === '42703' && error.message?.includes('extra_images')) {
    const err = new Error('Album photos need migration 055 to be run on this database first.');
    err.code = 'missing_album_column';
    throw err;
  }
  throw error;
};

export const createJourneyContent = async (payload) => {
  let image_url = payload.imageUrl || null;
  if (payload.imageDataUrl) {
    image_url = await uploadDataUrlToStorage('journey-images', payload.imageDataUrl, `${payload.section}/`, false);
  }
  const extra_images = await resolveExtraImages(payload.section, payload.extraImages);
  const { error } = await supabase.from('journey_content').insert({
    section: payload.section, image_url, title: payload.title || null, subtitle: payload.subtitle || null,
    description: payload.description || null, meta: payload.meta || null, link_url: payload.linkUrl || null,
    display_order: payload.order ?? 0, enabled: payload.enabled !== false, extra_images,
  });
  if (error) rethrowIfMissingAlbumColumn(error);
  logSystemEvent('Marketing', `Added Our Journey ${payload.section} item`, payload.actor || 'Marketing', payload.title).catch(() => {});
  return wrap({ message: 'Added' });
};

export const updateJourneyContent = async (id, payload) => {
  const patch = {};
  if (payload.title !== undefined) patch.title = payload.title;
  if (payload.subtitle !== undefined) patch.subtitle = payload.subtitle;
  if (payload.description !== undefined) patch.description = payload.description;
  if (payload.meta !== undefined) patch.meta = payload.meta;
  if (payload.linkUrl !== undefined) patch.link_url = payload.linkUrl;
  if (payload.order !== undefined) patch.display_order = payload.order;
  if (payload.enabled !== undefined) patch.enabled = payload.enabled;
  if (payload.imageDataUrl) {
    patch.image_url = await uploadDataUrlToStorage('journey-images', payload.imageDataUrl, `${payload.section || 'misc'}/`, false);
  } else if (payload.imageUrl !== undefined) {
    patch.image_url = payload.imageUrl;
  }
  if (payload.extraImages !== undefined) {
    patch.extra_images = await resolveExtraImages(payload.section, payload.extraImages);
  }
  const { error } = await supabase.from('journey_content').update(patch).eq('id', id);
  if (error) rethrowIfMissingAlbumColumn(error);
  return wrap({ message: 'Updated' });
};

export const deleteJourneyContent = async (id) => {
  const { error } = await supabase.from('journey_content').delete().eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Removed' });
};

export const setJourneyContentEnabled = async (id, enabled) => {
  const { error } = await supabase.from('journey_content').update({ enabled }).eq('id', id);
  if (error) throw error;
  return wrap({ message: enabled ? 'Shown' : 'Hidden', enabled });
};

// Customer Success Stories, testimonials flagged for the journey page
// specifically (a testimonial can appear in Reviews, on the journey
// page, both, or neither, independent toggles).
export const getSuccessStories = async () => {
  const { data, error } = await supabase.from('testimonials').select('*, branch:branches(name)').eq('enabled', true).eq('show_on_journey', true).order('created_at', { ascending: false });
  if (error) throw error;
  return wrap((data ?? []).map(mapTestimonial));
};

// Branch Journey, real branches, extended with the presentational
// fields this page needs.
export const getJourneyBranches = async () => {
  const { data, error } = await supabase.from('branches').select('*').eq('is_active', true).order('name');
  if (error) throw error;
  return wrap((data ?? []).map((b) => ({
    id: b.id, name: b.name, address: b.address, photoUrl: b.photo_url,
    openingYear: b.opening_year, description: b.journey_description,
  })));
};

export const updateBranchJourneyInfo = async (branchId, payload) => {
  let photo_url = payload.photoUrl;
  if (payload.imageDataUrl) {
    photo_url = await uploadDataUrlToStorage('journey-images', payload.imageDataUrl, 'branches/', false);
  }
  const patch = { opening_year: payload.openingYear, journey_description: payload.description };
  if (photo_url !== undefined) patch.photo_url = photo_url;
  const { error } = await supabase.from('branches').update(patch).eq('id', branchId);
  if (error) throw error;
  return wrap({ message: 'Branch journey info updated' });
};

// Real replacements for 4 dashboard functions that were still running
// entirely on mock/fabricated data (found via a full sweep of the
// codebase for mock-vs-real API usage), Director's Executive
// Dashboard, Action Centre, and Complaint Heat Map, plus Service
// Manager's Aging Dashboard. These are senior-staff decision-making
// views, so fake numbers here were a real risk, not just a cosmetic
// gap. Same output shape as the mock versions on purpose, so no
// consuming component needs to change.
const daysOpen = (createdAt, closedAt) => {
  const start = new Date(createdAt).getTime();
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
};

const AGING_DASHBOARD_SELECT = `
  id, ticket, status, severity, priority, customer_name, created_at, closed_at,
  branch:branches(name), assigned_pm:users!assigned_pm_id(full_name)
`;

export const getAgingDashboard = async (filters = {}) => {
  let query = supabase.from('complaints').select(AGING_DASHBOARD_SELECT)
    .in('status', ['created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated']);
  if (filters.branch) {
    const branchId = await branchIdByName(filters.branch);
    if (branchId) query = query.eq('branch_id', branchId);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []).map((c) => ({ ...c, _days: daysOpen(c.created_at, c.closed_at) }));

  const buckets = AGING_BUCKETS.map((b) => ({
    ...b,
    count: rows.filter((c) => c._days >= b.min && c._days <= b.max).length,
  }));
  const slaBreaches = rows.filter((c) => c._days > SLA_BREACH_DAYS);

  return wrap({
    totalOpen: rows.length,
    buckets,
    slaBreaches: slaBreaches.length,
    slaBreachList: slaBreaches.map((c) => ({
      ticket: c.ticket, branch: c.branch?.name, customer: c.customer_name,
      assignedPmName: c.assigned_pm?.full_name, daysOpen: c._days, status: c.status, severity: c.severity, priority: c.priority,
    })),
  });
};

export const getActionCentre = async () => {
  const { data, error } = await supabase.from('complaints').select(AGING_DASHBOARD_SELECT);
  if (error) throw error;
  const rows = (data ?? []).map((c) => ({ ...c, _days: daysOpen(c.created_at, c.closed_at) }));
  const isOpen = (c) => ['created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated'].includes(c.status);

  const escalations = rows.filter((c) => c.status === 'escalated');
  const over30 = rows.filter((c) => isOpen(c) && c._days > 30);
  const slaBreaches = rows.filter((c) => isOpen(c) && c._days > SLA_BREACH_DAYS);
  const critical = rows.filter((c) => c.severity === 'critical' && isOpen(c));
  const highPriority = rows.filter((c) => (c.priority === 'urgent' || c.priority === 'high') && isOpen(c));

  const byBranch = {};
  rows.forEach((c) => {
    const name = c.branch?.name || 'Unknown';
    byBranch[name] = byBranch[name] || { total: 0, escalated: 0 };
    byBranch[name].total += 1;
    if (c.status === 'escalated') byBranch[name].escalated += 1;
  });
  const flaggedBranches = Object.entries(byBranch)
    .filter(([, v]) => v.total > 0 && v.escalated / v.total > 0.15)
    .map(([name]) => name);

  const summarize = (list) => list.slice(0, 10).map((c) => ({
    id: c.id, ticket: c.ticket, branch: c.branch?.name,
    customer: c.customer_name, status: c.status,
    severity: c.severity, priority: c.priority, daysOpen: c._days,
  }));

  return wrap({
    escalations: { count: escalations.length, items: summarize(escalations) },
    over30Days: { count: over30.length, items: summarize(over30) },
    slaBreaches: { count: slaBreaches.length, items: summarize(slaBreaches) },
    criticalSeverity: { count: critical.length, items: summarize(critical) },
    highPriority: { count: highPriority.length, items: summarize(highPriority) },
    flaggedBranches,
  });
};

export const getExecutiveDashboard = async () => {
  const { data, error } = await supabase.from('complaints').select(`
    id, status, severity, priority, created_at, closed_at,
    complaint_satisfaction(rating)
  `);
  if (error) throw error;
  const rows = (data ?? []).map((c) => ({ ...c, _days: daysOpen(c.created_at, c.closed_at) }));
  const isOpen = (c) => ['created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated'].includes(c.status);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const thirtyDaysAgo = todayMs - 30 * 86400000;

  const created = rows.filter((c) => new Date(c.created_at).getTime() >= todayMs).length;
  const open = rows.filter(isOpen).length;
  const escalated = rows.filter((c) => c.status === 'escalated').length;
  const slaBreaches = rows.filter((c) => isOpen(c) && c._days > SLA_BREACH_DAYS).length;

  const monthCompl = rows.filter((c) => new Date(c.created_at).getTime() >= thirtyDaysAgo);
  const monthResolved = monthCompl.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
  const monthEscalated = monthCompl.filter((c) => c.status === 'escalated').length;
  // Company-wide CSAT, the proper rollup (mean of each branch's own
  // average, across every kind of interaction, not just complaints from
  // the last 30 days) rather than a narrower complaint-only figure.
  const { data: companyCsat } = await getCompanyCsat();

  return wrap({
    today: { created, open, escalated, slaBreaches },
    thisMonth: {
      satisfactionScore: companyCsat.avgRating ?? 0,
      resolutionRate: Number(((monthResolved / Math.max(monthCompl.length, 1)) * 100).toFixed(1)),
      escalationRate: Number(((monthEscalated / Math.max(monthCompl.length, 1)) * 100).toFixed(1)),
      trend: [],
    },
    attentionRequired: {
      highRisk: rows.filter((c) => (c.severity === 'critical' || c.priority === 'urgent') && isOpen(c)).length,
      overdue: rows.filter((c) => isOpen(c) && c._days > SLA_BREACH_DAYS).length,
      underperformingBranches: 0,
    },
  });
};

export const getComplaintHeatMap = async () => {
  const { data, error } = await supabase.from('complaints').select('status, severity, branch:branches(name)');
  if (error) throw error;
  const severityScore = { minor: 1, moderate: 2, major: 3, critical: 4 };
  const byBranch = {};
  (data ?? []).forEach((c) => {
    const name = c.branch?.name || 'Unknown';
    byBranch[name] = byBranch[name] || { rows: [], escalated: 0 };
    byBranch[name].rows.push(c);
    if (c.status === 'escalated') byBranch[name].escalated += 1;
  });
  return wrap(BRANCHES.map((b) => {
    const entry = byBranch[b] || { rows: [], escalated: 0 };
    const avgSeverityScore = entry.rows.length
      ? Number((entry.rows.reduce((s, c) => s + (severityScore[c.severity] || 0), 0) / entry.rows.length).toFixed(1))
      : 0;
    return { branch: b, complaintCount: entry.rows.length, escalated: entry.escalated, avgSeverityScore };
  }));
};

// Real system health check, replaces hardcoded "always Operational"
// cards with genuine checks against the actual database and scheduler.
export const getSystemHealth = async () => {
  const { data, error } = await supabase.rpc('get_system_health');
  if (error) throw error;
  return wrap({
    database: { ok: data.database.ok, userCount: data.database.userCount },
    scheduler: {
      cronEnabled: data.scheduler.cronEnabled,
      jobScheduled: data.scheduler.jobScheduled,
      schedule: data.scheduler.schedule,
      lastRunStatus: data.scheduler.lastRunStatus,
      lastRunAt: data.scheduler.lastRunAt,
    },
    checkedAt: data.checkedAt,
  });
};

// Pure formatting utility, was previously imported from the mock file
// even though it has no dependency on mock data at all.
export const clientIdFor = (id) => `TIC-${String(Number(id)).padStart(6, '0')}`;
export const APPLICATION_STATUSES = ['New', 'Under Review', 'Shortlisted', 'Rejected', 'Hired'];

// Remaining mock-API migration, closes out the full sweep. Every
// function below replaces one that previously only existed as
// in-memory fake data in services/api.js.

// ---- Internal staff announcements ----
const mapAnnouncement = (row) => ({
  id: row.id, title: row.title, body: row.body, author: row.author, authorRole: row.author_role,
  priority: row.priority, status: row.status, pinned: row.pinned,
  startDate: row.start_date, endDate: row.end_date, createdAt: row.created_at,
  targetRoles: (row.announcement_targets || []).map((t) => t.role),
});

export const getAnnouncements = async (filters = {}) => {
  let query = supabase.from('announcements').select('*, announcement_targets(role)').order('pinned', { ascending: false }).order('created_at', { ascending: false });
  if (!filters.includeAll) query = query.eq('status', 'published');
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []).map(mapAnnouncement);
  if (filters.role) {
    const today = new Date().toISOString().slice(0, 10);
    rows = rows.filter((a) =>
      (!a.startDate || a.startDate <= today) && (!a.endDate || a.endDate >= today) &&
      (a.targetRoles.length === 0 || a.targetRoles.includes(filters.role))
    );
  }
  return wrap(rows);
};

export const createAnnouncement = async (data) => {
  const { data: appUser } = await supabase.from('users').select('role').eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id).maybeSingle();
  const { data: inserted, error } = await supabase.from('announcements').insert({
    title: data.title, body: data.body, author: data.author || 'Staff', author_role: appUser?.role || null,
    priority: data.priority || 'normal', status: data.status || 'published', pinned: Boolean(data.pinned),
    start_date: data.startDate || null, end_date: data.endDate || null,
  }).select().single();
  if (error) throw error;
  if (data.targetRoles?.length) {
    await supabase.from('announcement_targets').insert(data.targetRoles.map((role) => ({ announcement_id: inserted.id, role })));
  }
  return wrap({ message: data.status === 'draft' ? 'Draft saved' : 'Announcement published', announcement: mapAnnouncement(inserted) });
};

export const updateAnnouncement = async (id, data) => {
  const patch = {};
  ['title', 'body', 'priority', 'status', 'pinned'].forEach((k) => { if (data[k] !== undefined) patch[k] = data[k]; });
  if (data.startDate !== undefined) patch.start_date = data.startDate || null;
  if (data.endDate !== undefined) patch.end_date = data.endDate || null;
  const { error } = await supabase.from('announcements').update(patch).eq('id', id);
  if (error) throw error;
  if (data.targetRoles !== undefined) {
    await supabase.from('announcement_targets').delete().eq('announcement_id', id);
    if (data.targetRoles.length) await supabase.from('announcement_targets').insert(data.targetRoles.map((role) => ({ announcement_id: id, role })));
  }
  return wrap({ message: 'Announcement updated', id });
};

export const deleteAnnouncement = async (id) => {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Announcement deleted', id });
};

// ---- Birthday preferences ----
export const getBirthdayPrefs = async (userId) => {
  const { data, error } = await supabase.from('birthday_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return wrap(data ? { enabled: data.enabled, channel: data.channel, birthdayDate: data.birthday_date } : { enabled: false, channel: 'whatsapp', birthdayDate: '' });
};

export const saveBirthdayPrefs = async (userId, prefs) => {
  const { error } = await supabase.from('birthday_preferences').upsert({
    user_id: userId, enabled: Boolean(prefs.enabled), channel: prefs.channel || 'whatsapp', birthday_date: prefs.birthdayDate || null,
  }, { onConflict: 'user_id' });
  if (error) throw error;
  return wrap({ message: 'Birthday preferences saved', prefs });
};

// No automated birthday-sending system exists (would need a scheduled
// job plus a real WhatsApp/email delivery integration, neither of which
// this app has), this previews what WOULD be sent, honestly labeled as
// a preview rather than claiming a message was actually delivered.
export const simulateBirthdaySend = async (userId) => {
  const { data } = await getBirthdayPrefs(userId);
  if (!data?.enabled) return wrap({ sent: false, reason: 'Birthday messages not enabled' });
  return wrap({
    sent: false,
    preview: true,
    channel: data.channel,
    message: "Happy Birthday! \ud83c\udf82 From your Portfolio Manager and the whole Ticano team. No one should be small forever \u2014 here's to another great year! ticanogroup.co.bw",
    note: 'Preview only \u2014 no automated birthday-sending system is connected yet.',
  });
};

// ---- Branch detail ----
export const getBranchDetail = async (branchName) => {
  const branchId = await branchIdByName(branchName);
  if (!branchId) return wrap({ branch: branchName, overview: { avgRating: 0, totalFeedback: 0, totalCustomers: 0, totalInteractions: 0, openComplaints: 0, resolvedComplaints: 0, escalationRate: 0 }, portfolioManagers: [] });

  const { data: complaints } = await supabase.from('complaints').select('status, complaint_satisfaction(rating)').eq('branch_id', branchId);
  const rows = complaints ?? [];
  const open = rows.filter((c) => ['created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated'].includes(c.status)).length;
  const resolved = rows.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
  const escalated = rows.filter((c) => c.status === 'escalated').length;
  const ratings = rows.flatMap((c) => c.complaint_satisfaction?.map((s) => s.rating) || []);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const { count: customerCount } = await supabase.from('client_profiles').select('user_id', { count: 'exact', head: true }).eq('preferred_branch_id', branchId);
  const { data: pms } = await supabase.from('users').select('id, full_name').eq('branch_id', branchId).eq('role', 'portfolio_manager').eq('is_active', true);

  return wrap({
    branch: branchName,
    overview: {
      avgRating: Number(avgRating.toFixed(1)), totalFeedback: ratings.length, totalCustomers: customerCount || 0,
      totalInteractions: rows.length, openComplaints: open, resolvedComplaints: resolved,
      escalationRate: rows.length ? Number(((escalated / rows.length) * 100).toFixed(1)) : 0,
    },
    portfolioManagers: (pms ?? []).map((p) => ({ id: p.id, name: p.full_name })),
    ratingTrend: [], serviceTypes: [], customerLocations: [],
  });
};

// ---- Client directory (for WhatsApp/Email composers) ----
export const getClientDirectory = async (filters = {}) => {
  let query = supabase.from('client_profiles').select(`
    user_id, client_type, industry,
    user:users!user_id(full_name, whatsapp_number, email),
    branch:branches!preferred_branch_id(name)
  `);
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []).map((c) => ({
    id: c.user_id, clientId: clientIdFor(c.user_id), name: c.user?.full_name, phone: c.user?.whatsapp_number,
    email: c.user?.email, branch: c.branch?.name, clientType: c.client_type, industry: c.industry, tickets: [],
  }));
  if (filters.branch) rows = rows.filter((c) => c.branch === filters.branch);
  if (filters.clientType) rows = rows.filter((c) => c.clientType === filters.clientType);
  if (filters.industry) rows = rows.filter((c) => c.industry === filters.industry);
  return wrap(rows);
};

export const getClientIndustries = async () => {
  const { data, error } = await supabase.from('client_profiles').select('industry').not('industry', 'is', null);
  if (error) throw error;
  return wrap([...new Set((data ?? []).map((r) => r.industry).filter(Boolean))].sort());
};

// ---- Global search ----
export const globalSearch = async (q, currentUser = null) => {
  if (!q || String(q).length < 2) return wrap({ complaints: [], leads: [], people: [] });
  const term = `%${q}%`;
  const role = currentUser?.role;

  // Relevance, not just access control, RLS already prevents a PM from
  // reading another branch's complaints outright, but "technically
  // permitted" and "relevant to what this role is searching for" aren't
  // the same thing. A PM searching wants their own cases, not a staff
  // directory; Marketing wants leads and people, not complaint detail.
  const searchComplaints = role !== 'marketing';
  const searchPeople = role === 'service_manager' || role === 'director' || role === 'admin' || role === 'marketing';
  // Director's role is executive oversight, not case-by-case client
  // management, individual client/lead records aren't relevant to what
  // they're searching for the way they are for a PM or Service Manager.
  const searchLeads = role !== 'director';

  let complaintsQuery = searchComplaints
    ? supabase.from('complaints').select('id, ticket, branch:branches(name), customer_name, status, assigned_pm:users!assigned_pm_id(full_name)')
        .or(`ticket.ilike.${term},customer_name.ilike.${term},category_name.ilike.${term}`).limit(10)
    : null;
  if (complaintsQuery && role === 'portfolio_manager' && currentUser?.id) {
    complaintsQuery = complaintsQuery.eq('assigned_pm_id', currentUser.id);
  }

  let leadsQuery = searchLeads
    ? supabase.from('leads').select('id, full_name, company_name, industry, status, assigned_pm_id').or(`full_name.ilike.${term},company_name.ilike.${term}`).limit(10)
    : null;
  if (leadsQuery && role === 'portfolio_manager' && currentUser?.id) {
    leadsQuery = leadsQuery.eq('assigned_pm_id', currentUser.id);
  }

  // Branch info isn't sensitive to any role, everyone benefits from
  // "search a branch name, get its address/phone/manager" working,
  // Director included (this was the one category actually missing for
  // them, not something to exclude the way leads are).
  const branchesQuery = supabase.from('branches').select('id, name, address, city, phone, email, manager_name')
    .or(`name.ilike.${term},city.ilike.${term},address.ilike.${term}`).eq('is_active', true).limit(5);

  const [complaintsRes, leadsRes, peopleRes, branchesRes] = await Promise.all([
    complaintsQuery ?? Promise.resolve({ data: [] }),
    leadsQuery ?? Promise.resolve({ data: [] }),
    searchPeople ? supabase.from('users').select('id, full_name, role, email').ilike('full_name', term).limit(10) : Promise.resolve({ data: [] }),
    branchesQuery,
  ]);

  return wrap({
    complaints: (complaintsRes.data ?? []).map((c) => ({ type: 'complaint', id: c.id, ticket: c.ticket, branch: c.branch?.name, customer: c.customer_name, status: c.status, assignedPmName: c.assigned_pm?.full_name })),
    leads: (leadsRes.data ?? []).map((l) => ({ type: 'lead', id: l.id, name: l.full_name, company: l.company_name, industry: l.industry, status: l.status })),
    people: (peopleRes.data ?? []).map((p) => ({ type: 'person', id: p.id, name: p.full_name, role: p.role, email: p.email })),
    branches: (branchesRes.data ?? []).map((b) => ({ type: 'branch', id: b.id, name: b.name, address: b.address, city: b.city, phone: b.phone, email: b.email, managerName: b.manager_name })),
  });
};

// ---- WhatsApp opt-out ----
export const optOut = async () => {
  const appUser = await getCurrentAppUser();
  if (!appUser.id) throw new Error('Not signed in');
  const { error } = await supabase.from('client_profiles').update({ whatsapp_opt_out: true }).eq('user_id', appUser.id);
  if (error) throw error;
  return wrap({ message: 'WhatsApp messaging preference updated' });
};

// ---- Tender recipient preview ----
export const previewTenderRecipients = async (filters = {}) => {
  const { data } = await getClientDirectory({
    branch: filters.branch && filters.branch !== 'All' ? filters.branch : undefined,
    clientType: filters.clientType && filters.clientType !== 'All' ? filters.clientType : undefined,
    industry: filters.industry && filters.industry !== 'All' ? filters.industry : undefined,
  });
  return wrap({ count: data.length, recipients: data });
};

// ---- Customer search (PM/staff picking a client) ----
export const searchCustomers = async (query) => {
  if (!query || String(query).trim().length < 2) return wrap([]);
  const term = `%${query}%`;
  const { data, error } = await supabase.from('users').select('id, full_name, whatsapp_number, email, role').eq('role', 'customer').or(`full_name.ilike.${term},whatsapp_number.ilike.${term},email.ilike.${term}`).limit(15);
  if (error) throw error;
  return wrap((data ?? []).map((u) => ({ id: u.id, name: u.full_name, phone: u.whatsapp_number, email: u.email })));
};

// ---- Database backup ----
// Supabase manages backups automatically at the infrastructure level
// (point-in-time recovery on paid plans), there is no API this client
// can call to "trigger" one on demand. Rather than fake success, this
// says so plainly and points at where real backup status actually lives.
export const triggerBackup = async () => {
  return wrap({
    message: 'Manual backup triggering isn\u2019t available from this app \u2014 Supabase manages backups automatically at the infrastructure level. Check Supabase Dashboard \u2192 Database \u2192 Backups for real backup status and to restore a point-in-time snapshot.',
    triggered: false,
  });
};

// ---- AI conversation history (AI Inbox) ----
// Staff working the inbox see the conversation itself, not who's on the
// other end of it, so the visitor's name never leaves the query layer,
// no name field on the mapped object and no join back to `users` for
// it. `assigned_staff` is a colleague handling the ticket, not the
// visitor, so that name is fine to keep.
const mapAiConversation = (row) => ({
  id: row.id, label: `Conversation #${row.id}`, role: row.role,
  branch: row.branch, channel: row.channel, language: row.language,
  messages: row.messages || [], status: row.status, unread: !row.is_read,
  assignedTo: row.assigned_staff?.full_name || null, startedAt: row.started_at, updatedAt: row.updated_at,
  summary: row.summary || '', intent: row.intent || '', category: row.category || '', urgency: row.urgency || 'normal',
});

const AI_CONVERSATION_COLUMNS = 'id, role, branch, channel, language, messages, status, is_read, assigned_to, started_at, updated_at, summary, intent, category, urgency, assigned_staff:users!assigned_to(full_name)';

export const getAiConversations = async (filters = {}) => {
  let query = supabase.from('ai_conversations').select(AI_CONVERSATION_COLUMNS).order('updated_at', { ascending: false });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.branch) query = query.eq('branch', filters.branch);
  if (filters.urgency) query = query.eq('urgency', filters.urgency);
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []).map(mapAiConversation);
  if (filters.q) {
    const q = String(filters.q).toLowerCase();
    rows = rows.filter((c) => c.summary?.toLowerCase().includes(q) || c.intent?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q));
  }
  return wrap(rows);
};

export const getAiConversation = async (id) => {
  const { data, error } = await supabase.from('ai_conversations').select(AI_CONVERSATION_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return wrap(data ? mapAiConversation(data) : null);
};

export const markAiConversationRead = async (id) => {
  const { error } = await supabase.from('ai_conversations').update({ is_read: true }).eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Marked read', id });
};

export const updateAiConversationStatus = async (id, status, actor = 'Staff') => {
  const { error } = await supabase.from('ai_conversations').update({ status }).eq('id', id);
  if (error) throw error;
  logSystemEvent('AI Assistant', `Conversation marked ${status}`, actor, `#${id}`).catch(() => {});
  return wrap({ message: 'Status updated', id, status });
};

export const assignAiConversation = async (id, staffId, actor = 'Staff') => {
  const { error } = await supabase.from('ai_conversations').update({ assigned_to: staffId }).eq('id', id);
  if (error) throw error;
  logSystemEvent('AI Assistant', 'Conversation assigned', actor, `#${id}`).catch(() => {});
  return wrap({ message: 'Conversation assigned', id });
};

export const getAiInboxSummary = async () => {
  const { data, error } = await supabase.from('ai_conversations').select('status, is_read, urgency');
  if (error) throw error;
  const rows = data ?? [];
  return wrap({
    total: rows.length,
    unread: rows.filter((r) => !r.is_read).length,
    open: rows.filter((r) => r.status === 'open').length,
    urgent: rows.filter((r) => r.urgency === 'high' && r.status !== 'resolved').length,
  });
};

// Called from aiService.js's extractAndLog, once per conversation (at a
// natural pause point, not every message), runs a small separate AI
// call to summarize the conversation, then persists both the transcript
// and that summary here. This is what the AI Inbox actually reads;
// previously nothing ever wrote here at all, which is why the Inbox only
// ever showed fixed mock data regardless of real conversations happening.
export const logAiConversation = async (payload) => {
  const row = {
    user_id: payload.userId || null, user_name: payload.userName || null, role: payload.visitorRole || null,
    branch: payload.branch || null, channel: payload.channel || 'web', language: payload.language || 'en',
    messages: payload.messages || [], summary: payload.summary || '', intent: payload.intent || '',
    category: payload.category || '', urgency: payload.urgency || 'normal',
    extracted_name: payload.extracted?.name || null, extracted_phone: payload.extracted?.phone || null,
    extracted_email: payload.extracted?.email || null, extracted_location: payload.extracted?.location || null,
  };

  if (payload.conversationId) {
    const { data, error } = await supabase.from('ai_conversations').update(row).eq('id', payload.conversationId).select().single();
    if (error) throw error;
    return wrap({ conversation: mapAiConversation(data) });
  }
  const { data, error } = await supabase.from('ai_conversations').insert(row).select().single();
  if (error) throw error;
  return wrap({ conversation: mapAiConversation(data) });
};

// PO CALCULATOR RANGES, admin-configurable fee brackets used by the
// redesigned Quote Calculator (PO amount in, total repayment / interest
// / remaining profit out).
const mapCalculatorRange = (row) => ({
  id: row.id, minAmount: Number(row.min_amount), maxAmount: row.max_amount === null ? null : Number(row.max_amount),
  calcType: row.calc_type, value: Number(row.value), label: row.label, enabled: row.enabled, order: row.display_order,
});

// Public, enabled ranges only, used by the calculator itself (both the
// public homepage version and every embedded dashboard version).
export const getCalculatorRanges = async () => {
  const { data, error } = await supabase.from('calculator_ranges').select('*').eq('enabled', true).order('min_amount', { ascending: true });
  if (error) throw error;
  return wrap((data ?? []).map(mapCalculatorRange));
};

// Admin, every range, including disabled ones, for the management screen.
export const getAllCalculatorRanges = async () => {
  const { data, error } = await supabase.from('calculator_ranges').select('*').order('min_amount', { ascending: true });
  if (error) throw error;
  return wrap((data ?? []).map(mapCalculatorRange));
};

export const createCalculatorRange = async (payload) => {
  const { error } = await supabase.from('calculator_ranges').insert({
    min_amount: payload.minAmount, max_amount: payload.maxAmount ?? null, calc_type: payload.calcType,
    value: payload.value, label: payload.label || null, enabled: payload.enabled !== false, display_order: payload.order ?? 0,
  });
  if (error) throw error;
  return wrap({ message: 'Range added' });
};

export const updateCalculatorRange = async (id, payload) => {
  const patch = {};
  if (payload.minAmount !== undefined) patch.min_amount = payload.minAmount;
  if (payload.maxAmount !== undefined) patch.max_amount = payload.maxAmount;
  if (payload.calcType !== undefined) patch.calc_type = payload.calcType;
  if (payload.value !== undefined) patch.value = payload.value;
  if (payload.label !== undefined) patch.label = payload.label;
  if (payload.enabled !== undefined) patch.enabled = payload.enabled;
  if (payload.order !== undefined) patch.display_order = payload.order;
  const { error } = await supabase.from('calculator_ranges').update(patch).eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Range updated' });
};

export const deleteCalculatorRange = async (id) => {
  const { error } = await supabase.from('calculator_ranges').delete().eq('id', id);
  if (error) throw error;
  return wrap({ message: 'Range removed' });
};

// INTERNAL STAFF MESSAGING, 1:1 and group chats, staff only, with
// optional document attachments.
const mapConversation = (row, myId) => {
  const otherMembers = (row.staff_conversation_members || []).filter((m) => m.user_id !== myId);
  const lastMsg = row._lastMessage;
  return {
    id: row.id, type: row.type,
    name: row.type === 'group' ? row.name : (otherMembers[0]?.user?.full_name || 'Direct message'),
    members: (row.staff_conversation_members || []).map((m) => ({ id: m.user_id, name: m.user?.full_name, role: m.user?.role })),
    updatedAt: row.updated_at,
    lastMessage: lastMsg ? { body: lastMsg.body, senderName: lastMsg.sender?.full_name, hasAttachment: Boolean(lastMsg.attachment_url), createdAt: lastMsg.created_at } : null,
    unread: row._unread || false,
  };
};

// Every conversation the current user belongs to, most recently active
// first, with a last-message preview and unread flag for the list view.
export const getMyConversations = async () => {
  const appUser = await getCurrentAppUser();
  if (!appUser.id) return wrap([]);

  const { data: memberships, error: memErr } = await supabase.from('staff_conversation_members').select('conversation_id, last_read_at').eq('user_id', appUser.id);
  if (memErr) throw memErr;
  if (!memberships?.length) return wrap([]);

  const ids = memberships.map((m) => m.conversation_id);
  const { data: conversations, error } = await supabase.from('staff_conversations')
    .select('*, staff_conversation_members(user_id, user:users(full_name, role))')
    .in('id', ids).order('updated_at', { ascending: false });
  if (error) throw error;

  const { data: lastMessages } = await supabase.from('staff_messages')
    .select('conversation_id, body, attachment_url, created_at, sender:users(full_name)')
    .in('conversation_id', ids).order('created_at', { ascending: false });

  const lastByConvo = {};
  (lastMessages ?? []).forEach((m) => { if (!lastByConvo[m.conversation_id]) lastByConvo[m.conversation_id] = m; });
  const lastReadByConvo = Object.fromEntries(memberships.map((m) => [m.conversation_id, m.last_read_at]));

  return wrap((conversations ?? []).map((c) => {
    c._lastMessage = lastByConvo[c.id];
    c._unread = c._lastMessage && (!lastReadByConvo[c.id] || new Date(c._lastMessage.created_at) > new Date(lastReadByConvo[c.id]));
    return mapConversation(c, appUser.id);
  }));
};

export const getConversationMessages = async (conversationId) => {
  const appUser = await getCurrentAppUser();
  const { data: membership } = await supabase.from('staff_conversation_members')
    .select('user_id').eq('conversation_id', conversationId).eq('user_id', appUser.id).maybeSingle();
  if (!membership) throw new Error('You are not a member of this conversation');

  const { data, error } = await supabase.from('staff_messages')
    .select('*, sender:users(full_name)')
    .eq('conversation_id', conversationId).order('created_at', { ascending: true });
  if (error) throw error;
  return wrap((data ?? []).map((m) => ({
    id: m.id, conversationId: m.conversation_id, senderId: m.sender_id, senderName: m.sender?.full_name,
    body: m.body, attachmentUrl: m.attachment_url, attachmentName: m.attachment_name,
    attachmentType: m.attachment_type, attachmentSize: m.attachment_size, createdAt: m.created_at,
  })));
};

export const sendStaffMessage = async (conversationId, payload) => {
  const appUser = await getCurrentAppUser();
  let attachment_url = null;
  if (payload.attachmentDataUrl) {
    attachment_url = await uploadDataUrlToStorage('staff-attachments', payload.attachmentDataUrl, `${conversationId}/`, true);
  }
  const { error } = await supabase.from('staff_messages').insert({
    conversation_id: conversationId, sender_id: appUser.id, body: payload.body || null,
    attachment_url, attachment_name: payload.attachmentName || null,
    attachment_type: payload.attachmentType || null, attachment_size: payload.attachmentSize || null,
  });
  if (error) throw error;
  return wrap({ message: 'Sent' });
};

export const getStaffAttachmentSignedUrl = async (path) => {
  const { data, error } = await supabase.storage.from('staff-attachments').createSignedUrl(path, 300);
  if (error) throw error;
  return wrap({ url: data.signedUrl });
};

export const markConversationRead = async (conversationId) => {
  const appUser = await getCurrentAppUser();
  const { error } = await supabase.from('staff_conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId).eq('user_id', appUser.id);
  if (error) throw error;
  return wrap({ message: 'Marked read' });
};

// Total unread messages across every conversation this user is in, for
// the Messages tab badge. A message counts as unread if it arrived after
// this user's last_read_at for that conversation (or they've never read
// it at all), and wasn't sent by the user themselves.
export const getUnreadMessageCount = async () => {
  const appUser = await getCurrentAppUser();
  if (!appUser.id) return wrap(0);

  const { data: memberships } = await supabase.from('staff_conversation_members')
    .select('conversation_id, last_read_at').eq('user_id', appUser.id);
  if (!memberships?.length) return wrap(0);

  const ids = memberships.map((m) => m.conversation_id);
  const { data: messages } = await supabase.from('staff_messages')
    .select('conversation_id, sender_id, created_at').in('conversation_id', ids).neq('sender_id', appUser.id);

  const lastReadByConvo = Object.fromEntries(memberships.map((m) => [m.conversation_id, m.last_read_at]));
  const unread = (messages ?? []).filter((m) => {
    const lastRead = lastReadByConvo[m.conversation_id];
    return !lastRead || new Date(m.created_at) > new Date(lastRead);
  });
  return wrap(unread.length);
};

// The set of conversation ids this user belongs to, used client-side to
// decide whether an incoming realtime message event is actually "mine"
// (realtime can't filter on a join, so this is checked after the fact).
export const getMyConversationIds = async () => {
  const appUser = await getCurrentAppUser();
  if (!appUser.id) return wrap([]);
  const { data } = await supabase.from('staff_conversation_members').select('conversation_id').eq('user_id', appUser.id);
  return wrap((data ?? []).map((m) => m.conversation_id));
};

// Direct (1:1), reuses an existing thread with that person if one
// already exists, rather than creating duplicates.
export const startDirectConversation = async (otherUserId) => {
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', { p_other_user_id: otherUserId });
  if (error) throw error;
  return wrap({ conversationId: data });
};

export const createGroupConversation = async (name, memberIds) => {
  const { data, error } = await supabase.rpc('create_group_conversation', { p_name: name, p_member_ids: memberIds });
  if (error) throw error;
  return wrap({ conversationId: data, message: 'Group created' });
};

// Every other staff member, for starting a new conversation, excludes
// the current user themselves.
export const getStaffDirectoryForMessaging = async () => {
  const appUser = await getCurrentAppUser();
  const { data, error } = await supabase.from('users').select('id, full_name, role')
    .in('role', ['portfolio_manager', 'service_manager', 'director', 'marketing', 'admin'])
    .eq('is_active', true).neq('id', appUser.id || 0).order('full_name');
  if (error) throw error;
  return wrap((data ?? []).map((u) => ({ id: u.id, name: u.full_name, role: u.role })));
};

export const addGroupMember = async (conversationId, userId) => {
  const { error } = await supabase.rpc('add_group_member', { p_conversation_id: conversationId, p_user_id: userId });
  if (error) throw error;
  return wrap({ message: 'Added to group' });
};

export const removeGroupMember = async (conversationId, userId) => {
  const { error } = await supabase.rpc('remove_group_member', { p_conversation_id: conversationId, p_user_id: userId });
  if (error) throw error;
  return wrap({ message: 'Removed from group' });
};

// FEEDBACK REQUESTS, replaces the old complaint-only review link flow.
// Works for any staff-customer interaction (complaint, walk-in, enquiry,
// consultation, phone call, application, follow-up, other). Every link
// is a real server-side row from the moment it's created (not just at
// submission), with the one-time-use guarantee enforced atomically in
// submit_feedback_request()'s single UPDATE, see migration 051.

export const createFeedbackRequest = async (payload) => {
  const { data, error } = await supabase.rpc('create_feedback_request', {
    p_interaction_type: payload.interactionType,
    p_interaction_id: payload.interactionId ?? null,
    p_interaction_note: payload.interactionNote ?? null,
    p_client_id: payload.clientId ?? null,
    p_client_name: payload.clientName,
    p_client_phone: payload.clientPhone ?? null,
    p_expires_in_days: payload.expiresInDays ?? null,
  });
  if (error) throw error;
  const row = data?.[0];
  const link = `${window.location.origin}/feedback/${row.token}`;
  return wrap({ token: row.token, id: row.id, link });
};

// Public, no login. Returns { valid: false, reason } for a used/expired/
// unknown token, or the interaction context to show on the form.
export const getFeedbackRequestByToken = async (token) => {
  const { data, error } = await supabase.rpc('get_feedback_request_by_token', { p_token: token });
  if (error) throw error;
  return wrap(data);
};

export const submitFeedbackRequest = async (token, rating, comment) => {
  const { data, error } = await supabase.rpc('submit_feedback_request', { p_token: token, p_rating: rating, p_comment: comment || null });
  if (error) throw error;
  return wrap(data);
};

export const getMyFeedbackRequests = async () => {
  const { data, error } = await supabase.rpc('get_my_feedback_requests');
  if (error) throw error;
  return wrap((data ?? []).map((r) => ({
    id: r.id, token: r.token, interactionType: r.interaction_type, interactionNote: r.interaction_note,
    clientName: r.client_name, status: r.status, rating: r.rating, comment: r.comment,
    sentAt: r.sent_at, expiresAt: r.expires_at, completedAt: r.completed_at,
  })));
};

export const getStaffCsat = async (staffId) => {
  const { data, error } = await supabase.rpc('get_staff_csat', { p_staff_id: staffId });
  if (error) throw error;
  const row = data?.[0] || {};
  return wrap({ avgRating: row.avg_rating ? Number(row.avg_rating) : null, totalResponses: row.total_responses || 0 });
};

export const getBranchCsat = async (branchId) => {
  const { data, error } = await supabase.rpc('get_branch_csat', { p_branch_id: branchId });
  if (error) throw error;
  const row = data?.[0] || {};
  return wrap({ avgRating: row.avg_rating ? Number(row.avg_rating) : null, totalResponses: row.total_responses || 0 });
};

export const getCompanyCsat = async () => {
  const { data, error } = await supabase.rpc('get_company_csat');
  if (error) throw error;
  const row = data?.[0] || {};
  return wrap({ avgRating: row.avg_rating ? Number(row.avg_rating) : null, branchesIncluded: row.branches_included || 0, totalResponses: row.total_responses || 0 });
};

export const getAllStaffCsat = async () => {
  const { data, error } = await supabase.rpc('get_all_staff_csat');
  if (error) throw error;
  return wrap((data ?? []).map((r) => ({
    staffId: r.staff_id, staffName: r.staff_name, branchId: r.branch_id, branchName: r.branch_name,
    avgRating: r.avg_rating ? Number(r.avg_rating) : null, totalResponses: r.total_responses || 0,
  })));
};

export const getAllBranchCsat = async () => {
  const { data, error } = await supabase.rpc('get_all_branch_csat');
  if (error) throw error;
  return wrap((data ?? []).map((r) => ({
    branchId: r.branch_id, branchName: r.branch_name,
    avgRating: r.avg_rating ? Number(r.avg_rating) : null, totalResponses: r.total_responses || 0,
  })));
};
