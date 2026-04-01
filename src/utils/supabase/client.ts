import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance to prevent multiple client creations on the browser
// which causes the "AbortError: Lock broken by another request with the 'steal' option"
let supabaseClient: SupabaseClient | null = null;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Erreur critique : Les variables d'environnement NEXT_PUBLIC_SUPABASE_URL et/ou NEXT_PUBLIC_SUPABASE_ANON_KEY sont manquantes. Assurez-vous de les avoir définies dans votre fichier .env.local avant de démarrer l'application."
    );
  }

  // Create a single instance globally on the client side
  if (typeof window !== "undefined") {
    if (!supabaseClient) {
      supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    }
    return supabaseClient;
  }

  // On the server, always create a new instance (for SSR rendering client components)
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
