import { headers } from 'next/headers'
import { loadSurvey, clientIp } from '@/lib/surveyApi'
import SurveyForm from '@/components/SurveyForm'

// The gate is HERE, in the Server Component, not inside SurveyForm.
//
// That is the whole trick: if the token isn't live, this function returns
// before SurveyForm is ever rendered, so the survey's markup — the items, the
// names, the photos — never reaches the browser at all. Hiding it with CSS or
// an early return inside a Client Component would still ship it in the HTML,
// where anyone can read it with View Source.
export default async function SurveyItemsPage({ params }) {
  const { token } = await params

  const headerList = await headers()
  const ip = clientIp(headerList)
  const userAgent = headerList.get('user-agent')

  const data = await loadSurvey(token, { ip, userAgent })

  if (!data) {
    return (
      <div className="survey-shell survey-centered">
        <h1>This link isn&apos;t active</h1>
        <p>Check with Cory for a current one.</p>
      </div>
    )
  }

  return (
    <SurveyForm
      token={token}
      name={data.name}
      isFrozen={Boolean(data.is_frozen)}
      items={Array.isArray(data.items) ? data.items : []}
    />
  )
}
