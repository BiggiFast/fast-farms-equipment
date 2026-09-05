'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Supabase sends the recovery token in the URL *hash* (#access_token=...),
// which never reaches the server — so this has to run in the browser.
export default function ResetPasswordForm() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    // All the state changes happen inside this async function rather than in
    // the effect body, so none of them fire synchronously during the effect
    // and trigger a cascading re-render.
    async function establishSession() {
      const params = new URLSearchParams(window.location.hash.slice(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken) {
        if (!cancelled) {
          setError(
            'This link is missing its reset token. Request a new password reset email.'
          )
        }
        return
      }

      const { error: sessionError } = await createClient().auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken ?? '',
      })

      if (cancelled) return

      if (sessionError) {
        setError(
          `This link has expired or has already been used. (${sessionError.message})`
        )
        return
      }

      // Clear the token out of the address bar so it isn't left in history
      window.history.replaceState(null, '', window.location.pathname)
      setReady(true)
    }

    establishSession()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }

    setBusy(true)
    setError(null)

    const { error } = await createClient().auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="mb-6">Password updated.</p>
        <button
          onClick={() => router.push('/admin')}
          className="w-full rounded border px-4 py-3 font-medium"
        >
          Go to the admin
        </button>
      </div>
    )
  }

  if (error && !ready) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!ready) {
    return <p className="text-sm opacity-60">Checking your link…</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm">New password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          className="w-full rounded border px-3 py-2 text-base"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm">Confirm new password</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          className="w-full rounded border px-3 py-2 text-base"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded border px-4 py-3 font-medium disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Update password'}
      </button>
    </form>
  )
}
