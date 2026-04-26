const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const supabaseUrl = env.supabase.url;
const supabaseKey = env.supabase.serviceRoleKey || env.supabase.anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. Supabase integration will be disabled.');
}

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

module.exports = supabase;
