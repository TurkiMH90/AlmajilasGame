/**
 * Supabase Client Configuration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Copy your project URL and anon key from Settings > API
 * 3. Create a .env file in project root with:
 *    VITE_SUPABASE_URL=your_project_url
 *    VITE_SUPABASE_ANON_KEY=your_anon_key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Declare Vite env types
declare global {
    interface ImportMeta {
        env: {
            VITE_SUPABASE_URL?: string;
            VITE_SUPABASE_ANON_KEY?: string;
        };
    }
}

// Environment variables (Vite uses VITE_ prefix)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Missing environment variables. Using mock mode.');
}

// Create Supabase client
export const supabase: SupabaseClient = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
    return !!(supabaseUrl && supabaseAnonKey);
}

// Database table names
export const TABLES = {
    CATEGORIES: 'categories',
    QUESTIONS: 'questions',
    USER_QUESTION_HISTORY: 'user_question_history',
    USERS: 'users'
} as const;

// Storage bucket names
export const BUCKETS = {
    TRIVIA_MEDIA: 'trivia-media'
} as const;
