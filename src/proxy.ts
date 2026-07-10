import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Roda em tudo, menos assets estáticos, imagens e arquivos do PWA.
  // O manifest é buscado pelo navegador SEM cookies; se cair no redirect de login,
  // o Chrome não reconhece o app como instalável.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sw\\.js|offline$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
