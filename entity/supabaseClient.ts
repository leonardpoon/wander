// Singleton Supabase client for the application, import everywhere you'll need DB connection

import {createClient} from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Check .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)