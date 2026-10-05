import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  notifyProductChanged,
  subscribeToProductChanges,
} from "./lib/catalogEvents";

const bucket = "product-images";
const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export default function ProductImages() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [file, setFile] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInput = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadDrafts() {
      const { data, error: loadError } = await supabase
        .from("products")
        .select("id, name, sku, image_paths, is_active")
        .order("created_at", { ascending: false });

      if (!active) return;

      if (loadError) {
        setError(loadError.message);
        return;
      }

      setProducts(data);
      setProductId(data[0]?.id ?? "");
    }

    loadDrafts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return subscribeToProductChanges(({ type, product }) => {
      if (!product?.id) return;

      setProducts((current) => {
        if (type === "deleted") {
          return current.filter((item) => item.id !== product.id);
        }

        const exists = current.some((item) => item.id === product.id);

        if (!exists) {
          return [product, ...current];
        }

        return current.map((item) =>
          item.id === product.id ? { ...item, ...product } : item,
        );
      });

      if (type === "created") {
        setProductId(product.id);
      }
    });
  }, []);
  const selected = products.find((product) => product.id === productId);
  async function handleUpload(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selected || !file) return;

    const extension = extensions[file.type];

    if (!extension || file.size > 2 * 1024 * 1024) {
      setError("Choose a JPG, PNG, or WebP image under 2 MB.");
      return;
    }

    setPending(true);

    const path = `products/${selected.id}/${crypto.randomUUID()}.${extension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: updated, error: saveError } = await supabase
        .from("products")
        .update({
          image_paths: [...(selected.image_paths ?? []), path],
        })
        .eq("id", selected.id)
        .select("id, image_paths")
        .single();

      if (saveError) {
        const { error: cleanupError } = await supabase.storage
          .from(bucket)
          .remove([path]);

        throw new Error(
          cleanupError
            ? `Image was uploaded but could not be attached or removed: ${saveError.message}`
            : saveError.message,
        );
      }

      setProducts((current) =>
        current.map((product) =>
          product.id === updated.id
            ? { ...product, image_paths: updated.image_paths }
            : product,
        ),
      );
      notifyProductChanged({
        type: "updated",
        product: {
          ...selected,
          image_paths: updated.image_paths,
        },
      });
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setMessage(`Image added to ${selected.name}.`);
    } catch (uploadOrSaveError) {
      setError(uploadOrSaveError.message);
    } finally {
      setPending(false);
    }
  }
  async function handleReplace(oldPath, replacement) {
    if (!selected || !replacement) return;

    setError("");
    setMessage("");

    const extension = extensions[replacement.type];

    if (!extension || replacement.size > 2 * 1024 * 1024) {
      setError("Choose a JPG, PNG, or WebP image under 2 MB.");
      return;
    }

    setPending(true);

    const productId = selected.id;
    const productName = selected.name;
    const newPath = `products/${productId}/${crypto.randomUUID()}.${extension}`;
    let uploaded = false;

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(newPath, replacement, {
          contentType: replacement.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploaded = true;

      const { data: current, error: readError } = await supabase
        .from("products")
        .select("image_paths")
        .eq("id", productId)
        .single();

      if (readError) throw readError;

      const nextPaths = [...(current.image_paths ?? [])];
      const position = nextPaths.indexOf(oldPath);

      if (position === -1) {
        throw new Error("This photo changed. Refresh the page and try again.");
      }

      nextPaths[position] = newPath;

      const { data: updated, error: saveError } = await supabase
        .from("products")
        .update({ image_paths: nextPaths })
        .eq("id", productId)
        .select("id, image_paths")
        .single();

      if (saveError) throw saveError;
      uploaded = false;

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === updated.id
            ? { ...product, image_paths: updated.image_paths }
            : product,
        ),
      );
      notifyProductChanged({
        type: "updated",
        product: {
          ...selected,
          image_paths: updated.image_paths,
        },
      });

      const { error: removalError } = await supabase.storage
        .from(bucket)
        .remove([oldPath]);

      if (removalError) {
        setError(
          `New photo saved, but the old file could not be removed: ` +
            `${removalError.message}. Old path: ${oldPath}`,
        );
        return;
      }

      setMessage(`Photo replaced for ${productName}.`);
    } catch (replaceError) {
      if (uploaded) {
        const { error: cleanupError } = await supabase.storage
          .from(bucket)
          .remove([newPath]);

        setError(
          cleanupError
            ? `${replaceError.message} Also remove this unused upload in Storage: ${newPath}`
            : replaceError.message,
        );
      } else {
        setError(replaceError.message);
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="mt-10 bg-surface p-6 sm:p-8">
      <h2 className="text-lg font-bold">Product images</h2>

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
          {pending ? "Uploading…" : "Upload image"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}

      {selected && (
        <div className="mt-6 flex flex-wrap gap-4">
          {(selected.image_paths ?? []).map((path) => {
            const { data } = supabase.storage.from(bucket).getPublicUrl(path);

            return (
              <div key={path}>
                <img
                  src={data.publicUrl}
                  alt={selected.name}
                  className="h-50 w-90 object-cover"
                />

                <label className="mt-2 block cursor-pointer text-sm font-bold underline">
                  Replace photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={pending}
                    className="sr-only"
                    onChange={(event) => {
                      const replacement = event.target.files?.[0];
                      event.target.value = "";
                      handleReplace(path, replacement);
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
