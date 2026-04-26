const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', url);
console.log('Anon Key (start):', anon ? anon.substring(0, 10) : 'MISSING');
console.log('Service Key (start):', service ? service.substring(0, 10) : 'MISSING');

async function test(key, label) {
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
  if (error) {
    console.log(`[${label}] Failed:`, error.message);
  } else {
    console.log(`[${label}] Success! User count:`, data);
  }
}

(async () => {
  await test(anon, 'ANON');
  await test(service, 'SERVICE');
})();
