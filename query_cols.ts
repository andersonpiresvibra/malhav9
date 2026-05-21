import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function run() {
  console.log("=== TESTING vehicles ID DATA TYPE ===");
  try {
    const { data, error } = await supabase.from('vehicles').insert({
      id: 'test-vehicle-01',
      type: 'SERVIDOR',
      status: 'DISPONÍVEL'
    }).select();
    
    if (error) {
       console.log("Insert Error:", error.message, "(code:", error.code, ")");
    } else {
       console.log("Insert Success! Data:", data);
       // Clean up
       await supabase.from('vehicles').delete().eq('id', 'test-vehicle-01');
    }
  } catch (err: any) {
    console.log("Exception:", err.message || err);
  }
}

run();
