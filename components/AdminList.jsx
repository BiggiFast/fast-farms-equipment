'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// Shared shell for the three admin list screens: loads rows, shows a
// published/draft badge, and links each row to its editor.
export default function AdminList({
  title,
  newHref,
  newLabel,
  load,
  renderRow,
  emptyText,
}) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
      .then(setRows)
      .catch((err) => setError(err.message ?? 'Could not load'))
  }, [load])

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <Link href={newHref} className="rounded border px-3 py-2 text-sm">
          {newLabel}
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!rows && !error && <p className="text-sm opacity-60">Loading…</p>}
      {rows?.length === 0 && <p className="text-sm opacity-60">{emptyText}</p>}

      <ul className="divide-y">{rows?.map(renderRow)}</ul>
    </div>
  )
}

export function StatusBadge({ published }) {
  return (
    <span className="text-xs rounded border px-2 py-0.5 opacity-80">
      {published ? 'Published' : 'Draft'}
    </span>
  )
}
