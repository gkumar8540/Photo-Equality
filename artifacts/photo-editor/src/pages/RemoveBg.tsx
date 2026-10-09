import React, { useEffect, useRef, useState } from "react";
import { removeBackground } from "@imgly/background-removal";

function formatBytes(bytes: number) {
  if (!bytes) return "0 KB";

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function RemoveBg() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  const [resultBlob, setResultBlob] = useState<Blob | null>(
    null
  );

  const [rgbColor, setRgbColor] = useState("#808080");

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const [background, setBackground] = useState<
  "transparent" | "white" | "black" | "blue" | "red" | "green" | "yellow" | "rgb"
  >("transparent");

  const [resultWithBackground, setResultWithBackground] =
    useState("");

  const objectUrls = useRef(new Set<string>());

  const createObjectUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    objectUrls.current.add(url);
    return url;
  };

  const revokeObjectUrl = (url: string) => {
    if (objectUrls.current.delete(url)) {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    };
  }, []);

  const handleFile = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = event.target.files?.[0];

    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setStatus("Please select a valid image.");
      return;
    }

    if (originalUrl) {
      revokeObjectUrl(originalUrl);
    }

    if (resultUrl) {
      revokeObjectUrl(resultUrl);
    }

    if (resultWithBackground) {
      revokeObjectUrl(resultWithBackground);
    }

    const url = createObjectUrl(selected);

    setFile(selected);
    setOriginalUrl(url);

    setResultUrl("");
    setResultBlob(null);
    setResultWithBackground("");

    setProgress(0);
    setStatus("");
  };

  const processBackground = async () => {
  if (!file) {
    setStatus("Please upload an image first.");
    return;
  }

  try {
    setProcessing(true);
    setProgress(0);
    setStatus("Preparing AI background removal...");

    const blob = await removeBackground(file, {
      // Higher-quality model
      model: "isnet",

      // Keep PNG transparency
      output: {
        format: "image/png",
        quality: 1,
      },

      // Live processing stages
      progress: (key: string, current: number, total: number) => {
        if (!total) return;

        const ratio = current / total;
        let percent = 0;

        // Model / WASM files loading
        if (!key.startsWith("compute:")) {
          percent = Math.round(ratio * 20);

          setStatus("Loading AI model...");
        }

        // Image decoding
        else if (key === "compute:decode") {
          percent = 25;
          setStatus("Preparing image...");
        }

        // Main AI segmentation
        else if (key === "compute:inference") {
          percent = 50;
          setStatus("AI is detecting the subject...");
        }

        // Applying mask
        else if (key === "compute:mask") {
          percent = 75;
          setStatus("Removing background...");
        }

        // Creating final transparent PNG
        else if (key === "compute:encode") {
          percent = Math.round(75 + ratio * 25);
          setStatus("Creating transparent image...");
        }

        setProgress(
          Math.max(0, Math.min(100, percent))
        );
      },
    });

    // Processing completed
    setProgress(100);
    setStatus("Background removed successfully.");

    if (resultUrl) {
      revokeObjectUrl(resultUrl);
    }

    const url = createObjectUrl(blob);

    setResultBlob(blob);
    setResultUrl(url);

    // Transparent result is the default
    if (resultWithBackground) {
      revokeObjectUrl(resultWithBackground);
      setResultWithBackground("");
    }

    setBackground("transparent");

  } catch (error) {
    console.error(
      "Background removal failed:",
      error
    );

    setProgress(0);

    setStatus(
      "Background removal failed. Please try another image."
    );
  } finally {
    setProcessing(false);
  }
};



  const createBackgroundVersion = async (
  color: string,
  backgroundName: string
) => {
  if (!resultUrl) {
    setStatus("Remove the background first.");
    return;
  }

  try {
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(
          new Error("Could not load processed image")
        );
      img.src = resultUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create background canvas");
    }

    ctx.fillStyle = color;
    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.drawImage(
      img,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const newBlob =
      await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Could not export background image"));
            }
          },
          "image/png"
        );
      });

    if (resultWithBackground) {
      revokeObjectUrl(
        resultWithBackground
      );
    }

    const url = createObjectUrl(newBlob);

    setResultWithBackground(url);
    setStatus(`${backgroundName} background applied.`);
  } catch (error) {
    console.error("Could not apply the selected background:", error);
    setStatus(
      "Could not apply the selected background."
    );
  }
};

  const selectBackground = async (
  value:
    | "transparent"
    | "white"
    | "black"
    | "blue"
    | "red"
    | "green"
    | "yellow"
    | "rgb",
  customColor?: string
) => {
  setBackground(value);

  if (value === "transparent") {
    if (resultWithBackground) {
      revokeObjectUrl(
        resultWithBackground
      );
      setResultWithBackground("");
    }

    setStatus(
      "Transparent background selected."
    );

    return;
  }

  if (value === "rgb") {
    if (!customColor) return;
    setRgbColor(customColor);
    await createBackgroundVersion(customColor, "Custom");
    return;
  }

  const colors: Record<string, string> = {
    white: "#ffffff",
    black: "#000000",
    blue: "#2563eb",
    red: "#ef4444",
    green: "#22c55e",
    yellow: "#eab308",
  };

  await createBackgroundVersion(colors[value], value[0].toUpperCase() + value.slice(1));
};

  const download = () => {
    if (!resultUrl || !resultBlob) {
      setStatus(
        "Remove the background first."
      );
      return;
    }

    const downloadUrl =
      background === "transparent"
        ? resultUrl
        : resultWithBackground || resultUrl;

    const originalName =
      file?.name.replace(/\.[^/.]+$/, "") ||
      "image";

    const link =
      document.createElement("a");

    link.href = downloadUrl;

    link.download =
      `${originalName}-no-background.png`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setStatus("Image downloaded.");
  };

  const reset = () => {
    if (originalUrl) {
      revokeObjectUrl(originalUrl);
    }

    if (resultUrl) {
      revokeObjectUrl(resultUrl);
    }

    if (resultWithBackground) {
      revokeObjectUrl(
        resultWithBackground
      );
    }

    setFile(null);
    setOriginalUrl("");

    setResultUrl("");
    setResultBlob(null);

    setResultWithBackground("");

    setProgress(0);
    setStatus("");

    setBackground("transparent");
    setRgbColor("#808080");
  };

  const displayResult =
    background === "transparent"
      ? resultUrl
      : resultWithBackground || resultUrl;

  return (
    <div className="min-h-screen w-full min-w-0 bg-[#0c1d39] px-4 py-4 text-white">
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        {/* Header */}
        <div className="mb-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mb-0 rounded-lg border border-[#303b4d] bg-[#172844] px-1 py-0 text-sm text-gray-200 transition hover:bg-[#213553]"
          >
            ← Back
          </button>

          <h1 className="text-[15px] font-bold sm:text-3xl">
            Remove Image Background
          </h1>
          </div>

          <p className="mt-2 text-[8px] text-gray-400">
            Remove the background automatically using
            AI and download a transparent PNG.
          </p>
        </div>

        <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Preview */}
          <section className="w-full min-w-0 rounded-2xl border border-[#303b4d] bg-[#141f30] p-3 shadow-xl sm:p-6">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  Preview
                </h2>

                {file && (
                  <p className="mt-1 text-xs text-gray-400">
                    Original:{" "}
                    {formatBytes(file.size)}
                  </p>
                )}
              </div>

              {resultBlob && (
                <span className="rounded-full bg-[#173a2b] px-3 py-1 text-xs text-green-300">
                  PNG •{" "}
                  {formatBytes(resultBlob.size)}
                </span>
              )}
            </div>

            <div
              className="flex min-h-[460px] items-center justify-center rounded-xl border border-[#303b4d] p-4"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, #182538 25%, transparent 25%), linear-gradient(-45deg, #182538 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #182538 75%), linear-gradient(-45deg, transparent 75%, #182538 75%)",
                backgroundSize:
                  "24px 24px",
                backgroundPosition:
                  "0 0, 0 12px, 12px -12px, -12px 0px",
                backgroundColor:
                  "#101a29",
              }}
            >
              {!originalUrl ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#46566e] bg-[#0c1828] px-8 py-16 text-center transition hover:border-[#f3ad61]">
                  <div className="mb-4 text-5xl">
                    ✂️
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
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="w-full">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Original */}
                    <div>
                      <p className="mb-2 text-xs text-gray-400">
                        Original
                      </p>

                      <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-[#0d1827] p-3">
                        <img
                          src={originalUrl}
                          alt="Original"
                          className="max-h-[420px] max-w-full rounded object-contain"
                        />
                      </div>
                    </div>

                    {/* Result */}
                    <div>
                      <p className="mb-2 text-xs text-gray-400">
                        Background Removed
                      </p>

                      <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-[#0d1827] p-3">
                        {displayResult ? (
                          <img
                            src={displayResult}
                            alt="Background removed"
                            className="max-h-[420px] max-w-full rounded object-contain"
                          />
                        ) : (
                          <span className="text-sm text-gray-500">
                            Process image to preview
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

            {/* Progress */}
            {processing && (
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs text-gray-400">
                  <span>
                    Processing with AI...
                  </span>

                  <span>
                    {progress}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[#263449]">
                  <div
                    className="h-full rounded-full bg-[#f3ad61] transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  First run may take longer 
                  while the AI model loads.
                </p>
              </div>
            )}

            {status && !processing && (
              <div className="mt-4 rounded-lg border border-[#34445b] bg-[#101b2b] px-4 py-3 text-sm text-gray-300">
                {status}
              </div>
            )}
          </section>

          {/* Controls */}
          <aside className="w-full min-w-0 rounded-2xl border border-[#303b4d] bg-[#141f30] p-4 shadow-xl sm:p-5">
            <h2 className="mb-2 text-lg font-semibold">
              Background Settings
            </h2>


  {/* Background */}
 <div className="mb-6">
  <label className="mb-3 block text-sm text-gray-300">
    Output Background
  </label>

  <div className="flex w-full min-w-0 flex-nowrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
    {/* Transparent */}
    <button
      type="button"
      disabled={!resultUrl}
      onClick={() =>
        selectBackground("transparent")
      }
      className={`w-[84px] flex-none rounded-lg border px-2 py-3 text-xs transition ${
        background === "transparent"
          ? "border-[#f3ad61] bg-[#2c2a26] text-[#f3ad61]"
          : "border-[#3a4a60] text-gray-300 hover:bg-[#1c2a3d]"
      } disabled:opacity-40`}
    >
      <span className="mb-1 block text-lg">
        ◩
      </span>
      <span className="text-[12px]">
       Transparent
      </span>
    </button>


    {/* RGB */}
    <label
      className={`relative w-[84px] flex-none cursor-pointer rounded-lg border px-2 py-3 text-center text-xs transition ${
        background === "rgb"
          ? "border-[#f3ad61] bg-[#2c2a26] text-[#f3ad61]"
          : "border-[#3a4a60] text-gray-300 hover:bg-[#1c2a3d]"
      } ${
        !resultUrl
          ? "pointer-events-none opacity-40"
          : ""
      }`}
    >
      <span
        className="mx-auto mb-1 block h-5 w-5 rounded-full border border-[#60708a]"
        style={{ backgroundColor: rgbColor }}
      />
      🎨
      RGB

      <input
        type="color"
        disabled={!resultUrl}
        value={rgbColor}
        aria-label="Choose custom background color"
        onChange={(e) =>
          void selectBackground("rgb", e.target.value)
        }
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </label>

    {/* White */}
    <button
      type="button"
      disabled={!resultUrl}
      onClick={() =>
        selectBackground("white")
      }
      className={`w-[84px] flex-none rounded-lg border px-2 py-3 text-xs transition ${
        background === "white"
          ? "border-[#f3ad61] bg-[#2c2a26] text-[#f3ad61]"
          : "border-[#3a4a60] text-gray-300 hover:bg-[#1c2a3d]"
      } disabled:opacity-40`}
    >
      <span className="mb-1 block text-lg">
        ⚪
      </span>
      White
    </button>

    {/* Black */}
    <button
      type="button"
      disabled={!resultUrl}
      onClick={() =>
        selectBackground("black")
      }
      className={`w-[84px] flex-none rounded-lg border px-2 py-3 text-xs transition ${
        background === "black"
          ? "border-[#f3ad61] bg-[#2c2a26] text-[#f3ad61]"
          : "border-[#3a4a60] text-gray-300 hover:bg-[#1c2a3d]"
      } disabled:opacity-40`}
    >
      <span className="mb-1 block text-lg">
        ⚫
      </span>
      Black
    </button>

    {/* Blue */}
    <button
      type="button"
      disabled={!resultUrl}
      onClick={() =>
        selectBackground("blue")
      }
      className={`w-[84px] flex-none rounded-lg border px-2 py-3 text-xs transition ${
        background === "blue"
          ? "border-[#f3ad61] bg-[#2c2a26] text-[#f3ad61]"
          : "border-[#3a4a60] text-gray-300 hover:bg-[#1c2a3d]"
      } disabled:opacity-40`}
    >
      <span
        className="mx-auto mb-1 block h-5 w-5 rounded-full border border-[#60708a]"
        style={{
          backgroundColor: "#2563eb",
        }}
      />
      Blue
    </button>

    {/* Red */}
    <button
      type="button"
      disabled={!resultUrl}
      onClick={() =>
        selectBackground("red")
      }
      className={`w-[84px] flex-none rounded-lg border px-2 py-3 text-xs transition ${
        background === "red"
          ? "border-[#f3ad61] bg-[#2c2a26] text-[#f3ad61]"
          : "border-[#3a4a60] text-gray-300 hover:bg-[#1c2a3d]"
      } disabled:opacity-40`}
    >
      <span
        className="mx-auto mb-1 block h-5 w-5 rounded-full border border-[#60708a]"
        style={{
          backgroundColor: "#ef4444",
        }}
      />
      Red
    </button>

    {/* Green */}
    <button
      type="button"
      disabled={!resultUrl}
      onClick={() =>
        selectBackground("green")
      }
      className={`w-[84px] flex-none rounded-lg border px-2 py-3 text-xs transition ${
        background === "green"
          ? "border-[#f3ad61] bg-[#2c2a26] text-[#f3ad61]"
          : "border-[#3a4a60] text-gray-300 hover:bg-[#1c2a3d]"
      } disabled:opacity-40`}
    >
      <span
        className="mx-auto mb-1 block h-5 w-5 rounded-full border border-[#60708a]"
        style={{
          backgroundColor: "#22c55e",
        }}
      />
      Green
    </button>

    {/* Yellow */}
    <button
      type="button"
      disabled={!resultUrl}
      onClick={() =>
        selectBackground("yellow")
      }
      className={`w-[84px] flex-none rounded-lg border px-2 py-3 text-xs transition ${
        background === "yellow"
          ? "border-[#f3ad61] bg-[#2c2a26] text-[#f3ad61]"
          : "border-[#3a4a60] text-gray-300 hover:bg-[#1c2a3d]"
      } disabled:opacity-40`}
    >
      <span
        className="mx-auto mb-1 block h-5 w-5 rounded-full border border-[#60708a]"
        style={{
          backgroundColor: "#eab308",
        }}
      />
      Yellow
    </button>
    
  </div>
</div>



            {/* Information */}
            <div className="mb-4 rounded-xl border border-[#303b4d] bg-[#101a29] p-4">
              <div className="mb-3 text-sm font-medium">
                How it works
              </div>

              <div className="space-y-3 text-xs text-gray-400">
                <div className="flex gap-2">
                  <span className="text-[#f3ad61]">
                    1.
                  </span>

                  <span>
                    Upload your image.
                  </span>
                </div>

                <div className="flex gap-2">
                  <span className="text-[#f3ad61]">
                    2.
                  </span>

                  <span>
                    AI detects the foreground and
                    removes the background.
                  </span>
                </div>

                <div className="flex gap-2">
                  <span className="text-[#f3ad61]">
                    3.
                  </span>

                  <span>
                    Download the result as a PNG with
                    transparency.
                  </span>
                </div>
              </div>
            </div>

            {/* Privacy note */}
            <div className="mb-5 rounded-lg border border-[#30415a] bg-[#0e1a2a] p-3 text-xs text-gray-400">
              <strong className="text-gray-300">
                Processing:
              </strong>{" "}
              The background-removal processing runs in
              the browser using the installed AI model.
            </div>

            {/* Main button */}
            <div className="flex flex-row gap-2">
            <button
              type="button"
              disabled={!file || processing}
              onClick={processBackground}
              className="flex items-center justify-centerw-full h-15 rounded-lg bg-[#f3ad61] px-4 py-3 font-semibold text-[#111827] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40">
              {processing
                ? `Removing Background... ${progress}%`
                : "Remove Background"}
            </button>

            {/* Download */}
            <button
              type="button"
              disabled={!resultUrl}
              onClick={download}
              className="mt-0 w-full h-15 rounded-lg border border-[#46566e] px-4 py-3 font-semibold text-white transition hover:bg-[#1d2b40] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Download PNG
            </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
