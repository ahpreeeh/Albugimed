'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// Le plan gratuit Supabase met le projet en veille après ~7 jours sans
// activité. Pendant la fenêtre de réveil (~1-3 min après réactivation), la
// passerelle API renvoie une page HTML au lieu du JSON attendu, ce qui
// remonte comme une erreur "Unexpected token '<' ... is not valid JSON"
// (ou un échec réseau). On traduit ça en message clair et actionnable
// plutôt que d'afficher le charabia technique à l'utilisateur.
function isServerWakingUp(message: string): boolean {
  return (
    message.includes('not valid JSON') ||
    message.includes('Unexpected token') ||
    message.includes('<!DOCTYPE') ||
    message.includes('Failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('NetworkError')
  )
}

const WAKING_UP_MESSAGE =
  'Le serveur se réveille (mise en veille automatique après inactivité). Patiente ~30 secondes, puis réessaie.'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // On extrait l'email et le mot de passe depuis le FormData 
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
      return { error: 'L\'adresse email et le mot de passe sont requis.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
        return { error: 'Vos identifiants sont incorrects.' }
    }
    if (isServerWakingUp(error.message)) {
        return { error: WAKING_UP_MESSAGE }
    }
    return { error: error.message }
  }

  // Succès: on recharge la page d'accueil avec les nouveaux credentials
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
      return { error: 'L\'adresse email et le mot de passe sont requis.' }
  }
  
  if (password.length < 6) {
      return { error: 'Le mot de passe doit faire au moins 6 caractères.' }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  // Dans ce réglage: La confirmation d'email est OFF.
  // Par conséquent signUp va virtuellement connecter l'utilisateur immédiatement.
  
  if (error) {
      if (error.message.includes('User already registered')) {
          return { error: 'Cet email possède déjà un compte, connectez-vous.' }
      }
      if (isServerWakingUp(error.message)) {
          return { error: WAKING_UP_MESSAGE }
      }
      return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
