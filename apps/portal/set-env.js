#!/usr/bin/env node

const { execSync } = require('child_process');

const envVars = {
  'NEXT_PUBLIC_SUPABASE_URL': 'https://rqwxtbyuvxtsjpifhguw.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxd3h0Ynl1dnh0c2pwaWZoZ3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTk2MzEsImV4cCI6MjA2MjEzNTYzMX0.8T5QnxkiFoFLL3V6nJCdal4r9RtkWSIbDtKfpuFj60g'
};

console.log('Setting environment variables for portal...');

for (const [key, value] of Object.entries(envVars)) {
  try {
    console.log(`Setting ${key}...`);
    execSync(`echo "${value}" | vercel env add ${key} production preview development --yes`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error(`Failed to set ${key}:`, error.message);
  }
}

console.log('Done!');
