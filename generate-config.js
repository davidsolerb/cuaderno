import { writeFileSync } from 'fs';

const config = `window.__APP_CONFIG__ = {
  SUPABASE_URL: "${process.env.SUPABASE_URL || ''}",
  SUPABASE_ANON_KEY: "${process.env.SUPABASE_ANON_KEY || ''}",
  USE_MOCK: false
};\n`;

try {
  writeFileSync('config.js', config);
  console.log('config.js generated');
} catch (err) {
  console.error('Failed to write config.js', err);
}
