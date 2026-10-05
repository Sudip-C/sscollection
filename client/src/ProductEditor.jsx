import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const productColumns =
  "id, sku, name, description, category_id, price_paise, sizes, colors,image_paths";

function EditForm({ product, categories, onSaved }) {
  const [name, setName] = useState(product.name);
  const [categoryId, setCategoryId] = useState(product.category_id);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState((product.price_paise / 100).toFixed(2));
  const [sizes, setSizes] = useState((product.sizes ?? []).join(", "));
  const [colors, setColors] = useState((product.colors ?? []).join(", "));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
    const [message, setMessage] = useState("");


  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const sizeList = sizes
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const colorList = colors
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (
      !/^\d{1,7}(\.\d{1,2})?$/.test(price) ||
      Number(price) <= 0 ||
      !sizeList.length ||
      !colorList.length ||
      sizeList.length > 12 ||
      colorList.length > 12 ||
      [...sizeList, ...colorList].some((item) => item.length > 40)
    ) {
      setError("Check the price, sizes, and colors.");
      return;
    }

    setPending(true);

    const { data, error: saveError } = await supabase
      .from("products")
      .update({
        name: name.trim(),
        category_id: categoryId,
        description: description.trim(),
        price_paise: Math.round(Number(price) * 100),
        sizes: sizeList,
        colors: colorList,
      })
      .eq("id", product.id)
      .select(productColumns)
      .single();

    setPending(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    onSaved(data);
    setMessage("Product changes saved.");
  }
  

  return (
    <form onSubmit={handleSave} className="mt-6 grid max-w-2xl gap-4">
      <label className="grid gap-2 text-sm font-bold">
        Name
        <input
          required
          maxLength={160}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="border border-line bg-cream px-4 py-3"
        />
      </label>

      <label className="grid gap-2 text-sm font-bold">
        Category
        <select
          required
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="border border-line bg-cream px-4 py-3"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-bold">
        Description
        <textarea
          rows={3}
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="border border-line bg-cream px-4 py-3"
        />
      </label>

      <label className="grid gap-2 text-sm font-bold">
        Price (₹)
        <input
          required
          type="number"
          min="0.01"
          max="9999999.99"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="border border-line bg-cream px-4 py-3"
        />
      </label>

      <label className="grid gap-2 text-sm font-bold">
        Sizes, separated by commas
        <input
          required
          value={sizes}
          onChange={(event) => setSizes(event.target.value)}
          className="border border-line bg-cream px-4 py-3"
        />
      </label>

      <label className="grid gap-2 text-sm font-bold">
        Colors, separated by commas
        <input
          required
          value={colors}
          onChange={(event) => setColors(event.target.value)}
          className="border border-line bg-cream px-4 py-3"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-fit bg-ink px-6 py-3 font-bold text-cream disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>

      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </form>
  );
}

export default function ProductEditor({ categories }) {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error: loadError } = await supabase
        .from("products")
        .select(productColumns)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (loadError) setError(loadError.message);
      else {
        setProducts(data);
        setSelectedId("");
      }

      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const selected = products.find((product) => product.id === selectedId);

  function handleSaved(updated) {
    setProducts((current) =>
      current.map((product) => (product.id === updated.id ? updated : product)),
    );
  }
async function handleDelete() {
    if (!selected) return;

    const confirmed = window.confirm(
      `Permanently delete ${selected.name} (${selected.sku}) and its images?`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setMessage("");

    try {
      // Read the latest paths in case an image was uploaded after this page loaded.
      const { data: latest, error: lookupError } = await supabase
        .from("products")
        .select("image_paths")
        .eq("id", selected.id)
        .single();

      if (lookupError) throw lookupError;

      const paths = latest.image_paths ?? [];

      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", selected.id)
        .select("id")
        .single();

      if (deleteError) throw deleteError;

      const remaining = products.filter(
        (product) => product.id !== selected.id,
      );
      setProducts(remaining);
      setSelectedId("");

      if (paths.length > 0) {
        const { error: imageError } = await supabase.storage
          .from("product-images")
          .remove(paths);

        if (imageError) {
          setError(
            `Product deleted, but image cleanup failed: ${imageError.message}. ` +
              `Remove these paths in Supabase Storage: ${paths.join(", ")}`,
          );
          return;
        }
      }

      setMessage("Product and its images deleted.");
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeleting(false);
    }
  }
  return (
  <section className="mt-10 bg-surface p-6 sm:p-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold tracking-widest text-accent uppercase">
          Catalogue
        </p>
        <h2 className="mt-2 font-display text-4xl uppercase">
          Products ({products.length})
        </h2>
      </div>
    </div>

    {loading && <p className="mt-6">Loading products…</p>}

    {error && (
      <p role="alert" className="mt-4 text-red-700">
        {error}
      </p>
    )}

    {message && (
      <p role="status" className="mt-4 text-green-800">
        {message}
      </p>
    )}

    {!loading && products.length === 0 && (
      <p className="mt-6">No products yet.</p>
    )}

    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const imagePath = product.image_paths?.[0]
        const imageUrl = imagePath
          ? supabase.storage
              .from("product-images")
              .getPublicUrl(imagePath).data.publicUrl
          : null

        return (
          <article
            key={product.id}
            className="overflow-hidden border border-line bg-cream"
          >
            <div className="relative">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="aspect-[4/5] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center bg-line text-sm text-muted">
                  No image
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedId(product.id)
                  setError("")
                  setMessage("")
                }}
                aria-label={`Edit ${product.name}`}
                title={`Edit ${product.name}`}
                className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-ink text-cream shadow-lg"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs font-bold tracking-widest text-accent uppercase">
                {product.sku}
              </p>

              <h3 className="mt-2 text-xl font-bold">
                {product.name}
              </h3>

              <p className="mt-2 font-bold">
                ₹{(product.price_paise / 100).toFixed(2)}
              </p>
            </div>
          </article>
        )
      })}
    </div>

    {selected && (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/50"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setSelectedId("")
          }
        }}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-product-title"
          className="h-full w-full max-w-2xl overflow-y-auto bg-surface p-6 shadow-2xl sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest text-accent uppercase">
                {selected.sku}
              </p>

              <h2
                id="edit-product-title"
                className="mt-2 font-display text-4xl uppercase"
              >
                Edit {selected.name}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setSelectedId("")}
              aria-label="Close product editor"
              className="flex h-11 w-11 items-center justify-center border border-line text-2xl"
            >
              ×
            </button>
          </div>

          <div className="mt-6 flex gap-3 overflow-x-auto">
            {(selected.image_paths ?? []).map((path) => {
              const imageUrl = supabase.storage
                .from("product-images")
                .getPublicUrl(path).data.publicUrl

              return (
                <img
                  key={path}
                  src={imageUrl}
                  alt={selected.name}
                  className="h-48 w-36 shrink-0 object-cover"
                />
              )
            })}

            {!selected.image_paths?.length && (
              <div className="flex h-48 w-36 items-center justify-center bg-line text-sm text-muted">
                No image
              </div>
            )}
          </div>

          <EditForm
            key={selected.id}
            product={selected}
            categories={categories}
            onSaved={handleSaved}
          />

          <div className="mt-10 border-t border-line pt-6">
            <p className="font-bold text-red-700">Danger zone</p>
            <p className="mt-2 text-sm text-muted">
              This permanently deletes {selected.name} and all its images.
            </p>

            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="mt-4 border border-red-700 px-5 py-3 font-bold text-red-700 disabled:opacity-50"
            >
              {deleting
                ? "Deleting…"
                : `Delete ${selected.name} permanently`}
            </button>
          </div>
        </aside>
      </div>
    )}
  </section>
)
}
