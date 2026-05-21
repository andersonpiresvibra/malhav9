import dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else {
  dotenv.config();
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

async function run() {
  if (!supabaseUrl || !supabaseKey) {
     console.error("Missing credentials");
     process.exit(1);
  }
  
  const url = `${supabaseUrl}/rest/v1/`;
  console.log("Fetching OpenAPI spec from:", url);
  
  try {
     const res = await fetch(url, {
        headers: {
           'apikey': supabaseKey,
           'Authorization': `Bearer ${supabaseKey}`,
           'Content-Type': 'application/json'
        }
     });
     
     if (!res.ok) {
        console.error("Failed to fetch spec:", res.status, res.statusText);
        const text = await res.text();
        console.error("Response body:", text);
        return;
     }
     
     const spec = await res.json();
     console.log("=== TABLES FOUND IN SUPABASE ===");
     const tables = Object.keys(spec.definitions || {}).sort();
     for (const table of tables) {
        console.log(`- ${table}`);
        const columns = Object.keys(spec.definitions[table].properties || {});
        console.log(`  Columns: ${columns.join(', ')}`);
     }
  } catch (err: any) {
     console.error("Error fetching spec:", err.message || err);
  }
}

run();
