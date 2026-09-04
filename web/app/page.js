import Link from 'next/link'
import { getFeed } from '@/lib/queries'
import { mainPhoto } from '@/lib/photos'

export const revalidate = 60

export default async function HomePage() {
  const updates = await getFeed()

  return (
    <>
      {/* Same hero as the original site */}
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-railroad.png"
          alt="Oregon farmland at golden hour"
          className="hero-image"
        />
        <div className="hero-overlay" />
      </section>

      {/* The feed appears below the hero once there's something to show.
          Until Cory posts his first update the page looks exactly as it
          always has — no empty section, no "coming soon". */}
      {updates.length > 0 && (
        <div className="page-content">
          <h1>Latest</h1>
          {updates.map((update) => {
            const photo = mainPhoto(update)
            return (
              <article key={update.id} className="feed-item">
                {update.project && (
                  <Link
                    href={`/projects/${update.project.slug}`}
                    className="feed-project-label"
                  >
                    {update.project.title}
                  </Link>
                )}

                {update.title && <h2>{update.title}</h2>}

                {update.published_at && (
                  <time dateTime={update.published_at} className="feed-date">
                    {new Date(update.published_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                )}

                {photo && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={photo} alt={update.title ?? 'Update photo'} />
                )}

                {update.body && (
                  <p style={{ whiteSpace: 'pre-wrap' }}>{update.body}</p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
