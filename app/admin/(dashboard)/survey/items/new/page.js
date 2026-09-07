'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TextField, TextArea } from '@/components/Field'
import PhotoUploader from '@/components/PhotoUploader'
import { saveRow } from '@/lib/adminApi'
import { listEquipmentForPicker, addItemsFromEquipment } from '@/lib/surveyAdmin'
import { mainPhoto } from '@/lib/photos'

// Two ways to add something to the survey, because they're genuinely
// different jobs: photographing a machine in a shed, and pulling in one that
// already has a listing on the site.
export default function NewSurveyItemPage() {
  const router = useRouter()
  const [mode, setMode] = useState('photo')

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Add to the survey</h1>
        <Link href="/admin/survey/items" className="text-sm underline">
          Cancel
        </Link>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('photo')}
          className={`flex-1 rounded border px-3 py-3 text-sm ${mode === 'photo' ? 'font-semibold' : 'opacity-60'}`}
        >
          Photograph it
        </button>
        <button
          type="button"
          onClick={() => setMode('equipment')}
          className={`flex-1 rounded border px-3 py-3 text-sm ${mode === 'equipment' ? 'font-semibold' : 'opacity-60'}`}
        >
          From a listing
        </button>
      </div>

      {mode === 'photo' ? (
        <PhotoItemForm router={router} />
      ) : (
        <EquipmentPicker router={router} />
      )}
    </div>
  )
}

function PhotoItemForm({ router }) {
  const [title, setTitle] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [photos, setPhotos] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await saveRow('survey_items', null, {
        title: title.trim(),
        admin_note: adminNote.trim() || null,
        source: 'upload',
        photos,
      })
      router.push('/admin/survey/items')
      router.refresh()
    } catch (err) {
      setError(err.message ?? 'Could not save')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <TextField
        label="What is it?"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Red disc harrow, north shed"
        hint="How family will recognise it. Where it sits often helps more than what it's called."
        required
      />

      {/* Its own bucket, so cleaning up after the survey is deleting one
          bucket rather than picking survey photos out of the site's. */}
      <PhotoUploader bucket="survey-images" photos={photos} onChange={setPhotos} />

      <TextArea
        label="Note to yourself"
        rows={2}
        value={adminNote}
        onChange={(event) => setAdminNote(event.target.value)}
        hint="Never shown to anyone answering. Yours alone."
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="w-full rounded border px-4 py-3 font-medium disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Add to survey'}
      </button>
    </form>
  )
}

function EquipmentPicker({ router }) {
  const [rows, setRows] = useState(null)
  const [chosen, setChosen] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    listEquipmentForPicker()
      .then(setRows)
      .catch((err) => setError(err.message ?? 'Could not load listings'))
  }, [])

  function toggle(id) {
    setChosen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function add() {
    setBusy(true)
    setError(null)
    try {
      await addItemsFromEquipment(rows.filter((row) => chosen.has(row.id)))
      router.push('/admin/survey/items')
      router.refresh()
    } catch (err) {
      setError(err.message ?? 'Could not add')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm opacity-70">
        Pick from your live listings. The photos come across, though the files
        stay in the equipment bucket — if you delete a listing&apos;s photos
        later, the survey item loses its pictures but keeps its answers.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!rows && !error && <p className="text-sm opacity-60">Loading…</p>}
      {rows?.length === 0 && <p className="text-sm opacity-60">No live listings.</p>}

      <ul className="divide-y">
        {rows?.map((row) => (
          <li key={row.id} className="py-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={chosen.has(row.id)}
                disabled={row.alreadyAdded}
                onChange={() => toggle(row.id)}
                className="h-5 w-5 flex-shrink-0"
              />
              {mainPhoto(row) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={mainPhoto(row)}
                  alt=""
                  className="h-12 w-12 rounded border object-cover"
                />
              ) : (
                <span className="h-12 w-12 rounded border" />
              )}
              <span className="min-w-0 flex-1 text-sm">
                {row.name}
                {row.alreadyAdded && (
                  <span className="block text-xs opacity-60">already in the survey</span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={add}
        disabled={busy || chosen.size === 0}
        className="w-full rounded border px-4 py-3 font-medium disabled:opacity-50"
      >
        {busy ? 'Adding…' : `Add ${chosen.size || ''} to survey`}
      </button>
    </div>
  )
}
