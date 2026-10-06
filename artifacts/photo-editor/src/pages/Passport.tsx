import React, { useEffect, useRef, useState } from "react";

type Preset = "india" | "us" | "2x2" | "custom";
type Bg = "white" | "black" | "blue";

const presets = {
  india: { name: "India Passport", w: 35, h: 45 },
  us: { name: "US Passport", w: 51, h: 51 },
  "2x2": { name: "2 × 2 Inch", w: 51, h: 51 },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function Passport() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const [preset, setPreset] = useState<Preset>("india");
  const [customW, setCustomW] = useState(35);
  const [customH, setCustomH] = useState(45);
  const [bg, setBg] = useState<Bg>("white");
  const [copies, setCopies] = useState(1);
  const [quality, setQuality] = useState(95);

  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [popup, setPopup] = useState<
    "size" | "background" | "copies" | "quality" | null
  >(null);

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [imageUrl, previewUrl]);

  const getSize = () => {
    if (preset === "custom") {
      return { w: customW, h: customH };
    }

    return presets[preset];
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    const url = URL.createObjectURL(selected);

    setFile(selected);
    setImageUrl(url);
    setPreviewUrl(url);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const getBg = () => {
    if (bg === "black") return "#000000";
    if (bg === "blue") return "#3b82f6";
    return "#ffffff";
  };

  const createCanvas = async () => {
    if (!imageUrl) return null;

    const img = await loadImage(imageUrl);
    const { w, h } = getSize();

    const dpi = 300;
    const canvasW = Math.round((w / 25.4) * dpi);
    const canvasH = Math.round((h / 25.4) * dpi);

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = getBg();
    ctx.fillRect(0, 0, canvasW, canvasH);

    const scale = Math.max(
      canvasW / img.width,
      canvasH / img.height
    );

    const drawW = img.width * scale * zoom;
    const drawH = img.height * scale * zoom;

    const x = (canvasW - drawW) / 2 + offsetX * 2;
    const y = (canvasH - drawH) / 2 + offsetY * 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(img, x, y, drawW, drawH);

    return canvas;
  };

  const processPreview = async () => {
    if (!imageUrl) return;

    const canvas = await createCanvas();
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);

        setPreviewUrl((old) => {
          if (old && old !== imageUrl) {
            URL.revokeObjectURL(old);
          }
          return url;
        });
      },
      "image/jpeg",
      quality / 100
    );
  };

  const download = async () => {
    if (!file) return;

    setProcessing(true);

    try {
      const canvas = await createCanvas();
      if (!canvas) return;

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");

          const name =
            file.name.replace(/\.[^/.]+$/, "") ||
            "passport";

          a.href = url;
          a.download = `${name}-passport.jpg`;
          a.click();

          URL.revokeObjectURL(url);
          setProcessing(false);
        },
        "image/jpeg",
        quality / 100
      );
    } catch {
      setProcessing(false);
    }
  };

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (previewUrl && previewUrl !== imageUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setImageUrl("");
    setPreviewUrl("");
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const size = getSize();

  return (
    <div className="h-screen overflow-hidden bg-[#0c1d39] px-3 py-3 text-white">
      <div className="mx-auto flex h-full max-w-4xl flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between py-2">
          <button
            onClick={() => window.history.back()}
            className="rounded-lg border border-[#35445a] px-3 py-2 text-sm"
          >
            ← Back
          </button>

          <h1 className="text-lg font-bold sm:text-2xl">
            Passport Photo
          </h1>

          <div className="w-[55px]" />
        </div>

        {/* Preview */}
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="relative flex h-[min(62vh,560px)] w-full items-center justify-center overflow-hidden rounded-2xl border border-[#34445b] bg-[#101a29]">
            {!imageUrl ? (
              <label className="cursor-pointer rounded-xl border-2 border-dashed border-[#46566e] px-8 py-12 text-center">
                <div className="text-5xl">📷</div>
                <div className="mt-3 font-semibold">
                  Upload Photo
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  JPG, PNG or WebP
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="hidden"
                />
              </label>
            ) : (
              <div
                className="flex h-[80%] max-h-[500px] aspect-[35/45] items-center justify-center overflow-hidden border border-white/30 shadow-2xl"
                style={{ backgroundColor: getBg() }}
              >
                <img
                  src={previewUrl || imageUrl}
                  alt="Passport preview"
                  className="h-full w-full object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="shrink-0 py-3">
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setPopup("size")}
              className="rounded-xl border border-[#35445a] bg-[#141f30] px-2 py-3 text-xs"
            >
              📐
              <span className="mt-1 block">Size</span>
            </button>

            <button
              onClick={() => setPopup("background")}
              className="rounded-xl border border-[#35445a] bg-[#141f30] px-2 py-3 text-xs"
            >
              🎨
              <span className="mt-1 block">Background</span>
            </button>

            <button
              onClick={() => setPopup("copies")}
              className="rounded-xl border border-[#35445a] bg-[#141f30] px-2 py-3 text-xs"
            >
              📄
              <span className="mt-1 block">Copies</span>
            </button>

            <button
              onClick={() => setPopup("quality")}
              className="rounded-xl border border-[#35445a] bg-[#141f30] px-2 py-3 text-xs"
            >
              ⚙️
              <span className="mt-1 block">Adjust</span>
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              disabled={!imageUrl}
              onClick={processPreview}
              className="rounded-xl bg-[#f3ad61] py-3 font-semibold text-[#111827] disabled:opacity-40"
            >
              Apply
            </button>

            <button
              disabled={!imageUrl || processing}
              onClick={download}
              className="rounded-xl border border-[#46566e] py-3 font-semibold disabled:opacity-40"
            >
              {processing ? "Preparing..." : "Download"}
            </button>
          </div>
        </div>

        {/* Popup */}
        {popup && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
            onClick={() => setPopup(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-[#3a4a60] bg-[#141f30] p-5 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-semibold">
                  {popup === "size" && "Photo Size"}
                  {popup === "background" &&
                    "Background"}
                  {popup === "copies" && "Copies"}
                  {popup === "quality" &&
                    "Image Quality"}
                </h2>

                <button
                  onClick={() => setPopup(null)}
                  className="text-xl text-gray-400"
                >
                  ×
                </button>
              </div>

              {popup === "size" && (
                <div className="grid grid-cols-2 gap-2">
                  {(
                    Object.entries(presets) as [
                      Preset,
                      typeof presets.india
                    ][]
                  ).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setPreset(key);
                        setPopup(null);
                      }}
                      className={`rounded-xl border p-3 text-left ${
                        preset === key
                          ? "border-[#f3ad61] text-[#f3ad61]"
                          : "border-[#35445a]"
                      }`}
                    >
                      <div className="font-semibold">
                        {value.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {value.w} × {value.h} mm
                      </div>
                    </button>
                  ))}

                  <button
                    onClick={() => setPreset("custom")}
                    className={`rounded-xl border p-3 text-left ${
                      preset === "custom"
                        ? "border-[#f3ad61] text-[#f3ad61]"
                        : "border-[#35445a]"
                    }`}
                  >
                    <div className="font-semibold">
                      Custom
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="number"
                        value={customW}
                        onChange={(e) =>
                          setCustomW(
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded bg-[#0d1929] p-2 text-xs"
                      />
                      <input
                        type="number"
                        value={customH}
                        onChange={(e) =>
                          setCustomH(
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded bg-[#0d1929] p-2 text-xs"
                      />
                    </div>
                  </button>
                </div>
              )}

              {popup === "background" && (
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["white", "⚪ White"],
                      ["black", "⚫ Black"],
                      ["blue", "🔵 Blue"],
                    ] as [Bg, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => {
                        setBg(value);
                        setPopup(null);
                      }}
                      className={`rounded-xl border p-4 text-sm ${
                        bg === value
                          ? "border-[#f3ad61] text-[#f3ad61]"
                          : "border-[#35445a]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {popup === "copies" && (
                <div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={copies}
                    onChange={(e) =>
                      setCopies(Number(e.target.value))
                    }
                    className="w-full accent-[#f3ad61]"
                  />

                  <div className="mt-3 text-center text-2xl font-bold">
                    {copies}
                  </div>

                  <button
                    onClick={() => setPopup(null)}
                    className="mt-4 w-full rounded-xl bg-[#f3ad61] py-3 font-semibold text-[#111827]"
                  >
                    Done
                  </button>
                </div>
              )}

              {popup === "quality" && (
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Quality</span>
                    <span>{quality}%</span>
                  </div>

                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={quality}
                    onChange={(e) =>
                      setQuality(Number(e.target.value))
                    }
                    className="mt-4 w-full accent-[#f3ad61]"
                  />

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() =>
                        setZoom(Math.max(0.7, zoom - 0.1))
                      }
                      className="flex-1 rounded-xl border border-[#35445a] py-3"
                    >
                      − Zoom
                    </button>

                    <button
                      onClick={() =>
                        setZoom(Math.min(2, zoom + 0.1))
                      }
                      className="flex-1 rounded-xl border border-[#35445a] py-3"
                    >
                      + Zoom
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setZoom(1);
                      setOffsetX(0);
                      setOffsetY(0);
                      setPopup(null);
                    }}
                    className="mt-3 w-full rounded-xl bg-[#f3ad61] py-3 font-semibold text-[#111827]"
                  >
                    Reset Position
                  </button>
                </div>
              )}

              {popup === "size" && (
                <div className="mt-4 text-center text-xs text-gray-500">
                  Selected: {size.w} × {size.h} mm
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
