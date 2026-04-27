const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const supabaseUrl = env.supabase.url;
// Prioritize serviceRoleKey for backend operations to bypass RLS
const supabaseKey = env.supabase.serviceRoleKey || env.supabase.anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Credentials missing. Integration will be disabled.');
} else {
  const keyType = env.supabase.serviceRoleKey ? 'ServiceRole' : 'Anon';
  console.log(`[Supabase] Initializing with ${keyType} key`);
}

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }) 
  : null;

module.exports = supabase;

