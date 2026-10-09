import React, { useEffect, useRef, useState } from "react";

type Format = "image/jpeg" | "image/webp" | "image/png";

function formatBytes(bytes: number) {
  if (!bytes) return "0 KB";

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = reject;

    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: Format,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      format,
      format === "image/png" ? undefined : quality / 100
    );
  });
}

export default function Increase() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [outputUrl, setOutputUrl] = useState("");
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);

  const [targetKB, setTargetKB] = useState(500);

  const [format, setFormat] = useState<Format>("image/jpeg");

  const [quality, setQuality] = useState(95);

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [sourceWidth, setSourceWidth] = useState(0);
  const [sourceHeight, setSourceHeight] = useState(0);

  const [resizeMode, setResizeMode] = useState<
    "auto" | "custom"
  >("auto");

const [isDownloading, setIsDownloading] = useState(false);
const [downloadSuccess, setDownloadSuccess] = useState(false);
const handleDownload = async () => {
  if (!outputBlob || isDownloading) return;

  setIsDownloading(true);
  setDownloadSuccess(false);

  try {
    await download();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  } catch (error) {
    console.error("Download failed:", error);
  } finally {
    setIsDownloading(false);
  }
};

  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);

  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);

      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [preview, outputUrl]);

  const handleFile = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = event.target.files?.[0];

    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setStatus("Please select a valid image.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);

    if (outputUrl) URL.revokeObjectURL(outputUrl);

    const url = URL.createObjectURL(selected);

    setFile(selected);
    setPreview(url);

    setOutputUrl("");
    setOutputBlob(null);

    setStatus("");

    const img = new Image();

    img.onload = () => {
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      setSourceWidth(img.naturalWidth);
      setSourceHeight(img.naturalHeight);

      setCustomWidth(img.naturalWidth);
      setCustomHeight(img.naturalHeight);

      // Keep the selected image URL alive for the preview and processing.
    };

    img.src = url;
  };

  const getTargetDimensions = () => {
    if (resizeMode === "custom") {
      return {
        width: Math.max(100, Math.min(10000, customWidth)),
        height: Math.max(100, Math.min(10000, customHeight)),
      };
    }

    return {
      width: sourceWidth || width || customWidth,
      height: sourceHeight || height || customHeight,
    };
  };

  const createBlob = async (
    img: HTMLImageElement,
    canvasWidth: number,
    canvasHeight: number,
    q: number
  ) => {
    const canvas = document.createElement("canvas");

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    /*
      JPEG/WebP cannot preserve transparency reliably in the
      same way PNG can, so use white background.
    */
    if (format !== "image/png") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      img,
      0,
      0,
      canvasWidth,
      canvasHeight
    );

    return canvasToBlob(canvas, format, q);
  };

  const increaseImage = async () => {
    if (!file || !preview) {
      setStatus("Please upload an image first.");
      return;
    }

    try {
      setProcessing(true);
      setStatus("Preparing larger image...");

      const img = await loadImage(preview);
      const targetBytes = Math.max(10 * 1024, targetKB * 1024);
      const initial = getTargetDimensions();

      let currentWidth = Math.max(100, Math.min(10000, Math.round(initial.width)));
      let currentHeight = Math.max(100, Math.min(10000, Math.round(initial.height)));

      let blob = await createBlob(img, currentWidth, currentHeight, quality);
      if (!blob) throw new Error("Could not create output image.");

      if (resizeMode === "auto" && blob.size < targetBytes) {
        let lastSmallerBlob = blob;
        let lastSmallerWidth = currentWidth;
        let lastSmallerHeight = currentHeight;
        let reachedTarget = false;

        // Increase dimensions progressively while staying within practical limits.
        for (let i = 0; i < 24; i++) {
          const nextWidth = Math.min(10000, Math.max(currentWidth + 1, Math.round(currentWidth * 1.18)));
          const nextHeight = Math.min(10000, Math.max(currentHeight + 1, Math.round(currentHeight * 1.18)));

          if (nextWidth === currentWidth && nextHeight === currentHeight) break;

          const candidate = await createBlob(img, nextWidth, nextHeight, quality);
          if (!candidate) break;

          currentWidth = nextWidth;
          currentHeight = nextHeight;
          blob = candidate;

          if (candidate.size >= targetBytes) {
            reachedTarget = true;
            break;
          }

          lastSmallerBlob = candidate;
          lastSmallerWidth = currentWidth;
          lastSmallerHeight = currentHeight;

          if (currentWidth >= 10000 || currentHeight >= 10000) break;
        }

        // Binary-search dimensions to get closer to the requested size.
        if (reachedTarget) {
          let lowScale = 1;
          let highScale = 1.18;
          let bestBlob = blob;
          let bestWidth = currentWidth;
          let bestHeight = currentHeight;

          for (let i = 0; i < 8; i++) {
            const scale = (lowScale + highScale) / 2;
            const candidateWidth = Math.max(
              lastSmallerWidth,
              Math.min(currentWidth, Math.round((sourceWidth || initial.width) * scale))
            );
            const candidateHeight = Math.max(
              lastSmallerHeight,
              Math.min(currentHeight, Math.round((sourceHeight || initial.height) * scale))
            );

            const candidate = await createBlob(img, candidateWidth, candidateHeight, quality);
            if (!candidate) break;

            if (candidate.size >= targetBytes) {
              bestBlob = candidate;
              bestWidth = candidateWidth;
              bestHeight = candidateHeight;
              highScale = scale;
            } else {
              lowScale = scale;
            }
          }

          blob = bestBlob;
          currentWidth = bestWidth;
          currentHeight = bestHeight;
        } else {
          blob = lastSmallerBlob;
          currentWidth = lastSmallerWidth;
          currentHeight = lastSmallerHeight;
        }
      }

      if (outputUrl) URL.revokeObjectURL(outputUrl);

      const url = URL.createObjectURL(blob);
      setOutputBlob(blob);
      setOutputUrl(url);
      setWidth(currentWidth);
      setHeight(currentHeight);

      if (blob.size >= targetBytes) {
        setStatus(`Done — output is ${formatBytes(blob.size)}.`);
      } else if (resizeMode === "custom") {
        setStatus(
          `Created ${formatBytes(blob.size)} at the selected dimensions. Custom dimensions are fixed, so the target KB may not be reached.`
        );
      } else {
        setStatus(
          `Maximum practical size reached: ${formatBytes(blob.size)}. This image/format may not reach the requested KB within browser-safe limits.`
        );
      }
    } catch (error) {
      console.error("Increase image size failed:", error);
      setStatus("Could not create the larger image. Try a smaller image or different format.");
    } finally {
      setProcessing(false);
    }
  };

  const download = () => {
    if (!outputBlob || !outputUrl) {
      setStatus("Create the larger image first.");
      return;
    }

    const extension =
      format === "image/png"
        ? "png"
        : format === "image/webp"
        ? "webp"
        : "jpg";

    const originalName =
      file?.name.replace(/\.[^/.]+$/, "") ||
      "image";

    const link = document.createElement("a");

    link.href = outputUrl;

    link.download = `${originalName}-increased.${extension}`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setStatus("Image downloaded.");
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);

    if (outputUrl) URL.revokeObjectURL(outputUrl);

    setFile(null);
    setPreview("");

    setOutputUrl("");
    setOutputBlob(null);

    setTargetKB(500);

    setFormat("image/jpeg");

    setQuality(95);

    setWidth(0);
    setHeight(0);
    setSourceWidth(0);
    setSourceHeight(0);

    setResizeMode("auto");

    setCustomWidth(1920);
    setCustomHeight(1080);

    setStatus("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1d39] px-4 py-4 text-white">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-2">
          <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mb-1 rounded-lg border border-[#303b4d] bg-[#172844] px-1 py-0 text-sm text-gray-200 transition hover:bg-[#213553]"
          >
            ←Back
          </button>

          <h1 className="text-[18px] font-bold sm:text-3xl">
            Increase Image Size
          </h1>
          </div>

          <p className="mt-1 text-[12px] text-gray-400">
            Increase image size in KB while maintaining best quality.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Preview */}
          <section className="rounded-2xl border border-[#303b4d] bg-[#141f30] p-3 shadow-xl sm:p-6">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  Preview
                </h2>

                {file && (
                  <p className="mt-1 text-xs text-gray-400">
                    Original: {formatBytes(file.size)}
                  </p>
                )}
              </div>

              {outputBlob && (
                <span className="rounded-full bg-[#173a2b] px-3 py-1 text-xs text-green-300">
                  {formatBytes(outputBlob.size)}
                </span>
              )}
            </div>

            <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-[#303b4d] bg-[#0a1424] p-4">
              {!preview ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#46566e] px-8 py-16 text-center transition hover:border-[#f3ad61]">
                  <div className="mb-4 text-5xl">
                    📈
                  </div>

                  <div className="text-lg font-semibold">
                    Upload an image
                  </div>

                  <div className="mt-2 text-sm text-gray-400">
                    JPG, PNG or WebP
                  </div>

                  <span className="mt-5 rounded-lg bg-[#f3ad61] px-5 py-2.5 font-semibold text-[#111827]">
                    Choose Image
                  </span>

                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="w-full">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs text-gray-400">
                        Original
                      </p>

                      <div className="flex min-h-[300px] items-center justify-center rounded-lg bg-[#111b2a] p-3">
                        <img
                          src={preview}
                          alt="Original"
                          className="max-h-[400px] max-w-full rounded object-contain"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs text-gray-400">
                        Increased
                      </p>

                      <div className="flex min-h-[300px] items-center justify-center rounded-lg bg-[#111b2a] p-3">
                        {outputUrl ? (
                          <img
                            src={outputUrl}
                            alt="Increased"
                            className="max-h-[400px] max-w-full rounded object-contain"
                          />
                        ) : (
                          <span className="text-sm text-gray-500">
                            Create output to preview
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <label className="cursor-pointer rounded-lg bg-[#f3ad61] px-4 py-2 text-sm font-semibold text-[#111827]">
                      Change Image

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFile}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={reset}
                      className="rounded-lg border border-[#46566e] px-4 py-2 text-sm text-gray-200 hover:bg-[#1d2b40]"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>

            {status && (
              <div className="mt-4 rounded-lg border border-[#34445b] bg-[#101b2b] px-4 py-3 text-sm text-gray-300">
                {status}
              </div>
            )}
          </section>

          {/* Controls */}
          <aside className="rounded-2xl border border-[#303b4d] bg-[#141f30] p-4 shadow-xl sm:p-5">
            <h2 className="mb-5 text-lg font-semibold">
              Size Settings
            </h2>

            {/* Target */}
            <div className="mb-5">
              <label className="mb-2 block text-sm text-gray-300">
                Target File Size
              </label>

              <div className="flex items-center gap-2">
                
<input
  type="number"
  min="10"
  placeholder="Min-10"
  max="50000"
  value={targetKB === 0 ? "" : targetKB}
  onChange={(e) =>
    setTargetKB(
      e.target.value === ""
        ? 0
        : Math.max(0, Math.min(50000, Number(e.target.value)))
    )
  }
  className="w-full rounded-sm  bg-[#0d1929] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f3ad61]"
/>


                <span className="text-sm text-gray-400">
                  KB
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {[200, 500, 1000, 2000].map(
                  (size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        setTargetKB(size)
                      }
                      className={`rounded-md border px-2.5 py-1 text-xs ${
                        targetKB === size
                          ? "border-[#f3ad61] text-[#f3ad61]"
                          : "border-[#3a4a60] text-gray-400"
                      }`}
                    >
                      {size >= 1000
                        ? `${size / 1000} MB`
                        : `${size} KB`}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Format */}
            <div className="mb-5">
              <label className="mb-2 block text-sm text-gray-300">
                Output Format
              </label>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["image/jpeg", "JPG"],
                    ["image/webp", "WebP"],
                    ["image/png", "PNG"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormat(value)}
                    className={`rounded-lg border px-2 py-2 text-sm ${
                      format === value
                        ? "border-[#f3ad61] bg-[#2c2a26] text-[#f3ad61]"
                        : "border-[#3a4a60] text-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            {format !== "image/png" && (
              <div className="mb-5">
                <div className="mb-2 flex justify-between">
                  <label className="text-sm text-gray-300">
                    Quality
                  </label>

                  <span className="text-xs text-gray-400">
                    {quality}%
                  </span>
                </div>

                <input
                  type="range"
                  min="50"
                  max="100"
                  value={quality}
                  onChange={(e) =>
                    setQuality(
                      Number(e.target.value)
                    )
                  }
                  className="w-full accent-[#f3ad61]"
                />
              </div>
            )}

            {/* Dimensions */}
            <div className="mb-5 rounded-xl border border-[#303b4d] bg-[#101a29] p-4">
              <div className="mb-3">
                <div className="text-sm font-medium">
                  Dimensions
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  Larger dimensions can create a larger
                  file size.
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setResizeMode("auto")
                  }
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    resizeMode === "auto"
                      ? "border-[#f3ad61] text-[#f3ad61]"
                      : "border-[#3a4a60] text-gray-400"
                  }`}
                >
                  Automatic
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setResizeMode("custom")
                  }
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    resizeMode === "custom"
                      ? "border-[#f3ad61] text-[#f3ad61]"
                      : "border-[#3a4a60] text-gray-400"
                  }`}
                >
                  Custom
                </button>
              </div>

              {resizeMode === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">
                      Width
                    </label>

                    <input
                      type="number"
                      min="100"
                      max="10000"
                      value={customWidth}
                      onChange={(e) =>
                        setCustomWidth(
                          Math.max(
                            100,
                            Number(e.target.value)
                          )
                        )
                      }
                      className="w-full rounded-lg border border-[#3a4a60] bg-[#0d1929] px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-400">
                      Height
                    </label>

                    <input
                      type="number"
                      min="100"
                      max="10000"
                      value={customHeight}
                      onChange={(e) =>
                        setCustomHeight(
                          Math.max(
                            100,
                            Number(e.target.value)
                          )
                        )
                      }
                      className="w-full rounded-lg border border-[#3a4a60] bg-[#0d1929] px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
              )}

              <div className="mt-3 text-xs text-gray-500">
                Current output:{" "}
                {width && height
                  ? `${width} × ${height}px`
                  : "—"}
              </div>
            </div>

            {/* Info */}
            <div className="mb-5 rounded-lg bg-[#0e1a2a] p-3 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Original</span>

                <span>
                  {file
                    ? formatBytes(file.size)
                    : "—"}
                </span>
              </div>

              <div className="mt-2 flex justify-between">
                <span>Target</span>

                <span>
                  {targetKB} KB
                </span>
              </div>

              <div className="mt-2 flex justify-between">
                <span>Output</span>

                <span>
                  {outputBlob
                    ? formatBytes(
                        outputBlob.size
                      )
                    : "—"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <button
              type="button"
              disabled={!file || processing}
              onClick={increaseImage}
              className="w-full rounded-lg bg-[#f3ad61] px-4 py-3 font-semibold text-[#111827] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {processing
                ? "Creating..."
                : "Increase Image Size"}
            </button>

  <button
  type="button"
  disabled={!outputBlob || isDownloading}
  onClick={handleDownload}
  className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 font-semibold text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
    downloadSuccess
      ? "border-green-500 bg-green-600 hover:bg-green-600"
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
      Downloading...
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
      Download Successfull
    </>
  ) : (
    "Download Image"
  )}
</button>
          </aside>
        </div>
      </div>
    </div>
  );
}

