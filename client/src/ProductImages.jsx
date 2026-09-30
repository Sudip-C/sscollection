import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

const bucket = 'product-images'
const extensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export default function ProductImages() {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [file, setFile] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const fileInput = useRef(null)

  useEffect(() => {
    let active = true

    async function loadDrafts() {
      const { data, error: loadError } = await supabase
        .from('products')
        .select('id, name, sku, image_paths')
        .eq('is_active', false)
        .order('created_at', { ascending: false })

      if (!active) return

      if (loadError) {
        setError(loadError.message)
        return
      }

      setProducts(data)
      setProductId(data[0]?.id ?? '')
    }

    loadDrafts()

    return () => {
      active = false
    }
  }, [])

  const selected = products.find((product) => product.id === productId)
  async function handleUpload(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!selected || !file) return

    const extension = extensions[file.type]

    if (!extension || file.size > 2 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP image under 2 MB.')
      return
    }

    setPending(true)

    const path = `products/${selected.id}/${crypto.randomUUID()}.${extension}`

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: updated, error: saveError } = await supabase
        .from('products')
        .update({
          image_paths: [...(selected.image_paths ?? []), path],
        })
        .eq('id', selected.id)
        .select('id, image_paths')
        .single()

      if (saveError) {
        const { error: cleanupError } = await supabase.storage
          .from(bucket)
          .remove([path])

        throw new Error(
          cleanupError
            ? `Image was uploaded but could not be attached or removed: ${saveError.message}`
            : saveError.message,
        )
      }

      setProducts((current) =>
        current.map((product) =>
          product.id === updated.id
            ? { ...product, image_paths: updated.image_paths }
            : product,
        ),
      )
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      setMessage(`Image added to ${selected.name}.`)
    } catch (uploadOrSaveError) {
      setError(uploadOrSaveError.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="mt-10 bg-surface p-6 sm:p-8">
      <h2 className="text-lg font-bold">Draft images</h2>

      <form onSubmit={handleUpload} className="mt-6 grid max-w-xl gap-4">
        <label className="grid gap-2 text-sm font-bold">
          Product draft
          <select
            required
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className="border border-line bg-cream px-4 py-3"
          >
            {products.length === 0 && <option value="">No drafts yet</option>}
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold cursor-pointer">
          Image (JPG, PNG, or WebP; maximum 2 MB)
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button
          type="submit"
          disabled={pending || !selected || !file}
          className="w-fit bg-ink px-6 py-3 font-bold text-cream disabled:opacity-50"
        >
          {pending ? 'Uploading…' : 'Upload image'}
        </button>
      </form>

      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm">{message}</p>}

      {selected && (
        <div className="mt-6 flex flex-wrap gap-4">
          {(selected.image_paths ?? []).map((path) => {
            const { data } = supabase.storage.from(bucket).getPublicUrl(path)

            return (
              <img
                key={path}
                src={data.publicUrl}
                alt={selected.name}
                className="h-40 w-32 object-cover"
              />
            )
          })}
        </div>
      )}
    </section>
  )
}