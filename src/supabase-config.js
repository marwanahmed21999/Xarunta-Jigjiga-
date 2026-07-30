// Jigjiga Portal - Supabase Configuration
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ssthisblwaxpxagrbwmq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kcKzt3tFjrorouN329CdrA_s9i-K28m';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase, SUPABASE_URL, SUPABASE_ANON_KEY };
