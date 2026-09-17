import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

const authStorage = typeof window !== 'undefined' ? window.sessionStorage : undefined

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        storage: authStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
