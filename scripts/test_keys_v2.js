const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function test(key, label) {
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.log(`[${label}] Error:`, error.message);
  } else {
    console.log(`[${label}] Found ${data.length} users.`);
    if (data.length > 0) console.log(`[${label}] Top user:`, data[0].email);
  }
}

(async () => {
  await test(anon, 'ANON');
  await test(service, 'SERVICE');
})();
