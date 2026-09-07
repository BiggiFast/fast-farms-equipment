'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { OWNER_OPTIONS, MAX_NOTE_LENGTH } from '@/lib/survey'
import { allPhotos } from '@/lib/photos'

// Long enough that typing a sentence doesn't fire a save per keystroke, short
// enough that a phone dying mid-thought loses almost nothing.
const NOTE_DEBOUNCE_MS = 800

// Per-card save state. Never silent: a failed save has to say so and offer a
// way to try again, because the alternative is somebody carefully recording a
// memory that was quietly dropped.
function SaveState({ state, onRetry }) {
  if (!state) return null
  if (state === 'saving') return <p className="survey-save is-saving">Saving…</p>
  if (state === 'saved') return <p className="survey-save is-saved">Saved</p>

  return (
    <p className="survey-save is-error">
      Didn&apos;t save.{' '}
      <button type="button" className="survey-retry" onClick={onRetry}>
        Try again
      </button>
    </p>
  )
}

export default function SurveyForm({ token, name, isFrozen, items }) {
  const [answers, setAnswers] = useState(() => {
    // Pre-filled from the database, so coming back a week later shows what you
    // already said rather than a blank page.
    const initial = {}
    for (const item of items) {
      initial[item.id] = { owner: item.owner ?? null, note: item.note ?? '' }
    }
    return initial
  })

  const [status, setStatus] = useState({})
  const [zoom, setZoom] = useState(null)

  // Set the instant the database refuses an answer because the link was
  // revoked while this page sat open. See handleRefusal below.
  const [lockedOut, setLockedOut] = useState(false)

  const router = useRouter()

  // Per-card request counter. Tapping three radios quickly can easily return
  // out of order, and the reply that lands last is not necessarily the one
  // sent last — so each save takes a number and only the newest one is allowed
  // to change what the card says.
  const seqRef = useRef({})

  const timersRef = useRef({})
  const pendingNotesRef = useRef(new Set())

  // Kept current so the page-hide flush below can read the latest text without
  // being re-registered on every keystroke.
  const answersRef = useRef(answers)
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  const save = useCallback(
    async (itemId, owner, note, { beacon = false } = {}) => {
      // No owner means there is nothing the database will accept yet — every
      // answer row needs a name on it.
      if (isFrozen || !owner) return

      const body = JSON.stringify({
        token,
        item_id: itemId,
        owner,
        note: note?.trim() ? note : null,
      })

      // The browser is closing. A normal fetch gets cancelled on the way out;
      // sendBeacon is handed to the OS and delivered regardless. No reply comes
      // back, which is fine — there is no longer a card to show it on.
      if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/survey/answer',
          new Blob([body], { type: 'application/json' })
        )
        return
      }

      const seq = (seqRef.current[itemId] ?? 0) + 1
      seqRef.current[itemId] = seq
      setStatus((s) => ({ ...s, [itemId]: 'saving' }))

      try {
        const response = await fetch('/api/survey/answer', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
        })
        const result = await response.json().catch(() => null)

        // A newer save started while this one was in flight. Its answer is the
        // one that counts; this reply is history.
        if (seqRef.current[itemId] !== seq) return

        // REVOKED WHILE THE PAGE WAS OPEN.
        //
        // Nothing they did was recorded — the database refused it — but
        // leaving a working-looking survey in front of someone whose access
        // is gone is its own kind of dishonest. Shut the page immediately,
        // then send them to the confirmation screen, which re-checks with the
        // server and shows the same neutral message a stranger would get.
        if (!result?.ok && result?.reason === 'inactive') {
          setLockedOut(true)
          router.replace(`/survey/${token}`)
          router.refresh()
          return
        }

        // FROZEN mid-session: their answers are locked but they may still
        // read them back. Re-rendering from the server brings back the same
        // page in read-only form, with the banner explaining why.
        if (!result?.ok && result?.reason === 'frozen') {
          router.refresh()
          return
        }

        setStatus((s) => ({ ...s, [itemId]: result?.ok ? 'saved' : 'error' }))
      } catch {
        if (seqRef.current[itemId] !== seq) return
        setStatus((s) => ({ ...s, [itemId]: 'error' }))
      }
    },
    [token, isFrozen, router]
  )

  // Choosing a name saves straight away — no submit button to forget.
  function chooseOwner(itemId, owner) {
    if (isFrozen) return

    const note = answers[itemId]?.note ?? ''
    setAnswers((a) => ({ ...a, [itemId]: { ...a[itemId], owner } }))

    // This save carries the note along, so any note timer waiting to fire is
    // now redundant.
    clearTimeout(timersRef.current[itemId])
    pendingNotesRef.current.delete(itemId)

    save(itemId, owner, note)
  }

  function changeNote(itemId, note) {
    if (isFrozen) return

    setAnswers((a) => ({ ...a, [itemId]: { ...a[itemId], note } }))

    const owner = answers[itemId]?.owner
    if (!owner) return // held locally; the hint under the box explains why

    pendingNotesRef.current.add(itemId)
    clearTimeout(timersRef.current[itemId])
    timersRef.current[itemId] = setTimeout(() => {
      pendingNotesRef.current.delete(itemId)
      save(itemId, owner, note)
    }, NOTE_DEBOUNCE_MS)
  }

  // Blur alone would not be enough — closing a phone browser mid-sentence
  // never fires it — but when it does fire there's no reason to keep waiting.
  function blurNote(itemId) {
    if (isFrozen || !pendingNotesRef.current.has(itemId)) return

    clearTimeout(timersRef.current[itemId])
    pendingNotesRef.current.delete(itemId)

    const { owner, note } = answers[itemId] ?? {}
    if (owner) save(itemId, owner, note)
  }

  // The case blur misses: the tab is closed, or the phone switches apps, with
  // a note still inside the debounce window.
  useEffect(() => {
    function flush() {
      for (const itemId of pendingNotesRef.current) {
        const { owner, note } = answersRef.current[itemId] ?? {}
        if (owner) save(itemId, owner, note, { beacon: true })
      }
      pendingNotesRef.current.clear()
    }

    window.addEventListener('pagehide', flush)
    const timers = timersRef.current

    return () => {
      window.removeEventListener('pagehide', flush)
      for (const timer of Object.values(timers)) clearTimeout(timer)
    }
  }, [save])

  useEffect(() => {
    if (!zoom) return
    function onKey(event) {
      if (event.key === 'Escape') setZoom(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  const answered = items.filter((item) => answers[item.id]?.owner).length
  const allAnswered = items.length > 0 && answered === items.length

  // Shown the moment a save is refused, without waiting for the navigation to
  // finish — on a poor connection that round trip is long enough to keep
  // tapping through. The wording matches the server's exactly, so a revoked
  // person and a stranger see the same thing and neither learns which is which.
  if (lockedOut) {
    return (
      <div className="survey-shell survey-centered">
        <h1>This link isn&apos;t active</h1>
        <p>Check with Cory for a current one.</p>
      </div>
    )
  }

  return (
    <div className="survey-shell">
      <header className="survey-head">
        <p className="survey-eyebrow">Hi {name}</p>
        <h1>Whose was it?</h1>
        <p className="survey-intro">
          For each piece of equipment below, pick who you think originally
          owned it. There are no wrong answers, and{' '}
          <strong>&ldquo;Not sure&rdquo; is genuinely useful</strong> — it says
          where to keep asking rather than pretending it&apos;s settled.
        </p>
        <p className="survey-intro">
          Your answers save by themselves. You can close this and come back.
        </p>
        <Link href={`/survey/${token}`} className="survey-backlink">
          Not {name}?
        </Link>
      </header>

      {isFrozen && (
        <p className="survey-banner">
          Your answers are locked and can&apos;t be changed now. You can still
          read back what you said — text Cory if something needs correcting.
        </p>
      )}

      {items.length === 0 ? (
        <p className="survey-empty">
          There&apos;s nothing to look at yet. Cory will text you when there is.
        </p>
      ) : (
        <p className="survey-progress" aria-live="polite">
          {answered} of {items.length} answered
        </p>
      )}

      {items.map((item, index) => {
        const answer = answers[item.id] ?? { owner: null, note: '' }
        const photos = allPhotos(item)
        const noteWithoutOwner = !answer.owner && answer.note.trim() !== ''

        return (
          <fieldset key={item.id} className="survey-card">
            <legend className="survey-card-title">
              <span className="survey-card-number">{index + 1}</span>
              {item.title}
            </legend>

            <div className="survey-options">
              {OWNER_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`survey-option${
                    answer.owner === option ? ' is-chosen' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name={`item-${item.id}`}
                    value={option}
                    checked={answer.owner === option}
                    disabled={isFrozen}
                    onChange={() => chooseOwner(item.id, option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>

            {photos.length > 0 && (
              <div className="survey-photos">
                {photos.map((url, i) => (
                  <button
                    type="button"
                    key={url}
                    className="survey-photo"
                    onClick={() =>
                      setZoom({
                        url,
                        alt: `${item.title} — photo ${i + 1}`,
                      })
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${item.title} — photo ${i + 1}`}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            <label className="survey-note">
              <span>Anything you remember about it?</span>
              <textarea
                rows={2}
                value={answer.note}
                maxLength={MAX_NOTE_LENGTH}
                placeholder="Optional"
                disabled={isFrozen}
                onChange={(event) => changeNote(item.id, event.target.value)}
                onBlur={() => blurNote(item.id)}
              />
            </label>

            {noteWithoutOwner && (
              <p className="survey-hint">
                Pick a name above and this note saves with it.
              </p>
            )}

            <SaveState
              state={status[item.id]}
              onRetry={() => save(item.id, answer.owner, answer.note)}
            />
          </fieldset>
        )
      })}

      {allAnswered && (
        <p className="survey-done">
          That&apos;s all of them — thank you. This is exactly the kind of thing
          that gets lost otherwise.
        </p>
      )}

      {zoom && (
        <div
          className="survey-zoom"
          role="dialog"
          aria-modal="true"
          aria-label={zoom.alt}
          onClick={() => setZoom(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.url} alt={zoom.alt} />
          <button type="button" className="survey-zoom-close">
            Close
          </button>
        </div>
      )}
    </div>
  )
}
