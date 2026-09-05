import Link from 'next/link'

export const metadata = {
  title: 'Contact',
  description:
    'Get in touch about the farm equipment for sale — call 503-383-9702.',
}

// Ported from the old site's equipment/contact.html. The phone number is the
// only way buyers have to reach Cory, so losing this page at cutover would
// have quietly cost him sales.
export default function ContactPage() {
  return (
    <>
      <section className="page-hero">
        <h1>Get in Touch</h1>
      </section>

      <article className="page-content narrow">
        <h1>Interested in the equipment?</h1>

        <p>
          Give us a call and we&apos;ll be happy to answer any questions about
          the equipment.
        </p>

        <p style={{ marginTop: 'var(--space-lg)' }}>
          <a
            href="tel:503-383-9702"
            className="display-font"
            style={{
              fontSize: '2rem',
              color: 'var(--color-earth)',
              textDecoration: 'none',
            }}
          >
            503-383-9702
          </a>
        </p>

        <p className="note">
          An online contact form is coming. For now, please give us a call.
        </p>

        <p style={{ marginTop: 'var(--space-xl)' }}>
          <Link href="/equipment" className="back-link">
            &larr; Back to the equipment
          </Link>
        </p>
      </article>
    </>
  )
}
