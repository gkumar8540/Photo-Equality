import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Route, Router as WouterRouter, Switch } from 'wouter';
import { Capacitor } from '@capacitor/core';
import logo from '../../images/logoe.jpeg';
import { TopNavigation } from './components/navigation/TopNavigation';
import BottomNavigationPage from './pages/bottom-navigation';
import BreadcrumbNavigationPage from './pages/breadcrumb-navigation';
import MobileNavigationPage from './pages/mobile-navigation';
import OrbitNavigationPage from './pages/orbit-navigation';
import PulseNavigationPage from './pages/pulse-navigation';
import SidebarNavigationPage from './pages/sidebar-navigation';
import TopNavigationPage from './pages/top-navigation';
import {
  ArrowUpRight,
  Focus,
  Check,
  Contrast,
  Crop,
  Download,
  Droplets,
  FileImage,
  ImagePlus,
  Info,
  Maximize2,
  MousePointer2,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  UploadCloud,
} from 'lucide-react';

type FilterName = 'Original' | 'Noir' | 'Warm' | 'Cool' | 'Vintage' | 'Fade' | 'Drama';
type CropRect = { x: number; y: number; w: number; h: number };
type CropEdge = 'top-left' | 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left';
type Controls = {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  filter: FilterName;
  intensity: number;
};

const MAX_CANVAS_DIMENSION = 8192;

const defaultControls: Controls = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  blur: 0,
  filter: 'Original',
  intensity: 100,
};

const filterOptions: { name: FilterName; description: string; swatch: string }[] = [
  { name: 'Original', description: 'True to source', swatch: 'linear-gradient(135deg,#d8b88d,#4c5960)' },
  { name: 'Noir', description: 'High contrast', swatch: 'linear-gradient(135deg,#e5e2db,#17191e)' },
  { name: 'Warm', description: 'Soft amber', swatch: 'linear-gradient(135deg,#f4bd78,#9b4f35)' },
  { name: 'Cool', description: 'Quiet blue', swatch: 'linear-gradient(135deg,#c4d9df,#405b70)' },
  { name: 'Vintage', description: 'Aged film', swatch: 'linear-gradient(135deg,#d2ae74,#69533d)' },
  { name: 'Fade', description: 'Lifted blacks', swatch: 'linear-gradient(135deg,#e4d8c1,#84918e)' },
  { name: 'Drama', description: 'Deep detail', swatch: 'linear-gradient(135deg,#b6a28b,#20262b)' },
];

function buildFilter({ brightness, contrast, saturation, blur, filter, intensity }: Controls) {
  const t = intensity / 100;
  const preset = {
    Original: `saturate(${1 + saturation / 100})`,
    Noir: `grayscale(${t}) contrast(${1 + 0.16 * t})`,
    Warm: `sepia(${0.32 * t}) saturate(${1 + 0.25 * t}) hue-rotate(${-8 * t}deg)`,
    Cool: `saturate(${1 - 0.08 * t}) hue-rotate(${18 * t}deg) brightness(${1 + 0.02 * t})`,
    Vintage: `sepia(${0.44 * t}) saturate(${1 - 0.18 * t}) contrast(${1 - 0.08 * t})`,
    Fade: `saturate(${1 - 0.3 * t}) contrast(${1 - 0.14 * t}) brightness(${1 + 0.06 * t})`,
    Drama: `contrast(${1 + 0.33 * t}) saturate(${1 + 0.18 * t})`,
  }[filter];
  return `brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100}) ${preset} blur(${blur}px)`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EmptyArtwork() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[12%] top-[17%] h-40 w-40 rounded-full bg-[#d88952]/10 blur-3xl" />
      <div className="absolute bottom-[12%] right-[10%] h-56 w-56 rounded-full bg-[#7995a6]/10 blur-3xl" />
      <svg className="absolute inset-0 h-full w-full opacity-90" viewBox="0 0 900 620" fill="none" aria-hidden="true">
        <path d="M88 486 247 336l90 57 144-168 333 261H88Z" fill="#384551" />
        <path d="m247 336 90 57 144-168 86 68-71 78-93-22-109 86-152 51 105-150Z" fill="#2f3b45" />
        <path d="m337 393 144-168 86 68-81 98-71-22-78 65Z" fill="#f1aa5e" fillOpacity=".72" />
        <circle cx="669" cy="177" r="43" fill="#d48a57" fillOpacity=".72" />
        <circle cx="669" cy="177" r="68" stroke="#e9b477" strokeOpacity=".16" strokeWidth="1.5" />
        <path d="M151 177h116M209 119v116" stroke="#9ca4a7" strokeOpacity=".35" strokeWidth="1" />
        <path d="M692 377h92M738 331v92" stroke="#f6c48d" strokeOpacity=".3" strokeWidth="1" />
      </svg>
      <div className="absolute bottom-9 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[.2em] text-[#aeb2b0]/40">
        <span className="h-1.5 w-1.5 rounded-full bg-[#e8a45d]" />
        Prince Kumar workspace
      </div>
    </div>
  );
}

function AdjustmentRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  icon,
  suffix = '',
  disabled,
  testId,
  onReset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  icon: ReactNode;
  suffix?: string;
  disabled?: boolean;
  testId: string;
  onReset: () => void;
}) {
  const progress = `${((value - min) / (max - min)) * 100}%`;
  return (
    <div className={`space-y-2.5 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between text-[11px]">
        <label className="flex items-center gap-2 font-semibold tracking-wide text-[#d4d0c9]">
          <span className="text-[#eaaa64]">{icon}</span>{label}
        </label>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-[#9fa3a1]">{value > 0 ? '+' : ''}{value}{suffix}</span>
          <button type="button" onClick={onReset} disabled={disabled} className="control-button rounded p-1 text-[#797f81] hover:bg-[#292e34] hover:text-[#f3b16a]" aria-label={`Reset ${label}`} data-testid={`button-reset-${testId}`}>
            <RotateCcw size={11} />
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--range-progress': progress } as CSSProperties}
        className="range-warm h-4 w-full cursor-pointer appearance-none bg-transparent"
        data-testid={`input-${testId}`}
        aria-label={label}
      />
    </div>
  );
}

function PhotoEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [controls, setControls] = useState<Controls>(defaultControls);
  const [rotation, setRotation] = useState(0);
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [appliedCrop, setAppliedCrop] = useState<CropRect | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const cropInteractionRef = useRef<{
    type: 'draw' | 'resize';
    edge?: CropEdge;
    start: { x: number; y: number };
    rect?: CropRect;
  } | null>(null);

  const hasImage = Boolean(sourceUrl);
  const previewAspect = dimensions.width && dimensions.height
    ? (rotation % 180 === 0 ? dimensions.width / dimensions.height : dimensions.height / dimensions.width)
    : 1.45;

  const drawPreview = useCallback(() => {
    if (!sourceUrl || !canvasRef.current) return;
    const image = new Image();
    image.onload = () => {
      const rotated = document.createElement('canvas');
      const quarterTurn = rotation % 180 !== 0;
      const scale = Math.min(1, MAX_CANVAS_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
      const sourceWidth = Math.max(1, Math.round(image.naturalWidth * scale));
      const sourceHeight = Math.max(1, Math.round(image.naturalHeight * scale));
      rotated.width = quarterTurn ? sourceHeight : sourceWidth;
      rotated.height = quarterTurn ? sourceWidth : sourceHeight;
      const rotatedContext = rotated.getContext('2d');
      if (!rotatedContext) return;
      rotatedContext.save();
      if (rotation === 90) {
        rotatedContext.translate(rotated.width, 0);
        rotatedContext.rotate(Math.PI / 2);
      } else if (rotation === 180) {
        rotatedContext.translate(rotated.width, rotated.height);
        rotatedContext.rotate(Math.PI);
      } else if (rotation === 270) {
        rotatedContext.translate(0, rotated.height);
        rotatedContext.rotate(-Math.PI / 2);
      }
      rotatedContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);
      rotatedContext.restore();

      const crop = appliedCrop ?? { x: 0, y: 0, w: 1, h: 1 };
      const sx = Math.max(0, Math.round(crop.x * rotated.width));
      const sy = Math.max(0, Math.round(crop.y * rotated.height));
      const sw = Math.max(1, Math.min(rotated.width - sx, Math.round(crop.w * rotated.width)));
      const sh = Math.max(1, Math.min(rotated.height - sy, Math.round(crop.h * rotated.height)));
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = sw;
      canvas.height = sh;
      const context = canvas.getContext('2d');
      if (!context) return;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.clearRect(0, 0, sw, sh);

      // Multi-device fallback logic: Verify if context filter string renders cleanly.
      // If the WebView doesn't support context.filter natively, apply custom fast programmatic pixel transformation arithmetic.
      try {
        context.filter = buildFilter(controls);
        context.drawImage(rotated, sx, sy, sw, sh, 0, 0, sw, sh);
        context.filter = 'none';
      } catch (filterError) {
        console.warn('Hardware filter acceleration unsupported on this device, falling back to safe software fallback pixel mapping pipeline:', filterError);
        context.filter = 'none';
        context.drawImage(rotated, sx, sy, sw, sh, 0, 0, sw, sh);

        // Manual Math Processing Fallback for universal device compatibility (Oppo, Vivo, older Android systems)
        try {
          const imgData = context.getImageData(0, 0, sw, sh);
          const data = imgData.data;
          const { brightness, contrast, saturation } = controls;

          const bMul = 1 + (brightness / 100);
          const cMul = 1 + (contrast / 100);
          const sMul = 1 + (saturation / 100);

          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // 1. Apply Brightness configuration
            r = Math.min(255, Math.max(0, r * bMul));
            g = Math.min(255, Math.max(0, g * bMul));
            b = Math.min(255, Math.max(0, b * bMul));

            // 2. Apply Contrast matrix adjustments
            r = Math.min(255, Math.max(0, ((r - 128) * cMul) + 128));
            g = Math.min(255, Math.max(0, ((g - 128) * cMul) + 128));
            b = Math.min(255, Math.max(0, ((b - 128) * cMul) + 128));

            // 3. Apply Saturation linear weights mapping
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = Math.min(255, Math.max(0, gray + (r - gray) * sMul));
            g = Math.min(255, Math.max(0, gray + (g - gray) * sMul));
            b = Math.min(255, Math.max(0, gray + (b - gray) * sMul));

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
          }
          context.putImageData(imgData, 0, 0);
        } catch (pixelError) {
          console.error('Pixel fallback mapping fatal error:', pixelError);
        }
      }
    };
    image.src = sourceUrl;
  }, [appliedCrop, controls, rotation, sourceUrl]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  const loadFile = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setExportMessage('Choose a JPG, PNG, WebP, or other image file.');
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setSourceUrl(nextUrl);
    setFileName(file.name);
    setFileSize(file.size);
    setExportMessage('');
    setControls(defaultControls);
    setRotation(0);
    setCropMode(false);
    setCropRect(null);
    setAppliedCrop(null);
    const image = new Image();
    image.onload = () => setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = nextUrl;
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => loadFile(event.target.files?.[0]);

  const rotate = (direction: 'left' | 'right') => {
    setRotation((current) => (current + (direction === 'right' ? 90 : 270)) % 360);
  };

  const resetAll = () => {
    if (!hasImage) return;
    setControls(defaultControls);
    setRotation(0);
    setCropMode(false);
    setCropRect(null);
    setAppliedCrop(null);
    setExportMessage('Edits reset to the original image.');
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;
    setExportMessage('Preparing PNG…');

    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'edited-image';
    const finalFileName = `${baseName}-edited.png`;

    canvas.toBlob((blob) => {
      if (!blob) {
        setExportMessage('Export could not be prepared. Try again.');
        return;
      }

      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const dataUrl = reader.result as string;
            const base64Data = dataUrl.split(',')[1];

            // Direct check for interface window object
            const win = window as any;
            const bridge = win.AndroidDownloadBridge;

            if (bridge && typeof bridge.saveBase64ImageToDownloads === 'function') {
              const success = bridge.saveBase64ImageToDownloads(base64Data, finalFileName);
              if (success) {
                setExportMessage('PNG saved to your device.');
              } else {
                setExportMessage('Failed to save image. Please try again.');
              }
            } else {
              // Safe secondary immediate lookup for remote domain injections
              if (win.AndroidDownloadBridge && typeof win.AndroidDownloadBridge.saveBase64ImageToDownloads === 'function') {
                const retrySuccess = win.AndroidDownloadBridge.saveBase64ImageToDownloads(base64Data, finalFileName);
                if (retrySuccess) {
                  setExportMessage('PNG saved to your device.');
                  window.setTimeout(() => setExportMessage(''), 3500);
                  return;
                }
              }
              setExportMessage('Bridge binding delayed. Image could not be saved to Downloads folder.');
            }
          } catch (err) {
            console.error('Failed to save file natively via bridge:', err);
            setExportMessage('Failed to save image. Please try again.');
          }
          window.setTimeout(() => setExportMessage(''), 3500);
        };
        reader.readAsDataURL(blob);
        return;
      }

      const link = document.createElement('a');
      link.download = finalFileName;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      setExportMessage('PNG saved to your device.');
      window.setTimeout(() => setExportMessage(''), 3500);
    }, 'image/png');
  };

  const pointFromEvent = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  };

  const beginCrop = (event: PointerEvent<HTMLDivElement>) => {
    if (cropRect && (cropRect.x !== 0 || cropRect.y !== 0 || cropRect.w !== 1 || cropRect.h !== 1)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    cropInteractionRef.current = { type: 'draw', start: point };
    setCropRect({ x: point.x, y: point.y, w: 0.01, h: 0.01 });
  };

  const beginResize = (event: PointerEvent<HTMLSpanElement>, edge: CropEdge) => {
    event.stopPropagation();
    if (!cropRect) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    cropInteractionRef.current = {
      type: 'resize',
      edge,
      start: { x: event.clientX, y: event.clientY },
      rect: cropRect,
    };
  };

  const moveCrop = (event: PointerEvent<HTMLDivElement>) => {
    const interaction = cropInteractionRef.current;
    if (!interaction) return;
    if (interaction.type === 'resize' && interaction.rect && interaction.edge) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const deltaX = (event.clientX - interaction.start.x) / bounds.width;
      const deltaY = (event.clientY - interaction.start.y) / bounds.height;
      const initial = interaction.rect;
      const minimum = 0.03;
      let next = { ...initial };

      if (interaction.edge.includes('left')) {
        next.x = Math.min(initial.x + initial.w - minimum, Math.max(0, initial.x + deltaX));
        next.w = initial.w + initial.x - next.x;
      }
      if (interaction.edge.includes('right')) {
        next.w = Math.min(1 - initial.x, Math.max(minimum, initial.w + deltaX));
      }
      if (interaction.edge.includes('top')) {
        next.y = Math.min(initial.y + initial.h - minimum, Math.max(0, initial.y + deltaY));
        next.h = initial.h + initial.y - next.y;
      }
      if (interaction.edge.includes('bottom')) {
        next.h = Math.min(1 - initial.y, Math.max(minimum, initial.h + deltaY));
      }
      setCropRect(next);
      return;
    }

    if (interaction.type !== 'draw') return;
    const start = interaction.start;
    const point = pointFromEvent(event);
    setCropRect({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      w: Math.max(0.03, Math.abs(point.x - start.x)),
      h: Math.max(0.03, Math.abs(point.y - start.y)),
    });
  };

  const endCrop = () => {
    cropInteractionRef.current = null;
  };

  const updateControl = (key: keyof Controls, value: number | FilterName) => {
    setControls((current) => ({ ...current, [key]: value }));
    setExportMessage('');
  };

  const [isLooksOpen, setIsLooksOpen] = useState(false);

  return (
    <main className="min-h-[100dvh] bg-[#111419] text-[#ede7db]">
      <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-y-2 border-b border-[#9d9fa1] bg-[#15181d] px-4 py-3 sm:px-7">
        <div className="flex items-center gap-3">
        
<div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[50px] bg-[#f3ad61] text-[#22252a] shadow-[0_0_26px_rgba(242,170,90,.14)]">
  <img
    src={logo}
    alt="Logo"
    className="h-full w-full object-cover"/>
</div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-extrabold tracking-[-.02em] text-[#f4eee2]">Photo-EQuality</h1>
              <span className="rounded-full border border-[#465052] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[.12em] text-[#a8aaa5]">Beta</span>
            </div>
            <p className="hidden font-mono text-[9px] uppercase tracking-[.15em] text-[#777e80] sm:block">A quiet place to make images sing</p>
          </div>
        </div>
        <TopNavigation>
          <a href="/nav/top" className="rounded-md px-2 py-2 text-[10px] font-semibold text-[#a8aaa5] transition-colors hover:bg-[#242a30] hover:text-[#f4eee2]">Top</a>
          <a href="/nav/sidebar" className="rounded-md px-2 py-2 text-[10px] font-semibold text-[#a8aaa5] transition-colors hover:bg-[#242a30] hover:text-[#f4eee2]">Side</a>
          <a href="/nav/mobile" className="rounded-md px-2 py-2 text-[10px] font-semibold text-[#a8aaa5] transition-colors hover:bg-[#242a30] hover:text-[#f4eee2]">Mobile</a>
          <a href="/nav/breadcrumb" className="rounded-md px-2 py-2 text-[10px] font-semibold text-[#a8aaa5] transition-colors hover:bg-[#242a30] hover:text-[#f4eee2]">Crumb</a>
          <a href="/nav/bottom" className="rounded-md px-2 py-2 text-[10px] font-semibold text-[#a8aaa5] transition-colors hover:bg-[#242a30] hover:text-[#f4eee2]">Bottom</a>
          <a href="/nav/orbit" className="rounded-md px-2 py-2 text-[10px] font-semibold text-[#a8aaa5] transition-colors hover:bg-[#242a30] hover:text-[#f4eee2]">Orbit</a>
          <a href="/nav/pulse" className="rounded-md px-2 py-2 text-[10px] font-semibold text-[#a8aaa5] transition-colors hover:bg-[#242a30] hover:text-[#f4eee2]">Pulse</a>
        </TopNavigation>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 text-[10px] text-[#858b8d] sm:flex">
            <ShieldCheck size={14} className="text-[#d99d59]" />
            <span>Nothing leaves your browser</span>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} data-testid="input-file" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="control-button flex items-center gap-2 rounded-lg bg-[#f1ae62] px-3.5 py-2.5 text-[11px] font-extrabold text-[#24272a] shadow-[0_5px_18px_rgba(241,174,98,.12)] hover:bg-[#ffc47e]" data-testid="button-open-image">
            <UploadCloud size={15} /> Open image
          </button>
        </div>
      </header>

    <div className="mx-auto grid min-h-[calc(100dvh-72px)] max-w-[1640px] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_272px] bg-[#111419]">
{/*aside1*/}
       <aside className="order-2 border-t border-[#8ea8c5] bg-[#0c1d39] p-5 lg:order-1 lg:border-r lg:border-t-0 lg:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="mt-0.2 text-[16px] font-bold text-[#eee7db]">|| Adjustments ||</p>
            </div>
            <SlidersHorizontal size={16} className="text-[#8a8f8f]" />
          </div>
          <div className="space-y-0">
            <AdjustmentRow label="Brightness" value={controls.brightness} min={-100} max={100} onChange={(value) => updateControl('brightness', value)} icon={<Sun size={13} />} disabled={!hasImage} testId="brightness" onReset={() => updateControl('brightness', 0)} />
            <AdjustmentRow label="Contrast" value={controls.contrast} min={-100} max={100} onChange={(value) => updateControl('contrast', value)} icon={<Contrast size={13} />} disabled={!hasImage} testId="contrast" onReset={() => updateControl('contrast', 0)} />
            <AdjustmentRow label="Saturation" value={controls.saturation} min={-100} max={100} onChange={(value) => updateControl('saturation', value)} icon={<Droplets size={13} />} disabled={!hasImage} testId="saturation" onReset={() => updateControl('saturation', 0)} />
            <AdjustmentRow label="Blur" value={controls.blur} min={0} max={20} onChange={(value) => updateControl('blur', value)} icon={<Focus size={13} />} suffix="px" disabled={!hasImage} testId="blur" onReset={() => updateControl('blur', 0)} />
          </div>
          <div className="mt-7 border-t border-[#2a3036] pt-5">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[.18em] text-[#777e80]">Tools</p>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => { setCropMode((mode) => !mode); if (!cropRect) setCropRect({ x: 0, y: 0, w: 1, h: 1 }); }} disabled={!hasImage} className={`control-button flex flex-col items-center gap-1.5 rounded-lg border py-2.5 text-[10px] font-semibold ${cropMode ? 'border-[#f3ad61] bg-[#342b23] text-[#f3b572]' : 'border-[#30363d] bg-[#20252b] text-[#a8aaa5] hover:border-[#55534c] hover:text-[#eee7db]'} disabled:cursor-not-allowed disabled:opacity-40`} data-testid="button-toggle-crop">
                <Crop size={16} /> Crop
              </button>
              <button type="button" onClick={() => rotate('left')} disabled={!hasImage} className="control-button flex flex-col items-center gap-1.5 rounded-lg border border-[#30363d] bg-[#20252b] py-2.5 text-[10px] font-semibold text-[#a8aaa5] hover:border-[#55534c] hover:text-[#eee7db] disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-rotate-left">
                <RotateCcw size={16} /> Left
              </button>
              <button type="button" onClick={() => rotate('right')} disabled={!hasImage} className="control-button flex flex-col items-center gap-1.5 rounded-lg border border-[#30363d] bg-[#20252b] py-2.5 text-[10px] font-semibold text-[#a8aaa5] hover:border-[#55534c] hover:text-[#eee7db] disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-rotate-right">
                <RotateCw size={16} /> Right
              </button>
            </div>
          </div>

       {cropMode && hasImage && (
            <div className="flex items-center justify-center justify-between border-t border-[#2b3138] bg-[#171b20] px-4 py-3 sm:px-5">
             {/* <p className="flex items-center gap-2 text-[10px] text-[#a4a7a2]"><Crop size={14} className="text-[#e9a65e]" /> Drag across the image to set a crop</p>*/}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setCropMode(false); setCropRect(null); }} className="control-button rounded-md px-3 py-2 text-[10px] font-bold text-[#ffffff] bg-[#991B1B]" data-testid="button-cancel-crop">Cancel</button>
                <button type="button" onClick={() => { if (cropRect) setAppliedCrop(cropRect); setCropMode(false); }} disabled={!cropRect} className="control-button flex items-center gap-1 rounded-md bg-[#efaa60] px-2 py-2 text-[4px] font-bold text-[#26282a] hover:bg-[#ffc17c] disabled:opacity-50" data-testid="button-apply-crop"><Check size={15} /> Apply crop</button>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-[#30363d] bg-[#1c2127] p-3.5">
            <div className="flex items-start gap-2.5">
              <MousePointer2 size={14} className="mt-0.5 shrink-0 text-[#dd9f5c]" />
              <div>
                <p className="text-[10px] font-bold text-[#d8d4cc]">Small moves, big difference</p>
                <p className="mt-1 text-[10px] leading-relaxed text-[#858b8d]">Every slider updates the Image as you move. Your original stays untouched.</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="studio-grid mobile-preview order-1 flex min-h-[520px] flex-col bg-[#111419] lg:order-2">
          <div className="flex items-center justify-between border-b border-[#252b31] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${hasImage ? 'bg-[#e9a35b]' : 'bg-[#687276]'}`} />
              <span className="font-mono text-[10px] uppercase tracking-[.16em] text-[#989d9b]">{hasImage ? 'Live preview' : 'Ready when you are'}</span>
            </div>
            {hasImage && (
              <div className="flex items-center gap-3 font-mono text-[10px] text-[#737b7c]">
                <span>{rotation}°</span>
                <span className="h-3 w-px bg-[#384047]" />
                <span>{Math.round(previewAspect * 100) / 100}:1</span>
              </div>
            )}
          </div>
          <div
            className={`relative flex flex-1 items-center justify-center p-5 sm:p-8 ${isDraggingFile ? 'bg-[#26231f]' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(event) => { event.preventDefault(); setIsDraggingFile(false); loadFile(event.dataTransfer.files[0]); }}
            data-testid="drop-zone">
            {!hasImage ? (
              <div className={`drop-zone relative flex min-h-[390px] w-full max-w-[900px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#2d343b] bg-[#15181d] px-7 text-center shadow-[0_20px_70px_rgba(0,0,0,.18)] transition-colors ${isDraggingFile ? 'border-[#f3ad61] bg-[#25251f]' : ''}`}>
                <EmptyArtwork />
                <div className="relative z-10 animate-rise-in">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#55514a] bg-[#262b30]/90 text-[#f0ad66] shadow-[0_10px_30px_rgba(0,0,0,.22)]">
                    <ImagePlus size={27} strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl font-extrabold tracking-[-.035em] text-[#f1ece3] sm:text-2xl">Bring a frame to life.</h2>
                  <p className="mx-auto mt-2 max-w-[360px] text-[12px] leading-relaxed text-[#929897]">Drop an image here, or open one from your device. It stays right here, always.</p>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="control-button mt-6 inline-flex items-center gap-2 rounded-lg border border-[#71624f] bg-[#3a3025] px-4 py-2.5 text-[11px] font-bold text-[#f5c486] hover:border-[#eeb06c] hover:bg-[#443528]" data-testid="button-choose-image">
                    <UploadCloud size={15}/> Choose image
                  </button>
                  <p className="mt-4 font-mono text-[9px] uppercase tracking-[.18em] text-[#646d70]">JPG · PNG · WEBP · GIF</p>
                </div>
              </div>
            ) : (
              <div ref={stageRef} className="relative inline-flex items-center justify-center w-full h-full max-w-full animate-rise-in" style={{ maxHeight: 'calc(100dvh - 190px)' }}>
                <div className="checkerboard overflow-hidden rounded-xl border border-[#303840] p-2 shadow-[0_24px_70px_rgba(0,0,0,.34)] w-full flex items-center justify-center min-h-[300px]">
                  <canvas ref={canvasRef} className="block max-h-[calc(100dvh-230px)] max-w-full rounded-lg object-contain w-full h-auto min-w-[260px]" style={{ imageRendering: 'auto' }} data-testid="canvas-preview" />
                </div>
                {cropMode && cropRect && (
                  <div
                    className="absolute inset-2 cursor-crosshair touch-none"
                    onPointerDown={beginCrop}
                    onPointerMove={moveCrop}
                    onPointerUp={endCrop}
                    onPointerCancel={endCrop}
                    data-testid="crop-overlay"
                  >
                    <div onPointerDown={(event) => event.stopPropagation()} className="crop-window absolute border border-[#f6bf7d]" style={{ left: `${cropRect.x * 100}%`, top: `${cropRect.y * 100}%`, width: `${cropRect.w * 100}%`, height: `${cropRect.h * 100}%` }}>
                      <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                        <span className="border-r border-b border-[#f6bf7d]/35" /><span className="border-r border-b border-[#f6bf7d]/35" /><span className="border-b border-[#f6bf7d]/35" />
                        <span className="border-r border-b border-[#f6bf7d]/35" /><span className="border-r border-b border-[#f6bf7d]/35" /><span className="border-b border-[#f6bf7d]/35" />
                        <span className="border-r border-[#f6bf7d]/35" /><span className="border-r border-[#f6bf7d]/35" /><span />
                      </div>
                      <span className="absolute -left-1 -top-1 h-3 w-3 border-l-2 border-t-2 border-[#f6bf7d]" />
                      <span className="absolute -right-1 -top-1 h-3 w-3 border-r-2 border-t-2 border-[#f6bf7d]" />
                      <span className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-[#f6bf7d]" />
                      <span className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-[#f6bf7d]" />
                      <span onPointerDown={(event) => beginResize(event, 'top-left')} className="absolute -left-2 -top-2 h-4 w-4 cursor-nwse-resize" />
                      <span onPointerDown={(event) => beginResize(event, 'top')} className="absolute -left-1/2 -top-2 h-4 w-full cursor-ns-resize" />
                      <span onPointerDown={(event) => beginResize(event, 'top-right')} className="absolute -right-2 -top-2 h-4 w-4 cursor-nesw-resize" />
                      <span onPointerDown={(event) => beginResize(event, 'right')} className="absolute -right-2 -top-1/2 h-full w-4 cursor-ew-resize" />
                      <span onPointerDown={(event) => beginResize(event, 'bottom-right')} className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize" />
                      <span onPointerDown={(event) => beginResize(event, 'bottom')} className="absolute -bottom-2 -left-1/2 h-4 w-full cursor-ns-resize" />
                      <span onPointerDown={(event) => beginResize(event, 'bottom-left')} className="absolute -bottom-2 -left-2 h-4 w-4 cursor-nesw-resize" />
                      <span onPointerDown={(event) => beginResize(event, 'left')} className="absolute -left-2 -top-1/2 h-full w-4 cursor-ew-resize" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {/*cropMode && hasImage && (
            <div className="flex items-center justify-between border-t border-[#2b3138] bg-[#171b20] px-4 py-3 sm:px-6">
              <p className="flex items-center gap-2 text-[10px] text-[#a4a7a2]"><Crop size={14} className="text-[#e9a65e]" /> Drag across the image to set a crop</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setCropMode(false); setCropRect(null); }} className="control-button rounded-md px-3 py-2 text-[10px] font-bold text-[#a9adaa] hover:bg-[#252b31]" data-testid="button-cancel-crop">Cancel</button>
                <button type="button" onClick={() => { if (cropRect) setAppliedCrop(cropRect); setCropMode(false); }} disabled={!cropRect} className="control-button flex items-center gap-1.5 rounded-md bg-[#efaa60] px-3 py-2 text-[10px] font-bold text-[#26282a] hover:bg-[#ffc17c] disabled:opacity-50" data-testid="button-apply-crop"><Check size={13} /> Apply crop</button>
              </div>
            </div>
          )*/}
        </section>

{/*aside2*/}
    <aside
        className={`order-3 border-t border-[#9daeb2] bg-[#0c1d39] transition-all duration-300 lg:border-l lg:border-t-0 ${
        isLooksOpen ? "p-5 lg:p-6" : "p-3 lg:p-4"}`}>
    <button
        type="button"
        onClick={() => setIsLooksOpen((prev) => !prev)}
        className="mb-2 flex w-full items-center justify-between text-left">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[.18em] text-[#777e80]">
         Looks
        </p>
        <p className="mt-2 inline-block rounded-lg border border-[#30363d] bg-[#DB2777] px-4 py-2 text-[13px] font-bold text-[#eee7db] shadow-sm">
        Filters
        </p>
      </div>

       <Sparkles
       size={16}
       className={`text-[#dca05b] transition-transform duration-300 ${
       isLooksOpen ? "rotate-180" : "" }`}/>
    </button>
       {isLooksOpen && (
         <div>

          <div className="grid grid-cols-2 gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.name}
                type="button"
                onClick={() => updateControl('filter', option.name)}
                disabled={!hasImage}
                className={`filter-card rounded-lg border bg-[#20252b] p-1.5 text-left disabled:cursor-not-allowed disabled:opacity-40 ${controls.filter === option.name ? 'selected border-[#f3ad61] bg-[#2a2925]' : 'border-[#30363d]'}`}
                data-testid={`button-filter-${option.name.toLowerCase()}`}>
                <span className="block h-11 w-full rounded-md" style={{ background: option.swatch, filter: option.name === 'Noir' ? 'grayscale(1)' : option.name === 'Cool' ? 'hue-rotate(16deg)' : undefined }} />
                <span className="mt-2 block truncate px-1 text-[10px] font-bold text-[#dcd8cf]">{option.name}</span>
                <span className="mt-0.5 block truncate px-1 pb-1 text-[9px] text-[#7f8788]">{option.description}</span>
              </button>
            ))}
          </div>
    </div>
    )}
          
          <div className={`mt-5 border-t border-[#2a3036] pt-4 ${!hasImage ? 'opacity-40' : ''}`}>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="filter-intensity" className="text-[11px] font-semibold text-[#d4d0c9]">Filter intensity</label>
              <span className="font-mono text-[10px] text-[#9fa3a1]">{controls.intensity}%</span>
            </div>
            <input id="filter-intensity" type="range" min={0} max={100} value={controls.intensity} disabled={!hasImage} onChange={(event) => updateControl('intensity', Number(event.target.value))} style={{ '--range-progress': `${controls.intensity}%` } as CSSProperties} className="range-warm h-4 w-full cursor-pointer appearance-none bg-transparent" data-testid="input-filter-intensity" />
          </div>
          <div className="mt-6 border-t border-[#2a3036] pt-5">
            <p className="mb-3 font-mono text-[9px] uppercase tracking-[.18em] text-[#777e80]">Image details</p>
            {hasImage ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <FileImage size={15} className="mt-0.5 shrink-0 text-[#d79c59]" />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-[#dcd8cf]" data-testid="text-file-name">{fileName}</p>
                    <p className="mt-0.5 font-mono text-[9px] text-[#7f8788]" data-testid="text-file-size">{formatBytes(fileSize)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-[#30363d] bg-[#20252b] p-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-[#777f80]">Width</p>
                    <p className="mt-1 font-mono text-[11px] text-[#d9d2c5]" data-testid="text-image-width">{dimensions.width.toLocaleString()} px</p>
                  </div>
                  <div className="rounded-lg border border-[#30363d] bg-[#20252b] p-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-[#777f80]">Height</p>
                    <p className="mt-1 font-mono text-[11px] text-[#d9d2c5]" data-testid="text-image-height">{dimensions.height.toLocaleString()} px</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#343b40] bg-[#1c2127] p-4">
                <Info size={16} className="mb-2 text-[#b28151]" />
                <p className="text-[10px] leading-relaxed text-[#838a8a]">Your image dimensions, filename, and export details will appear here.</p>
              </div>
            )}
          </div>
          <div className="mt-5 rounded-xl border border-[#30363d] bg-[#1c2127] p-3.5">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#d7d0c3]"><Maximize2 size={13} className="text-[#dc9f5b]" /> Export at full size</div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-[#858b8d]">Your PNG keeps the source canvas dimensions and all current adjustments.</p>
          </div>
        </aside>
      </div>

      <footer className="flex flex-col items-start justify-between gap-3 border-t border-[#282e35] bg-[#392c3a] px-4 py-3.5 sm:flex-row sm:items-center sm:px-7">
        <div className="flex min-h-5 items-center gap-2 text-[10px] text-[#888e8e]" data-testid="status-message">
          {exportMessage ? <><Check size={13} className="text-[#dc9f5b]" />{exportMessage}</> : <><span className="h-1.5 w-1.5 rounded-full bg-[#5f686a]" /> Edits are private by default</>}
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button type="button" onClick={resetAll} disabled={!hasImage} className="control-button flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#394047] bg-[#20252b] px-3.5 py-2.5 text-[11px] font-bold text-[#b1b1aa] hover:border-[#667072] hover:text-[#eee7db] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none" data-testid="button-reset-all">
            <RotateCcw size={14} /> Reset
          </button>
          <button type="button" onClick={downloadImage} disabled={!hasImage} className="control-button flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#f1ae62] px-4 py-2.5 text-[11px] font-extrabold text-[#24272a] shadow-[0_5px_18px_rgba(241,174,98,.1)] hover:bg-[#ffc47e] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none" data-testid="button-download">
            <Download size={20} /> Download Image <ArrowUpRight size={19} />
          </button>
        </div>
      </footer>
    </main>
  );
}

function NotFound() {
  return <div className="flex min-h-screen items-center justify-center bg-[#112d5c] text-[#eee7db]">Page not found</div>;
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Switch>
        <Route path="/" component={PhotoEditor} />
        <Route path="/nav/top" component={TopNavigationPage} />
        <Route path="/nav/sidebar" component={SidebarNavigationPage} />
        <Route path="/nav/mobile" component={MobileNavigationPage} />
        <Route path="/nav/breadcrumb" component={BreadcrumbNavigationPage} />
        <Route path="/nav/bottom" component={BottomNavigationPage} />
        <Route path="/nav/orbit" component={OrbitNavigationPage} />
        <Route path="/nav/pulse" component={PulseNavigationPage} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

export default App;