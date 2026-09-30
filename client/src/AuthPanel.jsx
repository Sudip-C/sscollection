import { useState } from 'react'
import { supabase } from './lib/supabase'

function AuthPanel({ onClose }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setPending(true)
    setError('')
    setMessage('')

    try {
      const result =
        mode === 'signup'
          ? await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                emailRedirectTo: window.location.origin,
              },
            })
          : await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            })

      if (result.error) throw result.error

      setPassword('')

      if (mode === 'signup' && !result.data.session) {
        setMessage(
          'Check your email to confirm your account, then sign in.',
        )
      }
    } catch (authError) {
      setError(authError.message || 'Authentication failed.')
    } finally {
      setPending(false)
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'signup' : 'login')
    setPassword('')
    setError('')
    setMessage('')
  }

  return (
    <section
      aria-labelledby="auth-heading"
      className="border-b border-line bg-surface px-6 py-12 sm:px-10"
    >
      <div className="mx-auto max-w-md">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="auth-heading"
            className="font-display text-4xl uppercase"
          >
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-sm font-bold underline"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="account-email"
              className="mb-2 block text-sm font-bold"
            >
              Email
            </label>
            <input
              id="account-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-line bg-cream px-4 py-3 outline-accent"
            />
          </div>

          <div>
            <label
              htmlFor="account-password"
              className="mb-2 block text-sm font-bold"
            >
              Password
            </label>
            <input
              id="account-password"
              type="password"
              autoComplete={
                mode === 'signup'
                  ? 'new-password'
                  : 'current-password'
              }
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border border-line bg-cream px-4 py-3 outline-accent"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          {message && (
            <p role="status" className="text-sm text-ink">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-ink px-5 py-4 font-bold text-cream disabled:opacity-50"
          >
            {pending
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={switchMode}
          className="mt-6 text-sm font-bold underline"
        >
          {mode === 'login'
            ? 'New here? Create an account'
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </section>
  )
}

export default AuthPanel