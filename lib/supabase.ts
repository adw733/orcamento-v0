import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

// Create a singleton Supabase client with SSR support
// This client properly manages session/cookies for authentication
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if environment variables are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not found. Using mock client. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
  )
}

// Create the client with SSR support for proper session management
// This ensures the JWT token is sent with requests for RLS to work
export const supabase = createBrowserClient<Database>(
  supabaseUrl || "https://your-project.supabase.co",
  supabaseAnonKey || "your-anon-key",
)
