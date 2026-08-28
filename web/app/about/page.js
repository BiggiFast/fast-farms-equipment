/* eslint-disable react/no-unescaped-entities */
export const metadata = {
  title: 'About',
  description: 'About Cory Fast.',
}

export default function AboutPage() {
  return (
    <article className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">About</h1>

      <div className="space-y-4 leading-relaxed">
        <p>Hello, I'm Cory.</p>
        {/* TODO: replace with your real bio — the old site had a placeholder
            here too. This is one of the few things no framework can do for you. */}
        <p className="opacity-60">
          This space is waiting for your story. What would you like people to
          know about you?
        </p>
      </div>
    </article>
  )
}
