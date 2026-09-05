'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import AdminList, { StatusBadge } from '@/components/AdminList'
import { listProjects } from '@/lib/adminApi'

export default function AdminProjectsPage() {
  const load = useCallback(() => listProjects(), [])

  return (
    <AdminList
      title="Projects"
      newHref="/admin/projects/new"
      newLabel="+ New"
      load={load}
      emptyText="No projects yet."
      renderRow={(project) => (
        <li key={project.id} className="py-3">
          <Link href={`/admin/projects/${project.id}`} className="block">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{project.title}</span>
              <StatusBadge published={project.is_published} />
            </div>
            <div className="text-xs opacity-60 mt-1">
              {project.status} · /projects/{project.slug}
            </div>
          </Link>
        </li>
      )}
    />
  )
}
