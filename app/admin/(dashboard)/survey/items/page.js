'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { listSurveyItems } from '@/lib/surveyAdmin'
import { mainPhoto } from '@/lib/photos'

// The things being asked about. Order here is the order family see them.
export default function SurveyItemsPage() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    listSurveyItems()
      .then(setItems)
      .catch((err) => setError(err.message ?? 'Could not load'))
  }, [])

  useEffect(load, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Survey — Items</h1>
        <Link href="/admin/survey" className="rounded border px-3 py-2 text-sm">
          ← People
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/survey/items/new" className="rounded border px-4 py-3 text-sm">
          + Add an item
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!items && !error && <p className="text-sm opacity-60">Loading…</p>}
      {items?.length === 0 && (
        <p className="text-sm opacity-60">
          Nothing yet. Add an item, or pull one in from your equipment listings.
        </p>
      )}

      <ul className="divide-y">
        {items?.map((item) => {
          const photo = mainPhoto(item)
          return (
            <li key={item.id} className="py-3">
              <Link
                href={`/admin/survey/items/${item.id}`}
                className="flex items-start gap-3"
              >
                {photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photo}
                    alt=""
                    className="h-14 w-14 flex-shrink-0 rounded border object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded border text-xs opacity-40">
                    no photo
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-xs opacity-70">
                      {item.is_active ? 'In survey' : 'Hidden'}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs opacity-60">
                    {item.responseCount} answer{item.responseCount === 1 ? '' : 's'}
                    {item.source === 'equipment' && ' · from a listing'}
                    {item.confirmed_owner && ` · confirmed: ${item.confirmed_owner}`}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
