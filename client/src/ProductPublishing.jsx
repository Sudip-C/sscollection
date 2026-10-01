import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function ProductPublishing() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      const { data, error: loadError } = await supabase
        .from('products')
        .select('id, name, sku, image_paths, is_active')
        .order('created_at', { ascending: false })

      if (!active) return

      if (loadError) setError(loadError.message)
      else setProducts(data)

      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [])

  async function togglePublished(product) {
    setError('')
    setMessage('')

    const nextActive = !product.is_active

    if (nextActive && !product.image_paths?.length) {
      setError('Add at least one image before publishing.')
      return
    }

    setPendingId(product.id)

    try {
      const { data, error: updateError } = await supabase
        .from('products')
        .update({ is_active: nextActive })
        .eq('id', product.id)
        .select('id, is_active')
        .single()

      if (updateError) throw updateError

      setProducts((current) =>
        current.map((item) =>
          item.id === data.id
            ? { ...item, is_active: data.is_active }
            : item,
        ),
      )
      setMessage(
        `${product.name} ${data.is_active ? 'published' : 'unpublished'}.`,
      )
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="mt-10 bg-surface p-6 sm:p-8">
      <h2 className="text-lg font-bold">Publish products</h2>

      {loading && <p className="mt-4">Loading products…</p>}
      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4">{message}</p>}

      {!loading && products.length === 0 && (
        <p className="mt-4">No products yet.</p>
      )}

      <ul className="mt-6 divide-y divide-line">
        {products.map((product) => (
          <li
            key={product.id}
            className="flex flex-wrap items-center justify-between gap-4 py-4"
          >
            <div>
              <p className="font-bold">{product.name}</p>
              <p className="text-sm text-muted">
                {product.sku} · {product.image_paths?.length ?? 0} image(s) ·{' '}
                {product.is_active ? 'Published' : 'Draft'}
              </p>
            </div>

            <button
              type="button"
              disabled={
                pendingId !== null ||
                (!product.is_active && !product.image_paths?.length)
              }
              onClick={() => togglePublished(product)}
              className="bg-ink px-5 py-2 font-bold text-cream disabled:opacity-50"
            >
              {pendingId === product.id
                ? 'Saving…'
                : product.is_active
                  ? 'Unpublish'
                  : 'Publish'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}