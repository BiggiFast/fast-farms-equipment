import EquipmentEditor from '@/components/EquipmentEditor'
export const metadata = { title: 'Edit listing', robots: { index: false } }
export default async function EditEquipmentPage({ params }) {
  const { id } = await params
  return <EquipmentEditor id={id} />
}
