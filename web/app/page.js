import Link from 'next/link'
import { getFeed } from '@/lib/queries'
import { mainPhoto } from '@/lib/photos'

// The feed refreshes at most once a minute. Posting from your phone shows up
// within a minute without any rebuild or deploy.
export const revalidate = 60

export default async function HomePage() {
  const updates = await getFeed()

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Latest</h1>

      {updates.length === 0 && (
        <p className="text-sm opacity-70">
          Nothing posted yet. Add your first update from the admin.
        </p>
      )}

      <ul className="space-y-8">
        {updates.map((update) => {
          const photo = mainPhoto(update)
          return (
            <li key={update.id} className="border-b pb-6">
              {update.project && (
                <Link
                  href={`/projects/${update.project.slug}`}
                  className="text-xs uppercase tracking-wide opacity-70"
                >
                  {update.project.title}
                </Link>
              )}

              {update.title && (
                <h2 className="text-lg font-medium mt-1">{update.title}</h2>
              )}

              {update.published_at && (
                <time
                  dateTime={update.published_at}
                  className="block text-xs opacity-60 mt-1"
                >
                  {new Date(update.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              )}

              {photo && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photo}
                  alt={update.title ?? 'Update photo'}
                  className="mt-3 w-full rounded"
                />
              )}

              {update.body && (
                <p className="mt-3 whitespace-pre-wrap">{update.body}</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
