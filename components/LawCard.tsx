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

function GridContent({ law, articleCount, badge }: { law: Law; articleCount: number; badge?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-rule bg-white p-4 h-full flex flex-col gap-2 hover:border-gold-400 transition-colors">
      <div className="flex items-start justify-between gap-2">
        {law.decree ? (
          <span className="text-xs font-mono text-ink-400">{law.decree}</span>
        ) : (
          <span />
        )}
        {badge}
      </div>
      <p className="font-serif text-base text-ink-900 leading-snug">{law.short_name}</p>
      <p className="text-xs text-ink-500 leading-snug line-clamp-2">{law.full_name}</p>
      <p className="text-xs text-ink-400 mt-auto pt-2">{articleCount} artículos</p>
    </div>
  )
}

function ListContent({ law, articleCount, badge }: { law: Law; articleCount: number; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 px-1 hover:bg-paper-2 transition-colors">
      <div className="min-w-0">
        <p className="font-serif text-base text-ink-900 leading-snug">{law.short_name}</p>
        <p className="text-xs text-ink-500 mt-0.5 leading-snug truncate">{law.full_name}</p>
      </div>
      <div className="shrink-0 flex items-center gap-3">
        {law.decree && <span className="text-xs font-mono text-ink-400 hidden sm:inline">{law.decree}</span>}
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
