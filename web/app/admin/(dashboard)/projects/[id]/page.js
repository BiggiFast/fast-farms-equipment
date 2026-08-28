import ProjectEditor from '@/components/ProjectEditor'
export const metadata = { title: 'Edit project', robots: { index: false } }
export default async function EditProjectPage({ params }) {
  const { id } = await params
  return <ProjectEditor id={id} />
}
