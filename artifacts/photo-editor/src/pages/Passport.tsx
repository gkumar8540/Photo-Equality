import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { removeBackground } from "@imgly/background-removal";

type Preset = "india" | "us" | "2x2" | "custom";

type Bg =
  | "white"
  | "black"
  | "blue"
  | "red"
  | "green"
  | "yellow"
  | "gray"
  | "custom"
  | "removed";

type Popup = "size" | "background" | "copies" | "quality" | null;

const presets = {
  india: { name: "India Passport", w: 35, h: 45 },
  us: { name: "US Passport", w: 51, h: 51 },
  "2x2": { name: "2 × 2 Inch", w: 51, h: 51 },
};

const colorOptions: { id: Bg; name: string; color: string }[] = [
  { id: "white", name: "White", color: "#ffffff" },
  { id: "black", name: "Black", color: "#000000" },
  { id: "blue", name: "Blue", color: "#2563eb" },
  { id: "red", name: "Red", color: "#ef4444" },
  { id: "green", name: "Green", color: "#22c55e" },
  { id: "yellow", name: "Yellow", color: "#facc15" },
  { id: "gray", name: "Gray", color: "#9ca3af" },
];

export default function Passport() {
  const [, setLocation] = useLocation();

  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const imageUrlRef = useRef("");
  const previewUrlRef = useRef("");

  const [preset, setPreset] = useState<Preset>("india");
  const [customW, setCustomW] = useState(35);
  const [customH, setCustomH] = useState(45);

  const [bg, setBg] = useState<Bg>("white");
  const [customColor, setCustomColor] = useState("#ffffff");

  const [rgbR, setRgbR] = useState(255);
  const [rgbG, setRgbG] = useState(255);
  const [rgbB, setRgbB] = useState(255);

  const [copies, setCopies] = useState(1);
  const [quality, setQuality] = useState(92);

  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [popup, setPopup] = useState<Popup>(null);
  const [processing, setProcessing] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const [removingBackground, setRemovingBackground] = useState(false);

  const getSize = () => {
    if (preset === "custom") {
      return {
        w: Math.max(1, customW),
        h: Math.max(1, customH),
      };
    }

    return presets[preset];
  };

  const getBg = () => {
    if (bg === "custom") {
      return customColor;
    }

    if (bg === "removed") {
      return "#ffffff";
    }

    const found = colorOptions.find((item) => item.id === bg);
    return found?.color || "#ffffff";
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (value: number) =>
      Math.max(0, Math.min(255, value))
        .toString(16)
        .padStart(2, "0");

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const updateRgb = (
    r: number = rgbR,
    g: number = rgbG,
    b: number = rgbB
  ) => {
    const rr = Math.max(0, Math.min(255, Math.round(r)));
    const gg = Math.max(0, Math.min(255, Math.round(g)));
    const bb = Math.max(0, Math.min(255, Math.round(b)));

    setRgbR(rr);
    setRgbG(gg);
    setRgbB(bb);

    const hex = rgbToHex(rr, gg, bb);
    setCustomColor(hex);
    setBg("custom");
  };

  const updateColor = (hex: string) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;

    setCustomColor(hex);
    setBg("custom");

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    setRgbR(r);
    setRgbG(g);
    setRgbB(b);
  };

  const revokeUrl = (url: string) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  const handleFile = (selectedFile: File | null) => {
    if (!selectedFile) return;

    revokeUrl(imageUrlRef.current);
    revokeUrl(previewUrlRef.current);

    const url = URL.createObjectURL(selectedFile);

    imageUrlRef.current = url;
    previewUrlRef.current = "";

    setFile(selectedFile);
    setImageUrl(url);
    setPreviewUrl("");

    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setDownloaded(false);
    setBackgroundRemoved(false);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    handleFile(selected);

    e.target.value = "";
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = reject;

      img.src = src;
    });
  };

  const getSourceImage = async () => {
    if (!imageUrlRef.current) {
      throw new Error("No image selected");
    }

    return loadImage(imageUrlRef.current);
  };



  const createCanvas = async () => {
  const size = getSize();

  // A4 = 210 × 297 mm at 300 DPI
  const dpi = 300;

  const a4W = Math.round((210 / 25.4) * dpi);
  const a4H = Math.round((297 / 25.4) * dpi);

  // Selected photo size
  const photoW = Math.round((size.w / 25.4) * dpi);
  const photoH = Math.round((size.h / 25.4) * dpi);

  const totalCopies = Math.max(1, Math.min(100, copies));

  // A4 page ke charon taraf 10px margin
  const pageMargin = 120;

  // Photos ke beech ka gap
  const gap = Math.round((3 / 25.4) * dpi);

  // Ek row me maximum photos
  const columns = Math.max(
    1,
    Math.floor(
      (a4W - pageMargin * 2 + gap) /
        (photoW + gap)
    )
  );

  // Total rows
  const rows = Math.ceil(totalCopies / columns);

  const canvas = document.createElement("canvas");

  canvas.width = a4W;
  canvas.height = a4H;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is not supported");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // A4 page always WHITE
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, a4W, a4H);

  const img = await getSourceImage();

  // Image ko passport-photo box me fit karna
  const scale = Math.max(
    photoW / img.width,
    photoH / img.height
  );

  const drawW = img.width * scale * zoom;
  const drawH = img.height * scale * zoom;

  const moveX = offsetX * (dpi / 100);
  const moveY = offsetY * (dpi / 100);

  for (let i = 0; i < totalCopies; i++) {
    const row = Math.floor(i / columns);
    const column = i % columns;

    // Photos pehle ki tarah LEFT se start hongi
    const photoX =
      pageMargin +
      column * (photoW + gap);

    // Photos TOP se start hongi
    const photoY =
      pageMargin +
      row * (photoH + gap);

    const x =
      photoX +
      (photoW - drawW) / 2 +
      moveX;

    const y =
      photoY +
      (photoH - drawH) / 2 +
      moveY;

    ctx.save();

    // Photo box ke andar hi image rahe
    ctx.beginPath();
    ctx.rect(
      photoX,
      photoY,
      photoW,
      photoH
    );
    ctx.clip();

    // Background sirf photo ke andar
    ctx.fillStyle = getBg();

    ctx.fillRect(
      photoX,
      photoY,
      photoW,
      photoH
    );

    // Photo draw
    ctx.drawImage(
      img,
      x,
      y,
      drawW,
      drawH
    );

    ctx.restore();
  }

  return canvas;
};





  const processPreview = async () => {
    if (!file || !imageUrlRef.current) return;

    try {
      setProcessing(true);
      setDownloaded(false);

      const canvas = await createCanvas();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(
          resolve,
          "image/jpeg",
          Math.max(0.1, Math.min(1, quality / 100))
        )
      );

      if (!blob) {
        throw new Error("Could not create preview");
      }

      revokeUrl(previewUrlRef.current);

      const url = URL.createObjectURL(blob);

      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (error) {
      console.error("Passport preview error:", error);
    } finally {
      setProcessing(false);
    }
  };

  const download = async () => {
    if (!file || !imageUrlRef.current) return;

    try {
      setProcessing(true);
      setDownloaded(false);

      const canvas = await createCanvas();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(
          resolve,
          "image/jpeg",
          Math.max(0.1, Math.min(1, quality / 100))
        )
      );

      if (!blob) {
        throw new Error("Could not create download");
      }

      const url = URL.createObjectURL(blob);

      const baseName =
        file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-z0-9_-]+/gi, "-")
          .replace(/^-|-$/g, "") || "passport-photo";

      const link = document.createElement("a");

      link.href = url;
      link.download = `${baseName}-passport.jpg`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setDownloaded(true);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 3000);
    } catch (error) {
      console.error("Passport download error:", error);
    } finally {
      setProcessing(false);
    }
  };

  const removeBg = async () => {
    if (!file || !imageUrlRef.current) return;

    try {
      setRemovingBackground(true);
      setDownloaded(false);

      const blob = await removeBackground(imageUrlRef.current, {
        output: {
          format: "image/png",
        },
      });

      const newUrl = URL.createObjectURL(blob);

      revokeUrl(imageUrlRef.current);

      imageUrlRef.current = newUrl;

      setImageUrl(newUrl);
      setFile(
        new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".png", {
          type: "image/png",
        })
      );

      setBackgroundRemoved(true);
      setBg("white");

      revokeUrl(previewUrlRef.current);
      previewUrlRef.current = "";

      setPreviewUrl("");
    } catch (error) {
      console.error("Background removal error:", error);
    } finally {
      setRemovingBackground(false);
    }
  };

  const resetPosition = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const reset = () => {
    revokeUrl(imageUrlRef.current);
    revokeUrl(previewUrlRef.current);

    imageUrlRef.current = "";
    previewUrlRef.current = "";

    setFile(null);
    setImageUrl("");
    setPreviewUrl("");

    setPreset("india");
    setCustomW(35);
    setCustomH(45);

    setBg("white");
    setCustomColor("#ffffff");

    setRgbR(255);
    setRgbG(255);
    setRgbB(255);

    setCopies(1);
    setQuality(92);

    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);

    setBackgroundRemoved(false);
    setDownloaded(false);
    setPopup(null);
  };

  useEffect(() => {
    return () => {
      revokeUrl(imageUrlRef.current);
      revokeUrl(previewUrlRef.current);
    };
  }, []);

  const size = getSize();

  return (
    <div className="min-h-screen bg-[#0c1d39] text-white flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="flex shrink-0 items-center justify-between border-b border-[#30363d] bg-[#20252b] px-4 py-3 gap-2">
        <button
            type="button"
            onClick={() => window.history.back()}
            className=" rounded-lg  px-0 py-0.5 text-sm text-gray-200 transition hover:bg-[#213553]"
          >
           <span className="text-[24px] font-bold leading-none">←</span>
          </button>

        {/*<h1 className="text-[12px] font-semibold">
          Passport Photo
        </h1>*/}

        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-[#30363d] bg-[#151a20] px-2 py-1.5 text-[11px] font-semibold text-[#d7d7d7] hover:border-[#55534c]"
        >
          Reset
        </button>


        {/* REMOVE BACKGROUND */}
              <button
                type="button"
                disabled={removingBackground}
                onClick={removeBg}
                title="Remove Background"
                className={`flex h-9 shrink-0 items-center justify-center rounded-full border-2 px-3 text-[9px] font-bold ${
                  bg === "removed"
                    ? "border-[#f3ad61] bg-[#342b23] text-[#f3ad61]"
                    : "border-[#555] bg-[#151a20] text-white"
                } disabled:opacity-50`}
              >
                {removingBackground
                  ? "Removing..."
                  : "Remove BG"}
              </button>


{/* DOWNLOAD */}
<button
  type="button"
  disabled={!imageUrl || processing}
  onClick={async () => {
    await download();

    setDownloaded(true);

    setTimeout(() => {
      setDownloaded(false);
    }, 2000);
  }}
  className={`relative rounded-md border px-2 py-1.5 text-[9px] font-semibold transition-colors disabled:opacity-40 ${
    downloaded
      ? "border-green-500 bg-green-600 text-white"
      : "border-[#30363d] bg-[#f3ad61] text-[#000000] font-bold hover:border-[#55534c] hover:text-black"
  }`}
  >
  {processing ? (
    <span className="absolute inset-0 flex items-center justify-center">
      <span className="h-1.5 w-1.5 animate-spin rounded-full border-2 border-[#a8aaa5] border-t-transparent" />
    </span>
  ) : downloaded ? (
    "✓Download"
  ) : (
    "Download"
  )}
</button>
    </header>

      {/* MAIN */}
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-3 pt-3">
        {/* PREVIEW */}
        <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          <div
            className="relative flex max-h-full max-w-[90vw] items-center justify-center overflow-hidden rounded-sm border border-[#30363d] bg-[#151a20] shadow-xl"
            style={{
              aspectRatio: `${size.w}/${size.h}`,
              height: "min(62vh, 520px)",
            }}
          >
            {!imageUrl ? (
              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 text-center">
                <div className="text-6xl">📷</div>

                <div>
                  <div className="text-1g font-semibold">
                    Select Photo
                  </div>

                  <div className="mt-1 text-[10px] text-[#9ca3af]">
                    JPG, PNG or WEBP
                  </div>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <>
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: getBg(),
                  }}
                />

                <img
                  src={previewUrl || imageUrl}
                  alt="Passport preview"
                  className="relative h-full w-full object-cover"
                  style={{
                    transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                />

                {processing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="rounded-lg bg-[#20252b] px-4 py-3 text-xs font-semibold">
                      Processing...
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* SELECT PHOTO */}
        {imageUrl && (
          <label className="mt-2 cursor-pointer rounded-md border border-[#30363d] bg-[#20252b] px-3 py-1.5 text-[10px] font-semibold text-[#a8aaa5] hover:border-[#55534c] hover:text-white">
            Change Photo
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        )}
      </main>

      {/* CONTROLS */}
      <footer className="shrink-0 border-t border-[#282e35] bg-[#392c3a] px-1 py-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* SIZE */}
          <div className="relative">
            <button
              type="button"
              disabled={!imageUrl}
              onClick={() =>
                setPopup(popup === "size" ? null : "size")
              }
              className="rounded-md border border-[#30363d] bg-[#20252b] px-3 py-0.5 text-[9px] font-semibold text-[#a8aaa5] hover:border-[#55534c] disabled:opacity-40"
            > 📐 <br />
              Size
            </button>
          </div>

          {/* BACKGROUND */}
          <button
            type="button"
            disabled={!imageUrl}
            onClick={() =>
              setPopup(
                popup === "background" ? null : "background"
              )
            }
            className="rounded-md border border-[#30363d] bg-[#20252b] px-3.5 py-0.5 text-[9px] font-semibold text-[#a8aaa5] hover:border-[#55534c] disabled:opacity-40"
          >
            🎨 <br />
            BG
          </button>

          {/* ADJUST */}
          <button
            type="button"
            disabled={!imageUrl}
            onClick={() =>
              setPopup(popup === "quality" ? null : "quality")
            }
            className="rounded-md border border-[#30363d] bg-[#20252b] px-2 py-0.5 text-[9px] font-semibold text-[#a8aaa5] hover:border-[#55534c] disabled:opacity-40"
          > ⚙️ <br />
            Adjust
          </button>

          {/* COPIES */}
          <button
            type="button"
            disabled={!imageUrl}
            onClick={() =>
              setPopup(popup === "copies" ? null : "copies")
            }
            className="rounded-md border border-[#30363d] bg-[#20252b] px-2 py-0.5 text-[9px] font-semibold text-[#a8aaa5] hover:border-[#55534c] disabled:opacity-40"
          > 📄<br />
            Copies
          </button>

          
          {/* APPLY */}
          <button type="button"disabled={!imageUrl || processing}
          onClick={processPreview}
          className="rounded-md border border-[#f3ad61] bg-[#f3ad61] px-2 py-1.5 text-[9px] font-bold text-black disabled:opacity-40">
          {processing ? (
          <span className="inline-flex h-[12px] w-[12px] items-center justify-center align-middle">
          <span className="h-1.5 w-1.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
          </span>
          ) : (
          "Apply"
          )}
          </button>




      </div>
      </footer>

      {/* SIZE POPUP */}
      {popup === "size" && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#20252b] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold">
                Photo Size
              </span>

              <button
                type="button"
                onClick={() => setPopup(null)}
                className="text-sm text-[#9ca3af]"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                Object.entries(presets) as [
                  Exclude<Preset, "custom">,
                  (typeof presets)[Exclude<Preset, "custom">]
                ][]
              ).map(([id, item]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setPreset(id);
                    setPopup(null);
                  }}
                  className={`rounded-lg border px-2 py-2 text-left ${
                    preset === id
                      ? "border-[#f3ad61] bg-[#342b23]"
                      : "border-[#30363d] bg-[#151a20]"
                  }`}
                >
                  <div className="text-[10px] font-semibold">
                    {item.name}
                  </div>

                  <div className="mt-1 text-[9px] text-[#9ca3af]">
                    {item.w} × {item.h} mm
                  </div>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPreset("custom")}
                className={`rounded-lg border px-2 py-2 text-left ${
                  preset === "custom"
                    ? "border-[#f3ad61] bg-[#342b23]"
                    : "border-[#30363d] bg-[#151a20]"
                }`}
              >
                <div className="text-[10px] font-semibold">
                  Custom
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    value={customW}
                    onChange={(e) => {
                      setPreset("custom");
                      setCustomW(
                        Math.max(1, Number(e.target.value) || 1)
                      );
                    }}
                    className="w-full rounded border border-[#30363d] bg-[#0c1117] px-2 py-1 text-[10px] text-white outline-none"
                    placeholder="W"
                  />

                  <input
                    type="number"
                    min="1"
                    value={customH}
                    onChange={(e) => {
                      setPreset("custom");
                      setCustomH(
                        Math.max(1, Number(e.target.value) || 1)
                      );
                    }}
                    className="w-full rounded border border-[#30363d] bg-[#0c1117] px-2 py-1 text-[10px] text-white outline-none"
                    placeholder="H"
                  />
                </div>

                <div className="mt-1 text-[8px] text-[#9ca3af]">
                  mm
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BACKGROUND POPUP */}
      {popup === "background" && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#20252b] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold">
                Background
              </span>

              <button
                type="button"
                onClick={() => setPopup(null)}
                className="text-sm text-[#9ca3af]"
              >
                ✕
              </button>
            </div>

            {/* COLOR ROW */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {colorOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={item.name}
                  onClick={() => {
                    setBg(item.id);
                    setBackgroundRemoved(false);
                  }}
                  className={`h-9 w-9 shrink-0 rounded-full border-2 ${
                    bg === item.id
                      ? "border-[#f3ad61]"
                      : "border-[#555]"
                  }`}
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              ))}
             
            </div>


                                         {/* RGB */}
            <div className="mt-3 rounded-lg border border-[#30363d] bg-[#151a20] p-3">
              <div className="mb-2 flex items-center justify-between">
                {/*<span className="text-[10px] font-semibold">
                  RGB Color
                </span>*/}

           {/* CUSTOM COLOR */}
              <label
                title="Custom RGB / Color"
                className={`relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 ${
                  bg === "custom"
                    ? "border-[#f3ad61]"
                    : "border-[#555]"
                }`}
                style={{
                  backgroundColor: customColor,
                }}>

                <input
                  type="color"
                  value={customColor}
                  onChange={(e) =>
                    updateColor(e.target.value)
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"/>

                
               <span className="pointer-events-none flex flex-col items-center justify-center text-[9px] font-bold text-black">
               <span>🎨</span>
               <span>RGB</span>
              </span>
              </label>


                {/* REMOVE BACKGROUND */}
              <button
                type="button"
                disabled={removingBackground}
                onClick={removeBg}
                title="Remove Background"
                className={`flex h-9 shrink-0 items-center justify-center rounded-full border-2 px-3 text-[9px] font-bold ${
                  bg === "removed"
                    ? "border-[#f3ad61] bg-[#342b23] text-[#f3ad61]"
                    : "border-[#555] bg-[#151a20] text-white"
                } disabled:opacity-50`}
              >
                {removingBackground
                  ? "Removing..."
                  : "Remove BG"}
              </button>

                {/*<div
                  className="h-6 w-6 rounded border border-[#555]"
                  style={{
                    backgroundColor: customColor,
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="text-[9px] text-[#9ca3af]">
                  R
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={rgbR}
                    onChange={(e) =>
                      updateRgb(Number(e.target.value), rgbG, rgbB)
                    }
                    className="mt-1 w-full rounded border border-[#30363d] bg-[#0c1117] px-2 py-1.5 text-[10px] text-white outline-none"
                  />
                </label>

                <label className="text-[9px] text-[#9ca3af]">
                  G
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={rgbG}
                    onChange={(e) =>
                      updateRgb(rgbR, Number(e.target.value), rgbB)
                    }
                    className="mt-1 w-full rounded border border-[#30363d] bg-[#0c1117] px-2 py-1.5 text-[10px] text-white outline-none"
                  />
                </label>

                <label className="text-[9px] text-[#9ca3af]">
                  B
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={rgbB}
                    onChange={(e) =>
                      updateRgb(rgbR, rgbG, Number(e.target.value))
                    }
                    className="mt-1 w-full rounded border border-[#30363d] bg-[#0c1117] px-2 py-1.5 text-[10px] text-white outline-none"
                  />
                </label>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => updateColor(e.target.value)}
                  className="flex-1 rounded border border-[#30363d] bg-[#0c1117] px-2 py-1.5 text-[10px] text-white outline-none"
                  placeholder="#ffffff"
                />*/}

                <button
                  type="button"
                  onClick={() => {
                    setBg("white");
                    setRgbR(255);
                    setRgbG(255);
                    setRgbB(255);
                    setCustomColor("#ffffff");
                    setBackgroundRemoved(false);
                  }}
                  className="rounded border border-[#30363d] px-2 py-1.5 text-[9px]"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COPIES POPUP */}
      {popup === "copies" && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#20252b] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold">
                Copies
              </span>

              <button
                type="button"
                onClick={() => setPopup(null)}
                className="text-sm text-[#9ca3af]"
              >
                ✕
              </button>
            </div>

            <div className="mb-2 flex justify-between text-[10px]">
              <span>Number of copies</span>
              <span className="font-bold text-[#f3ad61]">
                {copies}
              </span>
            </div>

            
<div className="flex gap-2 overflow-x-auto pb-2">
  {Array.from({ length: 30 }, (_, index) => {
    const number = index + 1;

    return (
      <button
        key={number}
        type="button"
        onClick={() => setCopies(number)}
        className={`h-9 min-w-9 shrink-0 rounded-md border text-[10px] font-semibold ${
          copies === number
            ? "border-[#f3ad61] bg-[#f3ad61] text-black"
            : "border-[#30363d] bg-[#151a20] text-[#a8aaa5] hover:border-[#55534c] hover:text-white"
        }`}
      >
        {number}
      </button>
    );
  })}
</div>


          </div>
        </div>
      )}

      {/* ADJUST POPUP */}
      {popup === "quality" && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#20252b] pl-4 pr-4 pt-1 pb-2 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold">
                Adjust
              </span>

              <button
                type="button"
                onClick={() => setPopup(null)}
                className="text-sm text-[#9ca3af]"
              >
                ✕
              </button>
            </div>

            {/* QUALITY */}
            <div>
              <div className="mb-0 flex justify-between text-[10px]">
                <span>Quality</span>
                <span className="text-[#f3ad61]">
                  {quality}%
                </span>
              </div>

              <input
                type="range"
                min="40"
                max="100"
                value={quality}
                onChange={(e) =>
                  setQuality(Number(e.target.value))
                }
                className="w-full"
              />
            </div>

            {/* ZOOM */}
            <div className="mt-2">
              <div className="mb-2 flex justify-between text-[10px]">
                <span>Zoom</span>
                <span className="text-[#f3ad61]">
                  {zoom.toFixed(2)}×
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setZoom((value) =>
                      Math.max(0.5, Number((value - 0.05).toFixed(2)))
                    )
                  }
                  className="h-8 w-8 rounded border border-[#30363d] bg-[#151a20]"
                >
                  −
                </button>

                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) =>
                    setZoom(Number(e.target.value))
                  }
                  className="flex-1"
                />

                <button
                  type="button"
                  onClick={() =>
                    setZoom((value) =>
                      Math.min(3, Number((value + 0.05).toFixed(2)))
                    )
                  }
                  className="h-8 w-8 rounded border border-[#30363d] bg-[#151a20]"
                >
                  +
                </button>
              </div>
            </div>

            {/* POSITION */}
            <div className="mt-3">
              <div className="mb-0 text-[10px]">
                Position
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div />

                <button
                  type="button"
                  onClick={() =>
                    setOffsetY((value) => value - 5)
                  }
                  className="rounded border border-[#30363d] bg-[#151a20] py-1 text-xs"
                >
                  ↑
                </button>

                <div />

                <button
                  type="button"
                  onClick={() =>
                    setOffsetX((value) => value - 5)
                  }
                  className="rounded border border-[#30363d] bg-[#151a20] py-1 text-xs"
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={resetPosition}
                  className="rounded border border-[#f3ad61] bg-[#342b23] py-1 text-[9px] font-semibold text-[#f3ad61]"
                >
                  Center
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setOffsetX((value) => value + 5)
                  }
                  className="rounded border border-[#30363d] bg-[#151a20] py-1 text-xs"
                >
                  →
                </button>

                <div />

                <button
                  type="button"
                  onClick={() =>
                    setOffsetY((value) => value + 5)
                  }
                  className="rounded border border-[#30363d] bg-[#151a20] py-1 text-xs"
                >
                  ↓
                </button>

                <div />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

