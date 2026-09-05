'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import AdminList from '@/components/AdminList'
import { listEquipment } from '@/lib/adminApi'

export default function AdminEquipmentPage() {
  const load = useCallback(() => listEquipment(), [])

  return (
    <AdminList
      title="Equipment"
      newHref="/admin/equipment/new"
      newLabel="+ New"
      load={load}
      emptyText="No listings yet."
      renderRow={(item) => (
        <li key={item.id} className="py-3">
          <Link href={`/admin/equipment/${item.id}`} className="block">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{item.name}</span>
              <span className="text-xs rounded border px-2 py-0.5 opacity-80">
                {item.is_active ? 'Listed' : 'Hidden'}
              </span>
            </div>
            <div className="text-xs opacity-60 mt-1">
              {item.category ?? 'uncategorised'} · /equipment/{item.slug}
            </div>
          </Link>
        </li>
      )}
    />
  )
}
