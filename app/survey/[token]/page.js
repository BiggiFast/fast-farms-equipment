import Link from 'next/link'
import { headers } from 'next/headers'
import { openSurvey, getProgress, clientIp } from '@/lib/surveyApi'

// No route caching config needed: headers() below reads the request, which
// makes this page dynamic on its own. A cached survey page would be a cached
// credential.

// Shown for an unknown token, a revoked one, and a mistyped one — deliberately
// the SAME message for all three. Telling someone "this link was revoked"
// confirms they hold a real person's link, and telling them "no such link"
// confirms the opposite. Neither is anyone's business but Cory's.
function LinkNotActive() {
  return (
    <div className="survey-shell survey-centered">
      <h1>This link isn&apos;t active</h1>
      <p>Check with Cory for a current one.</p>
    </div>
  )
}

export default async function SurveyConfirmPage({ params }) {
  const { token } = await params

  const headerList = await headers()
  const ip = clientIp(headerList)
  const userAgent = headerList.get('user-agent')

  const person = await openSurvey(token, { ip, userAgent })
  if (!person) return <LinkNotActive />

  // Only worth fetching once we know the link is good.
  const progress = await getProgress(token)
  const started = progress && progress.answered > 0

  return (
    <div className="survey-shell survey-centered">
      {/*
        THE FORWARDING CHECK, and the only reason this screen exists.
        Someone handed a link that isn't theirs sees a name that isn't theirs.
        It stops an honest person; it is not meant to stop a determined one —
        that is what the access log and the kill switch are for.
      */}
      <p className="survey-eyebrow">You&apos;re answering as</p>
      <h1 className="survey-name">{person.name}</h1>

      {started && (
        <p className="survey-progress-note">
          You&apos;ve answered {progress.answered} of {progress.total} so far.
        </p>
      )}

      <Link href={`/survey/${token}/items`} className="survey-button">
        {started ? 'Pick up where I left off' : "That's me — start"}
      </Link>

      <p className="survey-fineprint">
        Not you? Please don&apos;t continue — text Cory and he&apos;ll send you
        your own link.
      </p>
    </div>
  )
}
