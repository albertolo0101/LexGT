'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar() {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q.length < 2) return
    router.push(`/buscar?q=${encodeURIComponent(q)}`)
    setExpanded(false)
  }

  function handleExpandClick() {
    setExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <>
      {/* Desktop: always visible */}
      <form
        onSubmit={handleSubmit}
        className="hidden sm:flex items-center flex-1 max-w-xs"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en LexGT..."
          className="w-full text-xs border border-gray-200 rounded px-3 py-1.5 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 bg-gray-50"
        />
      </form>

      {/* Mobile: lupa icon → expand */}
      <div className="sm:hidden">
        {expanded ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              onBlur={() => { if (!query) setExpanded(false) }}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 bg-gray-50 w-36"
            />
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              Ir
            </button>
          </form>
        ) : (
          <button
            onClick={handleExpandClick}
            className="text-gray-500 hover:text-gray-900 transition-colors p-1"
            aria-label="Buscar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        )}
      </div>
    </>
  )
}
