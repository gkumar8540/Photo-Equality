import React, { ChangeEvent, useEffect, useRef, useState } from "react";

type Adjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
  blur: number;
};

type Tool =
  | "crop"
  | "resize"
  | "text"
  | "adjust"
  | "filters"
  | "background"
  | "feather";

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
};

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "crop", label: "Crop", icon: "▣" },
  { id: "resize", label: "Resize", icon: "↗" },
  { id: "text", label: "Text", icon: "T" },
  { id: "adjust", label: "Adjust", icon: "☷" },
  { id: "filters", label: "Filters", icon: "◐" },
  { id: "background", label: "Background", icon: "▧" },
  { id: "feather", label: "Feather", icon: "◌" },
];

export default function PhotoEqualityEditor() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const [imageUrl, setImageUrl] = useState("");
  const [fileName, setFileName] = useState("photo-equality");
  const [activeTool, setActiveTool] = useState<Tool>("adjust");
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [text, setText] = useState("Add Text Here");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(44);
  const [textX, setTextX] = useState(0.5);
  const [textY, setTextY] = useState(0.85);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [background, setBackground] = useState("#0c1d39");
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [feather, setFeather] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 1, height: 1 });
  const [resizeWidth, setResizeWidth] = useState(1200);
  const [resizeHeight, setResizeHeight] = useState(1200);
  const [keepRatio, setKeepRatio] = useState(true);
  const [message, setMessage] = useState("Upload a photo to start editing.");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [draggingText, setDraggingText] = useState(false);
  const dragPointerRef = useRef<number | null>(null);

  const hasImage = Boolean(imageUrl);

  useEffect(() => {
    if (!imageUrl) {
      imageRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setResizeWidth(img.naturalWidth);
      setResizeHeight(img.naturalHeight);
      setCrop({ x: 0, y: 0, width: 1, height: 1 });
      renderCanvas();
    };
    img.onerror = () => setMessage("Could not open this image. Try another JPG, PNG or WebP file.");
    img.src = imageUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  useEffect(() => {
    renderCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustments, text, textColor, textSize, textX, textY, fontFamily, background, transparentBackground, feather, crop, resizeWidth, resizeHeight]);

  useEffect(() => {
    return () => {
      if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const openFile = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setMessage("Please choose a JPG, PNG, WebP or GIF image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("Image is too large. Please choose a file under 20 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    setFileName(file.name.replace(/\.[^.]+$/, "") || "photo-equality");
    setImageUrl((old) => {
      if (old.startsWith("blob:")) URL.revokeObjectURL(old);
      return url;
    });
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setText("");
    setHistory([]);
    setHistoryIndex(-1);
    setMessage("Photo loaded. Choose a tool to edit.");
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    openFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete || !img.naturalWidth) return;

    const sx = Math.max(0, Math.min(0.99, crop.x)) * img.naturalWidth;
    const sy = Math.max(0, Math.min(0.99, crop.y)) * img.naturalHeight;
    const sw = Math.max(1, Math.min(img.naturalWidth - sx, crop.width * img.naturalWidth));
    const sh = Math.max(1, Math.min(img.naturalHeight - sy, crop.height * img.naturalHeight));
    const outW = Math.max(1, Math.min(8000, Math.round(resizeWidth || sw)));
    const outH = Math.max(1, Math.min(8000, Math.round(resizeHeight || sh)));
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!transparentBackground) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, outW, outH);
    } else {
      ctx.clearRect(0, 0, outW, outH);
    }

    ctx.save();
    ctx.filter = [
      `brightness(${adjustments.brightness}%)`,
      `contrast(${adjustments.contrast}%)`,
      `saturate(${adjustments.saturation}%)`,
      `grayscale(${adjustments.grayscale}%)`,
      `sepia(${adjustments.sepia}%)`,
      `blur(${adjustments.blur}px)`,
    ].join(" ");
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    ctx.restore();

    if (feather > 0) {
      const fade = Math.min(0.49, feather / 200);
      const grd = ctx.createRadialGradient(outW / 2, outH / 2, Math.min(outW, outH) * (0.5 - fade), outW / 2, outH / 2, Math.max(outW, outH) * 0.72);
      grd.addColorStop(0, "rgba(0,0,0,0)");
      grd.addColorStop(1, `rgba(0,0,0,${Math.min(1, feather / 100)})`);
      ctx.save();
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, outW, outH);
      ctx.restore();
    }

    if (text.trim()) {
      ctx.save();
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${Math.max(8, (textSize / 1000) * outW)}px ${fontFamily}`;
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = Math.max(2, outW / 200);
      ctx.fillText(text, textX * outW, textY * outH, outW * 0.9);
      ctx.restore();
    }
  };

  const snapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;
    const data = canvas.toDataURL("image/png");
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, data].slice(-20);
      setHistoryIndex(next.length - 1);
      return next;
    });
  };

  const loadSnapshot = (data: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setMessage("History preview restored. Continue editing or download.");
    };
    img.src = data;
  };

  const undo = () => {
    if (historyIndex <= 0) {
      setMessage("Nothing to undo yet. Use Apply to create an edit checkpoint.");
      return;
    }
    const next = historyIndex - 1;
    setHistoryIndex(next);
    loadSnapshot(history[next]);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) {
      setMessage("Nothing to redo.");
      return;
    }
    const next = historyIndex + 1;
    setHistoryIndex(next);
    loadSnapshot(history[next]);
  };

  const download = (format: "png" | "jpeg" = "png") => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) {
      setMessage("Upload a photo before downloading.");
      return;
    }
    try {
      const mime = format === "jpeg" ? "image/jpeg" : "image/png";
      const url = canvas.toDataURL(mime, 0.94);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName || "photo-equality"}-edited.${format === "jpeg" ? "jpg" : "png"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage(`Your ${format.toUpperCase()} is ready to save.`);
    } catch {
      setMessage("Download failed. Try a smaller image or another browser.");
    }
  };

  const resetEdits = () => {
    if (!hasImage) return;
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setText("");
    setTextColor("#ffffff");
    setTextSize(44);
    setTextX(0.5);
    setTextY(0.85);
    setFontFamily("Arial");
    setBackground("#0c1d39");
    setTransparentBackground(false);
    setFeather(0);
    setCrop({ x: 0, y: 0, width: 1, height: 1 });
    if (imageRef.current) {
      setResizeWidth(imageRef.current.naturalWidth);
      setResizeHeight(imageRef.current.naturalHeight);
    }
    setMessage("Edits reset.");
  };

  const applyFilter = (kind: "original" | "bw" | "vintage" | "vivid" | "soft") => {
    const presets: Record<typeof kind, Adjustments> = {
      original: DEFAULT_ADJUSTMENTS,
      bw: { ...DEFAULT_ADJUSTMENTS, grayscale: 100, contrast: 112 },
      vintage: { ...DEFAULT_ADJUSTMENTS, sepia: 58, saturation: 75, contrast: 92 },
      vivid: { ...DEFAULT_ADJUSTMENTS, saturation: 150, contrast: 112 },
      soft: { ...DEFAULT_ADJUSTMENTS, brightness: 106, contrast: 92, saturation: 88, blur: 0.4 },
    };
    setAdjustments(presets[kind]);
    setMessage(`${kind === "bw" ? "Black & white" : kind} filter applied.`);
  };

  const changeCrop = (key: "x" | "y" | "width" | "height", value: number) => {
    setCrop((prev) => {
      const next = { ...prev, [key]: value };
      next.x = Math.max(0, Math.min(0.9, next.x));
      next.y = Math.max(0, Math.min(0.9, next.y));
      next.width = Math.max(0.1, Math.min(1 - next.x, next.width));
      next.height = Math.max(0.1, Math.min(1 - next.y, next.height));
      return next;
    });
  };

  const panel = () => {
    if (!hasImage) {
      return <p className="text-sm leading-6 text-slate-300">Upload an image to unlock the editing controls.</p>;
    }
    switch (activeTool) {
      case "crop":
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">Adjust the crop region with the sliders, then click Apply checkpoint.</p>
            <Range label="Left" value={crop.x} min={0} max={0.9} step={0.01} onChange={(v) => changeCrop("x", v)} percent />
            <Range label="Top" value={crop.y} min={0} max={0.9} step={0.01} onChange={(v) => changeCrop("y", v)} percent />
            <Range label="Crop width" value={crop.width} min={0.1} max={1 - crop.x} step={0.01} onChange={(v) => changeCrop("width", v)} percent />
            <Range label="Crop height" value={crop.height} min={0.1} max={1 - crop.y} step={0.01} onChange={(v) => changeCrop("height", v)} percent />
            <button className="pe-secondary w-full" onClick={() => setCrop({ x: 0, y: 0, width: 1, height: 1 })}>Reset crop</button>
          </div>
        );
      case "resize":
        return (
          <div className="space-y-4">
            <label className="block text-sm text-slate-200">Width (px)
              <input className="pe-input mt-1" type="number" min={1} max={8000} value={resizeWidth} onChange={(e) => {
                const w = Math.max(1, Math.min(8000, Number(e.target.value) || 1));
                setResizeWidth(w);
                if (keepRatio && imageRef.current) setResizeHeight(Math.max(1, Math.round(w * imageRef.current.naturalHeight / imageRef.current.naturalWidth)));
              }} />
            </label>
            <label className="block text-sm text-slate-200">Height (px)
              <input className="pe-input mt-1" type="number" min={1} max={8000} value={resizeHeight} onChange={(e) => {
                const h = Math.max(1, Math.min(8000, Number(e.target.value) || 1));
                setResizeHeight(h);
                if (keepRatio && imageRef.current) setResizeWidth(Math.max(1, Math.round(h * imageRef.current.naturalWidth / imageRef.current.naturalHeight)));
              }} />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={keepRatio} onChange={(e) => setKeepRatio(e.target.checked)} /> Keep original aspect ratio</label>
          </div>
        );
      case "text":
        return (
          <div className="space-y-4">
            <label className="block text-sm text-slate-200">Text
              <textarea className="pe-input mt-1 min-h-20 resize-y" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type text to add to photo" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-slate-200">Text color<input className="mt-2 h-10 w-full rounded-lg bg-transparent" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} /></label>
              <label className="block text-sm text-slate-200">Font
                <select className="pe-input mt-1" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                  <option>Arial</option><option>Georgia</option><option>Verdana</option><option>Impact</option><option>monospace</option>
                </select>
              </label>
            </div>
            <Range label="Text size" value={textSize} min={12} max={100} onChange={setTextSize} suffix=" px" />
            <Range label="Horizontal position" value={textX} min={0.05} max={0.95} step={0.01} onChange={setTextX} percent />
            <Range label="Vertical position" value={textY} min={0.05} max={0.95} step={0.01} onChange={setTextY} percent />
          </div>
        );
      case "adjust":
        return (
          <div className="space-y-4">
            <Range label="Brightness" value={adjustments.brightness} min={0} max={200} onChange={(v) => setAdjustments((a) => ({ ...a, brightness: v }))} suffix="%" />
            <Range label="Contrast" value={adjustments.contrast} min={0} max={200} onChange={(v) => setAdjustments((a) => ({ ...a, contrast: v }))} suffix="%" />
            <Range label="Saturation" value={adjustments.saturation} min={0} max={200} onChange={(v) => setAdjustments((a) => ({ ...a, saturation: v }))} suffix="%" />
            <Range label="Grayscale" value={adjustments.grayscale} min={0} max={100} onChange={(v) => setAdjustments((a) => ({ ...a, grayscale: v }))} suffix="%" />
            <Range label="Sepia" value={adjustments.sepia} min={0} max={100} onChange={(v) => setAdjustments((a) => ({ ...a, sepia: v }))} suffix="%" />
            <Range label="Blur" value={adjustments.blur} min={0} max={10} step={0.1} onChange={(v) => setAdjustments((a) => ({ ...a, blur: v }))} suffix=" px" />
            <button className="pe-secondary w-full" onClick={() => setAdjustments(DEFAULT_ADJUSTMENTS)}>Reset adjustments</button>
          </div>
        );
      case "filters":
        return <div className="grid grid-cols-2 gap-2">{[
          ["original", "Original"], ["bw", "B&W"], ["vintage", "Vintage"], ["vivid", "Vivid"], ["soft", "Soft"]
        ].map(([kind, label]) => <button key={kind} className="pe-secondary" onClick={() => applyFilter(kind as "original" | "bw" | "vintage" | "vivid" | "soft")}>{label}</button>)}</div>;
      case "background":
        return (
          <div className="space-y-4">
            <label className="block text-sm text-slate-200">Canvas background<input className="mt-2 h-10 w-full rounded-lg bg-transparent" type="color" value={background} onChange={(e) => { setBackground(e.target.value); setTransparentBackground(false); }} /></label>
            <button className={`w-full ${transparentBackground ? "pe-primary" : "pe-secondary"}`} onClick={() => setTransparentBackground((v) => !v)}>{transparentBackground ? "Transparent enabled" : "Use transparent background"}</button>
            <p className="text-xs leading-5 text-slate-400">Transparent canvas does not remove the background inside the uploaded photo; it only makes uncovered canvas areas transparent.</p>
          </div>
        );
      case "feather":
        return (
          <div className="space-y-4">
            <Range label="Edge fade" value={feather} min={0} max={100} onChange={setFeather} suffix="%" />
            <p className="text-xs leading-5 text-slate-400">Fades the outside edges of the whole image. It is not AI background removal.</p>
            <button className="pe-secondary w-full" onClick={() => setFeather(0)}>Reset feather</button>
          </div>
        );
    }
  };

  const startTextDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== "text" || !text.trim() || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDraggingText(true);
    dragPointerRef.current = e.pointerId;
    setTextX(Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width)));
    setTextY(Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height)));
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveTextDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingText || dragPointerRef.current !== e.pointerId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setTextX(Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width)));
    setTextY(Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height)));
  };

  return (
    <div className="pe-root min-h-screen text-white">
      <style>{`
        .pe-root{background:#0c1d39;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .pe-panel{background:#20252b;border:1px solid #374151;border-radius:16px}
        .pe-primary{background:#f3ad61;color:#111827;font-weight:700;border-radius:10px;padding:10px 14px;transition:filter .15s}
        .pe-primary:hover{filter:brightness(1.06)} .pe-primary:disabled{opacity:.45;cursor:not-allowed}
        .pe-secondary{background:#303843;color:#f8fafc;border:1px solid #4b5563;border-radius:10px;padding:10px 12px;transition:background .15s}
        .pe-secondary:hover{background:#3b4654} .pe-input{display:block;width:100%;border:1px solid #4b5563;border-radius:9px;background:#111827;color:white;padding:10px 11px;outline:none}
        .pe-input:focus{border-color:#f3ad61} .pe-tool{min-width:78px;border:1px solid #414b58;background:#20252b;border-radius:12px;padding:10px 12px;color:#dbe3ee;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px}
        .pe-tool[aria-pressed=true]{border-color:#f3ad61;background:#3b3026;color:#f3ad61}
        .pe-tool-icon{font-size:21px;line-height:1.1}.pe-range{width:100%;accent-color:#f3ad61}
        @media(max-width:767px){.pe-mobile-tools{display:flex;overflow-x:auto;gap:8px;padding-bottom:4px;scrollbar-width:thin}.pe-tool{flex:0 0 78px}.pe-sticky-footer{position:sticky;bottom:0;z-index:20;background:#0c1d39ee;backdrop-filter:blur(12px);padding:10px 0 calc(10px + env(safe-area-inset-bottom))}.pe-root{padding-bottom:env(safe-area-inset-bottom)}}
      `}</style>

      <header className="sticky top-0 z-30 border-b border-slate-700/80 bg-[#0c1d39]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3ad61] text-xl font-black text-slate-900">PE</div>
            <div><h1 className="text-base font-bold sm:text-lg">Photo-Equality Editor</h1><p className="text-xs text-slate-400">All your photo tools in one place</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="pe-secondary !px-3 !py-2 text-sm" onClick={undo} disabled={!hasImage}>↶ <span className="hidden sm:inline">Undo</span></button>
            <button className="pe-secondary !px-3 !py-2 text-sm" onClick={redo} disabled={!hasImage}>↷ <span className="hidden sm:inline">Redo</span></button>
            <button className="pe-secondary !px-3 !py-2 text-sm" onClick={resetEdits} disabled={!hasImage}>Reset</button>
            <button className="pe-primary !px-3 !py-2 text-sm" onClick={() => fileInputRef.current?.click()}>{hasImage ? "Change photo" : "＋ Upload photo"}</button>
            <button className="pe-primary !px-3 !py-2 text-sm" onClick={() => download("png")} disabled={!hasImage}>↓ Download</button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[92px_minmax(0,1fr)_320px] lg:gap-5 lg:px-6 lg:py-6">
        <aside className="hidden lg:flex lg:flex-col lg:gap-2">
          {TOOLS.map((tool) => <button key={tool.id} className="pe-tool w-full" aria-pressed={activeTool === tool.id} onClick={() => setActiveTool(tool.id)}><span className="pe-tool-icon">{tool.icon}</span><span className="text-xs">{tool.label}</span></button>)}
        </aside>

        <section className="min-w-0 space-y-3">
          <div className="pe-mobile-tools lg:hidden">
            {TOOLS.map((tool) => <button key={tool.id} className="pe-tool" aria-pressed={activeTool === tool.id} onClick={() => setActiveTool(tool.id)}><span className="pe-tool-icon">{tool.icon}</span><span className="text-xs">{tool.label}</span></button>)}
          </div>
          <div className="pe-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3">
              <div><h2 className="font-semibold">Editing board</h2><p className="text-xs text-slate-400">{hasImage ? `${resizeWidth} × ${resizeHeight} px` : "Upload a photo to begin"}</p></div>
              <span className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300">{TOOLS.find((t) => t.id === activeTool)?.label}</span>
            </div>
            <div ref={boardRef} className="grid min-h-[320px] place-items-center bg-[#101720] p-3 sm:min-h-[460px] sm:p-6">
              {hasImage ? (
                <canvas ref={canvasRef} onPointerDown={startTextDrag} onPointerMove={moveTextDrag} onPointerUp={() => { setDraggingText(false); dragPointerRef.current = null; }} onPointerCancel={() => { setDraggingText(false); dragPointerRef.current = null; }} className={`max-h-[68vh] max-w-full rounded-sm object-contain shadow-2xl ${activeTool === "text" && text.trim() ? "cursor-move touch-none" : ""}`} style={{ width: "auto", height: "auto" }} />
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="flex w-full max-w-md flex-col items-center rounded-2xl border-2 border-dashed border-slate-600 px-6 py-12 text-center hover:border-[#f3ad61]">
                  <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-800 text-3xl">＋</span><span className="font-semibold">Upload your photo</span><span className="mt-2 text-sm text-slate-400">JPG, PNG, WebP or GIF · up to 20 MB</span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-700 px-4 py-3">
              <p className="text-xs text-slate-400">Tip: select Text to position your text by dragging on the photo.</p>
              <button className="pe-secondary !px-3 !py-2 text-sm" onClick={snapshot} disabled={!hasImage}>Apply checkpoint</button>
            </div>
          </div>
          <div role="status" aria-live="polite" className="rounded-xl border border-slate-700 bg-[#20252b] px-4 py-3 text-sm text-slate-300">{busy ? "Processing…" : message}</div>
        </section>

        <aside className="pe-panel h-fit min-w-0 p-4 lg:sticky lg:top-24">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div><h2 className="font-semibold">{TOOLS.find((t) => t.id === activeTool)?.label} settings</h2><p className="mt-1 text-xs text-slate-400">Changes preview instantly</p></div>
            <button className="pe-secondary !px-3 !py-2 text-xs lg:hidden" onClick={() => fileInputRef.current?.click()}>Upload</button>
          </div>
          {panel()}
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-700 pt-4">
            <button className="pe-secondary" onClick={resetEdits} disabled={!hasImage}>Reset all</button>
            <button className="pe-primary" onClick={() => download("png")} disabled={!hasImage}>Download PNG</button>
          </div>
        </aside>
      </main>

      <footer className="pe-sticky-footer border-t border-slate-700/80">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
          <p className="hidden text-xs text-slate-400 sm:block">Photo-Equality · Your edits stay in this browser unless you choose to save them.</p>
          <div className="ml-auto flex gap-2">
            <button className="pe-secondary !py-2 text-sm" onClick={() => download("jpeg")} disabled={!hasImage}>Download JPG</button>
            <button className="pe-primary !py-2 text-sm" onClick={() => download("png")} disabled={!hasImage}>↓ Save PNG</button>
          </div>
        </div>
      </footer>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onFileChange} />
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
  percent = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
  percent?: boolean;
}) {
  return (
    <label className="block text-sm text-slate-200">
      <span className="mb-2 flex items-center justify-between gap-2"><span>{label}</span><span className="tabular-nums text-xs text-slate-400">{percent ? `${Math.round(value * 100)}%` : `${value}${suffix}`}</span></span>
      <input className="pe-range" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}