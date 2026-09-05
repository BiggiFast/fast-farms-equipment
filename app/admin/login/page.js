import { Suspense } from 'react'
import Link from 'next/link'
import LoginForm from '@/components/LoginForm'

export const metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

// Deliberately outside the (dashboard) route group, so it gets no admin
// navigation and no "Sign out" link — neither makes sense to someone who
// isn't signed in yet.
export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="display-font mb-8 block text-center text-3xl tracking-widest"
        >
          CORY
        </Link>

        <h1 className="mb-6 text-center text-sm uppercase tracking-widest opacity-60">
          Admin sign in
        </h1>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="mt-8 text-center text-sm">
          <Link href="/" className="underline opacity-70">
            Back to the site
          </Link>
        </p>
      </div>
    </div>
  )
}
