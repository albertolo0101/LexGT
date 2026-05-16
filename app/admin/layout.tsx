import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== "admin") {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="w-52 shrink-0 border-r border-gray-100 px-4 py-8 flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
          Panel admin
        </p>
        <Link
          href="/admin"
          className="text-sm text-gray-700 hover:text-blue-700 py-1.5 px-2 rounded hover:bg-gray-100 transition-colors"
        >
          Reformas
        </Link>
        <Link
          href="/admin/reformas/nueva"
          className="text-sm text-gray-700 hover:text-blue-700 py-1.5 px-2 rounded hover:bg-gray-100 transition-colors"
        >
          Nueva reforma
        </Link>
      </aside>
      <div className="flex-1 px-8 py-8 max-w-4xl">{children}</div>
    </div>
  )
}
