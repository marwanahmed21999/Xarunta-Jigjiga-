// Echtes Login-System für Jigjiga Portal
// Organ-basierte Zugangskontrolle
import { supabase } from './supabase-config.js';

function staffEmail(staffId) {
  return staffId.trim().toLowerCase() + '@jigjiga-portal.local';
}

const ACCESS_RIGHTS = {
  police: {
    label: 'Booliska (Police)',
    canRead:  ['crime_db','biometrics','investigations','court_decisions','prosecution_files'],
    canWrite: ['crime_db','biometrics','investigations'],
    forbidden: ['prison_management','rehabilitation']
  },
  prosecution: {
    label: 'Xeer Ilaaliye (Prosecution)',
    canRead:  ['police_reports','investigation_reports','case_files','criminal_records','court_data'],
    canWrite: ['case_files','criminal_records','charges'],
    forbidden: ['biometrics','prison_management']
  },
  court: {
    label: 'Maxkamadda (Court)',
    canRead:  ['prosecution_files','criminal_records','case_files'],
    canWrite: ['court_records','verdicts','human_rights_reviews'],
    forbidden: ['investigation_data','biometrics']
  },
  corrections: {
    label: 'Xabsiga (Corrections)',
    canRead:  ['court_orders','verdicts'],
    canWrite: ['inmate_records','rehabilitation_programs','health_records'],
    forbidden: ['investigation_data','prosecution_files','biometrics']
  },
  admin: {
    label: 'Maamulaha (Admin)',
    canRead:  ['*'],
    canWrite: ['*'],
    forbidden: []
  }
};

async function login(staffId, password, organ, opts = {}) {
  const email = staffEmail(staffId);
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) return { success: false, error: authError.message };

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('staff_id', staffId.trim())
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { success: false, error: 'Kein Profil für diese Staff ID gefunden.' };
  }
  if (!opts.skipOrganCheck && profile.organ !== organ) {
    await supabase.auth.signOut();
    return { success: false, error: 'Dieser Account gehört nicht zum ausgewählten Organ.' };
  }
  if (profile.status === 'pending') {
    await supabase.auth.signOut();
    return { success: false, error: 'Dein Konto wartet noch auf Freischaltung durch einen Admin.' };
  }

  return { success: true, profile };
}

async function logout() {
  await supabase.auth.signOut();
}

function checkAccess(organ, resource) {
  const rights = ACCESS_RIGHTS[organ];
  if (!rights) return false;
  if (rights.forbidden.includes(resource)) return false;
  return rights.canRead.includes(resource) || rights.canWrite.includes('*');
}

export { login, logout, checkAccess, ACCESS_RIGHTS };
