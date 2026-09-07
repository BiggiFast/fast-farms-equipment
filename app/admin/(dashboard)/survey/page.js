'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  listRespondents,
  addRespondent,
  updateRespondents,
  regenerateTokens,
  deleteRespondent,
} from '@/lib/surveyAdmin'

// THE REVOCATION CONSOLE.
//
// This screen has one job that matters more than the others: when Cory finds
// out a link got passed around, he is probably standing in a field holding a
// phone, and he needs to kill it in seconds. Everything else on this page is
// arranged around not getting in the way of that.

function timeAgo(iso) {
  if (!iso) return 'never'
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function statusOf(person) {
  if (!person.is_active) return { label: 'Revoked', tone: 'text-red-700' }
  if (person.is_frozen) return { label: 'Frozen', tone: 'text-amber-700' }
  return { label: 'Active', tone: 'text-green-700' }
}

export default function SurveyPeoplePage() {
  const [people, setPeople] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [expanded, setExpanded] = useState(null)
  const [newName, setNewName] = useState('')
  const [copied, setCopied] = useState(null)

  // The state updates live in callbacks rather than straight in the effect
  // body — the same shape AdminList uses, and what React's lint rule wants.
  const refresh = useCallback(
    () =>
      listRespondents().then(
        (rows) => {
          setPeople(rows)
          setError(null)
        },
        (err) => setError(err.message ?? 'Could not load')
      ),
    []
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  // Every action funnels through here so that one place handles the busy
  // state, the error, and the reload. A half-applied bulk revoke that left the
  // screen showing stale rows would be genuinely dangerous.
  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await refresh()
      setSelected(new Set())
    } catch (err) {
      setError(err.message ?? 'That did not work')
    } finally {
      setBusy(false)
    }
  }

  function toggle(id) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function copyLink(person) {
    const url = `${window.location.origin}/survey/${person.token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(person.id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Clipboard access can be refused. Falling back to a prompt means the
      // link is still gettable rather than the button just doing nothing.
      window.prompt('Copy this link:', url)
    }
  }

  const ids = [...selected]
  const anySelected = ids.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Survey — People</h1>
        <div className="flex gap-2">
          <Link href="/admin/survey/items" className="rounded border px-3 py-2 text-sm">
            Items
          </Link>
          <Link href="/admin/survey/results" className="rounded border px-3 py-2 text-sm">
            Results
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Add someone */}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const name = newName.trim()
          if (!name) return
          run(async () => {
            await addRespondent(name)
            setNewName('')
          })
        }}
        className="flex gap-2"
      >
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Add a person — e.g. Kaley Fast"
          className="flex-1 rounded border px-3 py-2 text-base"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="rounded border px-4 py-2 text-sm disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {/* Bulk actions. Sticky, because the whole point is reaching Revoke
          without scrolling back up a long list on a phone. */}
      {anySelected && (
        <div className="sticky top-0 z-10 space-y-2 border-y bg-paper py-3">
          <p className="text-xs opacity-70">{ids.length} selected</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => updateRespondents(ids, { is_active: false }))}
              className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
            >
              Revoke
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => updateRespondents(ids, { is_active: true }))}
              className="rounded border px-3 py-2 text-sm disabled:opacity-50"
            >
              Reactivate
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!confirm('New links for the selected people. Their old links stop working immediately. Answers are kept.')) return
                run(() => regenerateTokens(ids))
              }}
              className="rounded border px-3 py-2 text-sm disabled:opacity-50"
            >
              Regenerate link
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => updateRespondents(ids, { is_frozen: true }))}
              className="rounded border px-3 py-2 text-sm disabled:opacity-50"
            >
              Freeze
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => updateRespondents(ids, { is_frozen: false }))}
              className="rounded border px-3 py-2 text-sm disabled:opacity-50"
            >
              Unfreeze
            </button>
          </div>
        </div>
      )}

      {!people && !error && <p className="text-sm opacity-60">Loading…</p>}
      {people?.length === 0 && (
        <p className="text-sm opacity-60">
          Nobody yet. Add a person above, then send them their link.
        </p>
      )}

      <ul className="divide-y">
        {people?.map((person) => {
          const status = statusOf(person)
          // One phone on wifi and then on cellular is genuinely two. Three or
          // more is the pattern worth a second look — not proof of anything,
          // but the thing you would want to notice.
          const manyDevices = person.deviceCount > 2

          return (
            <li key={person.id} className="py-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(person.id)}
                  onChange={() => toggle(person.id)}
                  className="mt-1 h-5 w-5 flex-shrink-0"
                  aria-label={`Select ${person.name}`}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{person.name}</span>
                    <span className={`text-xs ${status.tone}`}>{status.label}</span>
                  </div>

                  <div className="mt-1 text-xs opacity-70">
                    {person.answerCount} answered · seen {timeAgo(person.lastSeen)} ·{' '}
                    <span className={manyDevices ? 'font-semibold text-amber-700' : ''}>
                      {person.deviceCount} device{person.deviceCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  {manyDevices && (
                    <p className="mt-1 text-xs text-amber-700">
                      More devices than one person usually has. Worth checking
                      before this link collects any more answers.
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => copyLink(person)}
                      className="underline"
                    >
                      {copied === person.id ? 'Copied ✓' : 'Copy link'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded(expanded === person.id ? null : person.id)
                      }
                      className="underline opacity-70"
                    >
                      {expanded === person.id ? 'Hide visits' : `Visits (${person.visitCount})`}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const name = window.prompt('Rename to:', person.name)
                        if (!name?.trim()) return
                        run(() => updateRespondents([person.id], { name: name.trim() }))
                      }}
                      className="underline opacity-70"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          !confirm(
                            `Delete ${person.name}? Their ${person.answerCount} answers and their visit history are deleted too, permanently.\n\nRevoke is usually what you want — it kills the link and keeps the record.`
                          )
                        )
                          return
                        run(() => deleteRespondent(person.id))
                      }}
                      className="underline opacity-70"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Access history: every visit, with when and from where. */}
                  {expanded === person.id && (
                    <div className="mt-3 rounded border bg-paper-warm p-2">
                      {person.visits.length === 0 ? (
                        <p className="text-xs opacity-60">
                          Never opened. They may not have got the text.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {person.visits.slice(0, 40).map((visit, i) => (
                            <li key={i} className="text-xs">
                              <div className="opacity-80">
                                {new Date(visit.occurred_at).toLocaleString()} ·{' '}
                                {visit.ip ?? 'address unknown'}
                              </div>
                              <div className="truncate opacity-50">
                                {visit.user_agent ?? 'device unknown'}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
