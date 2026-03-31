import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Erreur critique : Les variables d'environnement NEXT_PUBLIC_SUPABASE_URL et/ou NEXT_PUBLIC_SUPABASE_ANON_KEY sont manquantes. Assurez-vous de les avoir définies dans votre fichier .env.local avant de démarrer l'application."
    );
  }

  // Crée l'objet réponse initial
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Met à jour les cookies sur la requête pour les propager aux Server Components
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        
        // Crée une nouvelle réponse avec les headers modifiés
        supabaseResponse = NextResponse.next({
          request,
        });

        // Met à jour les cookies sur la réponse pour les sauvegarder dans le navigateur
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Rafraîchir la session d'authentification
  // Cela appelera setAll() ci-dessus s'il y a un nouveau token généré
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  if (!user && !isLoginPage) {
    // Anonyme -> redirection vers la page de login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    // Connecté -> redirection vers le dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
