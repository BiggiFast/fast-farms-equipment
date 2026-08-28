import { notFound } from 'next/navigation'
import { getProject } from '@/lib/queries'
import { mainPhoto } from '@/lib/photos'

export const revalidate = 60

// This is what puts the project's own title and photo on a shared link
// or a search result, instead of the generic site title.
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
    <article>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wide opacity-70">
          {project.status}
        </p>
        <h1 className="text-2xl font-semibold mt-1">{project.title}</h1>
        {project.summary && <p className="mt-2 opacity-80">{project.summary}</p>}
      </header>

      {photo && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={photo} alt={project.title} className="w-full rounded mb-6" />
      )}

      {project.body && (
        <div className="whitespace-pre-wrap mb-10">{project.body}</div>
      )}

      <h2 className="text-xl font-semibold mb-6">
        Updates ({project.updates.length})
      </h2>

      {project.updates.length === 0 ? (
        <p className="text-sm opacity-70">No updates posted yet.</p>
      ) : (
        <ol className="space-y-8">
          {project.updates.map((update) => {
            const updatePhoto = mainPhoto(update)
            return (
              <li key={update.id} className="border-b pb-6">
                {update.published_at && (
                  <time
                    dateTime={update.published_at}
                    className="block text-xs opacity-60"
                  >
                    {new Date(update.published_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                )}
                {update.title && (
                  <h3 className="text-lg font-medium mt-1">{update.title}</h3>
                )}
                {updatePhoto && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={updatePhoto}
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
        </ol>
      )}
    </article>
  )
}
