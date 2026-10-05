const PRODUCT_CHANGED_EVENT = 'ss.collection:product-changed'

export function notifyProductChanged(change) {
  window.dispatchEvent(
    new CustomEvent(PRODUCT_CHANGED_EVENT, {
      detail: change,
    }),
  )
}

export function subscribeToProductChanges(listener) {
  function handleChange(event) {
    listener(event.detail)
  }

  window.addEventListener(PRODUCT_CHANGED_EVENT, handleChange)

  return () => {
    window.removeEventListener(PRODUCT_CHANGED_EVENT, handleChange)
  }
}