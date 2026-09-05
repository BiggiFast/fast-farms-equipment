'use client'

import { useEffect, useState } from 'react'
import EditorShell from '@/components/EditorShell'
import PhotoUploader from '@/components/PhotoUploader'
import { TextField, TextArea, CheckField } from '@/components/Field'
import { getRow, saveRow } from '@/lib/adminApi'
import { slugify } from '@/lib/slug'

const EMPTY = {
  name: '',
  slug: '',
  category: '',
  price: '',
  description: '',
  photos: [],
  is_active: true,
}

export default function EquipmentEditor({ id }) {
  const isNew = !id
  const [form, setForm] = useState(isNew ? EMPTY : null)
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (isNew) return
    getRow('equipment', id)
      .then((row) =>
        setForm(
          row
            ? {
                ...EMPTY,
                ...row,
                photos: row.photos ?? [],
                price: row.price ?? '',
                category: row.category ?? '',
                description: row.description ?? '',
              }
            : null
        )
      )
      .catch((err) => setLoadError(err.message))
  }, [id, isNew])

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleName(value) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }))
  }

  async function handleSave() {
    await saveRow('equipment', id, {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      category: form.category?.trim() || null,
      price: form.price === '' ? null : Number(form.price),
      description: form.description?.trim() || null,
      photos: form.photos,
      is_active: form.is_active,
    })
  }

  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>
  if (!form) return <p className="text-sm opacity-60">Loading…</p>

  return (
    <EditorShell
      title={isNew ? 'New listing' : 'Edit listing'}
      table="equipment"
      id={id}
      onSave={handleSave}
      backHref="/admin/equipment"
    >
      <TextField
        label="Name"
        value={form.name}
        onChange={(e) => handleName(e.target.value)}
        required
        hint="Year + make + model gets found in search. “tractor” doesn't."
      />

      <TextField
        label="URL"
        value={form.slug}
        onChange={(e) => {
          setSlugTouched(true)
          set('slug', slugify(e.target.value))
        }}
        required
        hint={`www.mrcoryfast.com/equipment/${form.slug || '…'}`}
      />

      <TextField
        label="Category"
        value={form.category}
        onChange={(e) => set('category', e.target.value)}
        hint="e.g. tractor, truck, implement — groups the listings page."
      />

      <TextField
        label="Price"
        type="number"
        inputMode="decimal"
        step="0.01"
        value={form.price}
        onChange={(e) => set('price', e.target.value)}
        hint="Leave blank to show “Call for price”."
      />

      <TextArea
        label="Description"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
      />

      <div>
        <span className="block text-sm mb-2">Photos</span>
        <PhotoUploader
          bucket="equipment-images"
          photos={form.photos}
          onChange={(photos) => set('photos', photos)}
        />
      </div>

      <CheckField
        label="Listed for sale"
        checked={form.is_active}
        onChange={(e) => set('is_active', e.target.checked)}
        hint="Uncheck to hide it without deleting — e.g. sale pending."
      />
    </EditorShell>
  )
}
