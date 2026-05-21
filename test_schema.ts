import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Try to load env variables from any .env file that might be hidden or in the workspace
if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else {
  dotenv.config();
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log("=== SUPABASE SCHEMA DIAGNOSTIC ===");
console.log("VITE_SUPABASE_URL:", supabaseUrl || "NOT DEFINED");
console.log("VITE_SUPABASE_ANON_KEY length:", supabaseKey ? supabaseKey.length : 0);

if (!supabaseUrl || !supabaseKey) {
  console.log("Error: Supabase credentials are not defined in the environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
   const tables = [
      'frotas', 'vehicles',
      'operadores_geral', 'operators',
      'aeronaves', 'aircrafts',
      'malha_operacional', 'flights',
      'malha_raiz', 'root_mesh',
      'malha_dia', 'mesh_flights',
      'companhias', 'companies',
      'oper_do_dia', 'operator_work_days'
   ];
   
   for (const table of tables) {
      try {
         const { data, error } = await supabase.from(table).select('*').limit(1);
         if (error) {
            console.log(`❌ Table '${table}': ERROR -> ${error.message} (code: ${error.code})`);
         } else {
            console.log(`✅ Table '${table}': EXISTS -> (1st row data: ${data && data.length > 0 ? JSON.stringify(data[0]).substring(0, 100) : "empty table"})`);
         }
      } catch (err: any) {
         console.log(`💥 Table '${table}': EXCEPTION ->`, err.message || err);
      }
   }
}

run();
