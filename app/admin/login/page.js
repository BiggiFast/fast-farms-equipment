import { Suspense } from 'react'
import LoginForm from '@/components/LoginForm'

export const metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-6">Sign in</h1>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
