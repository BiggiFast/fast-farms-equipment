// Turning answers into a conclusion — and the CSVs that outlive the website.
//
// Pure functions only: give them rows, they give back numbers. Nothing here
// touches the database or the DOM, which is what makes the consensus rules
// below something you can reason about rather than trust.

import { UNSURE } from '@/lib/survey'

/* ------------------------------------------------------------- CONSENSUS */

// What the group thinks, given every CURRENT answer for one item.
//
// THE RULE THAT MATTERS: "Not sure" never wins.
//
// It is a real answer and it is counted and reported — but if it could win,
// the consensus would come out "Not sure" on exactly the items where nobody
// remembers, which are the ones most needing a phone call. So the winner is
// chosen from the named people only, and the unsure count is reported beside
// it: "Doug (2 of 4, 1 unsure)".
//
// kind is one of:
//   unanswered   — nobody has said anything yet
//   nobody-knows — everyone who answered said "Not sure"
//   tied         — two or more names level at the top
//   unanimous    — everyone who answered gave the same name
//   majority     — a clear winner, but not everyone agreed
//
// `tied` and `nobody-knows` are the two worth chasing up in person.
export function consensusOf(answers) {
  const given = answers.filter(Boolean)
  const unsure = given.filter((a) => a === UNSURE).length
  const named = given.filter((a) => a !== UNSURE)

  if (given.length === 0) {
    return { kind: 'unanswered', winner: null, count: 0, total: 0, unsure: 0 }
  }

  if (named.length === 0) {
    return {
      kind: 'nobody-knows',
      winner: null,
      count: 0,
      total: given.length,
      unsure,
    }
  }

  const tally = new Map()
  for (const name of named) tally.set(name, (tally.get(name) ?? 0) + 1)

  const top = Math.max(...tally.values())
  const leaders = [...tally.entries()].filter(([, n]) => n === top)

  if (leaders.length > 1) {
    return {
      kind: 'tied',
      winner: leaders.map(([name]) => name).sort().join(' / '),
      count: top,
      total: given.length,
      unsure,
    }
  }

  const [winner] = leaders[0]
  return {
    // Unanimous only if literally everyone who answered said this name — an
    // item where one person said "Not sure" is a majority, not agreement.
    kind: top === given.length ? 'unanimous' : 'majority',
    winner,
    count: top,
    total: given.length,
    unsure,
  }
}

export function describeConsensus(consensus) {
  switch (consensus.kind) {
    case 'unanswered':
      return 'No answers yet'
    case 'nobody-knows':
      return `Nobody knows (${consensus.unsure} unsure)`
    default: {
      const base = `${consensus.winner} (${consensus.count} of ${consensus.total}`
      return consensus.unsure > 0
        ? `${base}, ${consensus.unsure} unsure)`
        : `${base})`
    }
  }
}

/* ---------------------------------------------------------------- MATRIX */

// Fold items, people and every answer ever given into one grid.
//
// Each cell carries the current answer AND the full history for that person
// and item, so a changed answer can be flagged and opened without going back
// to the database.
export function buildMatrix({ items, people, responses }) {
  // Newest first, so the first row seen for a pair is the current one.
  const sorted = [...responses].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )

  const byPair = new Map()
  for (const row of sorted) {
    const key = `${row.item_id}|${row.respondent_id}`
    if (!byPair.has(key)) byPair.set(key, [])
    byPair.get(key).push(row)
  }

  const rows = items.map((item) => {
    const cells = people.map((person) => {
      const history = byPair.get(`${item.id}|${person.id}`) ?? []
      const current = history[0] ?? null

      return {
        person,
        current,
        history,
        // More than one row for this pair means they changed their mind, and
        // that is a thing to surface rather than smooth over.
        changed: history.length > 1,
      }
    })

    const consensus = consensusOf(cells.map((cell) => cell.current?.owner ?? null))

    return {
      item,
      cells,
      consensus,
      anyChanged: cells.some((cell) => cell.changed),
      answeredCount: cells.filter((cell) => cell.current).length,
    }
  })

  return rows
}

/* ------------------------------------------------------------------- CSV */

// Every field quoted, every embedded quote doubled. Notes will contain commas
// and line breaks — a memory about a tractor is not a tidy value — and an
// unquoted CSV turns one of those into a shifted column nobody notices.
function csvCell(value) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(rows) {
  // The BOM is what stops Excel reading "Käley" as "KÃ¤ley". Numbers and
  // Google Sheets don't need it; Excel does, and Excel is what gets used.
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

// THE SUMMARY. One row per item: where each person landed, what the group
// thinks, and what Cory concluded.
export function currentAnswersCsv({ matrix, people }) {
  const header = [
    'Item',
    ...people.flatMap((person) => [person.name, `${person.name} — note`]),
    'Consensus',
    'Unsure count',
    'Answered',
    'Confirmed owner',
    'Any answer changed',
  ]

  const rows = matrix.map((row) => [
    row.item.title,
    ...row.cells.flatMap((cell) => [
      cell.current?.owner ?? '',
      cell.current?.note ?? '',
    ]),
    describeConsensus(row.consensus),
    row.consensus.unsure,
    `${row.answeredCount} of ${people.length}`,
    row.item.confirmed_owner ?? '',
    row.anyChanged ? 'YES' : '',
  ])

  return toCsv([header, ...rows])
}

// THE AUDIT TRAIL. One row per answer ever given, superseded ones included.
//
// This is the file that answers the question if the record is ever disputed —
// who said what, when, and from where. Keep it even after the survey is gone.
export function historyCsv({ matrix }) {
  const header = [
    'Item',
    'Person',
    'Answered',
    'Note',
    'Standing',
    'When',
    'IP address',
  ]

  const rows = []
  for (const row of matrix) {
    for (const cell of row.cells) {
      cell.history.forEach((answer, index) => {
        rows.push([
          row.item.title,
          cell.person.name,
          answer.owner,
          answer.note ?? '',
          // history is newest-first, so index 0 is what they say now.
          index === 0 ? 'current answer' : 'superseded',
          new Date(answer.created_at).toLocaleString(),
          answer.ip ?? '',
        ])
      })
    }
  }

  return toCsv([header, ...rows])
}
