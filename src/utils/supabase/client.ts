import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance to prevent multiple client creations on the browser
// which causes the "AbortError: Lock broken by another request with the 'steal' option"
let supabaseClient: SupabaseClient | null = null;

// ─── Garde-fou "bac à sable" local ────────────────────────────────────
//
// En développement local (localhost / `npm run dev`), on NE veut PAS que
// l'app lise ou écrive dans la base de données en ligne réelle : tester
// en local polluerait / écraserait les vraies données du compte de prod.
//
// Quand on détecte un environnement local, on enveloppe le client
// Supabase dans un Proxy qui neutralise TOUS les accès aux tables
// (`.from(...)` / `.rpc(...)`) : les lectures renvoient du vide, les
// écritures sont ignorées. L'app retombe alors automatiquement sur
// localStorage (comportement déjà prévu quand le cloud ne répond pas).
//
// L'authentification (`.auth`) reste 100% fonctionnelle pour pouvoir
// tester le login en local. Sur Vercel (preview + production), rien
// n'est neutralisé : la synchronisation cloud marche normalement.
// ─────────────────────────────────────────────────────────────────────

function isLocalSandbox(): boolean {
  if (typeof window === "undefined") {
    // Rendu côté serveur : pas de hostname disponible, on se base sur
    // NODE_ENV. `npm run dev` => "development". Vercel (preview + prod)
    // => "production".
    return process.env.NODE_ENV !== "production";
  }
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

let sandboxNoticeShown = false;
function showSandboxNoticeOnce() {
  if (sandboxNoticeShown || typeof window === "undefined") return;
  sandboxNoticeShown = true;
  console.info(
    "%c🧪 AlbugiMed — mode local (bac à sable)",
    "font-weight:bold;color:#5b7fa6",
    "\nLes données ne sont PAS synchronisées avec ton compte en ligne." +
      "\nTout reste dans ce navigateur (localStorage)." +
      "\nTes vraies données de production sont intactes (visibles sur le site Vercel).",
  );
}

// Stub de query builder : chaînable ET awaitable, ne fait rien et renvoie
// un résultat vide. Couvre select/eq/in/upsert/delete/maybeSingle/etc.
function makeNoopQueryBuilder(): unknown {
  const empty = { data: null, error: null };
  const builder: Record<string, unknown> = {
    select: () => builder,
    insert: () => Promise.resolve(empty),
    upsert: () => Promise.resolve(empty),
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => Promise.resolve(empty),
    maybeSingle: () => Promise.resolve(empty),
    // Permet `await supabase.from(...).select()...` à n'importe quel
    // maillon de la chaîne : resolve avec une liste vide.
    then: (resolve: (value: { data: never[]; error: null }) => unknown) =>
      resolve({ data: [], error: null }),
  };
  return builder;
}

function wrapInSandbox(client: SupabaseClient): SupabaseClient {
  showSandboxNoticeOnce();
  return new Proxy(client, {
    get(target, prop, receiver) {
      // Neutralise tout accès aux tables. `.auth` & co passent normalement.
      if (prop === "from" || prop === "rpc") {
        return () => makeNoopQueryBuilder();
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

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
      const real = createBrowserClient(supabaseUrl, supabaseAnonKey);
      supabaseClient = isLocalSandbox() ? wrapInSandbox(real) : real;
    }
    return supabaseClient;
  }

  // On the server, always create a new instance (for SSR rendering client components)
  const real = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return isLocalSandbox() ? wrapInSandbox(real) : real;
}
