import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

const formatPrice = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
})

const whatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').replace(
  /\D/g,
  '',
)

export default function ProductDrawer({ product, onClose }) {
  const images = product.image_paths ?? []
  const [selectedImage, setSelectedImage] = useState(images[0] ?? null)
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const panelRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = panelRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled])',
      )

      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  const imageUrl = selectedImage
    ? supabase.storage.from('product-images').getPublicUrl(selectedImage).data
        .publicUrl
    : null

  const message = [
    `Hi ss.collection, I'm interested in ${product.name} (SKU: ${product.sku}).`,
    `Size: ${size || 'Please advise'}`,
    `Color: ${color || 'Please advise'}`,
    `Quantity: ${quantity}`,
    `Price: ${formatPrice.format(product.price_paise / 100)} each`,
  ].join('\n')

  const whatsappUrl = /^\d{10,15}$/.test(whatsappNumber)
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close product details"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/60"
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-title"
        className="absolute inset-y-0 right-0 w-full max-w-[640px] overflow-y-auto bg-cream px-6 pb-10 pt-6 shadow-2xl sm:px-10"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="pt-2 text-xs font-bold tracking-widest uppercase">
            The details / {product.sku}
          </p>

          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-3xl leading-none text-muted hover:text-ink"
          >
            ×
          </button>
        </div>

        <h2
          id="product-title"
          className="mt-8 font-display text-5xl uppercase sm:text-6xl"
        >
          {product.name}
        </h2>

        <p className="mt-3 text-lg text-muted">
          {product.categories?.name} ·{' '}
          {formatPrice.format(product.price_paise / 100)}
        </p>

        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="mt-8 aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="mt-8 flex aspect-[4/3] items-center justify-center bg-surface text-muted">
            Image coming soon
          </div>
        )}

        {images.length > 1 && (
          <div className="mt-3 flex gap-3 overflow-x-auto">
            {images.map((path, index) => {
              const thumbnailUrl = supabase.storage
                .from('product-images')
                .getPublicUrl(path).data.publicUrl

              return (
                <button
                  key={path}
                  type="button"
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={selectedImage === path}
                  onClick={() => setSelectedImage(path)}
                  className={`shrink-0 border-2 ${
                    selectedImage === path
                      ? 'border-ink'
                      : 'border-transparent'
                  }`}
                >
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="h-20 w-20 object-cover"
                  />
                </button>
              )
            })}
          </div>
        )}

        {product.description && (
          <p className="mt-8 leading-relaxed text-muted">
            {product.description}
          </p>
        )}

        {(product.colors ?? []).length > 0 && (
          <div className="mt-8">
            <h3 className="text-xs font-bold tracking-widest uppercase">
              Choose a color
            </h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {product.colors.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={color === item}
                  onClick={() => setColor(item)}
                  className={`border px-5 py-3 font-bold ${
                    color === item
                      ? 'border-ink bg-ink text-cream'
                      : 'border-line'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {(product.sizes ?? []).length > 0 && (
          <div className="mt-8">
            <h3 className="text-xs font-bold tracking-widest uppercase">
              Choose your size
            </h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {product.sizes.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={size === item}
                  onClick={() => setSize(item)}
                  className={`min-w-16 border px-4 py-3 font-bold ${
                    size === item
                      ? 'border-ink bg-ink text-cream'
                      : 'border-line'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="mt-8 block">
          <span className="text-xs font-bold tracking-widest uppercase">
            Quantity
          </span>
          <input
            type="number"
            min="1"
            max="10"
            value={quantity}
            onChange={(event) =>
              setQuantity(
                Math.max(1, Math.min(10, Number(event.target.value) || 1)),
              )
            }
            className="mt-3 block w-24 border border-line bg-cream px-4 py-3"
          />
        </label>

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 block bg-ink px-6 py-4 text-center font-bold text-cream"
          >
            Ask on WhatsApp
          </a>
        ) : (
          <p className="mt-8 text-sm text-red-700">
            Store WhatsApp number is not configured.
          </p>
        )}
      </aside>
    </div>
  )
}