import Link from 'next/link'
import type { Law } from '@/lib/types'

type Props = {
  laws: Pick<Law, 'id' | 'slug' | 'short_name'>[]
  isAuthenticated: boolean
}

export default function SidebarContent({ laws, isAuthenticated }: Props) {
  return (
    <nav className="flex flex-col py-4 h-full">
      <div className="flex-1 min-h-0">
        <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Leyes
        </p>
        <ul>
          {laws.map((law) => (
            <li key={law.id}>
              <Link
                href={`/leyes/${law.slug}`}
                className="block px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors truncate"
              >
                {law.short_name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 px-4 flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Jurisprudencias
          </p>
          <span className="text-[9px] font-medium bg-gray-100 text-gray-400 rounded px-1.5 py-0.5 leading-none">
            Próximamente
          </span>
        </div>
      </div>

      {isAuthenticated && (
        <div className="border-t border-gray-100 pt-2 mt-2 flex-shrink-0">
          <Link
            href="/casos"
            className="block px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            Mis casos
          </Link>
        </div>
      )}
    </nav>
  )
}
