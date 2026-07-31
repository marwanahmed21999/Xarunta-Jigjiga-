// Echtes Bürgerkonto — getrennt vom Mitarbeiter-Login (auth.js).
// Bürger melden sich mit ihrer eigenen echten E-Mail-Adresse an (kein Staff-ID-Trick).
import { supabase } from './supabase-config.js';

const PENDING_KEY = 'pendingCitizenProfile';

// Legt das Profil an, sobald eine echte Session existiert. Falls Supabase "Confirm email"
// aktiviert hat, gibt es beim signUp() selbst noch keine Session (RLS würde den Insert
// ablehnen) — darum merken wir Name/Telefon zwischen und tragen sie beim ersten Login nach.
async function ensureProfile(user) {
  const { data: existing } = await supabase.from('citizen_profiles').select('id').eq('id', user.id).maybeSingle();
  if (existing) return;

  let fullName = user.email;
  let phone = null;
  const pendingRaw = localStorage.getItem(PENDING_KEY);
  if (pendingRaw) {
    const pending = JSON.parse(pendingRaw);
    if (pending.email === user.email) {
      fullName = pending.fullName || fullName;
      phone = pending.phone || null;
    }
    localStorage.removeItem(PENDING_KEY);
  }

  await supabase.from('citizen_profiles').insert({ id: user.id, full_name: fullName, phone });
}

async function signUp(email, password, fullName, phone) {
  email = email.trim();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { success: false, error: error.message };

  localStorage.setItem(PENDING_KEY, JSON.stringify({ email, fullName: fullName.trim(), phone: phone.trim() || null }));

  if (data.session) {
    await ensureProfile(data.session.user);
    return { success: true, needsEmailConfirm: false };
  }
  return { success: true, needsEmailConfirm: true };
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { success: false, error: error.message };
  await ensureProfile(data.user);
  return { success: true };
}

async function signOut() {
  await supabase.auth.signOut();
}

async function currentCitizen() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  await ensureProfile(session.user);
  const { data: profile } = await supabase.from('citizen_profiles').select('*').eq('id', session.user.id).maybeSingle();
  if (!profile) return null;

  return { user: session.user, profile };
}

// Verknüpft einen soeben eingereichten Antrag/eine Zahlung mit dem eingeloggten Bürgerkonto,
// damit er/sie ihn später im eigenen Konto wiederfindet. Ohne Login ist das ein No-Op.
async function attachServiceRequest(requestNumber) {
  await supabase.rpc('attach_my_service_request', { p_request_number: requestNumber });
}
async function attachPayment(reference) {
  await supabase.rpc('attach_my_payment', { p_reference: reference });
}

async function myServiceRequests() {
  const { data, error } = await supabase.from('service_requests').select('*').order('created_at', { ascending: false });
  return error ? [] : data;
}
async function myPayments() {
  const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
  return error ? [] : data;
}

// Zugriffsprotokoll: zeigt dem Bürger, welches Amt wann auf einen seiner Anträge/Zahlungen zugegriffen hat
async function accessLogFor(tableName, recordId) {
  const { data, error } = await supabase.from('access_log').select('*')
    .eq('table_name', tableName).eq('record_id', recordId).order('created_at', { ascending: false });
  return error ? [] : data;
}

// Echte Benachrichtigungen: informieren den Bürger, sobald sich der Status
// eines Antrags/einer Zahlung ändert. In-App (kein SMS/E-Mail-Versand, dafür fehlt eine echte Anbindung).
async function myNotifications() {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
  return error ? [] : data;
}
async function markNotificationsRead(ids) {
  if (!ids || ids.length === 0) return;
  await supabase.from('notifications').update({ is_read: true }).in('id', ids);
}

// Verlauf eines Antrags (Statuswechsel + Rückfragen der Mitarbeiter) — für den Bürger selbst sichtbar
async function requestTimeline(requestId) {
  const { data, error } = await supabase.from('service_events').select('*').eq('request_id', requestId).order('created_at', { ascending: true });
  return error ? [] : data;
}

// Zum Nachreichen von Unterlagen (z.B. Lageplan bei einer Baugenehmigung) nach Einreichung nötig,
// um die tatsächliche Zeilen-ID des Antrags zu kennen (die RPC gibt nur die Referenznummer zurück).
async function requestIdByNumber(requestNumber) {
  const { data } = await supabase.from('service_requests').select('id').eq('request_number', requestNumber).maybeSingle();
  return data ? data.id : null;
}

async function uploadRequestDocument(requestId, file) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: 'Bitte einloggen, um Dokumente hochzuladen.' };

  const path = session.user.id + '/' + requestId + '/' + Date.now() + '-' + file.name;
  const { error: uploadError } = await supabase.storage.from('request-documents').upload(path, file);
  if (uploadError) return { success: false, error: uploadError.message };

  const { error: rowError } = await supabase.from('request_documents').insert({
    request_id: requestId, account_id: session.user.id, file_path: path, file_name: file.name
  });
  if (rowError) return { success: false, error: rowError.message };

  return { success: true };
}

async function requestDocuments(requestId) {
  const { data, error } = await supabase.from('request_documents').select('*').eq('request_id', requestId).order('created_at', { ascending: false });
  if (error || !data) return [];

  return Promise.all(data.map(async (doc) => {
    const { data: signed } = await supabase.storage.from('request-documents').createSignedUrl(doc.file_path, 3600);
    return { ...doc, url: signed ? signed.signedUrl : null };
  }));
}

export { signUp, signIn, signOut, currentCitizen, attachServiceRequest, attachPayment, myServiceRequests, myPayments, accessLogFor, myNotifications, markNotificationsRead, requestTimeline, requestIdByNumber, uploadRequestDocument, requestDocuments };
