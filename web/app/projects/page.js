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
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold mb-6">Currently working on</h1>
        {active.length === 0 ? (
          <p className="text-sm opacity-70">Nothing active right now.</p>
        ) : (
          <ProjectList projects={active} />
        )}
      </section>

      {rest.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-6">Past projects</h2>
          <ProjectList projects={rest} />
        </section>
      )}
    </div>
  )
}

function ProjectList({ projects }) {
  return (
    <ul className="space-y-6">
      {projects.map((project) => {
        const photo = mainPhoto(project)
        return (
          <li key={project.id} className="border-b pb-4">
            <Link href={`/projects/${project.slug}`}>
              {photo && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photo}
                  alt={project.title}
                  className="w-full rounded mb-3"
                />
              )}
              <h3 className="text-lg font-medium">{project.title}</h3>
              {project.summary && (
                <p className="text-sm opacity-80 mt-1">{project.summary}</p>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
