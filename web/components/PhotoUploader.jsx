'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resizeImage } from '@/lib/resizeImage'

// Shared by every admin form. Holds an array of
//   { url, is_main, sort_order }
// which is exactly the shape stored in the `photos` jsonb column.
export default function PhotoUploader({ bucket, photos, onChange, max = 10 }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleFiles(event) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = '' // let the same file be picked again later
    if (files.length === 0) return

    if (photos.length + files.length > max) {
      setError(`Up to ${max} photos. You have ${photos.length}.`)
      return
    }

    setBusy(true)
    setError(null)
    const supabase = createClient()
    const uploaded = []

    try {
      for (const file of files) {
        const blob = await resizeImage(file)
        // Timestamp + random suffix so two photos taken in the same second
        // can't overwrite each other
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(name, blob, { contentType: 'image/jpeg' })

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(name)

        uploaded.push({ url: publicUrl, is_main: false, sort_order: 0 })
      }

      const next = [...photos, ...uploaded].map((p, i) => ({
        ...p,
        sort_order: i,
      }))
      // Nothing marked main yet? First photo becomes the cover.
      if (!next.some((p) => p.is_main) && next.length > 0) next[0].is_main = true

      onChange(next)
    } catch (err) {
      setError(err.message ?? 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  function setMain(index) {
    onChange(photos.map((p, i) => ({ ...p, is_main: i === index })))
  }

  function remove(index) {
    const next = photos
      .filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, sort_order: i }))
    if (!next.some((p) => p.is_main) && next.length > 0) next[0].is_main = true
    onChange(next)
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded border px-4 py-3 text-sm disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Add photos'}
        </button>
        <span className="text-xs opacity-60">
          {photos.length}/{max}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        // accept + multiple gives the phone its camera / camera-roll picker
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, i) => (
            <li key={photo.url} className="border rounded overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                className="w-full aspect-square object-cover"
              />
              <div className="p-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setMain(i)}
                  className={photo.is_main ? 'font-semibold' : 'underline'}
                >
                  {photo.is_main ? '★ Cover' : 'Make cover'}
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="underline opacity-70"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
