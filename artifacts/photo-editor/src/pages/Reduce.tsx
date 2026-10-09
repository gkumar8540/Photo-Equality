
import React, { useEffect, useState } from "react";

type Format = "image/jpeg" | "image/webp" | "image/png";

const bytes = (n: number) =>
  n < 1024 * 1024
    ? `${(n / 1024).toFixed(1)} KB`
    : `${(n / 1024 / 1024).toFixed(2)} MB`;

const load = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const encodeCanvas = (
  canvas: HTMLCanvasElement,
  format: Format,
  quality: number
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Image encoding failed"));
          return;
        }

        if (result.type !== format) {
          reject(new Error("This image format is not supported by this browser."));
          return;
        }

        resolve(result);
      },
      format,
      format === "image/png" ? undefined : quality
    );
  });

export default function Reduce() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [output, setOutput] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);

  const [target, setTarget] = useState(200);
  const [quality, setQuality] = useState(75);
  const [format, setFormat] = useState<Format>("image/jpeg");
  const [maxWidth, setMaxWidth] = useState(1920);

  const [popup, setPopup] = useState<
    "size" | "format" | "quality" | "resize" | null
  >(null);

  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
      if (output) URL.revokeObjectURL(output);
    };
  }, [url, output]);

  const choose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setStatus("Please select a valid image.");
      e.target.value = "";
      return;
    }

    if (url) URL.revokeObjectURL(url);
    if (output) URL.revokeObjectURL(output);

    setFile(selected);
    setUrl(URL.createObjectURL(selected));
    setOutput("");
    setBlob(null);
    setStatus("");
    setDownloadSuccess(false);

    e.target.value = "";
  };

  const compress = async () => {
    if (!file || !url || working) return;

    setWorking(true);
    setStatus("Compressing image...");

    try {
      const img = await load(url);
      const targetBytes = Math.max(10, target) * 1024;

      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;

      if (!originalWidth || !originalHeight) {
        throw new Error("Invalid image dimensions");
      }

      let width = Math.max(
        1,
        Math.min(originalWidth, Math.floor(maxWidth))
      );

      let height = Math.max(
        1,
        Math.round(originalHeight * (width / originalWidth))
      );

      let result: Blob | null = null;

      // Repeatedly reduce quality, then dimensions if needed.
      for (let attempt = 0; attempt < 35; attempt++) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");

        if (format !== "image/png") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        let bestUnderTarget: Blob | null = null;
        let smallestResult: Blob | null = null;

        const qualityValues =
          format === "image/png"
            ? [1]
            : Array.from({ length: 17 }, (_, i) =>
                Math.max(0.1, quality / 100 - i * 0.05)
              );

        const uniqueQualities = [...new Set(qualityValues)];

        for (const q of uniqueQualities) {
          const encoded = await encodeCanvas(canvas, format, q);

          if (!smallestResult || encoded.size < smallestResult.size) {
            smallestResult = encoded;
          }

          if (encoded.size <= targetBytes) {
            // Keep the highest quality that meets the target.
            bestUnderTarget = encoded;
            break;
          }
        }

        result = bestUnderTarget || smallestResult;

        if (!result) {
          throw new Error("Could not create the output image");
        }

        if (result.size <= targetBytes) break;

        if (width === 1 && height === 1) break;

        const scale = Math.min(
          0.9,
          Math.sqrt(targetBytes / result.size) * 0.9
        );

        const nextWidth = Math.max(1, Math.floor(width * scale));
        const nextHeight = Math.max(1, Math.floor(height * scale));

        if (nextWidth === width && nextHeight === height) {
          if (width >= height && width > 1) {
            width--;
          } else if (height > 1) {
            height--;
          } else {
            break;
          }
        } else {
          width = nextWidth;
          height = nextHeight;
        }
      }

      if (!result) {
        throw new Error("Compression failed");
      }

      if (output) URL.revokeObjectURL(output);

      const outputUrl = URL.createObjectURL(result);

      setBlob(result);
      setOutput(outputUrl);
      setDownloadSuccess(false);

      setStatus(
        result.size <= targetBytes
          ? `Done • ${bytes(result.size)}`
          : `Closest result • ${bytes(result.size)}. Try a larger target size.`
      );
    } catch (error) {
      console.error("Compression failed:", error);
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not compress this image."
      );
    } finally {
      setWorking(false);
    }
  };

  const download = () => {
    if (!blob || !output) {
      throw new Error("Please compress an image first.");
    }

    const extension =
      format === "image/png"
        ? "png"
        : format === "image/webp"
          ? "webp"
          : "jpg";

    const name =
      file?.name.replace(/\.[^/.]+$/, "").replace(/[^\w-]+/g, "-") ||
      "image";

    const a = document.createElement("a");
    a.href = output;
    a.download = `${name}-reduced.${extension}`;

    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownload = async () => {
    if (!blob || !output || isDownloading) return;

    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      // Allow the spinner to render before starting the download.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 250));

      download();
      setDownloadSuccess(true);

      window.setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (error) {
      console.error("Download failed:", error);
      setStatus("Download could not be started.");
    } finally {
      setIsDownloading(false);
    }
  };

  const reset = () => {
    if (url) URL.revokeObjectURL(url);
    if (output) URL.revokeObjectURL(output);

    setFile(null);
    setUrl("");
    setOutput("");
    setBlob(null);
    setStatus("");
    setDownloadSuccess(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-[#0c1d39] px-3 py-3 text-white">
      <div className="mx-auto flex h-full max-w-4xl flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between py-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-lg border border-[#35445a] px-1 py-0 text-sm"
          >
            ←Back
          </button>

          <h1 className="text-lg font-bold sm:text-2xl">
            Reduce Image KB
          </h1>

          <div className="w-[55px]" />
        </div>

        {/* Preview */}
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="flex h-[min(62vh,560px)] w-full items-center justify-center overflow-hidden rounded-2xl border border-[#34445b] bg-[#101a29] p-4">
            {!url ? (
              <label className="cursor-pointer rounded-xl border-2 border-dashed border-[#46566e] px-8 py-12 text-center">
                <div className="text-5xl">📉</div>
                <div className="mt-3 font-semibold">Upload Image</div>
                <div className="mt-1 text-xs text-gray-400">
                  JPG, PNG or WebP
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={choose}
                  className="hidden"
                />
              </label>
            ) : (
              <img
                src={output || url}
                alt="Preview"
                className="max-h-full max-w-full rounded object-contain"
              />
            )}
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className="shrink-0 py-2 text-center text-xs text-gray-400">
            {status}
          </div>
        )}

        {/* Buttons */}
        <div className="shrink-0 py-2">
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPopup("size")}
              className="rounded-xl border border-[#35445a] bg-[#141f30] py-3 text-xs"
            >
              📦
              <span className="mt-1 block">Size</span>
            </button>

            <button
              type="button"
              onClick={() => setPopup("format")}
              className="rounded-xl border border-[#35445a] bg-[#141f30] py-3 text-xs"
            >
              🖼️
              <span className="mt-1 block">Format</span>
            </button>

            <button
              type="button"
              onClick={() => setPopup("quality")}
              className="rounded-xl border border-[#35445a] bg-[#141f30] py-3 text-xs"
            >
              ⚙️
              <span className="mt-1 block">Quality</span>
            </button>

            <button
              type="button"
              onClick={() => setPopup("resize")}
              className="rounded-xl border border-[#35445a] bg-[#141f30] py-3 text-xs"
            >
              📐
              <span className="mt-1 block">Resize</span>
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!file || working}
              onClick={compress}
              className="rounded-xl bg-[#f3ad61] py-3 font-semibold text-[#111827] disabled:opacity-40"
            >
              {working ? "Processing..." : "Reduce Size"}
            </button>

            <button
              type="button"
              disabled={!blob || isDownloading}
              onClick={handleDownload}
              className={`flex items-center justify-center gap-2 rounded-xl border py-3 font-semibold text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                downloadSuccess
                  ? "border-green-500 bg-green-600"
                  : "border-[#46566e] hover:bg-[#1d2b40]"
              }`}
            >
              {isDownloading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-90"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Processing
                </>
              ) : downloadSuccess ? (
                <>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12l4 4L19 6" />
                  </svg>
                  Downloaded
                </>
              ) : (
                "Download"
              )}
            </button>
          </div>
        </div>

        {/* Popup */}
        {popup && (
          <div
            onClick={() => setPopup(null)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-[#3a4a60] bg-[#141f30] p-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-semibold">
                  {popup === "size" && "Target Size"}
                  {popup === "format" && "Output Format"}
                  {popup === "quality" && "Image Quality"}
                  {popup === "resize" && "Maximum Width"}
                </h2>

                <button
                  type="button"
                  onClick={() => setPopup(null)}
                  className="text-xl text-gray-400"
                >
                  ×
                </button>
              </div>

              {/* Size */}
              {popup === "size" && (
                <>
                  
<input
  type="number"
  min="10"
  placeholder="Min-10"
  value={target === 0 ? "" : target}
  onChange={(e) =>
    setTarget(
      e.target.value === "" ? 0 : Math.max(0, Number(e.target.value))
    )
  }
  className="w-full rounded-sm  bg-[#0d1929] p-3 outline-none"
/>


                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {[50, 100, 200, 500].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setTarget(n);
                          setPopup(null);
                        }}
                        className="rounded-lg border border-[#35445a] p-2 text-xs"
                      >
                        {n} KB
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Format */}
              {popup === "format" && (
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["image/jpeg", "JPG"],
                      ["image/webp", "WebP"],
                      ["image/png", "PNG"],
                    ] as [Format, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setFormat(value);
                        setPopup(null);
                      }}
                      className={`rounded-xl border p-4 ${
                        format === value
                          ? "border-[#f3ad61] text-[#f3ad61]"
                          : "border-[#35445a]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Quality */}
              {popup === "quality" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Quality</span>
                    <span>{quality}%</span>
                  </div>

                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="mt-4 w-full accent-[#f3ad61]"
                  />

                  {format === "image/png" && (
                    <p className="mt-2 text-xs text-gray-400">
                      PNG does not support the quality slider. Dimensions may
                      be reduced to meet the target size.
                    </p>
                  )}
                </>
              )}

              {/* Resize */}
              {popup === "resize" && (
                <>
                  <label className="text-sm text-gray-400">
                    Maximum Width
                  </label>

                  <input
                    type="number"
                    min="100"
                    value={maxWidth}
                    onChange={(e) =>
                      setMaxWidth(Math.max(100, Number(e.target.value) || 100))
                    }
                    className="mt-2 w-full rounded-xl bg-[#0d1929] p-3 outline-none"
                  />
                </>
              )}

              <button
                type="button"
                onClick={() => setPopup(null)}
                className="mt-5 w-full rounded-xl bg-[#f3ad61] py-3 font-semibold text-[#111827]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

