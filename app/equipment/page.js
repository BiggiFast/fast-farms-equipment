import Link from 'next/link'
import { getEquipment } from '@/lib/queries'
import EquipmentBrowser from '@/components/EquipmentBrowser'

export const revalidate = 60
export const metadata = {
  title: 'Equipment for Sale',
  description:
    'Farm equipment for sale — tractors, trucks, and implements from the Fast family farm.',
}

export default async function EquipmentPage() {
  const items = await getEquipment()

  return (
    <>
      <section className="page-hero">
        <h1>Equipment Sales</h1>
        <p>
          These belonged to my dad, Doug.{' '}
          <Link href="/doug">Read about him here.</Link>
        </p>
      </section>

      {items.length === 0 ? (
        <div className="container">
          <p className="empty-state">No listings available right now.</p>
        </div>
      ) : (
        <EquipmentBrowser items={items} />
      )}
    </>
  )
}
