import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard', '/inventario', '/evaluaciones', '/gaps', '/evidencias',
  '/ajustes', '/organizacion', '/usuarios', '/datos', '/perfil',
  '/governance', '/settings',
]

function matchesPath(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtectedAppRoute = matchesPath(path, PROTECTED_PREFIXES)
  const isOnboardingRoute = path === '/onboarding'
  const isAuthRoute = path === '/login' || path === '/register'

  if ((isProtectedAppRoute || isOnboardingRoute) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (!user) return supabaseResponse

  // onboarding_completed ahora es una columna directa en profiles
  const { data: profile } = await supabase
    .schema('fluxion')
    .from('profiles')
    .select('organization_id, onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle()

  const onboardingCompleted = profile?.onboarding_completed === true

  if (isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = onboardingCompleted ? '/dashboard' : '/onboarding'
    return NextResponse.redirect(url)
  }

  if (isOnboardingRoute && onboardingCompleted) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (isProtectedAppRoute && !onboardingCompleted) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  if (isOnboardingRoute && !profile) {
    return supabaseResponse
  }

  return supabaseResponse
}
