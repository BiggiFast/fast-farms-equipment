// Supabase client module for browser-based app
// Import Supabase from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase credentials
const SUPABASE_URL = 'https://tpsajkkwrsbaoyoiexee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwc2Fqa2t3cnNiYW95b2lleGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5OTQ5MzUsImV4cCI6MjA3ODU3MDkzNX0.lxxBBMYMHCOWRX__aF7wZjqHlu10pzmqazO_SXkKcKM';

// Create and export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


