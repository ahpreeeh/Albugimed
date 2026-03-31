'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

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
      return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
