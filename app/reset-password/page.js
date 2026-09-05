import { Suspense } from 'react'
import ResetPasswordForm from '@/components/ResetPasswordForm'

export const metadata = {
  title: 'Reset Password',
  robots: { index: false, follow: false },
}

// Supabase password-recovery emails link here. The old site served this at
// /reset-password.html; that path now redirects (see next.config.mjs) so
// links in already-sent emails keep working.
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-sm uppercase tracking-widest opacity-60">
          Set a new password
        </h1>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
