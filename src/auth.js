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

async function completeLogin(staffId, organ, opts) {
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

async function login(staffId, password, organ, opts = {}) {
  const email = staffEmail(staffId);
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) return { success: false, error: authError.message };

  // Zwei-Faktor-Prüfung: falls dieser Account TOTP eingerichtet hat, reicht das Passwort allein nicht.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const factor = factorsData && factorsData.totp && factorsData.totp[0];
    if (factor) {
      return { success: false, mfaRequired: true, factorId: factor.id, staffId, organ, opts };
    }
  }

  return await completeLogin(staffId, organ, opts);
}

async function verifyMfaAndCompleteLogin(factorId, code, staffId, organ, opts) {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return { success: false, error: challengeError.message };

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId, challengeId: challenge.id, code
  });
  if (verifyError) return { success: false, error: verifyError.message };

  return await completeLogin(staffId, organ, opts);
}

async function logout() {
  await supabase.auth.signOut();
}

// --- Zwei-Faktor-Authentifizierung (TOTP) verwalten, für bereits eingeloggte Nutzer ---

async function mfaStatus() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { enrolled: false, factors: [] };
  const verified = (data.totp || []).filter(f => f.status === 'verified');
  return { enrolled: verified.length > 0, factors: verified };
}

async function mfaEnroll() {
  return await supabase.auth.mfa.enroll({ factorType: 'totp' });
}

async function mfaConfirmEnroll(factorId, code) {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return { success: false, error: challengeError.message };
  const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  if (verifyError) return { success: false, error: verifyError.message };
  return { success: true };
}

async function mfaUnenroll(factorId) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  return { success: !error, error: error ? error.message : null };
}

function checkAccess(organ, resource) {
  const rights = ACCESS_RIGHTS[organ];
  if (!rights) return false;
  if (rights.forbidden.includes(resource)) return false;
  return rights.canRead.includes(resource) || rights.canWrite.includes('*');
}

export { login, logout, checkAccess, ACCESS_RIGHTS, verifyMfaAndCompleteLogin, mfaStatus, mfaEnroll, mfaConfirmEnroll, mfaUnenroll };
