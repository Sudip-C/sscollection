import { useState } from "react";
import { adminFetch } from "./lib/adminApi";

export default function ProductDraftForm({ categories }) {
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [savedProduct, setSavedProduct] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSavedProduct(null);

    try {
      const response = await adminFetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          name,
          description,
          price,
          sizes: sizes
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          colors: colors
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save product.");
      }
      const product = result.product;

      setSavedProduct(product);
      setName("");
      setDescription("");
      setPrice("");
      setSizes("");
      setColors("");
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-black/15 bg-white p-6">
      <h2 className="text-2xl font-semibold">Add a product draft</h2>
      <p className="mt-2 text-sm text-black/60">
        The product will remain hidden until you publish it.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-1">
          Category
          <select
            required
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="rounded-lg border border-black/20 p-3"
          >
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          Product name
          <input
            required
            maxLength={160}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-black/20 p-3"
          />
        </label>

        <label className="grid gap-1">
          Description
          <textarea
            maxLength={2000}
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="rounded-lg border border-black/20 p-3"
          />
        </label>

        <label className="grid gap-1">
          Price (₹)
          <input
            required
            type="number"
            min="0.01"
            max="9999999.99"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="rounded-lg border border-black/20 p-3"
          />
        </label>

        <label className="grid gap-1">
          Sizes (separate with commas)
          <input
            required
            placeholder="S, M, L, XL"
            value={sizes}
            onChange={(event) => setSizes(event.target.value)}
            className="rounded-lg border border-black/20 p-3"
          />
        </label>

        <label className="grid gap-1">
          Colors (separate with commas)
          <input
            required
            placeholder="Black, Cream"
            value={colors}
            onChange={(event) => setColors(event.target.value)}
            className="rounded-lg border border-black/20 p-3"
          />
        </label>

        <button
          type="submit"
          disabled={pending || categories.length === 0}
          className="w-fit rounded-lg bg-black px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save draft"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-red-700">
          {error}
        </p>
      )}
      {savedProduct && (
        <p role="status" className="mt-4 text-green-800">
          Draft saved: {savedProduct.name} — SKU {savedProduct.sku}
        </p>
      )}
    </section>
  );
}
