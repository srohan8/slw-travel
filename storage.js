// ================================================================
// STORAGE — slwtravel.com
// All data persistence goes through here.
// Supabase-backed with localStorage fallback for offline.
// ================================================================
import { supabase, getUser } from './auth.js';

// ── Admin Settings ───────────────────────────────────────────────
// Cached so we don't hit DB on every render
let _settingsCache = null;

async function getSettings() {
  if (_settingsCache) return _settingsCache;
  const { data, error } = await supabase.from('admin_settings').select('*');
  if (error || !data) return getDefaultSettings();
  const settings = {};
  data.forEach(row => {
    settings[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
  });
  _settingsCache = settings;
  return settings;
}

async function updateSetting(key, value) {
  _settingsCache = null; // bust cache
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() });
  if (error) throw error;
}

function getDefaultSettings() {
  return {
    freemium_enabled:    false,
    login_required:      false,
    new_signups_enabled: true,
    affiliate_links:     true,
    maintenance_mode:    false,
    limits: { free: { routePlans: 3, flightSearches: 3, savedTrips: 1 } }
  };
}

// ── Trips ────────────────────────────────────────────────────────
async function saveTrip(trip) {
  const user = await getUser();
  if (!user) throw new Error('Not logged in');

  const payload = {
    user_id:    user.id,
    title:      trip.title || 'Untitled trip',
    data:       trip,
    updated_at: new Date().toISOString(),
  };

  if (trip.id) {
    // Update existing
    const { data, error } = await supabase
      .from('trips').update(payload).eq('id', trip.id).eq('user_id', user.id).select().single();
    if (error) throw error;
    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('trips').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
}

async function loadTrips() {
  const user = await getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('trips').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
  if (error) return [];
  return data.map(row => ({ ...row.data, id: row.id, title: row.title }));
}

async function deleteTrip(tripId) {
  const user = await getUser();
  if (!user) throw new Error('Not logged in');
  const { error } = await supabase
    .from('trips').delete().eq('id', tripId).eq('user_id', user.id);
  if (error) throw error;
}

async function getTripBySlug(slug) {
  const { data, error } = await supabase
    .from('trips').select('*').eq('share_slug', slug).eq('is_public', true).single();
  if (error || !data) return null;
  return { ...data.data, id: data.id, title: data.title };
}

async function setTripPublic(tripId, isPublic) {
  const user = await getUser();
  if (!user) throw new Error('Not logged in');
  const slug = isPublic ? `${Date.now()}-${Math.random().toString(36).slice(2,7)}` : null;
  const { error } = await supabase
    .from('trips').update({ is_public: isPublic, share_slug: slug }).eq('id', tripId).eq('user_id', user.id);
  if (error) throw error;
  return slug;
}

// ── Usage tracking ───────────────────────────────────────────────
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

async function incrementUsage(action) {
  const user = await getUser();
  if (!user) return;
  const month = currentMonth();
  // Upsert — increment count or create with count=1
  await supabase.rpc('increment_usage', { p_user_id: user.id, p_action: action, p_month: month });
}

async function getUsage(action) {
  const user = await getUser();
  if (!user) return 0;
  const month = currentMonth();
  const { data } = await supabase
    .from('usage').select('count').eq('user_id', user.id).eq('action', action).eq('month', month).single();
  return data?.count || 0;
}

async function checkLimit(action) {
  const settings = await getSettings();
  if (!settings.freemium_enabled) return { allowed: true, used: 0, limit: Infinity };

  const profile = await import('./auth.js').then(m => m.getProfile());
  const plan = profile?.plan || 'free';
  if (plan === 'pro') return { allowed: true, used: 0, limit: Infinity };

  const limits = settings.limits?.free || { routePlans: 3, flightSearches: 3, savedTrips: 1 };
  const limitMap = { routePlans: limits.routePlans, flightSearches: limits.flightSearches };
  const limit = limitMap[action] ?? Infinity;
  const used = await getUsage(action);

  return { allowed: used < limit, used, limit };
}

export {
  getSettings, updateSetting, getDefaultSettings,
  saveTrip, loadTrips, deleteTrip, getTripBySlug, setTripPublic,
  incrementUsage, getUsage, checkLimit,
};
