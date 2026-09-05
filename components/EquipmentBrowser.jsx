'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { mainPhoto } from '@/lib/photos'

function formatPrice(price) {
  if (price == null) return 'Call for price'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

// Category filter pills, carried over from the original equipment page.
// Categories come from the data rather than a hardcoded list, so a new
// category on a listing shows up here automatically.
export default function EquipmentBrowser({ items }) {
  const [active, setActive] = useState('all')

  const categories = useMemo(() => {
    const found = new Set(
      items.map((i) => i.category?.trim().toLowerCase()).filter(Boolean)
    )
    return ['all', ...Array.from(found).sort()]
  }, [items])

  const visible =
    active === 'all'
      ? items
      : items.filter((i) => i.category?.trim().toLowerCase() === active)

  return (
    <>
      {categories.length > 2 && (
        <nav className="category-tags">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`tag ${active === category ? 'active' : ''}`}
              onClick={() => setActive(category)}
            >
              {category}
            </button>
          ))}
        </nav>
      )}

      <div className="container">
        {visible.length === 0 ? (
          <p className="empty-state">Nothing in this category right now.</p>
        ) : (
          <div className="equipment-grid">
            {visible.map((item) => {
              const photo = mainPhoto(item)
              return (
                <Link
                  key={item.id}
                  href={`/equipment/${item.slug}`}
                  className="equipment-card"
                >
                  {photo && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={photo} alt={item.name} loading="lazy" />
                  )}
                  <div className="equipment-card-body">
                    {item.category && (
                      <span className="equipment-tag">{item.category}</span>
                    )}
                    <h2>{item.name}</h2>
                    <div className="price">{formatPrice(item.price)}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
