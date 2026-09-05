import Link from 'next/link'
import { getProjects } from '@/lib/queries'
import { mainPhoto } from '@/lib/photos'

export const revalidate = 60
export const metadata = { title: 'Projects' }

export default async function ProjectsPage() {
  const projects = await getProjects()
  const active = projects.filter((p) => p.status === 'active')
  const rest = projects.filter((p) => p.status !== 'active')

  return (
    <>
      <section className="page-hero">
        <h1>Projects</h1>
        <p>What I&apos;m working on, and what I&apos;ve finished.</p>
      </section>

      <div className="page-content">
        {projects.length === 0 ? (
          <p className="empty-state">Nothing posted yet.</p>
        ) : (
          <>
            {active.length > 0 && <ProjectList projects={active} />}
            {rest.length > 0 && (
              <>
                <h1 style={{ marginTop: 'var(--space-2xl)' }}>Past</h1>
                <ProjectList projects={rest} />
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

function ProjectList({ projects }) {
  return (
    <>
      {projects.map((project) => {
        const photo = mainPhoto(project)
        return (
          <article key={project.id} className="feed-item">
            <Link href={`/projects/${project.slug}`}>
              <span className="status-pill">{project.status}</span>
              <h2>{project.title}</h2>
              {photo && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={photo} alt={project.title} loading="lazy" />
              )}
              {project.summary && <p>{project.summary}</p>}
            </Link>
          </article>
        )
      })}
    </>
  )
}
