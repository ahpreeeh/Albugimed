import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Met à jour la session dans les cookies (s'assure que le token d'Auth est à jour)
  return await updateSession(request);
}

// Spécifie sur quelles routes le middleware doit s'exécuter
export const config = {
  matcher: [
    '/',
    '/login',
    '/cockpit/:path*',
    '/subjects/:path*',
    '/planning/:path*',
    '/simulation/:path*',
    '/notes/:path*',
    '/coming/:path*',
    '/restore/:path*',
  ],
};
