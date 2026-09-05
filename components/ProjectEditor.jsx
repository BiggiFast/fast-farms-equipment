'use client'

import { useEffect, useState } from 'react'
import EditorShell from '@/components/EditorShell'
import PhotoUploader from '@/components/PhotoUploader'
import { TextField, TextArea, SelectField, CheckField } from '@/components/Field'
import { getRow, saveRow } from '@/lib/adminApi'
import { slugify } from '@/lib/slug'

const EMPTY = {
  title: '',
  slug: '',
  summary: '',
  body: '',
  photos: [],
  status: 'active',
  is_published: false,
  started_at: '',
}

export default function ProjectEditor({ id }) {
  const isNew = !id
  const [form, setForm] = useState(isNew ? EMPTY : null)
  // Once you've hand-edited a slug, stop overwriting it as you type the title
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (isNew) return
    getRow('projects', id)
      .then((row) =>
        setForm(
          row
            ? {
                ...EMPTY,
                ...row,
                photos: row.photos ?? [],
                started_at: row.started_at ?? '',
              }
            : null
        )
      )
      .catch((err) => setLoadError(err.message))
  }, [id, isNew])

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleTitle(value) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }))
  }

  async function handleSave() {
    await saveRow('projects', id, {
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      summary: form.summary?.trim() || null,
      body: form.body?.trim() || null,
      photos: form.photos,
      status: form.status,
      is_published: form.is_published,
      started_at: form.started_at || null,
    })
  }

  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>
  if (!form) return <p className="text-sm opacity-60">Loading…</p>

  return (
    <EditorShell
      title={isNew ? 'New project' : 'Edit project'}
      table="projects"
      id={id}
      onSave={handleSave}
      backHref="/admin/projects"
    >
      <TextField
        label="Title"
        value={form.title}
        onChange={(e) => handleTitle(e.target.value)}
        required
      />

      <TextField
        label="URL"
        value={form.slug}
        onChange={(e) => {
          setSlugTouched(true)
          set('slug', slugify(e.target.value))
        }}
        required
        hint={`mrcoryfast.com/projects/${form.slug || '…'}`}
      />

      <TextField
        label="Summary"
        value={form.summary ?? ''}
        onChange={(e) => set('summary', e.target.value)}
        hint="One line, shown on the projects list."
      />

      <TextArea
        label="About this project"
        value={form.body ?? ''}
        onChange={(e) => set('body', e.target.value)}
      />

      <SelectField
        label="Status"
        value={form.status}
        onChange={(e) => set('status', e.target.value)}
      >
        <option value="active">Active — working on it now</option>
        <option value="paused">Paused</option>
        <option value="completed">Completed</option>
      </SelectField>

      <TextField
        label="Started"
        type="date"
        value={form.started_at ?? ''}
        onChange={(e) => set('started_at', e.target.value)}
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
        hint="Unpublished projects stay hidden, and so does their whole page."
      />
    </EditorShell>
  )
}
