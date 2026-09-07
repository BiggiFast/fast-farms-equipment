'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadResults, setConfirmedOwner } from '@/lib/surveyAdmin'
import {
  buildMatrix,
  describeConsensus,
  currentAnswersCsv,
  historyCsv,
} from '@/lib/surveyResults'
import { OWNER_OPTIONS } from '@/lib/survey'
import { mainPhoto } from '@/lib/photos'

// THE PAYOFF. Everything before this was collecting; this is the answer.

const FILTERS = [
  { key: 'all', label: 'Everything' },
  { key: 'disputed', label: 'Disagreed' },
  { key: 'nobody-knows', label: 'Nobody knows' },
  { key: 'unanswered', label: 'Unanswered' },
  { key: 'changed', label: 'Changed answers' },
  { key: 'unconfirmed', label: 'Not yet confirmed' },
]

// Tied and nobody-knows are the two that need a phone call, so they are the
// two that look different at a glance.
const TONE = {
  unanimous: 'text-green-700',
  majority: 'text-green-800',
  tied: 'text-amber-700 font-semibold',
  'nobody-knows': 'text-amber-700 font-semibold',
  unanswered: 'opacity-50',
}

function download(filename, text) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/csv;charset=utf-8' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function SurveyResultsPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)

  const refresh = useCallback(
    () =>
      loadResults().then(
        (loaded) => {
          setData(loaded)
          setError(null)
        },
        (err) => setError(err.message ?? 'Could not load')
      ),
    []
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  const matrix = useMemo(
    () => (data ? buildMatrix(data) : []),
    [data]
  )

  const visible = useMemo(() => {
    switch (filter) {
      case 'disputed':
        return matrix.filter((row) => row.consensus.kind === 'tied')
      case 'nobody-knows':
        return matrix.filter((row) => row.consensus.kind === 'nobody-knows')
      case 'unanswered':
        return matrix.filter((row) => row.consensus.kind === 'unanswered')
      case 'changed':
        return matrix.filter((row) => row.anyChanged)
      case 'unconfirmed':
        return matrix.filter((row) => !row.item.confirmed_owner)
      default:
        return matrix
    }
  }, [matrix, filter])

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <p className="text-sm opacity-60">Loading…</p>

  const { people } = data

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Survey — Results</h1>
        <Link href="/admin/survey" className="rounded border px-3 py-2 text-sm">
          ← People
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            download('equipment-survey.csv', currentAnswersCsv({ matrix, people }))
          }
          className="rounded border px-3 py-2 text-sm"
        >
          Export answers
        </button>
        <button
          type="button"
          onClick={() =>
            download('equipment-survey-history.csv', historyCsv({ matrix }))
          }
          className="rounded border px-3 py-2 text-sm"
        >
          Export full history
        </button>
      </div>

      <p className="text-xs opacity-60">
        The history file has every answer anyone ever gave, superseded ones
        included, with times. If the record is ever questioned, that&apos;s the
        file that answers it — keep a copy somewhere outside this website.
      </p>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={`rounded border px-3 py-2 text-xs ${
              filter === option.key ? 'font-semibold' : 'opacity-60'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {people.length === 0 && (
        <p className="text-sm opacity-60">Nobody has been added yet.</p>
      )}
      {visible.length === 0 && people.length > 0 && (
        <p className="text-sm opacity-60">Nothing matches that filter.</p>
      )}

      {/*
        The matrix gets wide — one column per person. It scrolls sideways
        INSIDE this box; the page itself never does. A page that slides left
        and right on a phone feels broken.
      */}
      {visible.length > 0 && (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-paper-warm text-left">
                <th className="sticky left-0 z-10 bg-paper-warm px-3 py-2 font-medium">
                  Item
                </th>
                {people.map((person) => (
                  <th key={person.id} className="whitespace-nowrap px-3 py-2 font-medium">
                    {person.name}
                    {!person.is_active && (
                      <span className="block text-xs font-normal opacity-60">
                        revoked
                      </span>
                    )}
                    {person.is_active && person.is_frozen && (
                      <span className="block text-xs font-normal opacity-60">
                        frozen
                      </span>
                    )}
                  </th>
                ))}
                <th className="whitespace-nowrap px-3 py-2 font-medium">
                  Consensus
                </th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">
                  Confirmed
                </th>
              </tr>
            </thead>

            <tbody>
              {visible.map((row) => (
                <tr key={row.item.id} className="border-b align-top">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-paper px-3 py-2 text-left font-normal"
                  >
                    <span className="flex items-center gap-2">
                      {mainPhoto(row.item) && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={mainPhoto(row.item)}
                          alt=""
                          className="h-8 w-8 flex-shrink-0 rounded border object-cover"
                        />
                      )}
                      <span className="min-w-[10rem]">
                        {row.item.title}
                        {!row.item.is_active && (
                          <span className="block text-xs opacity-60">hidden</span>
                        )}
                      </span>
                    </span>
                  </th>

                  {row.cells.map((cell) => {
                    const key = `${row.item.id}|${cell.person.id}`
                    return (
                      <td key={cell.person.id} className="px-3 py-2">
                        {cell.current ? (
                          <button
                            type="button"
                            onClick={() => setOpen(open === key ? null : key)}
                            className="text-left"
                          >
                            <span
                              className={
                                cell.changed ? 'underline decoration-amber-600' : ''
                              }
                            >
                              {cell.current.owner}
                            </span>
                            {/* A note and a changed answer both get a mark,
                                because both mean "there is more here". */}
                            {cell.current.note && <span title="has a note"> 📝</span>}
                            {cell.changed && (
                              <span className="text-amber-700" title="changed their answer">
                                {' '}
                                ↻
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="opacity-30">—</span>
                        )}

                        {open === key && (
                          <div className="mt-2 w-56 rounded border bg-paper-warm p-2 text-xs">
                            {cell.history.map((answer, i) => (
                              <div key={answer.id} className={i > 0 ? 'mt-2 opacity-70' : ''}>
                                <div className="font-medium">
                                  {answer.owner}
                                  {i === 0 ? '' : ' (superseded)'}
                                </div>
                                <div className="opacity-70">
                                  {new Date(answer.created_at).toLocaleString()}
                                </div>
                                {answer.note && (
                                  <p className="mt-1 whitespace-pre-wrap">{answer.note}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}

                  <td className={`whitespace-nowrap px-3 py-2 ${TONE[row.consensus.kind] ?? ''}`}>
                    {describeConsensus(row.consensus)}
                  </td>

                  <td className="px-3 py-2">
                    <select
                      value={row.item.confirmed_owner ?? ''}
                      onChange={(event) => {
                        const owner = event.target.value
                        setConfirmedOwner(row.item.id, owner)
                          .then(refresh)
                          .catch((err) => setError(err.message ?? 'Could not save'))
                      }}
                      className="rounded border px-2 py-1 text-sm"
                    >
                      <option value="">—</option>
                      {OWNER_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
