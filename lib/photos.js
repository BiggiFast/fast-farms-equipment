// Photos are stored as a jsonb array on both `equipment` and `updates`:
//   [{ url, is_main, sort_order }]
// Older equipment rows predate that and only have a plain `image_url`,
// so every read goes through here to handle both shapes.

export function mainPhoto(row) {
  const photos = Array.isArray(row?.photos) ? row.photos : []
  if (photos.length > 0) {
    const main = photos.find((p) => p?.is_main)
    return (main ?? photos[0])?.url ?? null
  }
  return row?.image_url ?? null // legacy single-image rows
}

export function allPhotos(row) {
  const photos = Array.isArray(row?.photos) ? row.photos : []
  if (photos.length > 0) {
    return [...photos]
      .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
      .map((p) => p?.url)
      .filter(Boolean)
  }
  return row?.image_url ? [row.image_url] : []
}
