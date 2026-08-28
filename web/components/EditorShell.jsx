'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { softDelete } from '@/lib/adminApi'

// Wraps every editor form: handles the save/delete buttons, busy state,
// and error display so the three editors don't each reinvent it.
export default function EditorShell({
  title,
  table,
  id,
  onSave,
  backHref,
  children,
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSave()
      router.push(backHref)
      router.refresh()
    } catch (err) {
      setError(err.message ?? 'Could not save')
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this? It can be restored from the database later.'))
      return
    setBusy(true)
    setError(null)
    try {
      await softDelete(table, id)
      router.push(backHref)
      router.refresh()
    } catch (err) {
      setError(err.message ?? 'Could not delete')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <h1 className="text-xl font-semibold">{title}</h1>

      {children}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Sticks to the bottom of the screen so Save is always reachable
          without scrolling to the end of a long form on a phone. */}
      <div className="sticky bottom-0 -mx-4 border-t bg-paper px-4 py-3 flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded border px-4 py-3 font-medium disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        {id && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="rounded border px-4 py-3 text-sm opacity-70 disabled:opacity-40"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
