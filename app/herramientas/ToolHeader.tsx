import Link from 'next/link'
import { Ico } from '@/components/icons'

export default function ToolHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="mb-8">
      <div className="mb-4 flex items-center gap-1.5 text-xs text-ink-500">
        <Link href="/herramientas" className="transition-colors hover:text-navy-700">
          Herramientas
        </Link>
        <Ico.chev className="h-3 w-3" />
        <span className="text-ink-900">{title}</span>
      </div>
      <h1 className="font-serif text-3xl text-ink-900">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-700">{intro}</p>
    </header>
  )
}
