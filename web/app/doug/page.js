/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link'

export const metadata = {
  title: 'In Memory of Doug',
  description:
    'This equipment sale is more than a transaction — it is a tribute to my father, Doug.',
  openGraph: {
    title: 'In Memory of Doug',
    images: ['/images/doug.jpg'],
  },
}

export default function DougPage() {
  return (
    <article className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">In Memory of Doug</h1>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/doug.jpg"
        alt="Doug with his Case IH tractor on the farm"
        className="w-full rounded mb-8"
      />

      <div className="space-y-4 leading-relaxed">
        {/* NOTE: the original page said "one year ago". See the note in the
            handoff — this line needs a date that won't go stale. */}
        <p>
          This equipment sale is more than just a transaction—it's a tribute to
          my father, Doug, who passed away one year ago.
        </p>
        <p>
          Dad spent his life working the land. He knew every piece of equipment
          here like an old friend. Each tractor, each implement, each truck has
          a story—early mornings, long days, and the quiet satisfaction of a job
          well done.
        </p>
        <p>
          He never got the retirement he deserved. The kind where you sit on the
          porch, watch the sun set over fields you've tended for decades, and
          finally rest. Life had other plans.
        </p>
        <p>
          So this is my way of finishing what he started. Finding good homes for
          the equipment he cared for. Making sure his legacy lives on in the
          hands of other farmers, other families, other dreamers who understand
          what it means to work the earth.
        </p>
        <p>
          Every piece here was maintained with pride. Dad wouldn't have had it
          any other way.
        </p>
        <p>
          If you're reading this and you find something you need, know that
          you're not just buying equipment. You're carrying forward a piece of a
          life well-lived.
        </p>
        <p className="italic">— Cory</p>
      </div>

      <p className="mt-10 text-sm">
        <Link href="/equipment" className="underline">
          See the equipment
        </Link>
      </p>
    </article>
  )
}
