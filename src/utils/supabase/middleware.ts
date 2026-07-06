import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const AUTH_LOOKUP_TIMEOUT_MS = 2500;

type AuthLookupResult =
  | { status: 'ok'; user: User | null }
  | { status: 'error'; error: unknown }
  | { status: 'timeout' };

async function getUserWithTimeout(
  getUser: () => Promise<{ data: { user: User | null }; error: unknown }>,
): Promise<AuthLookupResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const authLookup = getUser()
    .then(({ data, error }): AuthLookupResult => {
      if (error) return { status: 'error', error };
      return { status: 'ok', user: data.user ?? null };
    })
    .catch((error): AuthLookupResult => ({ status: 'error', error }));

  const timeout = new Promise<AuthLookupResult>((resolve) => {
    timeoutId = setTimeout(() => resolve({ status: 'timeout' }), AUTH_LOOKUP_TIMEOUT_MS);
  });

  const result = await Promise.race([authLookup, timeout]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
}

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

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const authLookup = await getUserWithTimeout(() => supabase.auth.getUser());

  if (authLookup.status === 'timeout') {
    console.warn('[middleware] Supabase auth.getUser timeout');

    if (isLoginPage) {
      return supabaseResponse;
    }

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('auth', 'timeout');
    return NextResponse.redirect(url);
  }

  if (authLookup.status === 'error') {
    console.warn('[middleware] Supabase auth.getUser failed', authLookup.error);
  }

  const user = authLookup.status === 'ok' ? authLookup.user : null;

  if (!user && !isLoginPage) {
    // Anonyme -> redirection vers la page de login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    // Connecté -> redirection directe vers /cockpit (évite le double-hop
    // /login → / → /cockpit depuis Phase 4 step 4.4)
    const url = request.nextUrl.clone();
    url.pathname = '/cockpit';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
