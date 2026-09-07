import { appendAnswer, clientIp } from '@/lib/surveyApi'

// The only write the survey performs.
//
// It exists as a route handler for one reason: to capture the real client IP.
// A browser cannot report its own address honestly, and the access trail is
// worth nothing if the person being logged supplies the log entry.
//
// Everything else is checked in the database. The token decides who this is,
// so there is no respondent field to forge; the item must be active; the owner
// must be a real option; a revoked or frozen person is refused. This handler
// deliberately re-implements none of that — two copies of a security rule
// eventually disagree, and the copy that matters is the one nearest the data.
export async function POST(request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    return Response.json(
      { ok: false, reason: 'malformed' },
      { status: 400 }
    )
  }

  const { token, item_id: itemId, owner, note } = body

  if (typeof token !== 'string' || typeof itemId !== 'string' || typeof owner !== 'string') {
    return Response.json({ ok: false, reason: 'malformed' }, { status: 400 })
  }

  const result = await appendAnswer({
    token,
    itemId,
    owner,
    note: typeof note === 'string' ? note : null,
    ip: clientIp(request.headers),
  })

  // A refusal is not an HTTP error — the request was well formed and the
  // answer is "no". 200 with { ok: false, reason } lets the card show a
  // useful message instead of a browser-level failure.
  return Response.json(result ?? { ok: false, reason: 'inactive' })
}
