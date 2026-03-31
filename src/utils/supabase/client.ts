import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Erreur critique : Les variables d'environnement NEXT_PUBLIC_SUPABASE_URL et/ou NEXT_PUBLIC_SUPABASE_ANON_KEY sont manquantes. Assurez-vous de les avoir définies dans votre fichier .env.local avant de démarrer l'application."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
