import UpdateEditor from '@/components/UpdateEditor'

export const metadata = { title: 'Edit update', robots: { index: false } }

export default async function EditUpdatePage({ params }) {
  const { id } = await params
  return <UpdateEditor id={id} />
}
