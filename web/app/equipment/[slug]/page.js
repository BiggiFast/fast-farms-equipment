import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEquipmentItem, getEquipment } from '@/lib/queries'
import { mainPhoto, allPhotos } from '@/lib/photos'

export const revalidate = 60

// Pre-build a page for every listing so they're fast and crawlable.
// If Supabase is unreachable at build time, fall back to an empty list —
// pages then render on first request instead of failing the whole deploy.
export async function generateStaticParams() {
  try {
    const items = await getEquipment()
    return items.map((item) => ({ slug: item.slug }))
  } catch (error) {
    console.warn(
      '[equipment] Could not prebuild listing pages; they will render on demand.',
      error?.message ?? error
    )
    return []
  }
}

// THE SEO PAYLOAD.
// Each machine gets its own title, description, and share image — so a search
// for "John Deere 4020 for sale Oregon" can land directly on that tractor.
export async function generateMetadata({ params }) {
  const { slug } = await params
  const item = await getEquipmentItem(slug)
  if (!item) return { title: 'Not found' }

  const photo = mainPhoto(item)
  const description =
    item.description?.slice(0, 160) ?? `${item.name} for sale.`

  return {
    title: `${item.name} for Sale`,
    description,
    openGraph: {
      title: `${item.name} for Sale`,
      description,
      images: photo ? [photo] : undefined,
    },
  }
}

function formatPrice(price) {
  if (price == null) return 'Call for price'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

export default async function EquipmentItemPage({ params }) {
  const { slug } = await params
  const item = await getEquipmentItem(slug)
  if (!item) notFound()

  const photos = allPhotos(item)

  // Structured data: tells Google this page IS a product for sale, with a
  // price. This is what can produce a rich result with the price shown.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    description: item.description ?? undefined,
    image: photos.length > 0 ? photos : undefined,
    category: item.category ?? undefined,
    offers: {
      '@type': 'Offer',
      price: item.price ?? undefined,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href="/equipment" className="text-sm underline">
        &larr; All equipment
      </Link>

      <h1 className="text-2xl font-semibold mt-4">{item.name}</h1>
      <p className="text-lg mt-1">{formatPrice(item.price)}</p>
      {item.category && (
        <p className="text-xs uppercase tracking-wide opacity-70 mt-1">
          {item.category}
        </p>
      )}

      {photos.length > 0 && (
        <div className="mt-6 space-y-4">
          {photos.map((url, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={url}
              src={url}
              alt={`${item.name} — photo ${i + 1}`}
              className="w-full rounded"
            />
          ))}
        </div>
      )}

      {item.description && (
        <p className="mt-6 whitespace-pre-wrap">{item.description}</p>
      )}

      <section className="mt-10 border-t pt-6 text-sm opacity-80">
        <p>
          This was my dad&apos;s.{' '}
          <Link href="/doug" className="underline">
            About Doug
          </Link>
        </p>
      </section>
    </article>
  )
}
