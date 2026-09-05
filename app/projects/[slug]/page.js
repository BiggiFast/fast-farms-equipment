import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProject } from '@/lib/queries'
import { mainPhoto } from '@/lib/photos'

export const revalidate = 60

// Gives a shared link this project's own title and photo, rather than the
// generic site title.
export async function generateMetadata({ params }) {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project) return { title: 'Not found' }

  const photo = mainPhoto(project)
  return {
    title: project.title,
    description: project.summary ?? undefined,
    openGraph: {
      title: project.title,
      description: project.summary ?? undefined,
      images: photo ? [photo] : undefined,
    },
  }
}

export default async function ProjectPage({ params }) {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project) notFound()

  const photo = mainPhoto(project)

  return (
    <>
      <section className="page-hero">
        <span className="status-pill">{project.status}</span>
        <h1>{project.title}</h1>
        {project.summary && <p>{project.summary}</p>}
      </section>

      <article className="page-content">
        <Link href="/projects" className="back-link">
          &larr; All projects
        </Link>

        {photo && (
          <div className="framed-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={project.title} />
          </div>
        )}

        {project.body && <p style={{ whiteSpace: 'pre-wrap' }}>{project.body}</p>}

        <h1 style={{ marginTop: 'var(--space-2xl)' }}>
          Updates ({project.updates.length})
        </h1>

        {project.updates.length === 0 ? (
          <p className="empty-state">No updates posted yet.</p>
        ) : (
          project.updates.map((update) => {
            const updatePhoto = mainPhoto(update)
            return (
              <article key={update.id} className="feed-item">
                {update.published_at && (
                  <time dateTime={update.published_at} className="feed-date">
                    {new Date(update.published_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                )}
                {update.title && <h2>{update.title}</h2>}
                {updatePhoto && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={updatePhoto}
                    alt={update.title ?? 'Update photo'}
                    loading="lazy"
                  />
                )}
                {update.body && (
                  <p style={{ whiteSpace: 'pre-wrap' }}>{update.body}</p>
                )}
              </article>
            )
          })
        )}
      </article>
    </>
  )
}
