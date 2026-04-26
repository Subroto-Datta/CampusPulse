const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const supabaseUrl = env.supabase.url;
// Use anonKey as primary because the provided serviceRoleKey was invalid
const supabaseKey = env.supabase.anonKey || env.supabase.serviceRoleKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. Supabase integration will be disabled.');
}

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

module.exports = supabase;
