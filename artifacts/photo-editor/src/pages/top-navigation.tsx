import { useEffect, useRef, useState } from 'react';

type TextLayer = {
  id: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;

  highlightedWords: {
  start: number;
  end: number;
  color: string;
}[];

  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  opacity: number;
};

type Tool = 'background' | 'photo' | 'size' | 'text';

export default function PhotoMixerPage() {
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const [background, setBackground] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  const [activeTool, setActiveTool] =
    useState<Tool>('background');

  const [textLayers, setTextLayers] =
    useState<TextLayer[]>([]);

  const [selectedTextId, setSelectedTextId] =
    useState<number | null>(null);

  const [selectedWordRange, setSelectedWordRange] = useState<{
  layerId: number;
  start: number;
  end: number;
} | null>(null);

  const [showTextPanel, setShowTextPanel] =
    useState(false);

  const [newText, setNewText] = useState('');
  const [textColor, setTextColor] =
    useState('#ffffff');

    const [wordColor, setWordColor] = useState('#ff0000');

  const [textSize, setTextSize] =
    useState(32);

  const [textBold, setTextBold] =
    useState(false);

  const [textItalic, setTextItalic] =
    useState(false);

  const [textAlign, setTextAlign] =
    useState<'left' | 'center' | 'right'>(
      'center'
    );

  const [photoTransform, setPhotoTransform] =
    useState({
      x: 50,
      y: 50,
      width: 76,
      rotation: 0,
    });

  const [canvasRotation, setCanvasRotation] =
    useState(0);

  const [dragging, setDragging] = useState<{
    type: 'photo' | 'text';
    id?: number;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
  } | null>(null);

  // =========================
  // BACKGROUND
  // =========================

  const selectBackground = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const nextUrl = URL.createObjectURL(file);

    setBackground((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return nextUrl;
    });

    event.target.value = '';
  };

  // =========================
  // PHOTO
  // =========================

  const selectPhoto = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const nextUrl = URL.createObjectURL(file);

    setPhoto((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return nextUrl;
    });

    setPhotoTransform({
      x: 50,
      y: 50,
      width: 76,
      rotation: 0,
    });

    event.target.value = '';
  };

  // =========================
  // TEXT
  // =========================

  const addText = () => {
    const value = newText.trim();

    if (!value) return;

    const id = Date.now();

    const newLayer: TextLayer = {
      id,
      text: value,
      x: 50,
      y: 50,
      fontSize: textSize,
      color: textColor,
        highlightedWords: [],
      bold: textBold,
      italic: textItalic,
      align: textAlign,
      opacity: 1,
    };

    setTextLayers((layers) => [
      ...layers,
      newLayer,
    ]);

    setSelectedTextId(id);
    setNewText('');
    setShowTextPanel(false);
    setActiveTool('text');
  };

  const updateSelectedText = (
    updates: Partial<TextLayer>
  ) => {
    if (selectedTextId === null) return;
            

  const applyWordColor = (color: string) => {
  if (!selectedWordRange) return;

  setTextLayers((layers) =>
    layers.map((layer) => {
      if (layer.id !== selectedWordRange.layerId) {
        return layer;
      }

      const newHighlight = {
        start: selectedWordRange.start,
        end: selectedWordRange.end,
        color,
      };

      const remainingHighlights = layer.highlightedWords.filter(
        (highlight) =>
          highlight.end <= selectedWordRange.start ||
          highlight.start >= selectedWordRange.end
      );

      return {
        ...layer,
        highlightedWords: [
          ...remainingHighlights,
          newHighlight,
        ],
      };
    })
  );
};

    setTextLayers((layers) =>
      layers.map((layer) =>
        layer.id === selectedTextId
          ? {
              ...layer,
              ...updates,
            }
          : layer
      )
    );
  };

  const deleteSelectedText = () => {
    if (selectedTextId === null) return;

    setTextLayers((layers) =>
      layers.filter(
        (layer) =>
          layer.id !== selectedTextId
      )
    );

    setSelectedTextId(null);
  };

  // =========================
  // POINTER DOWN
  // =========================

  const handlePointerDown = (
    event: React.PointerEvent,
    type: 'photo' | 'text',
    id?: number
  ) => {
    const canvas = canvasAreaRef.current;

    if (!canvas) return;

    let currentX = 50;
    let currentY = 50;

    if (type === 'photo') {
      currentX = photoTransform.x;
      currentY = photoTransform.y;
    }

    if (
      type === 'text' &&
      id !== undefined
    ) {
      const layer = textLayers.find(
        (item) => item.id === id
      );

      if (layer) {
        currentX = layer.x;
        currentY = layer.y;
      }
    }

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    setDragging({
      type,
      id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: currentX,
      originalY: currentY,
    });
  };

  // =========================
  // POINTER MOVE
  // =========================

  const handlePointerMove = (
    event: React.PointerEvent
  ) => {
    if (!dragging) return;

    const canvas = canvasAreaRef.current;

    if (!canvas) return;

    const rect =
      canvas.getBoundingClientRect();

    const deltaX =
      ((event.clientX - dragging.startX) /
        rect.width) *
      100;

    const deltaY =
      ((event.clientY - dragging.startY) /
        rect.height) *
      100;

    const newX = Math.max(
      0,
      Math.min(
        100,
        dragging.originalX + deltaX
      )
    );

    const newY = Math.max(
      0,
      Math.min(
        100,
        dragging.originalY + deltaY
      )
    );

    if (dragging.type === 'photo') {
      setPhotoTransform((current) => ({
        ...current,
        x: newX,
        y: newY,
      }));
    }

    if (
      dragging.type === 'text' &&
      dragging.id !== undefined
    ) {
      setTextLayers((layers) =>
        layers.map((layer) =>
          layer.id === dragging.id
            ? {
                ...layer,
                x: newX,
                y: newY,
              }
            : layer
        )
      );
    }
  };

  // =========================
  // POINTER UP
  // =========================

  const handlePointerUp = (
    event: React.PointerEvent
  ) => {
    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    setDragging(null);
  };

  // =========================
  // ROTATE CANVAS
  // =========================

  const rotateCanvas = () => {
    setCanvasRotation(
      (rotation) =>
        (rotation + 90) % 360
    );
  };

  // =========================
  // DONE / EXPORT
  // =========================

  const handleDone = () => {
    const canvas =
      canvasAreaRef.current;

    if (!canvas) return;

    alert(
      'Photo Mixer editing completed.'
    );
  };

  // =========================
  // SELECTED TEXT
  // =========================

  const selectedText =
    textLayers.find(
      (layer) =>
        layer.id === selectedTextId
    ) ?? null;
    

  useEffect(() => {
    return () => {
      if (background) {
        URL.revokeObjectURL(background);
      }

      if (photo) {
        URL.revokeObjectURL(photo);
      }
    };
  }, []);
                   
                const handleTextSelection = (layerId: number) => {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) return;

  const selectedText = selection.toString();

  if (!selectedText.trim()) return;

  const range = selection.getRangeAt(0);

  const container = document.querySelector(
    `[data-text-layer-id="${layerId}"]`
  );

  if (!container || !container.contains(range.commonAncestorContainer)) {
    return;
  }

  const preRange = range.cloneRange();

  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);

  const start = preRange.toString().length;
  const end = start + selectedText.length;

  setSelectedWordRange({
    layerId,
    start,
    end,
  });
};

const applyWordColor = (color: string) => {
  if (!selectedWordRange) return;

  setTextLayers((layers) =>
    layers.map((layer) => {
      if (layer.id !== selectedWordRange.layerId) {
        return layer;
      }

      const newHighlight = {
        start: selectedWordRange.start,
        end: selectedWordRange.end,
        color,
      };

      const remainingHighlights = layer.highlightedWords.filter(
        (highlight) =>
          highlight.end <= selectedWordRange.start ||
          highlight.start >= selectedWordRange.end
      );

      return {
        ...layer,
        highlightedWords: [
          ...remainingHighlights,
          newHighlight,
        ],
      };
    })
  );
};

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-full flex-col overflow-hidden bg-[#111111] text-white">

      {/* ================= HEADER ================= */}

      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#171717] px-3 sm:px-5">

        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          <span className="text-xl">
            ‹
          </span>

          <span className="hidden sm:inline">
            Back
          </span>
        </button>

        <h1 className="text-base font-bold sm:text-lg">
          Photo Mixer
        </h1>

        <button
          type="button"
          onClick={handleDone}
          className="rounded-lg bg-[#f3ad61] px-4 py-2 text-xs font-bold text-black transition hover:opacity-90 sm:text-sm"
        >
          Done
        </button>
      </header>

      {/* ================= EDITOR ================= */}

      <main className="flex min-h-0 flex-1 flex-col items-center overflow-auto bg-[#0d0d0d] pb-24">

        {/* TOP ACTIONS */}

        <div className="flex w-full max-w-[650px] items-center justify-between px-3 py-3">

          <button
            type="button"
            onClick={() => {
              setSelectedTextId(null);
              setShowTextPanel(false);
            }}
            className="rounded-lg border border-white/10 bg-[#1b1b1b] px-3 py-2 text-xs font-semibold text-white/80"
          >
            Layers
          </button>

          <button
            type="button"
            onClick={rotateCanvas}
            className="rounded-lg border border-white/10 bg-[#1b1b1b] px-3 py-2 text-xs font-semibold text-white/80"
          >
            ↻ Rotate
          </button>
        </div>

        {/* ================= CANVAS ================= */}

        <div
          ref={canvasAreaRef}
          id="photo-mixer-canvas"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative aspect-[3/4] w-[94vw] max-w-[520px] touch-none overflow-hidden bg-[#d9d9d9] shadow-2xl"
          style={{
            transform: `rotate(${canvasRotation}deg)`,
          }}
        >

          {/* BACKGROUND */}

          {background ? (
            <img
              src={background}
              alt="Background"
              draggable={false}
              className="absolute inset-0 h-full w-full select-none object-cover"
            />
          ) : (
            <button
              type="button"
              onClick={() =>
                backgroundInputRef.current?.click()
              }
              className="absolute inset-0 flex flex-col items-center justify-center bg-[#d9d9d9] text-black/50"
            >
              <span className="text-4xl">
                +
              </span>

              <span className="mt-1 text-sm font-semibold">
                Add Background
              </span>
            </button>
          )}

          {/* PHOTO */}

          {photo && (
            <div
              onPointerDown={(event) =>
                handlePointerDown(
                  event,
                  'photo'
                )
              }
              className="absolute z-10 touch-none"
              style={{
                left: `${photoTransform.x}%`,
                top: `${photoTransform.y}%`,
                width: `${photoTransform.width}%`,
                transform:
                  'translate(-50%, -50%)',
                rotate: `${photoTransform.rotation}deg`,
              }}
            >
              <img
                src={photo}
                alt="Selected"
                draggable={false}
                className="block h-auto w-full select-none object-contain"
              />

              <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-[#ef4444]" />

              {/* RESIZE HANDLE */}

              <button
                type="button"
                aria-label="Resize photo"
                className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full border-2 border-white bg-[#ef4444] shadow"
                onPointerDown={(event) =>
                  event.stopPropagation()
                }
                onClick={(event) => {
                  event.stopPropagation();

                  setPhotoTransform(
                    (current) => ({
                      ...current,
                      width: Math.min(
                        100,
                        current.width + 5
                      ),
                    })
                  );
                }}
              />

              {/* ROTATE HANDLE */}

              <button
                type="button"
                aria-label="Rotate photo"
                className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white bg-[#f3ad61] shadow"
                onPointerDown={(event) =>
                  event.stopPropagation()
                }
                onClick={(event) => {
                  event.stopPropagation();

                  setPhotoTransform(
                    (current) => ({
                      ...current,
                      rotation:
                        current.rotation +
                        15,
                    })
                  );
                }}
              />
            </div>
          )}

                            {/* TEXT LAYERS section start*/}

          {textLayers.map((layer) => (
          <button
              key={layer.id}
              data-text-layer-id={layer.id}
              type="button"
             onPointerDown={() => {
             setSelectedTextId(layer.id);
             setShowTextPanel(true);
             }}

              onMouseUp={() => handleTextSelection(layer.id)}
              onTouchEnd={() => handleTextSelection(layer.id)}

              className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 whitespace-pre-wrap   ${
                selectedTextId === layer.id
                  ? 'rounded border border-dashed border-[#f3ad61] px-2 py-1'
                  : ''
              }`}
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                color: layer.color,
                fontSize: `${layer.fontSize}px`,
                fontWeight: layer.bold
                  ? 700
                  : 400,
                fontStyle: layer.italic
                  ? 'italic'
                  : 'normal',
                textAlign: layer.align,
                opacity: layer.opacity,
                userSelect: 'text',
              }}
            >
              {(() => {
        const highlights = [...layer.highlightedWords].sort(
        (a, b) => a.start - b.start
        );

         if (highlights.length === 0) {
         return layer.text;
        }

        const parts: React.ReactNode[] = [];
        let cursor = 0;

       highlights.forEach((highlight, index) => {
      if (highlight.start > cursor) {
        parts.push(
        <span key={`normal-${index}`}>
          {layer.text.slice(cursor, highlight.start)}
        </span>
      );
    }

    parts.push(
      <span
        key={`highlight-${index}`}
        style={{
          color: highlight.color,
        }}
      >
        {layer.text.slice(
          highlight.start,
          highlight.end
        )}
      </span>
    );

    cursor = highlight.end;
    });

     if (cursor < layer.text.length) {
     parts.push(
      <span key="normal-end">
        {layer.text.slice(cursor)}
      </span>
     );
    }

     return parts;
       })()}
     
        {selectedTextId === layer.id && (
  <span
    role="button"
    tabIndex={0}
    onPointerDown={(event) => {
      event.stopPropagation();
      setTextLayers((layers) =>
        layers.filter((item) => item.id !== layer.id)
      );
      setSelectedTextId(null);
      setShowTextPanel(false);
    }}
    className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white shadow-md"
    >
    ×
    </span>
    )}
  </button>
          ))}
        </div>

        {/* ================= TEXT PANEL ================= */}

        {showTextPanel && (
          <div className="mt-4 w-[94vw] max-w-[520px] rounded-2xl border border-white/10 bg-[#181818] p-4 shadow-xl">

            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">
               {selectedTextId !== null ? 'Edit Text' : 'Add Text'}
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowTextPanel(false)
                }
                className="rounded-lg px-2 py-1 text-white/60 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <textarea
          value={
          selectedTextId !== null
          ? (textLayers.find(
          (layer) => layer.id === selectedTextId
          )?.text ?? ''): newText}
          onChange={(event) => {
          if (selectedTextId !== null) {
          updateSelectedText({
          text: event.target.value,
          });
          } else {
        setNewText(event.target.value);
       }
      }}
      placeholder="Enter your text..."
      rows={3}
      className="w-full resize-none rounded-xl border border-white/10 bg-[#101010] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#f3ad61]"
      />
            {/* TEXT OPTIONS */}

            <div className="mt-3 flex flex-wrap gap-2">

              <button
                type="button"
               onClick={() => {
  if (selectedTextId !== null) {
    const currentText = textLayers.find(
      (layer) => layer.id === selectedTextId
    );

    if (currentText) {
      updateSelectedText({
        bold: !currentText.bold,
      });
    }
  } else {
    setTextBold((value) => !value);
  }
}}
               className={`rounded-lg border px-3 py-2 text-xs font-bold ${
  selectedTextId !== null
    ? textLayers.find(
        (layer) => layer.id === selectedTextId
      )?.bold
      ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
      : 'border-white/10 bg-[#222] text-white'
    : textBold
      ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
      : 'border-white/10 bg-[#222] text-white'
}`}
              >
                B
              </button>

              <button
                type="button"
          onClick={() => {
  if (selectedTextId !== null) {
    const currentText = textLayers.find(
      (layer) => layer.id === selectedTextId
    );

    if (currentText) {
      updateSelectedText({
        italic: !currentText.italic,
      });
    }
  } else {
    setTextItalic((value) => !value);
  }
}}
                className={`rounded-lg border px-3 py-2 text-xs italic ${
  selectedTextId !== null
    ? textLayers.find(
        (layer) => layer.id === selectedTextId
      )?.italic
      ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
      : 'border-white/10 bg-[#222] text-white'
    : textItalic
      ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
      : 'border-white/10 bg-[#222] text-white'
}`}
              >
                I
              </button>

              <button
                type="button"
                onClick={() =>
                  setTextAlign('left')
                }
                className={`rounded-lg border px-3 py-2 text-xs ${
                  textAlign === 'left'
                    ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
                    : 'border-white/10 bg-[#222]'
                }`}
              >
                Left
              </button>

              <button
                type="button"
                onClick={() =>
                  setTextAlign('center')
                }
                className={`rounded-lg border px-3 py-2 text-xs ${
                  textAlign === 'center'
                    ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
                    : 'border-white/10 bg-[#222]'
                }`}
              >
                Center
              </button>

              <button
                type="button"
                onClick={() =>
                  setTextAlign('right')
                }
                className={`rounded-lg border px-3 py-2 text-xs ${
                  textAlign === 'right'
                    ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
                    : 'border-white/10 bg-[#222]'
                }`}
              >
                Right
              </button>
            </div>

            {/* SIZE */}

            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs text-white/60">
                <span>
                  Text Size
                </span>

                <span>
                  {textSize}px
                </span>
              </div>

              <input
                type="range"
                min="12"
                max="100"
                value={textSize}
                onChange={(event) =>
                  setTextSize(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="w-full"
              />
            </div>

            {/* COLOR */}

            <div className="mt-4 flex items-center justify-between">

              <span className="text-xs text-white/60">
                Text Color
              </span>

              <input type="color" value={selectedText?.color ?? '#ffffff'}
               onChange={(event) =>
               updateSelectedText({
               color: event.target.value,
               })
              }/>

            <div className="flex items-center gap-2">
  <span className="text-xs font-semibold text-white/70">
    Word Color
  </span>

  <input
    type="color"
    value={wordColor}
    onChange={(event) => {
      const color = event.target.value;
      setWordColor(color);
      applyWordColor(color);
    }}
  />
</div>

            </div>

            <button
              type="button"
              onClick={addText}
              disabled={!newText.trim()}
              className="mt-4 w-full rounded-xl bg-[#f3ad61] py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add Text
            </button>
          </div>
        )}

        {/* ================= SELECTED TEXT CONTROLS ================= */}

       {selectedText && !showTextPanel && (
  <div className="mt-4 w-[94vw] max-w-[520px] rounded-xl border border-white/10 bg-[#181818] p-3">

    <div className="flex items-center gap-2 overflow-x-auto">

      <button
        type="button"
        onClick={() =>
          updateSelectedText({
            bold: !selectedText.bold,
          })
        }
        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${
          selectedText.bold
            ? 'bg-[#f3ad61] text-black'
            : 'bg-[#252525] text-white'
        }`}
      >
        B
      </button>

      <button
        type="button"
        onClick={() =>
          updateSelectedText({
            italic: !selectedText.italic,
          })
        }
        className={`shrink-0 rounded-lg px-3 py-2 text-xs italic ${
          selectedText.italic
            ? 'bg-[#f3ad61] text-black'
            : 'bg-[#252525] text-white'
        }`}
      >
        I
      </button>

      <button
        type="button"
        onClick={() =>
          updateSelectedText({ align: 'left' })
        }
        className={`shrink-0 rounded-lg px-3 py-2 text-xs ${
          selectedText.align === 'left'
            ? 'bg-[#f3ad61] text-black'
            : 'bg-[#252525] text-white'
        }`}
      >
        Left
      </button>

      <button
        type="button"
        onClick={() =>
          updateSelectedText({ align: 'center' })
        }
        className={`shrink-0 rounded-lg px-3 py-2 text-xs ${
          selectedText.align === 'center'
            ? 'bg-[#f3ad61] text-black'
            : 'bg-[#252525] text-white'
        }`}
      >
        Center
      </button>

      <button
        type="button"
        onClick={() =>
          updateSelectedText({ align: 'right' })
        }
        className={`shrink-0 rounded-lg px-3 py-2 text-xs ${
          selectedText.align === 'right'
            ? 'bg-[#f3ad61] text-black'
            : 'bg-[#252525] text-white'
        }`}
      >
        Right
      </button>

      <button
        type="button"
        onClick={deleteSelectedText}
        className="ml-auto shrink-0 rounded-lg bg-[#ef4444] px-3 py-2 text-xs font-bold text-white"
      >
        Delete
      </button>
    </div>

    <div className="mt-4 flex items-center gap-4">

      <div className="flex-1">
        <div className="mb-1 flex justify-between text-[11px] text-white/60">
          <span>Size</span>
          <span>{selectedText.fontSize}px</span>
        </div>

        <input
          type="range"
          min="12"
          max="100"
          value={selectedText.fontSize}
          onChange={(event) =>
            updateSelectedText({
              fontSize: Number(event.target.value),
            })
          }
          className="w-full"
        />
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1">
        <span className="text-[11px] text-white/60">
          Color
        </span>

        <input
          type="color"
          value={selectedText.color}
          onChange={(event) =>
            updateSelectedText({
              color: event.target.value,
            })
          }
          className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
        />
      </div>

    </div>
  </div>
)}
        
      </main>

      {/* ================= HIDDEN INPUTS ================= */}

      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={selectBackground}
      />

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={selectPhoto}
      />

      {/* ================= BOTTOM TOOLBAR ================= */}

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#171717]/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur">

        <div className="mx-auto flex max-w-[650px] items-center justify-around">

          {/* BACKGROUND */}

          <button
            type="button"
            onClick={() => {
              setActiveTool(
                'background'
              );
              backgroundInputRef.current?.click();
            }}
            className={`flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold ${
              activeTool ===
              'background'
                ? 'bg-white/10 text-[#f3ad61]'
                : 'text-white/60'
            }`}
          >
            <span className="text-lg">
              ▣
            </span>

            <span>
              Background
            </span>
          </button>

          {/* PHOTO */}

          <button
            type="button"
            onClick={() => {
              setActiveTool('photo');
              photoInputRef.current?.click();
            }}
            className={`flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold ${
              activeTool === 'photo'
                ? 'bg-white/10 text-[#f3ad61]'
                : 'text-white/60'
            }`}
          >
            <span className="text-lg">
              ▧
            </span>

            <span>
              Photo
            </span>
          </button>

                                {/* SIZE section start */}

          <button
            type="button"
            onClick={() => {
              setActiveTool('size');

              if (photo) {
                setPhotoTransform(
                  (current) => ({
                    ...current,
                    width:
                      current.width >=
                      100
                        ? 40
                        : current.width +
                          10,
                  })
                );
              }
            }}
            className={`flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold ${
              activeTool === 'size'
                ? 'bg-white/10 text-[#f3ad61]'
                : 'text-white/60'
            }`}
          >
            <span className="text-lg">
              ⤢
            </span>

            <span>
              Size
            </span>
          </button>

          {/* TEXT */}

          <button
            type="button"
            onClick={() => {
              setActiveTool('text');
              setShowTextPanel(
                (value) => !value
              );
              setSelectedTextId(null);
            }}
            className={`flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold ${
              activeTool === 'text'
                ? 'bg-white/10 text-[#f3ad61]'
                : 'text-white/60'
            }`}
          >
            <span className="text-lg">
              T
            </span>

            <span>
              Text
            </span>
          </button>

        </div>
      </footer>
    </div>
  );
}
