import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import ProductDrawer from "./ProductDrawer";

const formatPrice = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

export default function ProductGrid() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      const [productResult, categoryResult] = await Promise.all([
        supabase
          .from("products")
          .select(
            "id, sku, name, description, price_paise, image_paths, sizes, colors, categories(id, name)",
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name").order("name"),
      ]);

      if (!active) return;

      if (productResult.error || categoryResult.error) {
        setError(
          productResult.error?.message ??
            categoryResult.error?.message ??
            "Could not load the catalogue.",
        );
      } else {
        setProducts(productResult.data);
        setCategories(categoryResult.data);
      }

      setLoading(false);
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const searchTerm = query.trim().toLocaleLowerCase();
  const minPaise = minPrice === "" ? 0 : Math.round(Number(minPrice) * 100);
  const maxPaise =
    maxPrice === "" ? Infinity : Math.round(Number(maxPrice) * 100);

  const invalidPriceRange =
    minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice);

  const visibleProducts = products.filter((product) => {
    const matchesCategory =
      !categoryId || product.categories?.id === categoryId;

    const matchesSearch =
      !searchTerm ||
      [product.name, product.description, product.categories?.name].some(
        (value) => value?.toLocaleLowerCase().includes(searchTerm),
      );
    const matchesPrice =
      product.price_paise >= minPaise && product.price_paise <= maxPaise;
    return matchesCategory && matchesSearch && matchesPrice;
  });
  const displayedProducts =
    sortBy === "newest"
      ? visibleProducts
      : [...visibleProducts].sort((a, b) => {
          if (sortBy === "price-low") {
            return a.price_paise - b.price_paise;
          }

          if (sortBy === "price-high") {
            return b.price_paise - a.price_paise;
          }

          return a.name.localeCompare(b.name);
        });
  return (
    <section id="products" className="border-t border-line px-6 py-16 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold tracking-widest text-accent uppercase">
          The collection
        </p>
        <h2 className="mt-3 font-display text-4xl uppercase sm:text-5xl">
          Shop the latest.
        </h2>
        <label className="mt-8 block max-w-md">
          <span className="mb-2 block text-sm font-bold">Search products</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tees, shorts, styles..."
            className="w-full border border-line bg-surface px-4 py-3 outline-accent rounded-md"
          />
        </label>
        <label className="mt-4 block max-w-md">
          <span className="mb-2 block text-sm font-bold">Category</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="w-full border border-line bg-surface px-4 py-3 outline-accent"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 grid max-w-md grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Min price (₹)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="No minimum"
              className="w-full border border-line bg-surface px-4 py-3 outline-accent"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold">Max price (₹)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="No maximum"
              className="w-full border border-line bg-surface px-4 py-3 outline-accent"
            />
          </label>
        </div>

        {invalidPriceRange && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            Minimum price cannot exceed maximum price.
          </p>
        )}
        <label className="mt-4 block max-w-md">
          <span className="mb-2 block text-sm font-bold">Sort by</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="w-full border border-line bg-surface px-4 py-3 outline-accent"
          >
            <option value="newest">Newest first</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </label>
        {loading && <p className="mt-8">Loading products…</p>}
        {error && (
          <p role="alert" className="mt-8 text-red-700">
            {error}
          </p>
        )}
        {!loading && !error && products.length === 0 && (
          <p className="mt-8">New pieces are coming soon.</p>
        )}
        {!loading &&
          !error &&
          products.length > 0 &&
          displayedProducts.length === 0 && (
            <p className="mt-8">No products match these filters.</p>
          )}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayedProducts?.map((product) => {
            const imagePath = product.image_paths?.[0];
            const imageUrl = imagePath
              ? supabase.storage.from("product-images").getPublicUrl(imagePath)
                  .data.publicUrl
              : null;

            return (
              <article key={product.id} className="bg-surface">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  className="block w-full text-left"
                  aria-label={`View details for ${product.name}`}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/5] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/5] items-center justify-center bg-line text-muted">
                      Image coming soon
                    </div>
                  )}

                  <div className="p-5">
                    <p className="text-xs font-bold tracking-widest text-accent uppercase">
                      {product.categories?.name ?? "ss.collection"}
                    </p>
                    <h3 className="mt-2 text-xl font-bold">{product.name}</h3>
                    <p className="mt-2 text-lg font-bold">
                      {formatPrice.format(product.price_paise / 100)}
                    </p>
                    
                  </div>
                </button>
              </article>
            );
          })}
        </div>
        {selectedProduct && (
          <ProductDrawer
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </div>
    </section>
  );
}
