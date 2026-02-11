import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = '⚠️ SUPABASE CONFIGURATION MISSING: Please check your environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).';
    console.error(errorMsg);

    // In production, we might want to alert the user if the app is literally broken
    if (typeof window !== 'undefined') {
        window.localStorage.setItem('config_error', errorMsg);
    }
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
