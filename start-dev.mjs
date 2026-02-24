#!/usr/bin/env bun
import { $ } from 'bun';

async function main() {
  // In Lovable Cloud, Supabase is managed remotely — skip local Docker check
  const skipLocal = process.env.VITE_SUPABASE_URL && !process.env.LOCAL_SUPABASE;

  if (!skipLocal) {
    console.log('Checking Supabase status...');
    try {
      await $`bun x supabase status`.quiet();
      console.log('✓ Supabase is already running\n');
    } catch (error) {
      console.log('Starting Supabase...\n');
      try {
        await $`bun x supabase start`;
        console.log('✓ Supabase started successfully\n');
      } catch (startError) {
        console.error('Failed to start Supabase. Please start it manually with: bun db:start');
        process.exit(1);
      }
    }
  }

  // Start Vite dev server
  console.log('Starting development server...\n');
  await $`vite`;
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
