'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import AdminList, { StatusBadge } from '@/components/AdminList'
import { listUpdates } from '@/lib/adminApi'

export default function AdminUpdatesPage() {
  const load = useCallback(() => listUpdates(), [])

  return (
    <AdminList
      title="Updates"
      newHref="/admin/updates/new"
      newLabel="+ New"
      load={load}
      emptyText="No updates yet."
      renderRow={(update) => (
        <li key={update.id} className="py-3">
          <Link href={`/admin/updates/${update.id}`} className="block">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">
                {update.title || update.body?.slice(0, 60) || 'Untitled'}
              </span>
              <StatusBadge published={update.is_published} />
            </div>
            <div className="text-xs opacity-60 mt-1">
              {update.project?.title ?? 'Standalone'}
              {update.published_at &&
                ` · ${new Date(update.published_at).toLocaleDateString()}`}
            </div>
          </Link>
        </li>
      )}
    />
  )
}
