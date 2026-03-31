import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Met à jour la session dans les cookies (s'assure que le token d'Auth est à jour)
  return await updateSession(request);
}

// Spécifie sur quelles routes le middleware doit s'exécuter
export const config = {
  matcher: [
    /*
     * Intercepte toutes les requêtes sauf pour :
     * - _next/static (fichiers statiques compilés par Next.js)
     * - _next/image (images optimisées par le routeur Next.js)
     * - favicon.ico (icône du site)
     * - les fichiers avec des extensions (images, graphismes, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
