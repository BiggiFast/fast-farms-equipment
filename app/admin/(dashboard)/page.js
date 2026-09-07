import Link from 'next/link'

// The front door. On a phone, the thing you want 90% of the time is
// "post an update", so that gets the big button and everything else is
// secondary.
export default function AdminHome() {
  return (
    <div className="max-w-md space-y-8">
      <section>
        <Link
          href="/admin/updates/new"
          className="block rounded border-2 px-4 py-6 text-center text-lg font-medium"
        >
          + New update
        </Link>
        <p className="mt-2 text-xs opacity-60 text-center">
          A note, a photo, a finding. Attach it to a project or post it on its own.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide opacity-60">Manage</h2>
        <Link href="/admin/updates" className="block rounded border px-4 py-3">
          Updates
        </Link>
        <Link href="/admin/projects" className="block rounded border px-4 py-3">
          Projects
        </Link>
        <Link href="/admin/equipment" className="block rounded border px-4 py-3">
          Equipment
        </Link>
        <Link href="/admin/survey" className="block rounded border px-4 py-3">
          Survey
        </Link>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide opacity-60 mb-2">
          View site
        </h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/" className="underline">Feed</Link>
          <Link href="/projects" className="underline">Projects</Link>
          <Link href="/equipment" className="underline">Equipment</Link>
        </div>
      </section>
    </div>
  )
}
