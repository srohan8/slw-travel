// ================================================================
// AUTH — slwtravel.com
// Supabase auth. All auth calls go through here.
// ================================================================
import { SUPABASE_URL, SUPABASE_ANON } from '../config/constants.js';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Session ──────────────────────────────────────────────────────
async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

async function isLoggedIn() {
  const session = await getSession();
  return !!session;
}

// ── Sign up / in / out ───────────────────────────────────────────
async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // Create profile row
  if (data.user) {
    await supabase.from('profiles').upsert({ id: data.user.id, email, plan: 'free' });
  }
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/app.html` }
  });
  if (error) throw error;
}

async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
}

// ── Profile ──────────────────────────────────────────────────────
async function getProfile() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

async function getUserPlan() {
  const profile = await getProfile();
  return profile?.plan || 'free';
}

// ── Auth state listener ──────────────────────────────────────────
function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
}

export {
  supabase,
  getSession, getUser, isLoggedIn,
  signUp, signIn, signInWithGoogle, signOut,
  getProfile, getUserPlan,
  onAuthStateChange
};
