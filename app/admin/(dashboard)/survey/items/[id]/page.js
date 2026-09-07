'use client'

import { use, useEffect, useState } from 'react'
import EditorShell from '@/components/EditorShell'
import { TextField, TextArea, SelectField, CheckField } from '@/components/Field'
import PhotoUploader from '@/components/PhotoUploader'
import { getRow, saveRow } from '@/lib/adminApi'
import { OWNER_OPTIONS } from '@/lib/survey'

export default function EditSurveyItemPage({ params }) {
  // params is a promise in Next 16; `use` unwraps it in a Client Component.
  const { id } = use(params)

  const [item, setItem] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getRow('survey_items', id)
      .then(setItem)
      .catch((err) => setError(err.message ?? 'Could not load'))
  }, [id])

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!item) return <p className="text-sm opacity-60">Loading…</p>

  return <Editor item={item} onChange={setItem} />
}

function Editor({ item, onChange }) {
  function set(field, value) {
    onChange({ ...item, [field]: value })
  }

  return (
    <EditorShell
      title="Edit item"
      table="survey_items"
      id={item.id}
      backHref="/admin/survey/items"
      onSave={() =>
        saveRow('survey_items', item.id, {
          title: item.title.trim(),
          admin_note: item.admin_note?.trim() || null,
          confirmed_owner: item.confirmed_owner || null,
          is_active: item.is_active,
          sort_order: Number(item.sort_order) || 0,
          photos: item.photos ?? [],
        })
      }
    >
      <TextField
        label="What is it?"
        value={item.title ?? ''}
        onChange={(event) => set('title', event.target.value)}
        required
      />

      <PhotoUploader
        bucket="survey-images"
        photos={item.photos ?? []}
        onChange={(photos) => set('photos', photos)}
      />

      <TextField
        label="Order"
        type="number"
        value={item.sort_order ?? 0}
        onChange={(event) => set('sort_order', event.target.value)}
        hint="Lower numbers come first in the survey."
      />

      <CheckField
        label="Show in the survey"
        checked={Boolean(item.is_active)}
        onChange={(event) => set('is_active', event.target.checked)}
        hint="Unticking hides it from everyone answering. Answers already given are kept."
      />

      <TextArea
        label="Note to yourself"
        rows={2}
        value={item.admin_note ?? ''}
        onChange={(event) => set('admin_note', event.target.value)}
        hint="Never shown to anyone answering."
      />

      {/*
        Cory's conclusion, not a survey answer. It is deliberately never sent
        to a respondent's browser — showing people what he has already decided
        would lead the witness, and the answers would stop being independent.
      */}
      <SelectField
        label="Confirmed owner"
        value={item.confirmed_owner ?? ''}
        onChange={(event) => set('confirmed_owner', event.target.value)}
        hint="Your own record once you're satisfied. Never shown to anyone answering."
      >
        <option value="">Not settled yet</option>
        {OWNER_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </SelectField>
    </EditorShell>
  )
}
