"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Law, LawReform } from "@/lib/types"
import { markReformSeen, migrateAnnotations } from "@/app/leyes/actions"
import ReformModal from "./ReformModal"

type ArticlePair = { oldArticleId: string; newArticleId: string }

interface Props {
  law: Law
  pendingReforms: LawReform[]
  userTier: "anonymous" | "free" | "pro"
  articlePairsByReform: Record<string, ArticlePair[]>
}

const cardClass =
  "group flex items-start justify-between gap-6 py-5 -mx-2 px-2 rounded hover:bg-gray-50 transition-colors"

function CardContent({ law, badge }: { law: Law; badge?: React.ReactNode }) {
  return (
    <>
      <div className="min-w-0">
        <p className="text-base font-medium text-gray-900 group-hover:text-blue-700 transition-colors leading-snug">
          {law.short_name}
        </p>
        <p className="text-sm text-gray-500 mt-0.5 leading-snug">{law.full_name}</p>
      </div>
      <div className="shrink-0 flex items-center gap-2 mt-0.5">
        {law.decree && (
          <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
            {law.decree}
          </span>
        )}
        {badge}
      </div>
    </>
  )
}

export default function LawCard({
  law,
  pendingReforms,
  userTier,
  articlePairsByReform,
}: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)

  const badge =
    pendingReforms.length > 0 ? (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold leading-none">
        {pendingReforms.length}
      </span>
    ) : undefined

  if (pendingReforms.length === 0) {
    return (
      <Link href={`/leyes/${law.slug}`} className={cardClass}>
        <CardContent law={law} />
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
        className={`${cardClass} cursor-pointer`}
      >
        <CardContent law={law} badge={badge} />
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
