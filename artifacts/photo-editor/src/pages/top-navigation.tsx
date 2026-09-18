import { useEffect, useRef, useState } from 'react';
import { TopNavigation } from '../components/navigation/TopNavigation';

type TextLayer = {
  id: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  opacity: number;
};

export default function PhotoMixerPage() {
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [background, setBackground] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  const [activeTool, setActiveTool] = useState<
    'background' | 'photo' | 'size' | 'text'
  >('background');

  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<number | null>(null);

  const [showTextPanel, setShowTextPanel] = useState(false);

  const [newText, setNewText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(32);
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textAlign, setTextAlign] =
    useState<'left' | 'center' | 'right'>('center');

  const selectBackground = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const url = URL.createObjectURL(file);
    setBackground(url);
  };

  const selectPhoto = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const url = URL.createObjectURL(file);
    setPhoto(url);
  };

  const addText = () => {
    const value = newText.trim();

    if (!value) return;

    const id = Date.now();

    const layer: TextLayer = {
      id,
      text: value,
      x: 50,
      y: 50,
      fontSize: textSize,
      color: textColor,
      bold: textBold,
      italic: textItalic,
      align: textAlign,
      opacity: 1,
    };

    setTextLayers((layers) => [...layers, layer]);
    setSelectedTextId(id);
    setNewText('');
    setShowTextPanel(false);
  };

  const updateSelectedText = (
    changes: Partial<TextLayer>
  ) => {
    if (selectedTextId === null) return;

    setTextLayers((layers) =>
      layers.map((layer) =>
        layer.id === selectedTextId
          ? { ...layer, ...changes }
          : layer
      )
    );
  };

  const deleteSelectedText = () => {
    if (selectedTextId === null) return;

    setTextLayers((layers) =>
      layers.filter((layer) => layer.id !== selectedTextId)
    );

    setSelectedTextId(null);
  };

  useEffect(() => {
    return () => {
      if (background) {
        URL.revokeObjectURL(background);
      }

      if (photo) {
        URL.revokeObjectURL(photo);
      }
    };
  }, [background, photo]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#2b3238] text-white">

      {/* Top Header */}
      <header className="flex h-[64px] shrink-0 items-center justify-between bg-[#20242c] px-4">

        <a
          href="/"
          className="flex h-11 w-11 items-center justify-center rounded-full text-3xl text-white active:bg-white/10"
          aria-label="Back"
        >
          ←
        </a>

        <h1 className="text-[20px] font-medium">
          Photo Mixer
        </h1>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center text-[30px] text-white active:scale-95"
          aria-label="Done"
        >
          ✓
        </button>

      </header>

      {/* Editor Area */}
      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">

        {/* Layers Button */}
        <button
          type="button"
          className="absolute left-0 top-8 z-30 flex h-14 w-16 items-center justify-center rounded-r-full bg-[#20242c] text-3xl active:bg-[#343a43]"
          aria-label="Layers"
        >
          ▱
        </button>

        {/* Rotate Button */}
        <button
          type="button"
          className="absolute right-0 top-8 z-30 flex h-14 w-16 items-center justify-center rounded-l-full bg-[#20242c] text-3xl active:bg-[#343a43]"
          aria-label="Rotate"
        >
          ↻
        </button>

        {/* Canvas */}
        <div
          id="photo-mixer-canvas"
          className="relative aspect-[3/4] w-[94vw] max-w-[520px] overflow-hidden bg-[#d9d9d9] shadow-2xl"
        >

          {/* Background */}
          {background ? (
            <img
              src={background}
              alt="Background"
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <button
              type="button"
              onClick={() => backgroundInputRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center bg-[#3a4249] text-white/40"
            >
              <span className="text-5xl">＋</span>
              <span className="mt-2 text-sm">
                Add Background
              </span>
            </button>
          )}

          {/* Added Photo */}
          {photo && (
            <div className="absolute left-[12%] top-[15%] z-10 w-[76%]">

              <img
                src={photo}
                alt="Added photo"
                className="block w-full select-none object-contain"
                draggable={false}
              />

              {/* Selection Border */}
              <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-[#ef4444]" />

              {/* Resize Handle */}
              <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-white text-xs text-black">
                ↗
              </div>

              {/* Rotate Handle */}
              <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-white text-xs text-black">
                ↻
              </div>

            </div>
          )}

          {/* Text Layers */}
          {textLayers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => setSelectedTextId(layer.id)}
              className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 whitespace-pre-wrap ${
                selectedTextId === layer.id
                  ? 'rounded border border-dashed border-[#f3ad61] px-2 py-1'
                  : ''
              }`}
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                color: layer.color,
                fontSize: `${layer.fontSize}px`,
                fontWeight: layer.bold ? 700 : 400,
                fontStyle: layer.italic ? 'italic' : 'normal',
                textAlign: layer.align,
                opacity: layer.opacity,
              }}
            >
              {layer.text}
            </button>
          ))}

        </div>

      </main>

      {/* Text Editing Panel */}
      {showTextPanel && (
        <div className="absolute bottom-[82px] left-2 right-2 z-50 rounded-2xl border border-white/10 bg-[#20242c] p-3 shadow-2xl">

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Add Text
            </h2>

            <button
              type="button"
              onClick={() => setShowTextPanel(false)}
              className="text-xl text-white/60"
            >
              ×
            </button>
          </div>

          {/* Text Input */}
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Write your text..."
            rows={2}
            className="w-full resize-none rounded-lg border border-white/10 bg-[#15181d] p-3 text-sm text-white outline-none focus:border-[#f3ad61]"
          />

          {/* Controls */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">

            <button
              type="button"
              onClick={() => setTextBold((value) => !value)}
              className={`min-w-10 rounded-lg px-3 py-2 text-sm font-bold ${
                textBold
                  ? 'bg-[#f3ad61] text-black'
                  : 'bg-white/10'
              }`}
            >
              B
            </button>

            <button
              type="button"
              onClick={() => setTextItalic((value) => !value)}
              className={`min-w-10 rounded-lg px-3 py-2 text-sm italic ${
                textItalic
                  ? 'bg-[#f3ad61] text-black'
                  : 'bg-white/10'
              }`}
            >
              I
            </button>

            <button
              type="button"
              onClick={() => setTextAlign('left')}
              className={`min-w-10 rounded-lg px-3 py-2 ${
                textAlign === 'left'
                  ? 'bg-[#f3ad61] text-black'
                  : 'bg-white/10'
              }`}
            >
              ≡
            </button>

            <button
              type="button"
              onClick={() => setTextAlign('center')}
              className={`min-w-10 rounded-lg px-3 py-2 ${
                textAlign === 'center'
                  ? 'bg-[#f3ad61] text-black'
                  : 'bg-white/10'
              }`}
            >
              ≡
            </button>

            <button
              type="button"
              onClick={() => setTextAlign('right')}
              className={`min-w-10 rounded-lg px-3 py-2 ${
                textAlign === 'right'
                  ? 'bg-[#f3ad61] text-black'
                  : 'bg-white/10'
              }`}
            >
              ≡
            </button>

          </div>

          {/* Size */}
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-white/60">
              <span>Text Size</span>
              <span>{textSize}px</span>
            </div>

            <input
              type="range"
              min="12"
              max="100"
              value={textSize}
              onChange={(e) => setTextSize(Number(e.target.value))}
              className="h-2 w-full accent-[#f3ad61]"
            />
          </div>

          {/* Color */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-white/60">
              Text Color
            </span>

            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"
            />
          </div>

          {/* Add */}
          <button
            type="button"
            onClick={addText}
            className="mt-4 min-h-[44px] w-full rounded-xl bg-[#f3ad61] text-sm font-semibold text-black active:scale-[0.99]"
          >
            Add Text
          </button>

        </div>
      )}

      {/* Selected Text Controls */}
      {selectedTextId !== null && !showTextPanel && (
        <div className="absolute bottom-[82px] left-2 right-2 z-40 flex items-center gap-2 overflow-x-auto rounded-xl bg-[#20242c] p-2">

          <button
            type="button"
            onClick={() =>
              updateSelectedText({
                bold: !textLayers.find(
                  (layer) => layer.id === selectedTextId
                )?.bold,
              })
            }
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold"
          >
            B
          </button>

          <button
            type="button"
            onClick={() =>
              updateSelectedText({
                italic: !textLayers.find(
                  (layer) => layer.id === selectedTextId
                )?.italic,
              })
            }
            className="rounded-lg bg-white/10 px-4 py-2 text-sm italic"
          >
            I
          </button>

          <button
            type="button"
            onClick={deleteSelectedText}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300"
          >
            Delete
          </button>

        </div>
      )}

      {/* Hidden Inputs */}
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

      {/* Bottom Toolbar */}
      <nav className="z-50 grid h-[82px] shrink-0 grid-cols-4 border-t border-white/5 bg-[#20242c]">

        {/* Background */}
        <button
          type="button"
          onClick={() => {
            setActiveTool('background');
            backgroundInputRef.current?.click();
          }}
          className={`flex flex-col items-center justify-center gap-1 ${
            activeTool === 'background'
              ? 'text-white'
              : 'text-white/60'
          }`}
        >
          <span className="text-2xl">▣</span>
          <span className="text-xs">Background</span>
        </button>

        {/* Photo */}
        <button
          type="button"
          onClick={() => {
            setActiveTool('photo');
            photoInputRef.current?.click();
          }}
          className={`flex flex-col items-center justify-center gap-1 ${
            activeTool === 'photo'
              ? 'text-white'
              : 'text-white/60'
          }`}
        >
          <span className="text-2xl">▣</span>
          <span className="text-xs">Photo</span>
        </button>

        {/* Size */}
        <button
          type="button"
          onClick={() => setActiveTool('size')}
          className={`flex flex-col items-center justify-center gap-1 ${
            activeTool === 'size'
              ? 'text-white'
              : 'text-white/60'
          }`}
        >
          <span className="text-2xl">↗</span>
          <span className="text-xs">Size</span>
        </button>

        {/* Text */}
        <button
          type="button"
          onClick={() => {
            setActiveTool('text');
            setShowTextPanel(true);
          }}
          className={`flex flex-col items-center justify-center gap-1 ${
            activeTool === 'text'
              ? 'text-[#f3ad61]'
              : 'text-white/60'
          }`}
        >
          <span className="text-2xl font-bold">T</span>
          <span className="text-xs">Text</span>
        </button>

      </nav>

    </div>
  );
}


