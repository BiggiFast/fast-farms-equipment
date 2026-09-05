'use client'

import { useEffect, useState } from 'react'
import EditorShell from '@/components/EditorShell'
import PhotoUploader from '@/components/PhotoUploader'
import { TextField, TextArea, SelectField, CheckField } from '@/components/Field'
import { getRow, saveRow, listProjects } from '@/lib/adminApi'

const EMPTY = {
  project_id: '',
  title: '',
  body: '',
  photos: [],
  is_published: false,
  published_at: null,
}

export default function UpdateEditor({ id }) {
  const isNew = !id
  const [form, setForm] = useState(isNew ? EMPTY : null)
  const [projects, setProjects] = useState([])
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    listProjects().then(setProjects).catch(() => setProjects([]))
  }, [])

  useEffect(() => {
    if (isNew) return
    getRow('updates', id)
      .then((row) =>
        setForm(
          row
            ? { ...EMPTY, ...row, project_id: row.project_id ?? '', photos: row.photos ?? [] }
            : null
        )
      )
      .catch((err) => setLoadError(err.message))
  }, [id, isNew])

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    const values = {
      // '' from the dropdown means "no project" — the column wants NULL
      project_id: form.project_id || null,
      title: form.title?.trim() || null,
      body: form.body?.trim() || null,
      photos: form.photos,
      is_published: form.is_published,
      // Stamp the publish time the first time it actually goes public, so a
      // draft written last week shows today's date when you publish it.
      published_at:
        form.is_published && !form.published_at
          ? new Date().toISOString()
          : form.published_at,
    }
    await saveRow('updates', id, values)
  }

  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>
  if (!form) return <p className="text-sm opacity-60">Loading…</p>

  return (
    <EditorShell
      title={isNew ? 'New update' : 'Edit update'}
      table="updates"
      id={id}
      onSave={handleSave}
      backHref="/admin/updates"
    >
      <SelectField
        label="Project"
        value={form.project_id}
        onChange={(e) => set('project_id', e.target.value)}
        hint="Leave as “No project” for a one-off post."
      >
        <option value="">No project — standalone post</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </SelectField>

      <TextField
        label="Title (optional)"
        value={form.title ?? ''}
        onChange={(e) => set('title', e.target.value)}
        hint="A daily note often doesn't need one."
      />

      <TextArea
        label="What happened"
        value={form.body ?? ''}
        onChange={(e) => set('body', e.target.value)}
        rows={8}
      />

      <div>
        <span className="block text-sm mb-2">Photos</span>
        <PhotoUploader
          bucket="project-images"
          photos={form.photos}
          onChange={(photos) => set('photos', photos)}
        />
      </div>

      <CheckField
        label="Published"
        checked={form.is_published}
        onChange={(e) => set('is_published', e.target.checked)}
        hint="Leave unchecked to save as a draft only you can see."
      />
    </EditorShell>
  )
}
