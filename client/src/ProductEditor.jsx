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
        setSelectedId(data[0]?.id ?? "");
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
      setSelectedId(remaining[0]?.id ?? "");

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
      <h2 className="text-lg font-bold">Edit product</h2>

      {loading && <p className="mt-4">Loading products…</p>}
      {error && (
        <p role="alert" className="mt-4 text-red-700">
          {error}
        </p>
      )}
      {message && <p role="status" className="mt-4">{message}</p>}
      {!loading && !error && products.length === 0 && (
        <p className="mt-4">No products yet.</p>
      )}

      {selected && (
        <>
          <label className="mt-6 grid max-w-2xl gap-2 text-sm font-bold">
            Choose a product
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="border border-line bg-cream px-4 py-3"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </label>

          <EditForm
            key={selected.id}
            product={selected}
            categories={categories}
            onSaved={handleSaved}
          />
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="mt-8 border border-red-700 px-5 py-3 font-bold text-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete product permanently"}
          </button>
        </>
      )}
    </section>
  );
}
