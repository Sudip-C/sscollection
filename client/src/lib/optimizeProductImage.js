import imageCompression from "browser-image-compression";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSourceSize = 10 * 1024 * 1024;

export async function optimizeProductImage(file, onProgress) {
  if (!file || !allowedTypes.has(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }

  if (file.size > maxSourceSize) {
    throw new Error("Choose an image under 10 MB.");
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.85,
    preserveExif: false,
    onProgress,
  });

  const baseName =
    file.name
      .replace(/\.[^.]+$/, "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-") || "product-image";

  return {
    file: new File([compressed], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    }),
    originalSize: file.size,
    optimizedSize: compressed.size,
  };
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;

  return `${(kilobytes / 1024).toFixed(2)} MB`;
}
