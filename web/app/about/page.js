/* eslint-disable react/no-unescaped-entities */
export const metadata = {
  title: 'About',
  description: 'About Cory Fast.',
}

export default function AboutPage() {
  return (
    <article className="page-content narrow">
      <h1>About</h1>

      <p>Hello, I'm Cory.</p>
      {/* TODO: Cory's real bio. The old site had a placeholder here too —
          this is the one thing no framework solves. */}
      <p style={{ color: 'var(--color-text-muted)' }}>
        This space is waiting for your story. What would you like people to
        know about you?
      </p>
    </article>
  )
}
