"use client"

import { useState } from "react"
import { setUserTier } from "@/app/admin/actions"
import type { Tier } from "@/lib/types"

export default function TierForm() {
  const [email, setEmail] = useState("")
  const [tier, setTier] = useState<Tier>("pro")
  const [expiresAt, setExpiresAt] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      await setUserTier({
        email: email.trim(),
        tier,
        tierExpiresAt: expiresAt || null,
        tierSource: "manual",
      })
      setMessage({ ok: true, text: `Tier actualizado a "${tier}" para ${email.trim()}.` })
      setEmail("")
      setExpiresAt("")
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Error inesperado." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Email del usuario</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="usuario@ejemplo.com"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Tier</label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as Tier)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Expira el (opcional)
        </label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {message && (
        <p className={`text-xs ${message.ok ? "text-green-600" : "text-red-500"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
      >
        {loading ? "Aplicando…" : "Aplicar"}
      </button>
    </form>
  )
}
