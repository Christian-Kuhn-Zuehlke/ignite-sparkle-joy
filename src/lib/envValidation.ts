// Environment variable validation
// Runs at app startup to catch missing configuration early

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_PROJECT_ID: string;
  SENTRY_DSN?: string;
  APP_VERSION: string;
}

export function validateEnv(): EnvConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  
  // Required variables
  if (!supabaseUrl) {
    console.error('[ENV] VITE_SUPABASE_URL is missing');
  }
  
  if (!supabaseKey) {
    console.error('[ENV] VITE_SUPABASE_PUBLISHABLE_KEY is missing');
  }
  
  if (!projectId) {
    console.error('[ENV] VITE_SUPABASE_PROJECT_ID is missing');
  }
  
  // Optional variables with warnings
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (!sentryDsn && import.meta.env.MODE === 'production') {
    console.warn('[ENV] VITE_SENTRY_DSN not configured - error tracking disabled');
  }
  
  return {
    SUPABASE_URL: supabaseUrl || '',
    SUPABASE_PUBLISHABLE_KEY: supabaseKey || '',
    SUPABASE_PROJECT_ID: projectId || '',
    SENTRY_DSN: sentryDsn,
    APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  };
}

// Call at app startup
export const env = validateEnv();
