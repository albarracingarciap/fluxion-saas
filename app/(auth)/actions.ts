'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAppAuthState } from '@/lib/auth/app-state'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=Credenciales+incorrectas')
  }

  const { onboardingCompleted } = await getAppAuthState()

  revalidatePath('/dashboard', 'layout')
  redirect(onboardingCompleted ? '/dashboard' : '/onboarding')
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        first_name: formData.get('first_name') as string,
        last_name: formData.get('last_name') as string,
        organization_name: formData.get('organization_name') as string,
      }
    }
  }

  const { data: signUpData, error } = await supabase.auth.signUp(data)

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`)
  }

  if (!signUpData.session) {
    redirect('/login?message=Revisa+tu+email+para+confirmar+la+cuenta')
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding')
}
