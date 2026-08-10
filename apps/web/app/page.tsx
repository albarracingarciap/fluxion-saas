import { redirect } from 'next/navigation'
import { getAppAuthState } from '@/lib/auth/app-state'

export default async function HomePage() {
  const { user, onboardingCompleted } = await getAppAuthState()

  if (!user) {
    redirect('/login')
  }

  redirect(onboardingCompleted ? '/dashboard' : '/onboarding')
}
