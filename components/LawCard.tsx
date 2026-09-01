"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Law, LawReform, Tier } from "@/lib/types"
import { markReformSeen, migrateAnnotations } from "@/app/leyes/actions"
import ReformModal from "./ReformModal"

type ArticlePair = { oldArticleId: string; newArticleId: string }

interface Props {
  law: Law
  pendingReforms: LawReform[]
  userTier: Tier
  articlePairsByReform: Record<string, ArticlePair[]>
  articleCount: number
  view: "grid" | "list"
}

function AlertBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold-700 bg-gold-50 border border-gold-400/40 rounded-full px-2 py-0.5 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse-gold" />
      {count} {count === 1 ? "reforma" : "reformas"}
    </span>
  )
}

// Vista "cuadrícula": cada ley se ve como un tomo empastado — lomo a la
// izquierda, filete dorado y tipografía serif en oro sobre azul.
function GridContent({ law, articleCount, badge }: { law: Law; articleCount: number; badge?: React.ReactNode }) {
  return (
    <div className="group relative flex h-full min-h-[212px] overflow-hidden rounded-l-[3px] rounded-r-md bg-navy-900 shadow-[0_1px_2px_rgba(10,30,58,.25),0_10px_18px_-14px_rgba(10,30,58,.9)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(10,30,58,.3),0_16px_26px_-16px_rgba(10,30,58,.95)]">
      {/* lomo */}
      <span
        aria-hidden
        className="w-4 flex-shrink-0 bg-gradient-to-r from-navy-800 via-navy-900 to-navy-800 border-r border-gold-500/30"
      />
      <span aria-hidden className="w-px flex-shrink-0 bg-gold-500/20" />

      {/* pasta */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 border border-gold-500/25 m-2 ml-1.5 px-4 py-4 transition-colors group-hover:border-gold-400/50">
        <div className="flex items-start justify-between gap-2">
          {law.decree ? (
            <span className="font-mono text-[10px] uppercase tracking-widest text-gold-400/80">{law.decree}</span>
          ) : (
            <span />
          )}
          {badge}
        </div>

        <p className="font-serif text-lg leading-snug text-gold-200">{law.short_name}</p>

        <span aria-hidden className="h-px w-10 bg-gold-500/40" />

        <p className="line-clamp-3 text-xs leading-snug text-navy-100/60">{law.full_name}</p>

        <p className="mt-auto pt-2 text-[11px] uppercase tracking-widest text-navy-100/40">
          {articleCount} artículos
        </p>
      </div>
    </div>
  )
}

// Vista "biblioteca": nombre de la ley primero, decreto a continuación en tono
// más pálido.
function ListContent({ law, articleCount, badge }: { law: Law; articleCount: number; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 px-1 hover:bg-paper-2 transition-colors">
      <div className="min-w-0">
        <p className="truncate leading-snug">
          <span className="font-serif text-base text-ink-900">{law.short_name}</span>
          {law.decree && <span className="ml-2 font-mono text-xs text-ink-400/80">{law.decree}</span>}
        </p>
        <p className="text-xs text-ink-500 mt-0.5 leading-snug truncate">{law.full_name}</p>
      </div>
      <div className="shrink-0 flex items-center gap-3">
        <span className="text-xs text-ink-400 hidden sm:inline">{articleCount} arts.</span>
        {badge}
      </div>
    </div>
  )
}

export default function LawCard({
  law,
  pendingReforms,
  userTier,
  articlePairsByReform,
  articleCount,
  view,
}: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)

  const badge = <AlertBadge count={pendingReforms.length} />
  const Content = view === "grid" ? GridContent : ListContent
  const wrapperClass = view === "list" ? "border-b border-rule" : ""

  if (pendingReforms.length === 0) {
    return (
      <Link href={`/leyes/${law.slug}`} className={wrapperClass}>
        <Content law={law} articleCount={articleCount} />
      </Link>
    )
  }

  const handleClick = () => setCurrentIndex(0)

  const handleConfirm = async (action: "dismiss" | "migrate" | "delete") => {
    const reform = pendingReforms[currentIndex!]

    if (action !== "dismiss") {
      const pairs = articlePairsByReform[reform.id] ?? []
      for (const pair of pairs) {
        await migrateAnnotations({ ...pair, action })
      }
    }

    if (userTier !== "anonymous") {
      await markReformSeen(reform.id)
    }

    const next = currentIndex! + 1
    if (next < pendingReforms.length) {
      setCurrentIndex(next)
    } else {
      setCurrentIndex(null)
      router.push(`/leyes/${law.slug}`)
    }
  }

  const handleClose = () => setCurrentIndex(null)

  const currentReform = currentIndex !== null ? pendingReforms[currentIndex] : null

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick()
        }}
        className={`${wrapperClass} cursor-pointer`}
      >
        <Content law={law} articleCount={articleCount} badge={badge} />
      </div>

      {currentReform !== null && (
        <ReformModal
          reform={currentReform}
          hasAnnotationsOnReformedArticles={
            (articlePairsByReform[currentReform.id] ?? []).length > 0
          }
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}
    </>
  )
}
