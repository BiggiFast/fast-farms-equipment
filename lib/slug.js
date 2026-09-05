// Mirror of the slugify() function in the database, for generating a slug
// in the admin form as you type a title.
export function slugify(value) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}
