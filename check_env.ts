import dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else {
  dotenv.config();
}

console.log("=== ENV VARIABLE CHECK ===");
for (const key of Object.keys(process.env)) {
  if (key.includes('SUPABASE') || key.includes('DATABASE') || key.includes('URL') || key.includes('KEY')) {
     const val = process.env[key] || '';
     console.log(`${key}: ${val ? (val.startsWith('http') || key.includes('URL') ? val : '[STRING length ' + val.length + ']') : 'empty'}`);
  }
}
