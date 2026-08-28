import Link from 'next/link'
import { getEquipment } from '@/lib/queries'
import { mainPhoto } from '@/lib/photos'

export const revalidate = 60
export const metadata = {
  title: 'Equipment for Sale',
  description:
    'Farm equipment for sale — tractors, trucks, and implements from the Fast family farm.',
}

function formatPrice(price) {
  if (price == null) return 'Call for price'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

export default async function EquipmentPage() {
  const items = await getEquipment()

  // Group by category so the page reads as sections, not one long list
  const byCategory = items.reduce((acc, item) => {
    const key = item.category || 'Other'
    ;(acc[key] ||= []).push(item)
    return acc
  }, {})

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Equipment for Sale</h1>
      <p className="opacity-80 mb-8">
        These belonged to my dad, Doug.{' '}
        <Link href="/doug" className="underline">
          Read about him here.
        </Link>
      </p>

      {items.length === 0 && (
        <p className="text-sm opacity-70">No listings available right now.</p>
      )}

      {Object.entries(byCategory).map(([category, group]) => (
        <section key={category} className="mb-10">
          <h2 className="text-lg font-medium capitalize mb-4">{category}</h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            {group.map((item) => {
              const photo = mainPhoto(item)
              return (
                <li key={item.id} className="border rounded overflow-hidden">
                  <Link href={`/equipment/${item.slug}`}>
                    {photo && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={photo}
                        alt={item.name}
                        className="w-full aspect-[4/3] object-cover"
                      />
                    )}
                    <div className="p-3">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm opacity-80">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
