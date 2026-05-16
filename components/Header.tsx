import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getUserTier } from '@/lib/get-user-tier'
import Link from 'next/link'
import { signOut } from '@/app/auth/actions'
import SearchBar from './SearchBar'

export default async function Header() {
  const supabase = await createServerSupabaseClient()
  const [{ data: { user } }, tier] = await Promise.all([
    supabase.auth.getUser(),
    getUserTier(supabase),
  ])

  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="max-w-3xl mx-auto px-6 h-12 flex items-center gap-4">
        <Link
          href="/leyes"
          className="text-sm font-semibold text-gray-900 tracking-tight hover:text-gray-600 transition-colors flex-shrink-0"
        >
          LexGT
        </Link>

        <SearchBar />

        <div className="flex items-center gap-5 flex-shrink-0">
          {user && tier === 'pro' && (
            <Link
              href="/casos"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              Mis casos
            </Link>
          )}

          {user ? (
            <>
              <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[160px]">
                {user.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
