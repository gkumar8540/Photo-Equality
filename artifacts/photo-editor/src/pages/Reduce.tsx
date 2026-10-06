
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

export default function Reduce() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [output, setOutput] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);

  const [target, setTarget] = useState(200);
  const [quality, setQuality] = useState(75);
  const [format, setFormat] =
    useState<Format>("image/jpeg");
  const [maxWidth, setMaxWidth] = useState(1920);

  const [popup, setPopup] = useState<
    "size" | "format" | "quality" | "resize" | null
  >(null);

  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
      if (output) URL.revokeObjectURL(output);
    };
  }, [url, output]);

  const choose = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const f = e.target.files?.[0];

    if (!f) return;

    if (url) URL.revokeObjectURL(url);
    if (output) URL.revokeObjectURL(output);

    setFile(f);
    setUrl(URL.createObjectURL(f));
    setOutput("");
    setBlob(null);
    setStatus("");
  };

  const compress = async () => {
    if (!file || !url) return;

    setWorking(true);
    setStatus("Compressing image...");

    try {
      const img = await load(url);

      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (w > maxWidth) {
        const scale = maxWidth / w;

        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement("canvas");

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error();

      if (format !== "image/png") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(img, 0, 0, w, h);

      let q = quality / 100;
      let result: Blob | null = null;

      for (let i = 0; i < 8; i++) {
        result = await new Promise<Blob | null>(
          (resolve) =>
            canvas.toBlob(
              resolve,
              format,
              format === "image/png"
                ? undefined
                : q
            )
        );

        if (!result) break;

        if (result.size <= target * 1024) {
          break;
        }

        q -= 0.08;

        if (q < 0.2) {
          q = 0.2;
        }
      }

      if (!result) {
        throw new Error();
      }

      if (output) {
        URL.revokeObjectURL(output);
      }

      const outputUrl =
        URL.createObjectURL(result);

      setBlob(result);
      setOutput(outputUrl);

      setStatus(
        result.size <= target * 1024
          ? `Done • ${bytes(result.size)}`
          : `Closest result • ${bytes(result.size)}`
      );
    } catch {
      setStatus(
        "Could not compress this image."
      );
    } finally {
      setWorking(false);
    }
  };

  const download = () => {
    if (!blob || !output) return;

    const extension =
      format === "image/png"
        ? "png"
        : format === "image/webp"
        ? "webp"
        : "jpg";

    const name =
      file?.name.replace(/\.[^/.]+$/, "") ||
      "image";

    const a = document.createElement("a");

    a.href = output;
    a.download = `${name}-reduced.${extension}`;

    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const reset = () => {
    if (url) URL.revokeObjectURL(url);
    if (output) URL.revokeObjectURL(output);

    setFile(null);
    setUrl("");
    setOutput("");
    setBlob(null);
    setStatus("");
  };

  return (
    <div className="h-screen overflow-hidden bg-[#0c1d39] px-3 py-3 text-white">
      <div className="mx-auto flex h-full max-w-4xl flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between py-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-lg border border-[#35445a] px-3 py-2 text-sm"
          >
            ← Back
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
                <div className="text-5xl">
                  📉
                </div>

                <div className="mt-3 font-semibold">
                  Upload Image
                </div>

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
              <span className="mt-1 block">
                Size
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPopup("format")}
              className="rounded-xl border border-[#35445a] bg-[#141f30] py-3 text-xs"
            >
              🖼️
              <span className="mt-1 block">
                Format
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPopup("quality")}
              className="rounded-xl border border-[#35445a] bg-[#141f30] py-3 text-xs"
            >
              ⚙️
              <span className="mt-1 block">
                Quality
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPopup("resize")}
              className="rounded-xl border border-[#35445a] bg-[#141f30] py-3 text-xs"
            >
              📐
              <span className="mt-1 block">
                Resize
              </span>
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!file || working}
              onClick={compress}
              className="rounded-xl bg-[#f3ad61] py-3 font-semibold text-[#111827] disabled:opacity-40"
            >
              {working
                ? "Processing..."
                : "Reduce Size"}
            </button>

            <button
              type="button"
              disabled={!blob}
              onClick={download}
              className="rounded-xl border border-[#46566e] py-3 font-semibold disabled:opacity-40"
            >
              Download
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
                  {popup === "size" &&
                    "Target Size"}

                  {popup === "format" &&
                    "Output Format"}

                  {popup === "quality" &&
                    "Image Quality"}

                  {popup === "resize" &&
                    "Maximum Width"}
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
                    value={target}
                    onChange={(e) =>
                      setTarget(
                        Math.max(
                          10,
                          Number(e.target.value)
                        )
                      )
                    }
                    className="w-full rounded-xl bg-[#0d1929] p-3 outline-none"
                  />

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {[50, 100, 200, 500].map(
                      (n) => (
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
                      )
                    )}
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
                    onChange={(e) =>
                      setQuality(
                        Number(e.target.value)
                      )
                    }
                    className="mt-4 w-full accent-[#f3ad61]"
                  />
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
                      setMaxWidth(
                        Math.max(
                          100,
                          Number(e.target.value)
                        )
                      )
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

