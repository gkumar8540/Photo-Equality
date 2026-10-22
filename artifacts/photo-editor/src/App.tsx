import { App as CapacitorApp } from "@capacitor/app";
import React from "react";
import { useLocation } from "wouter";
import { FileText } from "lucide-react";



import { Link } from "wouter";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import Disclaimer from "./pages/Disclaimer";
import ContactUs from "./pages/ContactUs";

import Passport from "./pages/Passport";
import Reduce from "./pages/Reduce";
import Increase from "./pages/Increase";
import RemoveBg from "./pages/RemoveBg";
import TimeTravel from "./pages/TimeTravel";
import DocScanner from "./pages/DocScanner";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Route, Router as WouterRouter, Switch } from 'wouter';
import { Capacitor } from '@capacitor/core';
import logo from '../../images/logoe3.jpeg';
import { TopNavigation } from './components/navigation/TopNavigation';
import BottomNavigationPage from './pages/bottom-navigation';
import BreadcrumbNavigationPage from './pages/breadcrumb-navigation';
import OldFuturePage from './pages/OldFuture';
import TopNavigationPage from './pages/top-navigation';
import PhotoEdit from "./pages/photoedit";

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
      <div className="absolute bottom-9 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[.2em] text-[#aeb2b0]/80">
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
    <div className={`space-y-0 ${disabled ? 'opacity-40' : ''}`}>
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

function PhotoEquality() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);


  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
  const handleOutsideClick = () => {
    setMenuOpen(false);
  };

  if (menuOpen) {
    document.addEventListener("click", handleOutsideClick);
  }

  return () => {
    document.removeEventListener("click", handleOutsideClick);
  };
}, [menuOpen]);



  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [controls, setControls] = useState<Controls>(defaultControls);
  const [rotation, setRotation] = useState(0);
  const [cropMode, setCropMode] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  useEffect(() => {
  const handleOutsideClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    if (!target.closest("[data-tools-menu]") && !cropMode) {
      setToolsOpen(false);
    }
  };

  document.addEventListener("mousedown", handleOutsideClick);

  return () => {
    document.removeEventListener("mousedown", handleOutsideClick);
  };
}, [cropMode]);

  const [showAdjustments, setShowAdjustments] = useState(false);
  useEffect(() => {
  if (!showAdjustments) return;

  const handleOutsideClick = () => {
    setShowAdjustments(false);
  };

  document.addEventListener('click', handleOutsideClick);

  return () => {
    document.removeEventListener('click', handleOutsideClick);
  };
}, [showAdjustments]);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [appliedCrop, setAppliedCrop] = useState<CropRect | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [downloadComplete, setDownloadComplete] = useState(false);
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
    setDownloadComplete(false);
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

  const removeSelectedImage = () => {
    setSourceUrl(null);
    setFileName('');
    setFileSize(0);
    setDimensions({ width: 0, height: 0 });
    setControls(defaultControls);
    setRotation(0);
    setCropMode(false);
    setCropRect(null);
    setAppliedCrop(null);
    setExportMessage('');
    setDownloadComplete(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
    setDownloadComplete(false);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;
    setExportMessage('Preparing PNG…');
    setDownloadComplete(false);

    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'edited-image';
    const finalFileName = `${baseName}-Equality.png`;

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
                setDownloadComplete(true);
                setExportMessage('Image saved to your device.');
                window.setTimeout(() => setDownloadComplete(false), 2500);
              } else {
                setExportMessage('Failed to save image. Please try again.');
              }
            } else {
              // Safe secondary immediate lookup for remote domain injections
              if (win.AndroidDownloadBridge && typeof win.AndroidDownloadBridge.saveBase64ImageToDownloads === 'function') {
                const retrySuccess = win.AndroidDownloadBridge.saveBase64ImageToDownloads(base64Data, finalFileName);
                if (retrySuccess) {
                  setDownloadComplete(true);
                  setExportMessage('PNG saved to your device.');
                  window.setTimeout(() => setDownloadComplete(false), 2500);
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
      const objectUrl = URL.createObjectURL(blob);
      link.download = finalFileName;
      link.href = objectUrl;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      setDownloadComplete(true);
      setExportMessage('PNG saved to your device.');
      window.setTimeout(() => setDownloadComplete(false), 2500);
      window.setTimeout(() => setExportMessage(''), 3500);
    }, 'image/png');
  };

  const pointFromEvent = (event: PointerEvent<HTMLDivElement>) => {
    const rect = (canvasRef.current ?? event.currentTarget).getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  };
                               
  const beginCrop = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    cropInteractionRef.current = { type: 'draw', start: point };
  };

  const beginResize = (event: PointerEvent<HTMLSpanElement>, edge: CropEdge) => {
    event.stopPropagation();
    if (!cropRect) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    cropInteractionRef.current = {
      type: 'resize',edge, start: { x: event.clientX, y: event.clientY },
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
    const bounds = event.currentTarget.getBoundingClientRect();
    const dragDistance = Math.hypot(
      (point.x - start.x) * bounds.width,
      (point.y - start.y) * bounds.height
    );
    if (dragDistance < 6) return;

    let x = Math.min(start.x, point.x);
    let y = Math.min(start.y, point.y);
    let w = Math.abs(point.x - start.x);
    let h = Math.abs(point.y - start.y);

    if (start.x <= 0.02) {
      x = 0;
      w = Math.max(0.03, point.x);
    }
    if (start.x >= 0.98) {
      x = Math.min(point.x, 1);
      w = Math.max(0.03, 1 - x);
    }
    if (start.y <= 0.02) {
      y = 0;
      h = Math.max(0.03, point.y);
    }
    if (start.y >= 0.98) {
      y = Math.min(point.y, 1);
      h = Math.max(0.03, 1 - y);
    }

    setCropRect({
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
      w: Math.min(1, Math.max(0.03, w)),
      h: Math.min(1, Math.max(0.03, h)),
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

  useEffect(() => {
  if (!isLooksOpen) return;

  const handleOutsideClick = () => {
    setIsLooksOpen(false);
  };

  document.addEventListener('click', handleOutsideClick);

  return () => {
    document.removeEventListener('click', handleOutsideClick);
  };
}, [isLooksOpen]);

  const [, setLocation] = useLocation();

  const tools = [
    {
      title: "Passport",
      subtitle: "Passport Size",
      icon: "🪪",
      path: "/images/passport",
    },
    {
      title: "Remove",
      subtitle: "Background",
      icon: "✂️",
      path: "/images/remove-bg",
    },
    {
      title: "Photo Edit Pro",
      subtitle: "Edit Like a Pro",
      icon: "🖼️",
      path: "/images/Time-Travel",
    },
    {
      title: "Photo Mixer",
      subtitle: "Mix & Blend Photos",
      icon: "🔀",
      path: "/images/mixer",
    },
    {
      title: "Reduce",
      subtitle: "Image KB",
      icon: "📉",
      path: "/images/reduce",
    },
    {
      title: "Increase",
      subtitle: "Image KB-MB",
      icon: "📈",
      path: "/images/increase",
    },
    {
      title: "Photo Edit",
      subtitle: "Edit & Enhance",
      icon: "📷",
      path: "/images/photoedit",
    },
    {
      title: "TimeX",
      subtitle: "Past & Present",
      icon: "🕰️",
      path: "/images/Time-Travel",
    },
    
    
    
  ];

  const openTool = (path: string) => {
    setLocation(path);
  };

  return (
    <main className="min-h-[100dvh] bg-[#1d3255] pb-[calc(0rem+env(safe-area-inset-bottom))] text-[#ede7db] md:pb-0">
      <header className="relative z-50 flex min-h-[72px] flex-wrap items-center justify-between gap-y-2 border-b border-[#9d9fa1] bg-[#15181d] px-4 py-2 sm:px-7">
        <div className="flex items-center gap-3">
        
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[50px] bg-[#f3ad61] text-[#22252a] shadow-[0_0_26px_rgba(242,170,90,.14)]">
       <img
        src={logo}
        alt="Logo"
        className="h-full w-full object-cover"/>
      </div>

        <div>
          <div className="flex items-center gap-21.5">
            <h1 className="text-[18px] font-extrabold tracking-[-.02em] text-[#f4eee2]">Photo-EQuality</h1>
            {/*<span className="rounded-full border border-[#465052] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[.12em] text-[#a8aaa5]">Beta</span>*/}


         <div className="relative">
        {/* Menu Button */}
        <button type="button"onClick={(e) => {e.stopPropagation();
        setMenuOpen((prev) => !prev);
        }}
        className=" flex items-center gap-1 bg-transparent  px-1 py-1 text-sm text-white">
       <span className="text-3xl leading-none">☰</span>
       {/*<span className="text-sm">Menu</span>*/}
     </button>

  {/* Menu Dropdown */}
 {menuOpen && (
  <div
    onClick={(e) => e.stopPropagation()}
    className="absolute right-0 top-full z-[100] mt-0 w-46 rounded-lg border border-[#30363d] bg-[#303030] p-2 shadow-2xl">

      <Link
        to="/privacy-policy"
        onClick={() => setMenuOpen(false)}
        className="block rounded-md px-3 py-2.5 text-sm  text-blue-400 transition hover:bg-[#30363d]"
      >
        • Privacy Policy
      </Link>

      <Link
        to="/terms-conditions"
        onClick={() => setMenuOpen(false)}
        className="block rounded-md px-3 py-2.5 text-sm  text-blue-400 transition hover:bg-[#30363d]"
      >
        • Terms & Conditions
      </Link>

      <Link
        to="/disclaimer"
        onClick={() => setMenuOpen(false)}
        className="block rounded-md px-3 py-2.5 text-sm  text-blue-400 transition hover:bg-[#30363d]"
      >
        •Disclaimer
      </Link>

      <Link
        to="/contact-us"
        onClick={() => setMenuOpen(false)}
        className="block rounded-md px-3 py-2.5 text-sm  text-blue-400 transition hover:bg-[#30363d]">
        • Contact Us
      </Link>

    </div>
  )}
</div>

      </div>
        <p className="hidden font-mono text-[9px] uppercase tracking-[.15em] text-[#777e80] sm:block">A quiet place to make images sing</p>
        </div>
        </div>

        {/*<TopNavigation>
          <div className="items-center grid w-full px-2 py-1 grid-cols-3 gap-3">
          <a href="/nav/mixer" className="flex items-center justify-center rounded-md h-6 px-4 py-2 text-[15px] font-bold text-[#171717] transition-colors bg-[#ffffff] hover:text-[#a8aaa5]">Mixer</a>
          <a href="/nav/sidebar" className="flex items-center justify-center rounded-md h-6 px-2 py-2 text-[15px] font-semibold text-[#171717] transition-colors bg-[#ffffff] hover:text-[#a8aaa5]">TimeX</a>
          
          <a href="/nav/photoedit" className="flex items-center justify-center rounded-md h-6 px-2 py-2 text-[15px] font-semibold text-[#171717] transition-colors bg-[#ffffff] hover:text-[#a8aaa5]">Photo</a>
          </div>
        </TopNavigation>*/}

          <div className="flex items-center gap-2">
           <div className="hidden items-center gap-2 text-[10px] text-[#858b8d] sm:flex">
            <ShieldCheck size={14} className="text-[#d99d59]" />
            <span>Nothing leaves your browser</span>
           </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} data-testid="input-file" />
          {/*<button type="button" onClick={() => fileInputRef.current?.click()} className="control-button flex items-center gap-2 rounded-lg bg-[#f1ae62] px-3.5 py-2.5 text-[11px] font-extrabold text-[#24272a] shadow-[0_5px_18px_rgba(241,174,98,.12)] hover:bg-[#ffc47e]" data-testid="button-open-image">
            <UploadCloud size={15} /> Open image
          </button>*/}
        </div>
      </header>
                                 
                       {/*main start here */}

     <div className="min-h-161 bg-[#0c1d39] px-4 py-2 text-white">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
         <div className="mb-3 text-center">
           <h1 className="text-2xl font-bold sm:text-3xl">
            Images Tools
           </h1>
           <p className="mt-0 text-sm text-gray-400">
            Simple and powerful image tools
           </p>
         </div>

        {/* 2 × 2 Tools Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {tools.map((tool) => (
            <button
              key={tool.path}
              type="button"
              onClick={() => openTool(tool.path)}
              className="group flex min-h-[130px] flex-col items-center justify-center rounded-2xl border border-[#34445b] bg-[#141f30] p-0 text-center shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-[#f3ad61] hover:bg-[#18263a] active:scale-[0.98]"
            >
              {/* Icon */}
              <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-xl bg-[#202d40] text-3xl transition group-hover:bg-[#29384d]">
                {tool.icon}
              </div>

              {/* Title */}
              <div className="text-base font-bold text-white sm:text-lg">
                {tool.title}
              </div>

              {/* Subtitle */}
              <div className="mt-0 text-sm text-gray-400">
                {tool.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>


    </main>
  );
}

function NotFound() {
  return <div className="flex min-h-screen items-center justify-center bg-[#112d5c] text-[#eee7db]">Page not found</div>;
}

function App() {

  useEffect(() => {
  let backListener: any;
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

  const setupBackButton = async () => {
    backListener = await CapacitorApp.addListener(
      "backButton",
      (event: { canGoBack: boolean }) => {
        const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
        const routePath = basePath && currentPath.startsWith(basePath)
          ? currentPath.slice(basePath.length) || '/'
          : currentPath;

        if (routePath === '/') {
          CapacitorApp.exitApp();
          return;
        }

        if (!event.canGoBack) {
          CapacitorApp.exitApp();
          return;
        }

        window.history.back();
      }
    );
  };

  setupBackButton();

  return () => {
    backListener?.remove();
  };
}, []);



  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Switch>
        <Route path="/" component={PhotoEquality} />
        


        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms-conditions" component={TermsConditions} />
        <Route path="/disclaimer" component={Disclaimer} />
        <Route path="/contact-us" component={ContactUs} />

        <Route path="/images/mixer" component={TopNavigationPage} />
        <Route path="/images/sidebar" component={OldFuturePage} />      
        <Route path="/images/photoedit" component={PhotoEdit} />
        <Route path="/images/passport" component={Passport} />
        <Route path="/images/reduce" component={Reduce} />
        <Route path="/images/increase" component={Increase} />
        <Route path="/images/remove-bg" component={RemoveBg} />
        <Route path="/images/Time-Travel" component={TimeTravel} />
        <Route path="/images/Doc-scanner"component={DocScanner}/>

        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

export default App;