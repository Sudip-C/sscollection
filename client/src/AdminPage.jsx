import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { adminFetch } from './lib/adminApi'
import ProductDraftForm from './ProductDraftForm'
import ProductImages from './ProductImages.jsx'

function AdminPage() {
  const [status, setStatus] = useState('checking')
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const access = await adminFetch('/api/admin/me')

        if (!active) return

        if (access.status === 401) {
          setStatus('signed-out')
          return
        }

        if (access.status === 403) {
          setStatus('forbidden')
          return
        }

        if (!access.ok) {
          throw new Error('Could not verify admin access.')
        }

        const response = await adminFetch('/api/admin/categories')
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Could not load categories.')
        }

        if (active) {
          setCategories(result.categories)
          setStatus('ready')
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message)
          setStatus('error')
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  async function handleCreate(event) {
    event.preventDefault()
    setPending(true)
    setError('')

    try {
      const response = await adminFetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Could not create category.')
      }

      setCategories((current) =>
        [...current, result.category].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      )
      setName('')
    } catch (createError) {
      setError(createError.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-line px-6 py-6 sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            ss.collection<span className="text-accent">.</span>
          </Link>
          <span className="text-xs font-bold tracking-widest uppercase">
            Admin / Catalogue
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <h1 className="font-display text-5xl uppercase sm:text-6xl">
          Manage categories<span className="text-accent">.</span>
        </h1>

        {status === 'checking' && (
          <p className="mt-8">Checking admin access…</p>
        )}

        {status === 'signed-out' && (
          <p className="mt-8">
            Sign in from the{' '}
            <Link to="/" className="font-bold underline">
              store homepage
            </Link>{' '}
            to continue.
          </p>
        )}

        {status === 'forbidden' && (
          <p className="mt-8" role="alert">
            Your account does not have admin access.
          </p>
        )}

        {status === 'error' && (
          <p className="mt-8 text-red-700" role="alert">
            {error}
          </p>
        )}

        {status === 'ready' && (
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <section className="bg-surface p-6 sm:p-8">
              <h2 className="text-lg font-bold">New category</h2>

              <form onSubmit={handleCreate} className="mt-6">
                <label
                  htmlFor="category-name"
                  className="mb-2 block text-sm font-bold"
                >
                  Category name
                </label>

                <input
                  id="category-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={80}
                  placeholder="For example, Training Tees"
                  className="w-full border border-line bg-cream px-4 py-3 outline-accent"
                />

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-4 bg-ink px-6 py-3 font-bold text-cream disabled:opacity-50"
                >
                  {pending ? 'Saving…' : 'Create category'}
                </button>
              </form>

              {error && (
                <p role="alert" className="mt-4 text-sm text-red-700">
                  {error}
                </p>
              )}
            </section>

            <section>
              <h2 className="text-lg font-bold">
                Categories ({categories.length})
              </h2>

              <ul className="mt-6 divide-y divide-line border-y border-line">
                {categories.map((category) => (
                  <li
                    key={category.id}
                    className="flex flex-wrap justify-between gap-2 py-4"
                  >
                    <span className="font-bold">{category.name}</span>
                    <span className="text-sm text-muted">
                      {category.slug}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
        {status === 'ready' && (
          <ProductDraftForm categories={categories} />
        )}
        {status === 'ready' && <ProductImages />}
      </main>
    </div>
  )
}

export default AdminPage