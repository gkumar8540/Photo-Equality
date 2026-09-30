import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { TopNavigation } from "../components/navigation/TopNavigation";

type TemplateId = "thennow" | "thenNowFuture";
type PanelId =
  | "template"
  | "effect"
  | "background"
  | "frame"
  | "text"
  | "year";

type PhotoItem = {
  id: number;
  src: string;
  x: number;
  y: number;
  scale: number;
  effect: "normal" | "old" | "future";
};

type TextItem = {
  id: number;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  bold: boolean;
};

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1200;

const templates = {
  thennow: {
    name: "Then → Now",
    description: "Then style + Now style",
  },
  thenNowFuture: {
    name: "Then → Now → Future",
    description: "Three-stage timeline",
  },
};

const backgrounds = [
  { id: "dark", name: "Dark", value: "#10141c" },
  { id: "black", name: "Black", value: "#050505" },
  { id: "white", name: "White", value: "#f4f4f4" },
  { id: "blue", name: "Future Blue", value: "#101d3d" },
  { id: "purple", name: "Future Purple", value: "#241437" },
];

const frames = [
  { id: "none", name: "None" },
  { id: "simple", name: "Simple" },
  { id: "retro", name: "Retro" },
  { id: "neon", name: "Neon" },
];

export default function OldFuturePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [template, setTemplate] = useState<TemplateId>("thennow");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);

  const [panel, setPanel] = useState<PanelId>("template");

  const [background, setBackground] = useState("#10141c");
  const [frame, setFrame] = useState("none");

  const [title, setTitle] = useState("THEN → Now");
  const [subtitle, setSubtitle] = useState("1990  •  Now");

  const [textItems, setTextItems] = useState<TextItem[]>([
    {
      id: 1,
      text: "THEN",
      x: 300,
      y: 1100,
      size: 46,
      color: "#ffffff",
      opacity: 1,
      bold: true,
    },
    {
      id: 2,
      text: "Now",
      x: 900,
      y: 1100,
      size: 46,
      color: "#65e7ff",
      opacity: 1,
      bold: true,
    },
  ]);

  const [selectedText, setSelectedText] = useState<number | null>(null);

  const [globalGrain, setGlobalGrain] = useState(0);
  const [globalGlow, setGlobalGlow] = useState(0);

  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");

  const [draggingPhoto, setDraggingPhoto] = useState<number | null>(null);
  const [draggingText, setDraggingText] = useState<number | null>(null);

  const [lastPointer, setLastPointer] = useState({
    x: 0,
    y: 0,
  });

  const openPanel = (id: PanelId) => {
    setPanel((current) => (current === id ? "template" : id));
  };

  const createPhoto = useCallback(
    (src: string, index: number): PhotoItem => ({
      id: Date.now() + index,
      src,
      x:
        template === "thennow"
          ? index === 0
            ? 300
            : 900
          : index === 0
            ? 200
            : index === 1
              ? 600
              : 1000,
      y: 600,
      scale: 1,
      effect:
        template === "thennow"
          ? index === 0
            ? "old"
            : "future"
          : index === 0
            ? "old"
            : index === 1
              ? "normal"
              : "future",
    }),
    [template]
  );

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxPhotos = template === "thennow" ? 2 : 3;

    const selected = Array.from(files).slice(
      0,
      maxPhotos,
    );

    selected.forEach((file, index) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();

      reader.onload = () => {
        const src = String(reader.result);

        setPhotos((current) => {
          const next = [...current];

          if (next.length >= maxPhotos) {
            next[index] = createPhoto(src, index);
            return next;
          }

          next.push(createPhoto(src, next.length));
          return next;
        });
      };

      reader.readAsDataURL(file);
    });
  };

  const uploadClick = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, i) => i !== index));

    setActivePhoto((current) => {
      if (index === current) return 0;
      if (index < current) return current - 1;
      return current;
    });
  };

  const updatePhoto = (
    index: number,
    changes: Partial<PhotoItem>,
  ) => {
    setPhotos((current) =>
      current.map((photo, i) =>
        i === index ? { ...photo, ...changes } : photo,
      ),
    );
  };

  const updateSelectedText = (
    changes: Partial<TextItem>,
  ) => {
    if (selectedText === null) return;

    setTextItems((current) =>
      current.map((item) =>
        item.id === selectedText
          ? { ...item, ...changes }
          : item,
      ),
    );
  };

  const addText = () => {
    const newText: TextItem = {
      id: Date.now(),
      text: "NEW TEXT",
      x: CANVAS_WIDTH / 2,
      y: 200,
      size: 48,
      color: "#ffffff",
      opacity: 1,
      bold: true,
    };

    setTextItems((current) => [...current, newText]);
    setSelectedText(newText.id);
    setPanel("text");
  };

  const deleteSelectedText = () => {
    if (selectedText === null) return;

    setTextItems((current) =>
      current.filter((item) => item.id !== selectedText),
    );

    setSelectedText(null);
  };

  const resetAll = () => {
    setTemplate("thennow");
    setPhotos([]);
    setActivePhoto(0);
    setBackground("#10141c");
    setFrame("none");
    setGlobalGrain(0);
    setGlobalGlow(0);
    setTitle("THEN → Now");
    setSubtitle("1990  •  2050");

    setTextItems([
      {
        id: 1,
        text: "THEN",
        x: 300,
        y: 1100,
        size: 46,
        color: "#ffffff",
        opacity: 1,
        bold: true,
      },
      {
        id: 2,
        text: "Now",
        x: 900,
        y: 1100,
        size: 46,
        color: "#65e7ff",
        opacity: 1,
        bold: true,
      },
    ]);

    setSelectedText(null);
    setMessage("");
  };

  const getCanvasPoint = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    return {
      x:
        ((event.clientX - rect.left) / rect.width) *
        CANVAS_WIDTH,
      y:
        ((event.clientY - rect.top) / rect.height) *
        CANVAS_HEIGHT,
    };
  };

  const startDrag = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const point = getCanvasPoint(event);
    if (!point) return;

    setLastPointer({
      x: point.x,
      y: point.y,
    });

    const textHit = [...textItems]
      .reverse()
      .find((item) => {
        const width =
          Math.max(80, item.text.length * item.size * 0.55);

        return (
          point.x >= item.x - width / 2 &&
          point.x <= item.x + width / 2 &&
          point.y >= item.y - item.size &&
          point.y <= item.y + item.size
        );
      });

    if (textHit) {
      setSelectedText(textHit.id);
      setDraggingText(textHit.id);
      setDraggingPhoto(null);
      setPanel("text");

      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (photos.length > 0) {
      const photo = photos[activePhoto];

      if (
        Math.abs(point.x - photo.x) < 300 &&
        Math.abs(point.y - photo.y) < 300
      ) {
        setDraggingPhoto(activePhoto);
        setDraggingText(null);

        event.currentTarget.setPointerCapture(
          event.pointerId,
        );
      }
    }
  };

  const moveDrag = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const point = getCanvasPoint(event);
    if (!point) return;

    const dx = point.x - lastPointer.x;
    const dy = point.y - lastPointer.y;

    if (draggingPhoto !== null) {
      setPhotos((current) =>
        current.map((photo, index) =>
          index === draggingPhoto
            ? {
                ...photo,
                x: Math.max(
                  80,
                  Math.min(CANVAS_WIDTH - 80, photo.x + dx),
                ),
                y: Math.max(
                  150,
                  Math.min(CANVAS_HEIGHT - 100, photo.y + dy),
                ),
              }
            : photo,
        ),
      );
    }

    if (draggingText !== null) {
      setTextItems((current) =>
        current.map((item) =>
          item.id === draggingText
            ? {
                ...item,
                x: Math.max(
                  20,
                  Math.min(CANVAS_WIDTH - 20, item.x + dx),
                ),
                y: Math.max(
                  30,
                  Math.min(CANVAS_HEIGHT - 20, item.y + dy),
                ),
              }
            : item,
        ),
      );
    }

    setLastPointer({
      x: point.x,
      y: point.y,
    });
  };

  const stopDrag = () => {
    setDraggingPhoto(null);
    setDraggingText(null);
  };

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = reject;

      image.src = src;
    });

  const drawCoverImage = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number,
  ) => {
    const imageRatio = image.width / image.height;
    const boxRatio = width / height;

    let drawWidth = width;
    let drawHeight = height;

    if (imageRatio > boxRatio) {
      drawHeight = height;
      drawWidth = height * imageRatio;
    } else {
      drawWidth = width;
      drawHeight = width / imageRatio;
    }

    drawWidth *= scale;
    drawHeight *= scale;

    ctx.drawImage(
      image,
      x - drawWidth / 2,
      y - drawHeight / 2,
      drawWidth,
      drawHeight,
    );
  };

  const applyOldEffect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    ctx.save();

    ctx.fillStyle = "rgba(150, 100, 50, 0.15)";
    ctx.fillRect(
      x - width / 2,
      y - height / 2,
      width,
      height,
    );

    ctx.globalAlpha = 0.15;

    for (let i = 0; i < 120; i++) {
      const px =
        x - width / 2 + Math.random() * width;
      const py =
        y - height / 2 + Math.random() * height;

      ctx.fillStyle =
        Math.random() > 0.5 ? "#ffffff" : "#000000";

      ctx.fillRect(px, py, 2, 2);
    }

    ctx.restore();
  };

  const applyFutureEffect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    ctx.save();

    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(30, 210, 255, 0.10)";
    ctx.fillRect(
      x - width / 2,
      y - height / 2,
      width,
      height,
    );

    ctx.strokeStyle = "rgba(50, 220, 255, 0.45)";
    ctx.lineWidth = 3;

    for (
      let py = y - height / 2;
      py < y + height / 2;
      py += 35
    ) {
      ctx.beginPath();
      ctx.moveTo(x - width / 2, py);
      ctx.lineTo(x + width / 2, py);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = background;
    ctx.fillRect(
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );

    const currentPhotos = photos;

    if (currentPhotos.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.textAlign = "center";
      ctx.font = "bold 40px Arial";
      ctx.fillText(
        "UPLOAD PHOTO",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2,
      );
    } else {
      const loadedImages: {
        photo: PhotoItem;
        image: HTMLImageElement;
      }[] = [];

      for (const photo of currentPhotos) {
        try {
          const image = await loadImage(photo.src);
          loadedImages.push({ photo, image });
        } catch {
          // Ignore invalid image.
        }
      }

      const boxWidth =
        template === "thennow"
          ? 520
          : 350;

      const boxHeight =
        template === "thennow"
          ? 760
          : 760;

      for (let i = 0; i < loadedImages.length; i++) {
        const { photo, image } = loadedImages[i];

        const width = boxWidth;
        const height = boxHeight;

        ctx.save();

        ctx.beginPath();
        ctx.rect(
          photo.x - width / 2,
          photo.y - height / 2,
          width,
          height,
        );
        ctx.clip();

        drawCoverImage(
          ctx,
          image,
          photo.x,
          photo.y,
          width,
          height,
          photo.scale,
        );

        if (photo.effect === "old") {
          applyOldEffect(
            ctx,
            photo.x,
            photo.y,
            width,
            height,
          );
        }

        if (photo.effect === "future") {
          applyFutureEffect(
            ctx,
            photo.x,
            photo.y,
            width,
            height,
          );
        }

        ctx.restore();

        ctx.strokeStyle =
          photo.effect === "future"
            ? "#4eeaff"
            : "rgba(255,255,255,0.5)";

        ctx.lineWidth = 5;

        ctx.strokeRect(
          photo.x - width / 2,
          photo.y - height / 2,
          width,
          height,
        );
      }
    }

    // Header
    ctx.textAlign = "center";

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px Arial";
    ctx.fillText(
      title,
      CANVAS_WIDTH / 2,
      75,
    );

    ctx.fillStyle = "#9da7b5";
    ctx.font = "32px Arial";
    ctx.fillText(
      subtitle,
      CANVAS_WIDTH / 2,
      125,
    );

    // Divider
    ctx.strokeStyle =
      template === "thennow"
        ? "rgba(255,255,255,0.18)"
        : "rgba(80,220,255,0.4)";

    ctx.lineWidth = 4;

    if (template === "thennow") {
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 190);
      ctx.lineTo(CANVAS_WIDTH / 2, 1000);
      ctx.stroke();
    } else {
      ctx.beginPath();

      for (let i = 1; i < 3; i++) {
        const x = (CANVAS_WIDTH / 3) * i;

        ctx.moveTo(x, 190);
        ctx.lineTo(x, 1000);
      }

      ctx.stroke();
    }

    // Text
    for (const item of textItems) {
      ctx.save();

      ctx.globalAlpha = item.opacity;
      ctx.fillStyle = item.color;
      ctx.textAlign = "center";
      ctx.font = `${
        item.bold ? "bold " : ""
      }${item.size}px Arial`;

      ctx.fillText(
        item.text,
        item.x,
        item.y,
      );

      ctx.restore();
    }

    // Grain
    if (globalGrain > 0) {
      ctx.save();
      ctx.globalAlpha = globalGrain / 100;

      for (let i = 0; i < 1500; i++) {
        const x =
          Math.random() * CANVAS_WIDTH;
        const y =
          Math.random() * CANVAS_HEIGHT;

        ctx.fillStyle =
          Math.random() > 0.5
            ? "#ffffff"
            : "#000000";

        ctx.fillRect(x, y, 2, 2);
      }

      ctx.restore();
    }

    // Glow
    if (globalGlow > 0) {
      ctx.save();

      ctx.globalAlpha = globalGlow / 100;
      ctx.strokeStyle = "#38e8ff";
      ctx.shadowColor = "#38e8ff";
      ctx.shadowBlur = 35;
      ctx.lineWidth = 8;

      ctx.strokeRect(
        18,
        18,
        CANVAS_WIDTH - 36,
        CANVAS_HEIGHT - 36,
      );

      ctx.restore();
    }

    // Frame
    if (frame === "simple") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 18;
      ctx.strokeRect(
        15,
        15,
        CANVAS_WIDTH - 30,
        CANVAS_HEIGHT - 30,
      );
    }

    if (frame === "retro") {
      ctx.strokeStyle = "#d3a66a";
      ctx.lineWidth = 28;
      ctx.strokeRect(
        15,
        15,
        CANVAS_WIDTH - 30,
        CANVAS_HEIGHT - 30,
      );

      ctx.strokeStyle = "#5d422a";
      ctx.lineWidth = 6;
      ctx.strokeRect(
        42,
        42,
        CANVAS_WIDTH - 84,
        CANVAS_HEIGHT - 84,
      );
    }

    if (frame === "neon") {
      ctx.save();

      ctx.strokeStyle = "#45eaff";
      ctx.shadowColor = "#45eaff";
      ctx.shadowBlur = 30;
      ctx.lineWidth = 12;

      ctx.strokeRect(
        20,
        20,
        CANVAS_WIDTH - 40,
        CANVAS_HEIGHT - 40,
      );

      ctx.restore();
    }
  }, [
    background,
    frame,
    globalGlow,
    globalGrain,
    photos,
    template,
    textItems,
    title,
    subtitle,
  ]);

  useEffect(() => {
    void drawCanvas();
  }, [drawCanvas]);

  const downloadImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setExporting(true);
    setMessage("");

    try {
      const blob = await new Promise<Blob | null>(
        (resolve) =>
          canvas.toBlob(
            resolve,
            "image/png",
            1,
          ),
      );

      if (!blob) {
        throw new Error("Export failed");
      }

      const fileName =
        `photo-equality-old-future-${Date.now()}.png`;

      const isNative =
        typeof window !== "undefined" &&
        (
          window as any
        ).AndroidDownloadBridge;

      if (isNative) {
        const reader = new FileReader();

        reader.onloadend = () => {
          const result = String(
            reader.result || "",
          );

          const base64 = result.split(",")[1];

          try {
            const success =
              (
                window as any
              ).AndroidDownloadBridge.saveBase64ImageToDownloads(
                base64,
                fileName,
              );

            setMessage(
              success === false
                ? "Download failed."
                : "PNG saved to your device.",
            );
          } catch {
            setMessage(
              "Native download failed.",
            );
          }

          setExporting(false);
        };

        reader.readAsDataURL(blob);
        return;
      }

      const url =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);

      setMessage("PNG downloaded.");
    } catch {
      setMessage("Unable to export image.");
    } finally {
      setTimeout(() => {
        setExporting(false);
      }, 300);
    }
  };

  const applyTemplate = (
    value: TemplateId,
  ) => {
    setTemplate(value);

    if (value === "thennow") {
      setTitle("THEN → Now");
      setSubtitle("1990  •  2050");

      setTextItems([
        {
          id: 1,
          text: "THEN",
          x: 300,
          y: 1100,
          size: 46,
          color: "#ffffff",
          opacity: 1,
          bold: true,
        },
        {
          id: 2,
          text: "Now",
          x: 900,
          y: 1100,
          size: 46,
          color: "#65e7ff",
          opacity: 1,
          bold: true,
        },
      ]);

      setPhotos((current) =>
        current.slice(0, 2).map((photo, index) =>
          createPhoto(photo.src, index),
        ),
      );
    } else {
      setTitle("THEN → NOW → FUTURE");
      setSubtitle("1990  •  2026  •  2050");

      setTextItems([
        {
          id: 1,
          text: "THEN",
          x: 200,
          y: 1100,
          size: 38,
          color: "#ffffff",
          opacity: 1,
          bold: true,
        },
        {
          id: 2,
          text: "NOW",
          x: 600,
          y: 1100,
          size: 38,
          color: "#ffffff",
          opacity: 1,
          bold: true,
        },
        {
          id: 3,
          text: "FUTURE",
          x: 1000,
          y: 1100,
          size: 38,
          color: "#65e7ff",
          opacity: 1,
          bold: true,
        },
      ]);

      setPhotos((current) =>
        current.slice(0, 3).map((photo, index) =>
          createPhoto(photo.src, index),
        ),
      );
    }

    setActivePhoto(0);
  };

  const selectedPhoto =
    photos[activePhoto];

  const selectedTextItem =
    textItems.find(
      (item) => item.id === selectedText,
    );

  return (
    <TopNavigation>
  
    <div className="min-h-screen bg-[#15191f] text-white">

      <main className="mx-auto w-full max-w-[1450px] px-2 pb-6 pt-3 sm:px-4">
        {/* HEADER */}
        <div className="mb-1.5 rounded-xl border border-white/10 bg-[#20242c] p-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
  <button
    type="button"
    onClick={uploadClick}
    className="w-fit min-h-10 rounded-lg bg-[#f3ad61] px-4 text-sm font-bold text-black transition hover:brightness-110 active:scale-[0.98]"
  >
    + Add Photo
  </button>

  <h1 className="text-sm text-white/70">
    Create a timeline design
  </h1>
</div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(
                event: ChangeEvent<HTMLInputElement>,
              ) => {
                handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid gap-3 lg:grid-cols-[250px_minmax(0,1fr)_280px]">
          {/* LEFT */}
          <aside className="order-2 rounded-xl border border-white/10 bg-[#20242c] p-2 lg:order-1">
            <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-1">
              <button
                onClick={() => openPanel("template")}
                className={`rounded-lg px-2 py-3 text-xs font-semibold ${
                  panel === "template"
                    ? "bg-[#f3ad61] text-black"
                    : "bg-white/5 text-white/80"
                }`}
              >
                Templates
              </button>

              <button
                onClick={() => openPanel("effect")}
                className={`rounded-lg px-2 py-3 text-xs font-semibold ${
                  panel === "effect"
                    ? "bg-[#f3ad61] text-black"
                    : "bg-white/5 text-white/80"
                }`}
              >
                Effects
              </button>

              <button
                onClick={() => openPanel("background")}
                className={`rounded-lg px-2 py-3 text-xs font-semibold ${
                  panel === "background"
                    ? "bg-[#f3ad61] text-black"
                    : "bg-white/5 text-white/80"
                }`}
              >
                Background
              </button>

              <button
                onClick={() => openPanel("frame")}
                className={`rounded-lg px-2 py-3 text-xs font-semibold ${
                  panel === "frame"
                    ? "bg-[#f3ad61] text-black"
                    : "bg-white/5 text-white/80"
                }`}
              >
                Frame
              </button>

              <button
                onClick={() => openPanel("text")}
                className={`rounded-lg px-2 py-3 text-xs font-semibold ${
                  panel === "text"
                    ? "bg-[#f3ad61] text-black"
                    : "bg-white/5 text-white/80"
                }`}
              >
                Text
              </button>

              <button
                onClick={() => openPanel("year")}
                className={`rounded-lg px-2 py-3 text-xs font-semibold ${
                  panel === "year"
                    ? "bg-[#f3ad61] text-black"
                    : "bg-white/5 text-white/80"
                }`}
              >
                Years
              </button>
            </div>

            <div className="mt-2">
              {/* TEMPLATE */}
              {panel === "template" && (
                <div className="space-y-2">
                  {(
                    Object.entries(
                      templates,
                    ) as [
                      TemplateId,
                      {
                        name: string;
                        description: string;
                      },
                    ][]
                  ).map(
                    ([
                      id,
                      item,
                    ]) => (
                      <button
                        key={id}
                        onClick={() =>
                          applyTemplate(id)
                        }
                        className={`w-full rounded-xl border p-3 text-left ${
                          template === id
                            ? "border-[#f3ad61] bg-[#f3ad61]/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="text-sm font-bold">
                          {item.name}
                        </div>

                        <div className="mt-1 text-[11px] text-white/50">
                          {item.description}
                        </div>
                      </button>
                    ),
                  )}

                  {/*<button
                    onClick={uploadClick}
                    className="w-full rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-center text-sm font-semibold"
                  >
                    📷 Upload Photos
                  </button>*/}
                </div>
              )}

              {/* EFFECT */}
              {panel === "effect" && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-white/60">
                    Selected Photo
                  </div>

                  {photos.length === 0 ? (
                    <div className="rounded-lg bg-white/5 p-3 text-xs text-white/50">
                      Upload a photo first.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-1.5">
                        {photos.map(
                          (photo, index) => (
                            <button
                              key={photo.id}
                              onClick={() =>
                                setActivePhoto(
                                  index,
                                )
                              }
                              className={`rounded-lg border p-2 text-xs ${
                                activePhoto ===
                                index
                                  ? "border-[#f3ad61] bg-[#f3ad61]/10"
                                  : "border-white/10 bg-white/5"
                              }`}
                            >
                              Photo{" "}
                              {index + 1}
                            </button>
                          ),
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            "normal",
                            "old",
                            "future",
                          ] as const
                        ).map(
                          (effect) => (
                            <button
                              key={effect}
                              onClick={() =>
                                updatePhoto(
                                  activePhoto,
                                  {
                                    effect,
                                  },
                                )
                              }
                              className={`rounded-lg px-2 py-3 text-xs font-bold ${
                                selectedPhoto?.effect ===
                                effect
                                  ? "bg-[#f3ad61] text-black"
                                  : "bg-white/5"
                              }`}
                            >
                              {effect ===
                              "normal"
                                ? "Normal"
                                : effect ===
                                    "old"
                                  ? "90s"
                                  : "Future"}
                            </button>
                          ),
                        )}
                      </div>

                      <label className="block text-xs">
                        Zoom
                        <input
                          type="range"
                          min="0.6"
                          max="1.8"
                          step="0.05"
                          value={
                            selectedPhoto?.scale ??
                            1
                          }
                          onChange={(event) =>
                            updatePhoto(
                              activePhoto,
                              {
                                scale: Number(
                                  event.target
                                    .value,
                                ),
                              },
                            )
                          }
                          className="mt-2 w-full"
                        />
                      </label>

                      <label className="block text-xs">
                        Grain
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={globalGrain}
                          onChange={(event) =>
                            setGlobalGrain(
                              Number(
                                event.target
                                  .value,
                              ),
                            )
                          }
                          className="mt-2 w-full"
                        />
                      </label>

                      <label className="block text-xs">
                        Future Glow
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={globalGlow}
                          onChange={(event) =>
                            setGlobalGlow(
                              Number(
                                event.target
                                  .value,
                              ),
                            )
                          }
                          className="mt-2 w-full"
                        />
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* BACKGROUND */}
              {panel === "background" && (
                <div className="grid grid-cols-2 gap-2">
                  {backgrounds.map(
                    (item) => (
                      <button
                        key={item.id}
                        onClick={() =>
                          setBackground(
                            item.value,
                          )
                        }
                        className={`rounded-xl border p-2 ${
                          background ===
                          item.value
                            ? "border-[#f3ad61]"
                            : "border-white/10"
                        }`}
                      >
                        <span
                          className="mb-2 block h-10 rounded-lg"
                          style={{
                            background:
                              item.value,
                          }}
                        />

                        <span className="text-[11px]">
                          {item.name}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              )}

              {/* FRAME */}
              {panel === "frame" && (
                <div className="grid grid-cols-2 gap-2">
                  {frames.map(
                    (item) => (
                      <button
                        key={item.id}
                        onClick={() =>
                          setFrame(item.id)
                        }
                        className={`rounded-xl border p-4 text-xs font-bold ${
                          frame === item.id
                            ? "border-[#f3ad61] bg-[#f3ad61]/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        {item.name}
                      </button>
                    ),
                  )}
                </div>
              )}

              {/* TEXT */}
              {panel === "text" && (
                <div className="space-y-3">
                  <button
                    onClick={addText}
                    className="w-full rounded-lg bg-[#f3ad61] py-2 text-sm font-bold text-black"
                  >
                    + Add Text
                  </button>

                  {textItems.map(
                    (item) => (
                      <button
                        key={item.id}
                        onClick={() =>
                          setSelectedText(
                            item.id,
                          )
                        }
                        className={`w-full rounded-lg border p-2 text-left ${
                          selectedText ===
                          item.id
                            ? "border-[#f3ad61]"
                            : "border-white/10"
                        }`}
                      >
                        <div className="text-sm font-bold">
                          {item.text}
                        </div>
                      </button>
                    ),
                  )}

                  {selectedTextItem && (
                    <>
                      <input
                        value={
                          selectedTextItem.text
                        }
                        onChange={(event) =>
                          updateSelectedText({
                            text: event.target
                              .value,
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                        placeholder="Text"
                      />

                      <label className="block text-xs">
                        Size
                        <input
                          type="range"
                          min="18"
                          max="100"
                          value={
                            selectedTextItem.size
                          }
                          onChange={(event) =>
                            updateSelectedText({
                              size: Number(
                                event.target
                                  .value,
                              ),
                            })
                          }
                          className="mt-2 w-full"
                        />
                      </label>

                      <label className="block text-xs">
                        Opacity
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={
                            selectedTextItem.opacity
                          }
                          onChange={(event) =>
                            updateSelectedText({
                              opacity:
                                Number(
                                  event.target
                                    .value,
                                ),
                            })
                          }
                          className="mt-2 w-full"
                        />
                      </label>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            updateSelectedText({
                              bold:
                                !selectedTextItem.bold,
                            })
                          }
                          className={`flex-1 rounded-lg py-2 text-sm font-bold ${
                            selectedTextItem.bold
                              ? "bg-[#f3ad61] text-black"
                              : "bg-white/5"
                          }`}
                        >
                          B
                        </button>

                        <input
                          type="color"
                          value={
                            selectedTextItem.color
                          }
                          onChange={(event) =>
                            updateSelectedText({
                              color:
                                event.target.value,
                            })
                          }
                          className="h-9 w-12 rounded-lg border-0 bg-transparent"
                        />

                        <button
                          onClick={
                            deleteSelectedText
                          }
                          className="rounded-lg bg-red-500/20 px-3 text-sm font-bold text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* YEARS */}
              {panel === "year" && (
                <div className="space-y-3">
                  <label className="block text-xs">
                    Main Title
                    <input
                      value={title}
                      onChange={(event) =>
                        setTitle(
                          event.target.value,
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <label className="block text-xs">
                    Years
                    <input
                      value={subtitle}
                      onChange={(event) =>
                        setSubtitle(
                          event.target.value,
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <p className="text-[11px] leading-5 text-white/40">
                    Example: 1990 • 2026 • 2050
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* CENTER CANVAS */}
          <section className="order-1 min-w-0 lg:order-2">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c0f14] p-2 shadow-xl sm:p-3">
              <div className="mx-auto w-full max-w-[720px]">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  onPointerDown={startDrag}
                  onPointerMove={moveDrag}
                  onPointerUp={stopDrag}
                  onPointerCancel={stopDrag}
                  onPointerLeave={stopDrag}
                  className="block h-auto w-full touch-none rounded-lg"
                />
              </div>

              <div className="mt-2 text-center text-[11px] text-white/35">
                Drag photo or text directly on the preview.
              </div>
            </div>
          </section>

          {/* RIGHT */}
          <aside className="order-3 rounded-xl border border-white/10 bg-[#20242c] p-3">
            <h2 className="mb-3 text-sm font-bold">
              Photos
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {Array.from({
                length:
                  template === "thennow"
                    ? 2
                    : 3,
              }).map((_, index) => {
                const photo =
                  photos[index];

                return (
                  <button
                    key={index}
                    onClick={() => {
                      setActivePhoto(
                        index,
                      );

                      if (!photo) {
                        uploadClick();
                      }
                    }}
                    className={`relative aspect-square overflow-hidden rounded-lg border ${
                      activePhoto === index
                        ? "border-[#f3ad61]"
                        : "border-white/10"
                    } bg-black/20`}
                  >
                    {photo ? (
                      <>
                        <img
                          src={photo.src}
                          alt={`Photo ${
                            index + 1
                          }`}
                          className="h-full w-full object-cover"
                        />

                        <span
                          onClick={(
                            event,
                          ) => {
                            event.stopPropagation();
                            removePhoto(
                              index,
                            );
                          }}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm"
                        >
                          ×
                        </span>
                      </>
                    ) : (
                      <span className="text-xl text-white/40">
                        +
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl bg-white/5 p-3">
              <div className="text-xs font-bold">
                Current Template
              </div>

              <div className="mt-1 text-sm text-white/60">
                {templates[template].name}
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-white/5 p-3 text-[11px] leading-5 text-white/45">
              <div className="font-bold text-white/70">
                Quick controls
              </div>

              <div className="mt-1">
                • Select photo from the
                thumbnails.
              </div>

              <div>
                • Drag directly on Board
              </div>

              <div>
                • Use Effects for Then/Now
                look.
              </div>

              <div>
                • Use Text to add custom text.
              </div>
            </div>
          </aside>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="sticky bottom-2 z-20 mt-3 rounded-xl border border-white/10 bg-[#20242c]/95 p-2 shadow-2xl backdrop-blur">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <button
              onClick={resetAll}
              className="min-h-11 rounded-lg bg-white/5 px-2 text-xs font-bold text-white/80 hover:bg-white/10"
            >
              Reset
            </button>

            <button
              onClick={() => setPanel("text")}
              className="min-h-11 rounded-lg bg-white/5 px-2 text-xs font-bold text-white/80 hover:bg-white/10"
            >
              Edit
            </button>

            {/*<button
              onClick={uploadClick}
              className="min-h-11 rounded-lg bg-white/5 px-2 text-xs font-bold text-white/80 hover:bg-white/10"
            >
              Add Photo
            </button>*/}

            <button
              onClick={downloadImage}
              disabled={exporting}
              className="min-h-11 rounded-lg bg-[#f3ad61] px-2 text-xs font-bold text-black transition hover:brightness-110 disabled:opacity-50 sm:col-auto"
            >
              {exporting
                ? "Exporting..."
                : "Download"}
            </button>
          </div>

          {message && (
            <div className="pt-2 text-center text-xs text-white/60">
              {message}
            </div>
          )}
        </div>
      </main>
    </div>
    </TopNavigation>
  );
}