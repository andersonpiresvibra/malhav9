import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else {
  dotenv.config();
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
   const candidates = [
       'companies', 
       'aircraft_types', 
       'company_aircraft', 
       'positions', 
       'vehicles', 
       'operators', 
       'root_mesh_flights', 
       'flights', 
       'mesh_flights', 
       'flight_logs', 
       'chat_messages', 
       'flight_reports', 
       'caixa_preta', 
       'flight_alerts', 
       'mesh_snapshots'
   ];
   
   console.log("Probing exact database schema tables...");
   for (const table of candidates) {
      try {
         const { data, error } = await supabase.from(table).select('*').limit(1);
         if (error) {
            if (error.message.includes('Could not find')) {
               console.log(`❌ Table '${table}' DOES NOT exist`);
            } else {
               console.log(`⚠️ Table '${table}' returned other error: ${error.message} (code: ${error.code})`);
            }
         } else {
            console.log(`✅ Table '${table}': EXISTS (rows: ${data ? data.length : 0})`);
         }
      } catch (err: any) {
         console.log(`💥 Table '${table}': EXCEPTION ->`, err.message || err);
      }
   }
}

run();
