import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

declare global {
  interface Window {
    AndroidDownloadBridge?: {
      saveBase64ImageToDownloads?: (
        base64Data: string,
        fileName: string
      ) => boolean | void;
    };
  }
}

type HighlightRange = {
  start: number;
  end: number;
  color: string;
};

type TextLayer = {
  id: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;

  colorRanges?: {
  start: number;
  end: number;
  color: string;
}[];

  highlightedWords: HighlightRange[];
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  opacity: number;
  fontFamily: string;

  coloredRanges?: {
  start: number;
  end: number;
  color: string;
}[];
};

type Tool =
  | 'background'
  | 'photo'
  | 'size'
  | 'text'
  | 'edit'
  | null;

type CropRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type CropEdge =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

type PhotoTransform = {
  x: number;
  y: number;
  width: number;
  rotation: number;
};

type Adjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: number;
  sepia: number;
};

type FilterPreset =
  | 'original'
  | 'warm'
  | 'cool'
  | 'noir'
  | 'vintage';

type PhotoLayer = {
  id: number;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  transform: PhotoTransform;
  adjustments: Adjustments;
  filterPreset: FilterPreset;
  cornerRoundness: number;
  edgeFeather: number;
};

const SIZE_PRESETS = [
  { id: '9:16', label: '9:16', width: 1080, height: 1920 },
  { id: '16:9', label: '16:9', width: 1920, height: 1080 },
  { id: '1:1', label: '1:1', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5', width: 1080, height: 1350 },
  { id: '3:4', label: '3:4', width: 1080, height: 1440 },
  { id: '4:3', label: '4:3', width: 1440, height: 1080 },
  { id: '3:2', label: '3:2', width: 1620, height: 1080 },
];

const TEXT_REFERENCE_WIDTH = SIZE_PRESETS[0].width;

const FILTER_PRESETS: {
  id: FilterPreset;
  label: string;
  filter: string;
}[] = [
  {
    id: 'original',
    label: 'Original',
    filter: '',
  },
  {
    id: 'warm',
    label: 'Warm',
    filter: 'sepia(0.16) saturate(1.15)',
  },
  {
    id: 'cool',
    label: 'Cool',
    filter: 'hue-rotate(10deg) saturate(0.95)',
  },
  {
    id: 'noir',
    label: 'Noir',
    filter: 'grayscale(1) contrast(1.15)',
  },
  {
    id: 'vintage',
    label: 'Vintage',
    filter: 'sepia(0.3) saturate(0.85) contrast(0.95)',
  },
];

const FONT_OPTIONS = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
];

const BACKGROUND_COLORS = [
  '#ffffff',
  '#000000',
  '#f3ad61',
  '#f472b6',
  '#60a5fa',
  '#34d399',
  '#a78bfa',
  '#facc15',
  '#ef4444',
  '#64748b',
];

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
};

const DEFAULT_PHOTO_TRANSFORM: PhotoTransform = {
  x: 50,
  y: 50,
  width: 76,
  rotation: 0,
};

const DEFAULT_TEXT_SIZE = 42;

const clamp = (
  value: number,
  min: number,
  max: number
) => Math.max(min, Math.min(max, value));

const makeId = () =>
  Date.now() + Math.floor(Math.random() * 10000);

const loadImage = (
  src: string
): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = reject;

    image.src = src;
  });

const getTextFont = (layer: TextLayer) =>
  `${layer.italic ? 'italic ' : ''}${layer.bold ? '700' : '400'} ${
    layer.fontSize
  }px "${layer.fontFamily}"`;

export default function PhotoMixerPage() {

      const initialPinchDistance = useRef<number | null>(null);
const initialFontSize = useRef<number>(0);

const getPinchDistance = (
  p1: { clientX: number; clientY: number },
  p2: { clientX: number; clientY: number }
) => {
  return Math.hypot(
    p2.clientX - p1.clientX,
    p2.clientY - p1.clientY
  );
};

  const backgroundInputRef =
    useRef<HTMLInputElement | null>(null);

  const photoInputRef =
    useRef<HTMLInputElement | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const canvasAreaRef =
    useRef<HTMLDivElement | null>(null);

  const photoTapRef = useRef<{
    photoId: number;
    time: number;
    x: number;
    y: number;
  } | null>(null);

  const cropAnimationFrameRef =
    useRef<number | null>(null);

  const cropLatestPointRef =
    useRef<{
      clientX: number;
      clientY: number;
    } | null>(null);

  const [background, setBackground] =
    useState<string | null>(null);
  const backgroundRef = useRef(background);
  backgroundRef.current = background;

  const [photoLayers, setPhotoLayers] =
    useState<PhotoLayer[]>([]);
  const photoLayersRef = useRef(photoLayers);
  photoLayersRef.current = photoLayers;

  const [selectedPhotoId, setSelectedPhotoId] =
    useState<number | null>(null);
  const [showPhotoSelection, setShowPhotoSelection] =
    useState(true);
  const [showCornerRoundingControl, setShowCornerRoundingControl] =
    useState(false);

  const [backgroundColor, setBackgroundColor] =
    useState('#ffffff');

  const [activeTool, setActiveTool] =
    useState<Tool>(null);
  const [keyboardHeight, setKeyboardHeight] =
    useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isActive = true;
    let removeListeners: (() => void) | undefined;

    void Promise.all([
      Keyboard.addListener('keyboardWillShow', ({ keyboardHeight: height }) => {
        setKeyboardHeight(height);
      }),
      Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0);
      }),
    ]).then((listeners) => {
      const remove = () => {
        listeners.forEach((listener) => {
          void listener.remove();
        });
      };

      if (isActive) {
        removeListeners = remove;
      } else {
        remove();
      }
    });

    return () => {
      isActive = false;
      removeListeners?.();
    };
  }, []);

  const [canvasSize, setCanvasSize] =
    useState(SIZE_PRESETS[4]);

  const [textLayers, setTextLayers] =
    useState<TextLayer[]>([]);
  const [alignedTextGuideX, setAlignedTextGuideX] =
    useState<number | null>(null);

  const [selectedTextId, setSelectedTextId] =
    useState<number | null>(null);
  const [showTextSelection, setShowTextSelection] =
    useState(true);
const [editingTextId, setEditingTextId] =
  useState<number | null>(null);
  const textPointersRef = useRef<
  Map<number, { x: number; y: number }>
>(new Map());
  const textGestureLayerIdRef = useRef<number | null>(null);
  const textDragRef = useRef<{
    pointerId: number;
    layerId: number;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
  } | null>(null);

const textPinchRef = useRef<{
  active: boolean;
  startDistance: number;
  startFontSize: number;
}>({
  active: false,
  startDistance: 0,
  startFontSize: 0,
});


  const [newText, setNewText] =
    useState('');

  const [textColor, setTextColor] =
    useState('#ffffff');

  const [wordColor, setWordColor] =
    useState('#f3ad61');

  const [textSize, setTextSize] =
    useState(DEFAULT_TEXT_SIZE);

  const [textBold, setTextBold] =
    useState(false);

  const [textItalic, setTextItalic] =
    useState(false);

  const [textUnderline, setTextUnderline] =
    useState(false);

  const [textAlign, setTextAlign] =
    useState<'left' | 'center' | 'right'>(
      'center'
    );

  const [textOpacity, setTextOpacity] =
    useState(1);

  const [fontFamily, setFontFamily] =
    useState('Arial');

  const [selectedWordRange, setSelectedWordRange] =
    useState<{
      layerId: number;
      start: number;
      end: number;
    } | null>(null);

  const selectedPhoto = photoLayers.find(
    (layer) => layer.id === selectedPhotoId
  ) ?? null;
  const photo = selectedPhoto?.src ?? null;
  const photoTransform = selectedPhoto?.transform ?? DEFAULT_PHOTO_TRANSFORM;
  const adjustments = selectedPhoto?.adjustments ?? DEFAULT_ADJUSTMENTS;
  const filterPreset = selectedPhoto?.filterPreset ?? 'original';
  const photoNaturalSize = selectedPhoto
    ? { width: selectedPhoto.naturalWidth, height: selectedPhoto.naturalHeight }
    : { width: 1, height: 1 };

  const [isCropping, setIsCropping] =
    useState(false);

  /*
   * Crop starts exactly at the image edges.
   * This also makes the first crop feel natural.
   */
  const [
    cropRect, setCropRect] =
    useState<CropRect>({
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    });

  const cropInteractionRef = useRef<{
    type: 'draw' | 'resize';
    edge?: CropEdge;
    start: { x: number; y: number };
    rect?: CropRect;
  } | null>(null);

  const [dragging, setDragging] =
    useState<{
      type: 'photo' | 'resize' | 'text';
      id?: number;
      startX: number;
      startY: number;
      originalX: number;
      originalY: number;
      originalWidth?: number;
    } | null>(null);

  const [downloadComplete, setDownloadComplete] =
    useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [exportMessage, setExportMessage] =
    useState('');

  const hasImage = photoLayers.length > 0;

  const updatePhotoLayer = (
    id: number,
    update: (layer: PhotoLayer) => PhotoLayer
  ) => {
    setPhotoLayers((previous) =>
      previous.map((layer) =>
        layer.id === id ? update(layer) : layer
      )
    );
  };

  const setPhotoTransform = (
    update: PhotoTransform | ((current: PhotoTransform) => PhotoTransform)
  ) => {
    if (selectedPhotoId === null) return;

    updatePhotoLayer(selectedPhotoId, (layer) => ({
      ...layer,
      transform: typeof update === 'function'
        ? update(layer.transform)
        : update,
    }));
  };

  const setAdjustments = (
    update: Adjustments | ((current: Adjustments) => Adjustments)
  ) => {
    if (selectedPhotoId === null) return;
    updatePhotoLayer(selectedPhotoId, (layer) => ({
      ...layer,
      adjustments: typeof update === 'function'
        ? update(layer.adjustments)
        : update,
    }));
  };

  const setFilterPreset = (nextPreset: FilterPreset) => {
    if (selectedPhotoId === null) return;
    updatePhotoLayer(selectedPhotoId, (layer) => ({
      ...layer,
      filterPreset: nextPreset,
    }));
  };

  const setPhoto = (nextPhoto: string | null) => {
    if (selectedPhotoId === null) return;

    if (nextPhoto === null) {
      setPhotoLayers((previous) =>
        previous.filter((layer) => layer.id !== selectedPhotoId)
      );
      const nextLayer = photoLayers.find(
        (layer) => layer.id !== selectedPhotoId
      );
      setSelectedPhotoId(nextLayer?.id ?? null);
      setShowPhotoSelection(true);
      return;
    }

    updatePhotoLayer(selectedPhotoId, (layer) => ({
      ...layer,
      src: nextPhoto,
    }));
  };

  const selectedText =
    selectedTextId !== null
      ? textLayers.find(
          (layer) =>
            layer.id === selectedTextId
        ) ?? null
      : null;

  const selectedTextValue =
    selectedText?.text ?? newText;

  const currentAspectRatio =
    canvasSize.width /
    canvasSize.height;

  const getFilterString = (layer?: PhotoLayer) => {
    const layerAdjustments = layer?.adjustments ?? adjustments;
    const layerFilterPreset = layer?.filterPreset ?? filterPreset;
    const preset =
      FILTER_PRESETS.find(
        (item) =>
          item.id === layerFilterPreset
      )?.filter ?? '';

    const parts = [
      `brightness(${
        1 + layerAdjustments.brightness / 100
      })`,
      `contrast(${
        1 + layerAdjustments.contrast / 100
      })`,
      `saturate(${
        1 + layerAdjustments.saturation / 100
      })`,
      layerAdjustments.blur > 0
        ? `blur(${layerAdjustments.blur}px)`
        : '',
      layerAdjustments.grayscale > 0
        ? `grayscale(${
            layerAdjustments.grayscale / 100
          })`
        : '',
      layerAdjustments.sepia > 0
        ? `sepia(${
            layerAdjustments.sepia / 100
          })`
        : '',
      preset,
    ].filter(Boolean);

    return parts.join(' ');
  };

  const revokeIfBlob = (
    url: string | null
  ) => {
    if (
      url &&
      url.startsWith('blob:')
    ) {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    return () => {
      revokeIfBlob(backgroundRef.current);
      photoLayersRef.current.forEach((layer) => {
        revokeIfBlob(layer.src);
      });

      if (
        cropAnimationFrameRef.current !== null
      ) {
        cancelAnimationFrame(
          cropAnimationFrameRef.current
        );
      }
    };
  }, []);

  /*
   * Close overlay when user clicks outside.
   * Popup itself and footer toolbar remain protected.
   */
  useEffect(() => {
    if (!activeTool) return;

      const handleOutsideClick = (
        event: PointerEvent
    ) => {
      const target =
        event.target as HTMLElement;

      if (
        target.closest(
          '[data-photo-editor-panel]'
        ) ||
        target.closest(
          '[data-photo-editor-toolbar]'
        ) ||
        target.closest(
          '[data-photo-editor-actions]'
        )
      ) {
        return;
      }

      const clickedBoard = target.closest('[data-photo-editor-board]');
      const clickedPhoto = target.closest('[data-photo-layer]');
      const clickedText = target.closest('[data-text-layer]');
      if (
        clickedBoard &&
        (clickedPhoto ||
          clickedText ||
          (activeTool === 'text' && selectedTextId === null && newText.trim()))
      ) {
        return;
      }

      setActiveTool(null);
    };

    document.addEventListener(
      'pointerdown',
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        'pointerdown',
        handleOutsideClick
      );
    };
  }, [activeTool, selectedTextId, newText]);

  useEffect(() => {
    if (
      !activeTool ||
      activeTool !== 'text'
    ) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);

    return () =>
      window.clearTimeout(timer);
  }, [
    activeTool,
    selectedTextId,
  ]);

  const selectBackground = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const url =
      URL.createObjectURL(file);

    revokeIfBlob(background);

    setBackground(url);
    setActiveTool('background');

    event.target.value = '';
  };

  const selectPhoto = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      const loadedLayers = await Promise.all(
        files.map(async (file, index) => {
          const src = URL.createObjectURL(file);
          try {
            const image = await loadImage(src);
            const offset = photoLayers.length + index;
            const layer: PhotoLayer = {
              id: makeId(),
              src,
              naturalWidth: image.naturalWidth || 1,
              naturalHeight: image.naturalHeight || 1,
              transform: {
                ...DEFAULT_PHOTO_TRANSFORM,
                x: 50 + (offset % 5) * 3,
                y: 50 + (offset % 5) * 3,
              },
              adjustments: { ...DEFAULT_ADJUSTMENTS },
              filterPreset: 'original',
              cornerRoundness: 0,
              edgeFeather: 0,
            };
            return layer;
          } catch {
            revokeIfBlob(src);
            return null;
          }
        })
      );
      const nextLayers = loadedLayers.filter(
        (layer): layer is PhotoLayer => layer !== null
      );
      if (nextLayers.length === 0) throw new Error('No supported image files');

      setPhotoLayers((previous) => [...previous, ...nextLayers]);
      setSelectedPhotoId(nextLayers[nextLayers.length - 1].id);
      setShowPhotoSelection(true);
      setShowCornerRoundingControl(false);

      /*
       * Start crop exactly from image edges.
       */
      setCropRect({
        x: 0,
        y: 0,
        w: 100,
        h: 100,
      });

      setIsCropping(true);
      setActiveTool(null);
      setExportMessage('');
    } catch {
      setExportMessage(
        'Unable to load image.'
      );
    }

    event.target.value = '';
  };

  const startCrop = () => {
    if (!photo) return;

    cropInteractionRef.current = null;
    cropLatestPointRef.current = null;
    if (cropAnimationFrameRef.current !== null) {
      cancelAnimationFrame(cropAnimationFrameRef.current);
      cropAnimationFrameRef.current = null;
    }

    setCropRect({
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    });

    setIsCropping(true);
    setActiveTool(null);
  };

  const pointFromCropEvent = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    };
  };

  const beginCrop = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    cropInteractionRef.current = {
      type: 'draw',
      start: pointFromCropEvent(event),
    };
  };

  const beginCropResize = (
    event: ReactPointerEvent<HTMLDivElement>,
    edge: CropEdge
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    cropInteractionRef.current = {
      type: 'resize',
      edge,
      start: { x: event.clientX, y: event.clientY },
      rect: cropRect,
    };
  };

  const updateCropFromPoint = (
    clientX: number,
    clientY: number
  ) => {
    const stage =
      canvasAreaRef.current;

    const interaction =
      cropInteractionRef.current;

    if (
      !stage ||
      !interaction
    ) {
      return;
    }

    const rect =
      stage.getBoundingClientRect();

    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return;
    }

    /*
     * Convert mouse/touch movement into
     * exact percentage of the image stage.
     */
    const bounds = stage.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    if (interaction.type === 'resize' && interaction.rect && interaction.edge) {
      const deltaX = ((clientX - interaction.start.x) / bounds.width) * 100;
      const deltaY = ((clientY - interaction.start.y) / bounds.height) * 100;
      const initial = interaction.rect;
      const minimum = 3;
      const next = { ...initial };

      if (interaction.edge.includes('left')) {
        next.x = clamp(initial.x + deltaX, 0, initial.x + initial.w - minimum);
        next.w = initial.x + initial.w - next.x;
      }
      if (interaction.edge.includes('right')) {
        next.w = clamp(initial.w + deltaX, minimum, 100 - initial.x);
      }
      if (interaction.edge.includes('top')) {
        next.y = clamp(initial.y + deltaY, 0, initial.y + initial.h - minimum);
        next.h = initial.y + initial.h - next.y;
      }
      if (interaction.edge.includes('bottom')) {
        next.h = clamp(initial.h + deltaY, minimum, 100 - initial.y);
      }

      setCropRect(next);
      return;
    }

    if (interaction.type !== 'draw') return;

    const point = {
      x: clamp((clientX - bounds.left) / bounds.width, 0, 1),
      y: clamp((clientY - bounds.top) / bounds.height, 0, 1),
    };
    const start = interaction.start;
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
      x = point.x;
      w = Math.max(0.03, 1 - x);
    }
    if (start.y <= 0.02) {
      y = 0;
      h = Math.max(0.03, point.y);
    }
    if (start.y >= 0.98) {
      y = point.y;
      h = Math.max(0.03, 1 - y);
    }

    setCropRect({
      x: clamp(x * 100, 0, 97),
      y: clamp(y * 100, 0, 97),
      w: clamp(w * 100, 3, 100 - clamp(x * 100, 0, 97)),
      h: clamp(h * 100, 3, 100 - clamp(y * 100, 0, 97)),
    });
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (
      isCropping &&
      cropInteractionRef.current
    ) {
      event.preventDefault();

      cropLatestPointRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
      };

      /*
       * requestAnimationFrame prevents
       * excessive React state updates during
       * fast touch/mouse movement.
       */
      if (
        cropAnimationFrameRef.current ===
        null
      ) {
        cropAnimationFrameRef.current =
          requestAnimationFrame(() => {
            cropAnimationFrameRef.current =
              null;

            const point =
              cropLatestPointRef.current;

            if (!point) return;

            updateCropFromPoint(
              point.clientX,
              point.clientY
            );
          });
      }

      return;
    }

    if (!dragging) return;

    const stage =
      canvasAreaRef.current;

    if (!stage) return;

    const rect =
      stage.getBoundingClientRect();

    const dx =
      ((event.clientX -
        dragging.startX) /
        rect.width) *
      100;

    const dy =
      ((event.clientY -
        dragging.startY) /
        rect.height) *
      100;

    if (
      (dragging.type === 'photo' || dragging.type === 'resize') &&
      dragging.id !== undefined
    ) {
      setPhotoLayers((previous) =>
        previous.map((layer) => {
          if (layer.id !== dragging.id) return layer;

          if (dragging.type === 'resize') {
            const widthDelta = ((dx / 100) + (dy / 100)) * 50;
            return {
              ...layer,
              transform: {
                ...layer.transform,
                width: clamp(
                  (dragging.originalWidth ?? layer.transform.width) + widthDelta,
                  5,
                  150
                ),
              },
            };
          }

          return {
            ...layer,
            transform: {
              ...layer.transform,
              x: clamp(dragging.originalX + dx, 0, 100),
              y: clamp(dragging.originalY + dy, 0, 100),
            },
          };
        })
      );
    }

    if (
      dragging.type ===
        'text' &&
      dragging.id !== undefined
    ) {
      setTextLayers((previous) =>
        previous.map(
            (layer) =>
              layer.id ===
              dragging.id
                ? {
                    ...layer,
                    x: clamp(
                      dragging.originalX +
                        dx,
                      0,
                      100
                    ),
                    y: clamp(
                      dragging.originalY +
                        dy,
                      0,
                      100
                    ),
                  }
                : layer
          )
      );
    }
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (
      isCropping &&
      cropInteractionRef.current
    ) {
      cropInteractionRef.current =
        null;

      cropLatestPointRef.current =
        null;

      if (
        cropAnimationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          cropAnimationFrameRef.current
        );

        cropAnimationFrameRef.current =
          null;
      }

      try {
        event.currentTarget.releasePointerCapture(
          event.pointerId
        );
      } catch {
        // Ignore pointer capture errors.
      }

      return;
    }

    setDragging(null);
  };

  const applyCrop = async () => {
    if (!photo) return;

    try {
      const image =
        await loadImage(photo);

      const safeX = clamp(
        cropRect.x,
        0,
        100
      );

      const safeY = clamp(
        cropRect.y,
        0,
        100
      );

      const safeW = clamp(
        cropRect.w,
        1,
        100 - safeX
      );

      const safeH = clamp(
        cropRect.h,
        1,
        100 - safeY
      );

      const sourceX =
        (safeX / 100) *
        image.naturalWidth;

      const sourceY =
        (safeY / 100) *
        image.naturalHeight;

      const sourceWidth =
        (safeW / 100) *
        image.naturalWidth;

      const sourceHeight =
        (safeH / 100) *
        image.naturalHeight;

      const outputCanvas =
        document.createElement(
          'canvas'
        );

      outputCanvas.width =
        Math.max(
          1,
          Math.round(
            sourceWidth
          )
        );

      outputCanvas.height =
        Math.max(
          1,
          Math.round(
            sourceHeight
          )
        );

      const context =
        outputCanvas.getContext(
          '2d'
        );

      if (!context) {
        throw new Error(
          'Canvas unavailable'
        );
      }

      context.imageSmoothingEnabled =
        true;

      context.imageSmoothingQuality =
        'high';

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputCanvas.width,
        outputCanvas.height
      );

      const croppedData =
        outputCanvas.toDataURL(
          'image/png',
          1
        );

      if (selectedPhotoId === null) return;
      revokeIfBlob(photo);
      updatePhotoLayer(selectedPhotoId, (layer) => ({
        ...layer,
        src: croppedData,
        naturalWidth: outputCanvas.width,
        naturalHeight: outputCanvas.height,
        transform: {
          ...layer.transform,
          rotation: 0,
        },
      }));

      cropInteractionRef.current = null;
      cropLatestPointRef.current = null;
      if (cropAnimationFrameRef.current !== null) {
        cancelAnimationFrame(cropAnimationFrameRef.current);
        cropAnimationFrameRef.current = null;
      }
      setCropRect({
        x: 0,
        y: 0,
        w: 100,
        h: 100,
      });
      setIsCropping(false);

      setAdjustments(
        DEFAULT_ADJUSTMENTS
      );

      setFilterPreset(
        'original'
      );

      setActiveTool(null);

      setExportMessage(
        'Crop applied. Edit your photo below.'
      );
    } catch {
      setExportMessage(
        'Crop could not be applied.'
      );
    }
  };

  const cancelCrop = () => {
    cropInteractionRef.current =
      null;

    cropLatestPointRef.current =
      null;

    if (
      cropAnimationFrameRef.current !==
      null
    ) {
      cancelAnimationFrame(
        cropAnimationFrameRef.current
      );

      cropAnimationFrameRef.current =
        null;
    }

    setIsCropping(false);

    setActiveTool(null);
  };

  const addText = (
    position = { x: 50, y: 50 },
    closeAfterAdd = false
  ) => {
    const value =
      newText.trim();

    if (!value) return;

    const id = makeId();

    const layer: TextLayer = {
      id,
      text: value,
      x: position.x,
      y: position.y,
      fontSize: textSize,
      color: textColor,
      highlightedWords: [],
      bold: textBold,
      italic: textItalic,
      underline: textUnderline,
      align: textAlign,
      opacity: textOpacity,
      fontFamily,
    };

    setTextLayers(
      (previous) => [
        ...previous,
        layer,
      ]
    );

    setSelectedWordRange(null);

    if (closeAfterAdd) {
      setSelectedTextId(null);
      setShowTextSelection(true);
      setEditingTextId(null);
      setNewText('');
      setActiveTool(null);
    } else {
      setSelectedTextId(id);
      setShowTextSelection(true);
      setNewText(value);
      setActiveTool('text');
    }
  };

  const handleCanvasClick = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (
      activeTool !== 'text' ||
      selectedTextId !== null ||
      (event.target as HTMLElement).closest('[data-text-layer]')
    ) {
      return;
    }

    const value = newText.trim();
    const rect = event.currentTarget.getBoundingClientRect();
    if (!value || rect.width <= 0 || rect.height <= 0) return;

    addText(
      {
        x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
        y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
      },
      true
    );
  };

  const updateSelectedText = (
    changes: Partial<TextLayer>
  ) => {
    if (
      selectedTextId === null
    ) {
      return;
    }

    setTextLayers(
      (previous) =>
        previous.map(
          (layer) =>
            layer.id ===
            selectedTextId
              ? {
                  ...layer,
                  ...changes,
                }
              : layer
        )
    );
  };

    const getTextPointerDistance = () => {
      const points = Array.from(
        textPointersRef.current.values()
      );

      if (points.length < 2) return 0;

      return Math.hypot(
        points[1].x - points[0].x,
        points[1].y - points[0].y
      );
    };

    const handleTextPointerDown = (
      event: ReactPointerEvent<HTMLDivElement>,
      layer: TextLayer
    ) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        textGestureLayerIdRef.current !== null &&
        textGestureLayerIdRef.current !== layer.id
      ) {
        return;
      }

      textGestureLayerIdRef.current = layer.id;
      if (textPointersRef.current.size === 0) {
        if (selectedTextId === layer.id) {
          setShowTextSelection((visible) => !visible);
        } else {
          setSelectedTextId(layer.id);
          setShowTextSelection(true);
        }
      }
      textPointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore pointer capture errors.
      }

      if (textPointersRef.current.size >= 2) {
        setAlignedTextGuideX(null);
        textPinchRef.current = {
          active: true,
          startDistance: getTextPointerDistance(),
          startFontSize: layer.fontSize,
        };
        textDragRef.current = null;
        return;
      }

      textDragRef.current = {
        pointerId: event.pointerId,
        layerId: layer.id,
        startX: event.clientX,
        startY: event.clientY,
        originalX: layer.x,
        originalY: layer.y,
      };
    };

    const handleTextPointerMove = (
      event: ReactPointerEvent<HTMLDivElement>,
      layer: TextLayer
    ) => {
      if (!textPointersRef.current.has(event.pointerId)) return;

      event.preventDefault();
      textPointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (
        textPinchRef.current.active &&
        textPointersRef.current.size >= 2
      ) {
        const { startDistance, startFontSize } = textPinchRef.current;
        if (startDistance <= 0) return;

        const fontSize = clamp(
          Math.round(
            startFontSize *
              (getTextPointerDistance() / startDistance)
          ),
          12,
          160
        );

        setTextLayers((previous) =>
          previous.map((item) =>
            item.id === layer.id
              ? { ...item, fontSize }
              : item
          )
        );
        return;
      }

      const drag = textDragRef.current;
      const stage = canvasAreaRef.current;
      if (
        !drag ||
        drag.pointerId !== event.pointerId ||
        !stage
      ) {
        return;
      }

      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const x = clamp(
        drag.originalX +
          ((event.clientX - drag.startX) / rect.width) * 100,
        0,
        100
      );
      const y = clamp(
        drag.originalY +
          ((event.clientY - drag.startY) / rect.height) * 100,
        0,
        100
      );

      const alignmentTarget = textLayers.find(
        (item) =>
          item.id !== drag.layerId &&
          Math.abs(item.x - x) <= (8 / rect.width) * 100
      );
      const nextX = alignmentTarget?.x ?? x;
      setAlignedTextGuideX(alignmentTarget?.x ?? null);

      setTextLayers((previous) =>
        previous.map((item) =>
          item.id === drag.layerId
            ? { ...item, x: nextX, y }
            : item
        )
      );
    };

    const handleTextPointerUp = (
      event: ReactPointerEvent<HTMLDivElement>,
      layer: TextLayer
    ) => {
      textPointersRef.current.delete(event.pointerId);

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore pointer capture errors.
      }

      if (textPointersRef.current.size === 0) {
        textGestureLayerIdRef.current = null;
        textDragRef.current = null;
        textPinchRef.current.active = false;
        setAlignedTextGuideX(null);
        return;
      }

      if (textPointersRef.current.size < 2) {
        textPinchRef.current.active = false;
        const [pointerId, point] = Array.from(
          textPointersRef.current.entries()
        )[0];
        const currentLayer = textLayers.find(
          (item) => item.id === layer.id
        );

        if (currentLayer) {
          textDragRef.current = {
            pointerId,
            layerId: layer.id,
            startX: point.x,
            startY: point.y,
            originalX: currentLayer.x,
            originalY: currentLayer.y,
          };
        }
      }
    };

  const deleteSelectedText = () => {
    if (
      selectedTextId === null
    ) {
      return;
    }

    setTextLayers(
      (previous) =>
        previous.filter(
          (layer) =>
            layer.id !==
            selectedTextId
        )
    );

    setSelectedTextId(null);
    setSelectedWordRange(null);
    setNewText('');
  };

  const updateTextValue = (
    value: string
  ) => {
    if (
      selectedTextId !== null
    ) {
      setTextLayers(
        (previous) =>
          previous.map(
            (layer) => {
              if (
                layer.id !== selectedTextId
              ) {
                return layer;
              }

              const validRanges =
                layer.highlightedWords
                  .filter(
                    (range) =>
                      range.start <
                      value.length
                  )
                  .map(
                    (range) => ({
                      ...range,
                      end: Math.min(
                        range.end,
                        value.length
                      ),
                    })
                  );

              return {
                ...layer,
                text: value,
                highlightedWords:
                  validRanges,
              };
            }
          )
      );

      return;
    }

    setNewText(value);
  };

  const handleTextareaSelect = () => {
    if (
      selectedTextId === null ||
      !textareaRef.current
    ) {
      return;
    }

    const start =
      textareaRef.current.selectionStart;

    const end =
      textareaRef.current.selectionEnd;

    if (start === end) {
      setSelectedWordRange(null);
      return;
    }

    setSelectedWordRange({
      layerId:
        selectedTextId,
      start,
      end,
    });
  };

  const applyWordColor = () => {
    if (
      !selectedWordRange ||
      selectedTextId === null
    ) {
      return;
    }

    const {
  layerId,
  start,
  end,
} = selectedWordRange;

    if (start === end) return;

    setTextLayers(
      (previous) =>
        previous.map(
          (layer) => {
            if (layer.id !== layerId) {
  return layer;
}

            const nextRanges = [
              ...layer.highlightedWords,
            ];

            const overlapping =
              nextRanges.filter(
                (range) =>
                  !(
                    range.end <=
                      start ||
                    range.start >=
                      end
                  )
              );

            const remaining =
              nextRanges.filter(
                (range) =>
                  range.end <=
                    start ||
                  range.start >=
                    end
              );

            for (
              const range of overlapping
            ) {
              if (
                range.start <
                start
              ) {
                remaining.push({
                  start:
                    range.start,
                  end: start,
                  color:
                    range.color,
                });
              }

              if (
                range.end > end
              ) {
                remaining.push({
                  start: end,
                  end:
                    range.end,
                  color:
                    range.color,
                });
              }
            }

            remaining.push({
              start,
              end,
              color: wordColor,
            });

            remaining.sort(
              (a, b) =>
                a.start -
                b.start
            );

            return {
              ...layer,
              highlightedWords:
                remaining,
            };
          }
        )
    );

    setSelectedWordRange(null);
  };

  const clearWordColor = () => {
    if (
      selectedTextId === null
    ) {
      return;
    }

    setTextLayers(
      (previous) =>
        previous.map(
          (layer) =>
            layer.id ===
            selectedTextId
              ? {
                  ...layer,
                  highlightedWords:
                    [],
                }
              : layer
        )
    );

    setSelectedWordRange(null);
  };

  const beginPhotoDrag = (
    event: ReactPointerEvent<HTMLImageElement>,
    layer: PhotoLayer
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    const previousTap = photoTapRef.current;
    const isDoubleTap = Boolean(
      previousTap &&
      previousTap.photoId === layer.id &&
      now - previousTap.time <= 450 &&
      Math.hypot(
        event.clientX - previousTap.x,
        event.clientY - previousTap.y
      ) <= 32
    );

    if (isDoubleTap) {
      photoTapRef.current = null;
      setActiveTool('edit');
    } else {
      photoTapRef.current = {
        photoId: layer.id,
        time: now,
        x: event.clientX,
        y: event.clientY,
      };
    }

    if (!canvasAreaRef.current) {
      return;
    }

    try {
      canvasAreaRef.current.setPointerCapture(
        event.pointerId
      );
    } catch {
      // Ignore pointer capture errors.
    }

    if (selectedPhotoId === layer.id) {
      setShowPhotoSelection((visible) => !visible);
    } else {
      setSelectedPhotoId(layer.id);
      setShowPhotoSelection(true);
    }
    setShowCornerRoundingControl(true);
    setDragging({
      type: 'photo',
      id: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: layer.transform.x,
      originalY: layer.transform.y,
    });
  };

  const beginPhotoResize = (
    event: ReactPointerEvent<HTMLButtonElement>,
    layer: PhotoLayer
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canvasAreaRef.current) return;

    try {
      canvasAreaRef.current.setPointerCapture(event.pointerId);
    } catch {
      // Ignore pointer capture errors.
    }

    setSelectedPhotoId(layer.id);
    setDragging({
      type: 'resize',
      id: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: layer.transform.x,
      originalY: layer.transform.y,
      originalWidth: layer.transform.width,
    });
  };

 const beginTextDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
     layer: TextLayer
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedTextId(
      layer.id
    );
    const getTextPointerDistance = () => {
  const points = Array.from(
    textPointersRef.current.values()
  );

  if (points.length < 2) return 0;

  const [a, b] = points;

  return Math.hypot(
    b.x - a.x,
    b.y - a.y
  );
};

const handleTextPointerDown = (
  event: React.PointerEvent<HTMLDivElement>,
  layer: TextLayer
) => {
  event.preventDefault();
  event.stopPropagation();

  setSelectedTextId(layer.id);

  textPointersRef.current.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
  });

  if (textPointersRef.current.size === 2) {
    const distance = getTextPointerDistance();

    textPinchRef.current = {
      active: true,
      startDistance: distance,
      startFontSize: layer.fontSize,
    };

    return;
  }

  beginTextDrag(event, layer);
};

const handleTextPointerMove = (
  event: React.PointerEvent<HTMLDivElement>,
  layer: TextLayer
) => {
  if (!textPointersRef.current.has(event.pointerId)) {
    return;
  }

  textPointersRef.current.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
  });

  if (
    textPinchRef.current.active &&
    textPointersRef.current.size >= 2
  ) {
    const currentDistance =
      getTextPointerDistance();

    const {
      startDistance,
      startFontSize,
    } = textPinchRef.current;

    if (startDistance <= 0) return;

    const scale =
      currentDistance / startDistance;

    const newFontSize = Math.min(
      160,
      Math.max(
        12,
        startFontSize * scale
      )
    );

    updateSelectedText({
      fontSize: Math.round(newFontSize),
    });
  }
};

const handleTextPointerUp = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  textPointersRef.current.delete(
    event.pointerId
  );

  if (textPointersRef.current.size < 2) {
    textPinchRef.current.active = false;
  }
};


  const beginTextEdit = (
  event: React.MouseEvent<HTMLDivElement>,
  layer: TextLayer
) => {
  event.preventDefault();
  event.stopPropagation();

  setSelectedTextId(layer.id);
  setEditingTextId(layer.id);

  setNewText(layer.text);
};

    setNewText(layer.text);
    setTextColor(layer.color);
    setTextSize(layer.fontSize);
    setTextBold(layer.bold);
    setTextItalic(
      layer.italic
    );
    setTextUnderline(
      layer.underline
    );
    setTextAlign(layer.align);
    setTextOpacity(
      layer.opacity
    );
    setFontFamily(
      layer.fontFamily
    );

    setActiveTool('text');

    if (!canvasAreaRef.current) {
      return;
    }

    try {
      canvasAreaRef.current.setPointerCapture(
        event.pointerId
      );
    } catch {
      // Ignore pointer capture errors.
    }

    setDragging({
      type: 'text',
      id: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: layer.x,
      originalY: layer.y,
    });
  };

  const rotatePhoto = (
    amount: number
  ) => {
    setPhotoTransform(
      (previous) => ({
        ...previous,
        rotation:
          previous.rotation +
          amount,
      })
    );
  };

  const removePhoto = () => {
    revokeIfBlob(photo);
    if (selectedPhotoId !== null) {
      setPhotoLayers((previous) =>
        previous.filter((layer) => layer.id !== selectedPhotoId)
      );
      const nextLayer = photoLayers.find(
        (layer) => layer.id !== selectedPhotoId
      );
      setSelectedPhotoId(nextLayer?.id ?? null);
      setShowPhotoSelection(true);
    }

    setIsCropping(false);
    setActiveTool(photoLayers.length > 1 ? 'edit' : null);
  };

  const resetEdits = () => {
    setAdjustments(
      DEFAULT_ADJUSTMENTS
    );

    setFilterPreset(
      'original'
    );

    if (selectedPhotoId !== null) {
      updatePhotoLayer(selectedPhotoId, (layer) => ({
        ...layer,
        cornerRoundness: 0,
        edgeFeather: 0,
      }));
    }

    setPhotoTransform({
      ...DEFAULT_PHOTO_TRANSFORM,
    });

    setExportMessage(
      'Photo adjustments reset.'
    );
  };

  const resetAll = () => {
    revokeIfBlob(background);
    photoLayers.forEach((layer) => revokeIfBlob(layer.src));

    setBackground(null);
    setPhotoLayers([]);
    setSelectedPhotoId(null);
    setShowCornerRoundingControl(false);

    setBackgroundColor(
      '#ffffff'
    );

    setTextLayers([]);
    setSelectedTextId(null);
    setSelectedWordRange(null);

    setNewText('');

    setAdjustments(
      DEFAULT_ADJUSTMENTS
    );

    setFilterPreset(
      'original'
    );

    setCanvasSize(
      SIZE_PRESETS[4]
    );

    setCropRect({
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    });

    setIsCropping(false);

    setActiveTool(null);

    setDownloadComplete(false);
    setExportMessage('');
  };

  const drawBackgroundCover = (
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    width: number,
    height: number
  ) => {
    const imageRatio =
      image.naturalWidth /
      image.naturalHeight;

    const canvasRatio =
      width / height;

    let drawWidth = width;
    let drawHeight = height;
    let drawX = 0;
    let drawY = 0;

    if (
      imageRatio >
      canvasRatio
    ) {
      drawHeight = height;

      drawWidth =
        drawHeight *
        imageRatio;

      drawX =
        (width -
          drawWidth) /
        2;
    } else {
      drawWidth = width;

      drawHeight =
        drawWidth /
        imageRatio;

      drawY =
        (height -
          drawHeight) /
        2;
    }

    context.drawImage(
      image,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );
  };

  const drawPhoto = (
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    width: number,
    height: number,
    layer: PhotoLayer
  ) => {
    const photoWidth =
      width *
      (layer.transform.width /
        100);

    const photoRatio =
      image.naturalWidth /
      image.naturalHeight;

    const photoHeight =
      photoWidth /
      photoRatio;

    const centerX =
      width *
      (layer.transform.x /
        100);

    const centerY =
      height *
      (layer.transform.y /
        100);

    context.save();
    context.translate(
      centerX,
      centerY
    );

    context.rotate(
      (layer.transform.rotation *
        Math.PI) /
        180
    );

    const cornerRadius =
      (Math.min(photoWidth, photoHeight) *
        clamp(layer.cornerRoundness, 0, 100)) /
      200;
    if (cornerRadius > 0) {
      const left = -photoWidth / 2;
      const top = -photoHeight / 2;
      const right = photoWidth / 2;
      const bottom = photoHeight / 2;
      context.beginPath();
      context.moveTo(left + cornerRadius, top);
      context.lineTo(right - cornerRadius, top);
      context.arcTo(right, top, right, top + cornerRadius, cornerRadius);
      context.lineTo(right, bottom - cornerRadius);
      context.arcTo(right, bottom, right - cornerRadius, bottom, cornerRadius);
      context.lineTo(left + cornerRadius, bottom);
      context.arcTo(left, bottom, left, bottom - cornerRadius, cornerRadius);
      context.lineTo(left, top + cornerRadius);
      context.arcTo(left, top, left + cornerRadius, top, cornerRadius);
      context.closePath();
      context.clip();
    }

    if (layer.edgeFeather === 0) {
      context.filter = getFilterString(layer);
      context.drawImage(
        image,
        -photoWidth / 2,
        -photoHeight / 2,
        photoWidth,
        photoHeight
      );
    } else {
      const featherCanvas = document.createElement('canvas');
      featherCanvas.width = Math.max(1, Math.ceil(photoWidth));
      featherCanvas.height = Math.max(1, Math.ceil(photoHeight));
      const featherContext = featherCanvas.getContext('2d');
      if (!featherContext) {
        context.restore();
        throw new Error('Unable to apply edge feather to photo.');
      }

      featherContext.filter = getFilterString(layer);
      featherContext.drawImage(
        image,
        0,
        0,
        featherCanvas.width,
        featherCanvas.height
      );
      const imageData = featherContext.getImageData(
        0,
        0,
        featherCanvas.width,
        featherCanvas.height
      );
      const pixels = imageData.data;
      const featherPixels =
        (Math.min(featherCanvas.width, featherCanvas.height) *
          0.2 *
          clamp(layer.edgeFeather, 0, 100)) /
        100;

      for (let y = 0; y < featherCanvas.height; y += 1) {
        for (let x = 0; x < featherCanvas.width; x += 1) {
          const distanceToEdge = Math.min(
            x,
            y,
            featherCanvas.width - 1 - x,
            featherCanvas.height - 1 - y
          );
          const alpha = Math.min(1, distanceToEdge / featherPixels);
          const alphaIndex = (y * featherCanvas.width + x) * 4 + 3;
          pixels[alphaIndex] *= alpha;
        }
      }

      featherContext.putImageData(imageData, 0, 0);
      context.filter = 'none';
      context.drawImage(
        featherCanvas,
        -photoWidth / 2,
        -photoHeight / 2,
        photoWidth,
        photoHeight
      );
    }

    context.restore();
  };

  const drawTextLayer = (
    context: CanvasRenderingContext2D,
    layer: TextLayer,
    width: number,
    height: number,
    domRuns?: {
      text: string;
      x: number;
      y: number;
      color: string;
      font: string;
      fontSize: number;
      opacity: number;
      underline: boolean;
    }[]
  ) => {
    if (domRuns?.length) {
      context.save();
      context.textBaseline = 'middle';

      domRuns.forEach((run) => {
        context.font = run.font;
        context.globalAlpha = run.opacity;
        context.fillStyle = run.color;
        context.fillText(run.text, run.x, run.y);

        if (run.underline) {
          context.beginPath();
          context.lineWidth = Math.max(1, run.fontSize / 15);
          context.moveTo(run.x, run.y + run.fontSize * 0.42);
          context.lineTo(
            run.x + context.measureText(run.text).width,
            run.y + run.fontSize * 0.42
          );
          context.strokeStyle = run.color;
          context.stroke();
        }
      });

      context.restore();
      return;
    }

    const centerX =
      width *
      (layer.x / 100);

    const centerY =
      height *
      (layer.y / 100);

    const fontSize =
      layer.fontSize *
      (width / TEXT_REFERENCE_WIDTH);

    const lineHeight =
      fontSize * 1.25;

    context.save();

    context.font = `${
      layer.italic
        ? 'italic '
        : ''
    }${
      layer.bold
        ? '700'
        : '400'
    } ${fontSize}px "${
      layer.fontFamily
    }"`;

    context.textBaseline =
      'middle';

    context.globalAlpha =
      layer.opacity;

    const lineData: {
      line: string;
      width: number;
      start: number;
      end: number;
    }[] = [];
    const maxLineWidth = width * 0.9;
    let textOffset = 0;

    layer.text.split('\n').forEach((paragraph) => {
      if (!paragraph) {
        lineData.push({
          line: '',
          width: 0,
          start: textOffset,
          end: textOffset,
        });
        textOffset += 1;
        return;
      }

      const words = /\S+\s*/g;
      let currentLine = '';
      let currentStart = textOffset;
      let word: RegExpExecArray | null;

      while ((word = words.exec(paragraph)) !== null) {
        const nextLine = currentLine + word[0];

        if (
          currentLine &&
          context.measureText(nextLine).width > maxLineWidth
        ) {
          const visibleLine = currentLine.trimEnd();
          lineData.push({
            line: visibleLine,
            width: context.measureText(visibleLine).width,
            start: currentStart,
            end: currentStart + visibleLine.length,
          });
          currentStart = textOffset + word.index;
          currentLine = word[0].trimStart();
        } else {
          currentLine = nextLine;
        }

        while (
          currentLine.length > 0 &&
          context.measureText(currentLine).width > maxLineWidth
        ) {
          let splitAt = currentLine.length - 1;
          while (
            splitAt > 1 &&
            context.measureText(currentLine.slice(0, splitAt)).width >
              maxLineWidth
          ) {
            splitAt -= 1;
          }
          const visibleLine = currentLine.slice(0, splitAt);
          lineData.push({
            line: visibleLine,
            width: context.measureText(visibleLine).width,
            start: currentStart,
            end: currentStart + visibleLine.length,
          });
          currentStart += splitAt;
          currentLine = currentLine.slice(splitAt);
        }
      }

      if (currentLine) {
        const visibleLine = currentLine.trimEnd();
        lineData.push({
          line: visibleLine,
          width: context.measureText(visibleLine).width,
          start: currentStart,
          end: currentStart + visibleLine.length,
        });
      }

      textOffset += paragraph.length + 1;
    });

    const totalHeight =
      lineData.length *
      lineHeight;

    const startY =
      centerY -
      totalHeight / 2 +
      lineHeight / 2;

    const blockWidth = Math.max(
      0,
      ...lineData.map(({ width: lineWidth }) => lineWidth)
    );
    const colorRanges = [
      ...(layer.colorRanges ?? []),
      ...layer.highlightedWords,
    ];

    lineData.forEach(
      (
        {
          line,
          start: lineStart,
        },
        lineIndex
      ) => {
        const drawY =
          startY +
          lineIndex *
            lineHeight;

        const segments: {
          text: string;
          color: string;
          start: number;
          end: number;
        }[] = [];

        const lineEnd =
          lineStart + line.length;

        const boundaries =
          new Set<number>();

        boundaries.add(0);
        boundaries.add(
          line.length
        );

        colorRanges.forEach(
          (range) => {
            if (
              range.end <=
                lineStart ||
              range.start >=
                lineEnd
            ) {
              return;
            }

            boundaries.add(
              Math.max(
                0,
                range.start -
                  lineStart
              )
            );

            boundaries.add(
              Math.min(
                line.length,
                range.end -
                  lineStart
              )
            );
          }
        );

        const sortedBoundaries =
          Array.from(
            boundaries
          ).sort(
            (a, b) =>
              a - b
          );

        for (
          let i = 0;
          i <
          sortedBoundaries.length -
            1;
          i++
        ) {
          const localStart =
            sortedBoundaries[i];

          const localEnd =
            sortedBoundaries[
              i + 1
            ];

          if (
            localStart ===
            localEnd
          ) {
            continue;
          }

          const absoluteStart =
            lineStart +
            localStart;

          const absoluteEnd =
            lineStart +
            localEnd;

          const matchingRange =
            colorRanges.find(
              (range) =>
                absoluteStart >=
                  range.start &&
                absoluteEnd <=
                  range.end
            );

          segments.push({
            text: line.slice(
              localStart,
              localEnd
            ),
            color:
              matchingRange?.color ??
              layer.color,
            start:
              localStart,
            end:
              localEnd,
          });
        }

        const fullWidth =
          segments.reduce(
            (
              total,
              segment
            ) =>
              total +
              context.measureText(
                segment.text
              ).width,
            0
          );

        let cursorX = centerX - fullWidth / 2;

        if (layer.align === 'left') {
          cursorX = centerX - blockWidth / 2;
        } else if (layer.align === 'right') {
          cursorX = centerX + blockWidth / 2 - fullWidth;
        }

        segments.forEach(
          (segment) => {
            const segmentWidth =
              context.measureText(
                segment.text
              ).width;

            context.fillStyle =
              segment.color;

            context.fillText(
              segment.text,
              cursorX,
              drawY
            );

            if (
              layer.underline
            ) {
              context.beginPath();

              context.lineWidth =
                Math.max(
                  1,
                  fontSize / 15
                );

              context.moveTo(
                cursorX,
                drawY +
                  fontSize *
                    0.42
              );

              context.lineTo(
                cursorX +
                  segmentWidth,
                drawY +
                  fontSize *
                    0.42
              );

              context.strokeStyle =
                segment.color;

              context.stroke();
            }

            cursorX +=
              segmentWidth;
          }
        );

      }
    );

    context.restore();
  };

  const createExportCanvas =
    async () => {
      const outputCanvas =
        document.createElement(
          'canvas'
        );

      outputCanvas.width =
        canvasSize.width;

      outputCanvas.height =
        canvasSize.height;

      const context =
        outputCanvas.getContext(
          '2d'
        );

      if (!context) {
        throw new Error(
          'Canvas context unavailable'
        );
      }

      const board = canvasAreaRef.current;
      const boardRect = board?.getBoundingClientRect();
      const textLayouts = new Map<
        number,
        NonNullable<Parameters<typeof drawTextLayer>[4]>
      >();

      if (board && boardRect && boardRect.width > 0 && boardRect.height > 0) {
        const scaleX = outputCanvas.width / boardRect.width;
        const scaleY = outputCanvas.height / boardRect.height;

        textLayers.forEach((layer) => {
          const layerElement = board.querySelector<HTMLElement>(
            `[data-text-layer-id="${layer.id}"]`
          );
          if (!layerElement) return;

          const layerStyle = window.getComputedStyle(layerElement);
          const fontSize = parseFloat(layerStyle.fontSize) * scaleX;
          const font = [
            layerStyle.fontStyle,
            layerStyle.fontVariant,
            layerStyle.fontWeight,
            `${fontSize}px`,
            layerStyle.fontFamily,
          ].join(' ');
          const opacity = parseFloat(layerStyle.opacity);
          const underline =
            layerStyle.textDecorationLine.includes('underline');
          const runs: NonNullable<
            Parameters<typeof drawTextLayer>[4]
          > = [];
          const contentElements =
            layerElement.querySelectorAll<HTMLElement>('[data-text-content]');

          contentElements.forEach((contentElement) => {
            const walker = document.createTreeWalker(
              contentElement,
              NodeFilter.SHOW_TEXT
            );
            const color = window.getComputedStyle(contentElement).color;
            let node = walker.nextNode();

            while (node) {
              const textNode = node as Text;
              const text = textNode.textContent ?? '';
              const range = document.createRange();
              let offset = 0;
              let currentRun: {
                text: string;
                top: number;
                x: number;
                height: number;
              } | null = null;

              for (const character of Array.from(text)) {
                const characterLength = character.length;
                range.setStart(textNode, offset);
                range.setEnd(textNode, offset + characterLength);
                const rect = range.getBoundingClientRect();
                offset += characterLength;

                if (!rect.height) continue;

                const lineTop = Math.round(rect.top * 2) / 2;
                if (currentRun && currentRun.top === lineTop) {
                  currentRun.text += character;
                } else {
                  if (currentRun) {
                    runs.push({
                      text: currentRun.text,
                      x: (currentRun.x - boardRect.left) * scaleX,
                      y:
                        (currentRun.top +
                          currentRun.height / 2 -
                          boardRect.top) *
                        scaleY,
                      color,
                      font,
                      fontSize,
                      opacity,
                      underline,
                    });
                  }

                  currentRun = {
                    text: character,
                    top: lineTop,
                    x: rect.left,
                    height: rect.height,
                  };
                }
              }

              if (currentRun) {
                runs.push({
                  text: currentRun.text,
                  x: (currentRun.x - boardRect.left) * scaleX,
                  y:
                    (currentRun.top +
                      currentRun.height / 2 -
                      boardRect.top) *
                    scaleY,
                  color,
                  font,
                  fontSize,
                  opacity,
                  underline,
                });
              }

              node = walker.nextNode();
            }
          });

          if (runs.length) {
            textLayouts.set(layer.id, runs);
          }
        });
      }

      context.imageSmoothingEnabled =
        true;

      context.imageSmoothingQuality =
        'high';

      context.fillStyle =
        backgroundColor;

      context.fillRect(
        0,
        0,
        outputCanvas.width,
        outputCanvas.height
      );

      if (background) {
        try {
          const backgroundImage =
            await loadImage(
              background
            );

          drawBackgroundCover(
            context,
            backgroundImage,
            outputCanvas.width,
            outputCanvas.height
          );
        } catch {
          // Keep background color.
        }
      }

      for (const layer of photoLayers) {
        const photoImage = await loadImage(layer.src);
        drawPhoto(
          context,
          photoImage,
          outputCanvas.width,
          outputCanvas.height,
          layer
        );
      }

      textLayers.forEach(
        (layer) => {
          drawTextLayer(
            context,
            layer,
            outputCanvas.width,
            outputCanvas.height,
            textLayouts.get(layer.id)
          );
        }
      );

      return outputCanvas;
    };

  const canvasToBlob = (
    canvas: HTMLCanvasElement
  ): Promise<Blob> =>
    new Promise(
      (resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(
                new Error(
                  'Unable to create PNG'
                )
              );
            }
          },
          'image/png',
          1
        );
      }
    );

  const saveBlobToBrowser = (
    blob: Blob
  ) => {
    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement(
        'a'
      );

    anchor.href = url;

    anchor.download =
      `photo-equality-${Date.now()}.png`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(
        url
      );
    }, 1500);
  };

  const saveBlobToDevice =
    async (
      blob: Blob
    ) => {
      const reader =
        new FileReader();

      const base64 =
        await new Promise<string>(
          (
            resolve,
            reject
          ) => {
            reader.onload =
              () => {
                const result =
                  String(
                    reader.result ??
                      ''
                  );

                const rawBase64 =
                  result.includes(
                    ','
                  )
                    ? result.split(
                        ','
                      )[1]
                    : result;

                resolve(
                  rawBase64
                );
              };

            reader.onerror =
              () =>
                reject(
                  new Error(
                    'File conversion failed'
                  )
                );

            reader.readAsDataURL(
              blob
            );
          }
        );

      const bridge =
        window.AndroidDownloadBridge;

      if (
        bridge?.saveBase64ImageToDownloads
      ) {
        const result =
          bridge.saveBase64ImageToDownloads(
            base64,
            `photo-equality-${Date.now()}.png`
          );

        if (
          result === false
        ) {
          throw new Error(
            'Android save failed'
          );
        }

        return;
      }

      saveBlobToBrowser(blob);
    };

  const downloadImage =
    async () => {
      if (isDownloading) return;

      if (
        !hasImage &&
        textLayers.length === 0
      ) {
        setExportMessage(
          'Add a photo or text first.'
        );

        return;
      }

      setIsDownloading(true);
      setDownloadComplete(false);

      try {
        setExportMessage(
          'Preparing HD PNG...'
        );

        const canvas =
          await createExportCanvas();

        const blob =
          await canvasToBlob(
            canvas
          );

        await saveBlobToDevice(
          blob
        );

        setDownloadComplete(
          true
        );

        setExportMessage(
          'PNG saved successfully.'
        );

        window.setTimeout(
          () => {
            setDownloadComplete(
              false
            );
          },
          2500
        );
      } catch (error) {
        console.error('Image download failed:', error);
        setExportMessage(
          'Download failed. Please try again.'
        );
      } finally {
        setIsDownloading(false);
      }
    };

  const handleDone = () => {
    setActiveTool(null);

    setExportMessage(
      'Editing completed.'
    );
  };

  const updateAdjustment = (
    key: keyof Adjustments,
    value: number
  ) => {
    setAdjustments(
      (previous) => ({
        ...previous,
        [key]: value,
      })
    );
  };

  const selectTool = (
    tool: Exclude<Tool, null>
  ) => {
    if (tool === 'photo') {
      photoInputRef.current?.click();
      return;
    }

    if (tool === 'text') {
      setSelectedTextId(null);
      setEditingTextId(null);
      setNewText('');
      setTextColor(
        '#f00000'
      );
      setTextSize(
        DEFAULT_TEXT_SIZE
      );
      setTextBold(false);
      setTextItalic(false);
      setTextUnderline(false);
      setTextAlign('center');
      setTextOpacity(1);
      setFontFamily('Arial');
      setSelectedWordRange(
        null
      );

      setActiveTool('text');
      return;
    }

    setActiveTool(
      activeTool === tool
        ? null
        : tool
    );
  };

  const panelButtonClass =
    'flex min-h-[42px] items-center justify-center rounded-lg border border-white/10 bg-[#2b3238] px-3 text-xs font-semibold text-white transition active:scale-[0.98] hover:bg-[#343c43]';

  const footerButtonClass =
    'flex min-w-[68px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition';

  /*
   * All panels use this fixed overlay.
   * They no longer push the editor/export area.
   */
  const overlayPanelClass =
   'fixed left-2 right-2 bottom-[87px] z-[9999] mx-auto w-auto max-w-[760px] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-[#20242c] p-3 shadow-2xl';
  /*
   * Compact action bar stays above footer.
   * It remains visible even while a popup is open.
   */
  const exportActionClass =
    'fixed bottom-[70px] left-2 right-2 z-[220] mx-auto flex w-auto max-w-[760px] items-center gap-1.5 rounded-xl border border-white/10 bg-[#20242c]/95 p-1.5 shadow-xl backdrop-blur';

  if (
    isCropping &&
    photo
  ) {
    const maxStageWidth = Math.max(
      1,
      Math.min(760, window.innerWidth - 48)
    );
    const maxStageHeight = Math.max(
      1,
      window.innerHeight - 176
    );
    const cropScale = Math.min(
      maxStageWidth / photoNaturalSize.width,
      maxStageHeight / photoNaturalSize.height
    );
    const cropStageStyle:
      CSSProperties = {
        aspectRatio: `${photoNaturalSize.width}/${photoNaturalSize.height}`,
        width: `${Math.round(photoNaturalSize.width * cropScale)}px`,
        height: `${Math.round(photoNaturalSize.height * cropScale)}px`,
        maxWidth: '100%',
        maxHeight: '100%',
        touchAction: 'none',
      };

    return (
      <div className="fixed inset-0 z-[999] flex min-h-dvh flex-col bg-[#161a1f] text-white">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/15 bg-[#20242c] px-3 sm:px-5">
          <div>
            <h1 className="text-sm font-bold">
              Crop Photo
            </h1>

            <p className="text-[10px] text-white/50">
              Drag the crop area or any edge to adjust the frame
            </p>
          </div>

          <button
            type="button"
            onClick={cancelCrop}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>
        </header>

        <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-5 sm:p-6">
          <div
            ref={canvasAreaRef}
            onPointerDown={beginCrop}
            onPointerMove={
              handlePointerMove
            }
            onPointerUp={
              handlePointerUp
            }
            onPointerCancel={
              handlePointerUp
            }
            className="relative max-w-full overflow-hidden rounded-x bg-black shadow-2xl"
            style={cropStageStyle}>
            <img
              src={photo}
              alt="Crop preview"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"/>

            <div className="pointer-events-none absolute inset-0 bg-black/35" />

            <div
              onPointerDown={(event) => event.stopPropagation()}
              className="absolute border-2 border-white bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.38)]"
              style={{
                left: `${cropRect.x}%`,
                top: `${cropRect.y}%`,
                width: `${cropRect.w}%`,
                height: `${cropRect.h}%`,
                touchAction:
                  'none',
              }}
              >
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-b border-white/30" />

                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-b border-white/30" />

                <div className="border-r border-white/30" />
                <div className="border-r border-white/30" />
                <div />
              </div>

              {              (
                [
  ['top-left', 'left-[-2px] top-[-2px] h-2 w-2 cursor-nwse-resize'],
  ['top', 'left-[-2px] right-[-2px] top-[-2px] h-1 cursor-ns-resize'],
  ['top-right', 'right-[-2px] top-[-2px] h-2 w-2 cursor-nesw-resize'],
  ['right', 'right-[-2px] top-[-2px] bottom-[-2px] w-1 cursor-ew-resize'],
  ['bottom-right', 'right-[-2px] bottom-[-2px] h-2 w-2 cursor-nwse-resize'],
  ['bottom', 'left-[-2px] right-[-2px] bottom-[-2px] h-1 cursor-ns-resize'],
  ['bottom-left', 'left-[-2px] bottom-[-2px] h-2 w-2 cursor-nesw-resize'],
  ['left', 'left-[-2px] top-[-2px] bottom-[-2px] w-1 cursor-ew-resize'],
  ] as const
              ).map(
                ([
                  edge,
                  position,
                ]) => (
                  <div
                    key={edge}
                    onPointerDown={(
                      event
                    ) => {
                      beginCropResize(
                        event,
                        edge
                      );
                    }}
                    className={`absolute ${position} touch-none rounded-sm border-2 border-white bg-[#ffffff] shadow-lg`}
                    style={{
                      touchAction:
                        'none',
                    }}
                  />
                )
              )}
            </div>
          </div>
        </main>

        <footer className="shrink-0 border-t border-white/10 bg-[#20242c] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-[760px] gap-2">
            <button
              type="button"
              onClick={
                cancelCrop
              }
              className="flex-1 rounded-xl border border-white/10 bg-[#2b3238] py-3 text-xs font-bold"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={
                applyCrop
              }
              className="flex-1 rounded-xl bg-[#f3ad61] py-3 text-xs font-bold text-black">
              Apply Crop
            </button>
          </div>
        </footer>
      </div>
    );
  }
                                  {/* HEADER */}
  return (
    <div
      onPointerDownCapture={(event) => {
        const target = event.target;
        if (
          target instanceof Element &&
          !target.closest('[data-corner-rounding-control]') &&
          !target.closest('[data-photo-layer]')
        ) {
          setShowCornerRoundingControl(false);
        }
      }}
      className="fixed inset-0 z-50 flex min-h-dvh flex-col overflow-hidden bg-[#161a1f] text-white"
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#20242c] px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f3ad61] text-sm font-black text-black">
            PE
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold sm:text-base">
              Mixer
            </h1>
             <p className="hidden text-[9px] text-white/40 sm:block">
              Photo Editing Studio
             </p>
          </div>
        </div>
         {/*<button type="button" onClick={
            handleDone
             }
            className="rounded-lg bg-[#737373] px-1 py-0.5 text-xs font-bold text-white transition hover:brightness-110"
            >
            Done
          </button>*/}
                                {/* COMPACT DOWNLOAD + RESET */}
        <div data-photo-editor-actions
               className="inline-flex w-fit gap-2">
          <button type="button"onClick={downloadImage}disabled={isDownloading}
            aria-busy={isDownloading}
            aria-label={isDownloading ? 'Preparing download' : 'Download image'}
            className={`flex h-8 w-23 items-center justify-center rounded-md px-2 text-[9px] font-black transition ${
            downloadComplete
            ? 'bg-emerald-500 text-black'
            : 'bg-[#f3ad61] text-black'
            }`}>

            {isDownloading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            ) : downloadComplete ? (
            '✓'
            ) : (
            'Download↓'
            )}
          </button>

          <button type="button"onClick={resetAll}
          className="flex h-7 w-13 items-center justify-center rounded-md border border-white/10 bg-[#2b3238] px-2 text-[9px] font-bold text-white">
          Reset
         </button>
       </div>
          
        
  </header>

      {/* MAIN */}
      <main className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex min-h-full w-full max-w-[1100px] flex-col px-2 pb-36 pt-1 sm:px-5 sm:pt-5">
          {/* CANVAS */}
          <div className="flex min-h-[300px] flex-1 items-center justify-center">
            <div
              ref={canvasAreaRef}
              data-photo-editor-board
              onClick={handleCanvasClick}
              onPointerMove={
                handlePointerMove
              }
              onPointerUp={
                handlePointerUp
              }
              onPointerCancel={
                handlePointerUp
              }
              className="relative w-full max-w-[760px] overflow-hidden rounded-sm border border-white/10 bg-white shadow-2xl"
              style={{
                aspectRatio:
                  currentAspectRatio,
                containerType: 'inline-size',
                backgroundColor,
                touchAction:
                  'none',
              }}
            >
              {background && (
                <img
                  src={background}
                  alt="Background"
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                />
              )}

              {!background &&
                !photo &&
                textLayers.length ===
                  0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-black/50">
                    <div className="text-4xl">
                      +
                    </div>

                    <p className="text-sm font-bold">
                      Add a photo to start
                    </p>

                    <p className="text-xs">
                      Photo → Crop → Edit
                    </p>
                  </div>
                )}

              {photoLayers.map((layer, index) => {
                const selected = selectedPhotoId === layer.id;
                const cornerRoundness = clamp(layer.cornerRoundness, 0, 100);
                const minimumImageSide = Math.min(
                  layer.naturalWidth,
                  layer.naturalHeight
                );
                const cornerRadiusXPercent =
                  (50 * cornerRoundness * minimumImageSide) /
                  (100 * layer.naturalWidth);
                const cornerRadiusYPercent =
                  (50 * cornerRoundness * minimumImageSide) /
                  (100 * layer.naturalHeight);
                const featherEdgePercentX =
                  (minimumImageSide *
                    0.2 *
                    (layer.edgeFeather / 100) *
                    100) /
                  layer.naturalWidth;
                const featherEdgePercentY =
                  (minimumImageSide *
                    0.2 *
                    (layer.edgeFeather / 100) *
                    100) /
                  layer.naturalHeight;
                const featherMask =
                  layer.edgeFeather > 0
                    ? `linear-gradient(to right, transparent 0%, black ${featherEdgePercentX}%, black ${100 - featherEdgePercentX}%, transparent 100%), linear-gradient(to bottom, transparent 0%, black ${featherEdgePercentY}%, black ${100 - featherEdgePercentY}%, transparent 100%)`
                    : undefined;
                return (
                  <div
                    key={layer.id}
                    data-photo-layer
                    className="absolute"
                    style={{
                      left: `${layer.transform.x}%`,
                      top: `${layer.transform.y}%`,
                      width: `${layer.transform.width}%`,
                      transform: `translate(-50%, -50%) rotate(${layer.transform.rotation}deg)`,
                      transformOrigin: 'center center',
                      zIndex: selected ? 20 : 10 + index,
                    }}
                  >
                    <img
                      src={layer.src}
                      alt={`Photo layer ${index + 1}`}
                      draggable={false}
                      onPointerDown={(event) => beginPhotoDrag(event, layer)}
                      onDoubleClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedPhotoId(layer.id);
                        setShowPhotoSelection(true);
                        setActiveTool('edit');
                      }}
                      style={{
                        width: '100%',
                        height: 'auto',
                        filter: getFilterString(layer),
                        borderRadius: `${cornerRadiusXPercent}% / ${cornerRadiusYPercent}%`,
                        maskImage: featherMask,
                        maskComposite: 'intersect',
                        WebkitMaskImage: featherMask,
                        WebkitMaskComposite: 'source-in',
                        touchAction: 'none',
                      }}
                      className="block cursor-move select-none rounded-0"
                    />

                    {selected && showPhotoSelection && !isCropping && (
                      <>
                        <div className="pointer-events-none absolute inset-0 rounded-0 border-2 border-double border-[#dc2626]" />
                        <button
                          type="button"
                          onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
                          onClick={removePhoto}
                          className="absolute -left-3 -top-3 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-lg font-bold leading-none text-white shadow-lg"
                          aria-label="Remove selected photo"
                        >
                          ×
                        </button>
                        <button
                          type="button"
                          onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
                          onClick={() => rotatePhoto(90)}
                          className="absolute -right-3 -top-3 z-30 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#d1d5db] bg-[#b0b0b0] text-xs font-black text-white shadow"
                          aria-label="Rotate selected photo"
                        >
                          ↻
                        </button>

                        <button
                          type="button"onPointerDown={(event) => beginPhotoResize(event, layer)}
                          className="absolute -bottom-3 -right-3 z-30 flex h-5.5 w-5.5  touch-none items-center justify-center rounded-sm border-2 border-[#6b7280] bg-[#b0b0b0] text-xs font-bold leading-none text-black shadow"
                          style={{ touchAction: 'none' }}
                          aria-label="Resize selected photo"
                          >
                          ↔
                       </button>
                      </>
                    )}
                  </div>
                );
              })}

              {selectedPhoto &&
                showCornerRoundingControl &&
                !isCropping && (
                  <section
                    data-corner-rounding-control
                    onPointerDown={(event) => event.stopPropagation()}
                    className="fixed bottom-[88px] left-2 right-2 z-[60] mx-auto w-80 max-w-[420px] rounded-xl border border-white/15 bg-[#20242c]/95 p-2 shadow-xl backdrop-blur">
                    <div className="mb-1 flex items-center justify-between">
                      <h2 className="text-[11px] font-bold">Rounded & Feather</h2>
                      <button
                        type="button"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={() => setShowCornerRoundingControl(false)}
                        aria-label="Close rounded corners control"
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-sm leading-none text-white/80 hover:bg-white/20"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mb-1 flex items-center justify-between">
                      <label
                        htmlFor="corner-roundness-slider"
                        className="text-[10px] font-semibold text-white/70"
                      >
                        Corner roundness
                      </label>
                      <span className="text-[10px] text-white/60">
                        {selectedPhoto.cornerRoundness}
                      </span>
                    </div>
                    <input
                      id="corner-roundness-slider"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={selectedPhoto.cornerRoundness}
                      onChange={(event) => {
                        const cornerRoundness = clamp(
                          Number(event.target.value),
                          0,
                          100
                        );
                        updatePhotoLayer(selectedPhoto.id, (layer) => ({
                          ...layer,
                          cornerRoundness,
                        }));
                      }}
                      aria-label="Corner roundness"
                      className="w-full accent-[#f3ad61]"/>
                    <div className="mb-0 mt-1 flex items-center justify-between">
                      <label
                        htmlFor="edge-feather-slider"
                        className="text-[10px] font-semibold text-white/70"
                      >
                        Edge Feather
                      </label>
                      <span className="text-[10px] text-white/60">
                        {selectedPhoto.edgeFeather}
                      </span>
                    </div>
                    <input
                      id="edge-feather-slider"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={selectedPhoto.edgeFeather}
                      onChange={(event) => {
                        const edgeFeather = clamp(
                          Number(event.target.value),
                          0,
                          100
                        );
                        updatePhotoLayer(selectedPhoto.id, (layer) => ({
                          ...layer,
                          edgeFeather,
                        }));
                      }}
                      aria-label="Edge Feather"
                      className="w-full accent-[#f3ad61]"
                    />
                  </section>
                )}

              {alignedTextGuideX !== null && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 z-[25] border-l border-dashed border-white/60 shadow-[0_0_2px_rgba(0,0,0,0.8)]"
                  style={{ left: `${alignedTextGuideX}%` }}
                />
              )}
 
                                       {/* T-all */}
 {textLayers.map((layer) => (
  <div
    key={layer.id}
    data-text-layer
    data-text-layer-id={layer.id}
    onPointerDown={(event) => handleTextPointerDown(event, layer)}
    onPointerMove={(event) => handleTextPointerMove(event, layer)}
    onPointerUp={(event) => handleTextPointerUp(event, layer)}
    onPointerCancel={(event) => handleTextPointerUp(event, layer)}

    onDoubleClick={() => {
      setSelectedTextId(layer.id);
      setShowTextSelection(true);

      setNewText(layer.text);

      setActiveTool('text');
    }}

    className={`absolute max-w-[90%] cursor-move select-none whitespace-pre-wrap break-words px-2 py-1 ${
      selectedTextId === layer.id && showTextSelection
        ? 'ring-2 ring-[#f3ad61] ring-offset-2 ring-offset-transparent'
        : ''
    }`}

    style={{
      left: `${layer.x}%`,
      top: `${layer.y}%`,
      width: 'max-content',
      maxWidth: '90%',

      transform:
        'translate(-50%, -50%)',

      fontFamily:
        layer.fontFamily,

      fontSize: `${(layer.fontSize / TEXT_REFERENCE_WIDTH) * 100}cqw`,

      fontWeight:
        layer.bold
          ? 700
          : 400,

      fontStyle:
        layer.italic
          ? 'italic'
          : 'normal',

      textDecoration:
        layer.underline
          ? 'underline'
          : 'none',

      textAlign:
        layer.align,

      opacity:
        layer.opacity,

      zIndex: 30,

      touchAction:
        'none',
    }}
  >
    {/*
     * ============================
     * COLORED TEXT RENDERING
     * ============================
     */}

    {(() => {
      const ranges =
        [...(layer.colorRanges ?? [])]
          .filter(
            (range) =>
              range.start >= 0 &&
              range.end > range.start &&
              range.start < layer.text.length
          )
          .sort(
            (a, b) =>
              a.start - b.start
          );

      if (!ranges.length) {
        return (
          <span
            data-text-content
            style={{
              color: layer.color,
            }}
          >
            {layer.text}
          </span>
        );
      }

      const parts: React.ReactNode[] = [];

      let position = 0;

      ranges.forEach(
        (range, index) => {
          /*
           * Normal text before colored range
           */
          if (range.start > position) {
            parts.push(
              <span
                key={`normal-${index}`}
                data-text-content
                style={{
                  color: layer.color,
                }}
              >
                {layer.text.slice(
                  position,
                  range.start
                )}
              </span>
            );
          }

          /*
           * Colored text
           */
          const safeEnd = Math.min(
            range.end,
            layer.text.length
          );

          parts.push(
            <span
              key={`color-${index}`}
              data-text-content
              style={{
                color: range.color,
              }}
            >
              {layer.text.slice(
                range.start,
                safeEnd
              )}
            </span>
          );

          position = safeEnd;
        }
      );

      /*
       * Remaining normal text
       */
      if (position < layer.text.length) {
        parts.push(
          <span
            key="normal-last"
            data-text-content
            style={{
              color: layer.color,
            }}
          >
            {layer.text.slice(position)}
          </span>
        );
      }

      return parts;
    })()}

    {/* DELETE BUTTON */}
    {selectedTextId === layer.id && showTextSelection && (
      <>
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            updateSelectedText({
              fontSize: clamp(layer.fontSize + 4, 12, 160),
            });
          }}
          className="absolute -left-4 -top-4 flex h-5 w-5 items-center justify-center rounded-full bg-[#f3ad61] text-lg font-bold leading-none text-black shadow-lg"
          aria-label="Increase text size"
        >
          +
        </button>
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            updateSelectedText({
              fontSize: clamp(layer.fontSize - 4, 12, 160),
            });
          }}
          className="absolute -bottom-4 -left-4 flex h-5 w-5 items-center justify-center rounded-full bg-[#2b3238] text-lg font-bold leading-none text-white shadow-lg"
          aria-label="Decrease text size">
          −
        </button>
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            deleteSelectedText();
          }}
          className="absolute -right-4 -top-4 flex h-5 w-6 items-center justify-center rounded-full bg-red-500 text-sm font-black text-white shadow-lg"
          aria-label="Delete selected text"
        >
          ×
        </button>
      </>
    )}
  </div>
))}
                          {/*T-all end*/}
            </div>
          </div>

          {/* MESSAGE */}
          {exportMessage && (
            <div className="mx-auto mt-2 max-w-[760px] text-center text-[11px] font-semibold text-[#f3ad61]">
              {exportMessage}
            </div>
          )}
        </div>
      </main>

      {/* BACKGROUND OVERLAY */}
      {activeTool ===
        'background' && (
  <section data-photo-editor-panel className={overlayPanelClass}>
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">
                Background
              </h2>

              <p className="text-[10px] text-white/40">
                Image or solid color
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setActiveTool(
                  null
                )
              }
              className="text-lg text-white/50"
              >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
             <button type="button"onClick={() => backgroundInputRef.current?.click()}
              className={panelButtonClass}>
              Choose Image
             </button>

             <button
              type="button"
              onClick={() => {
                revokeIfBlob(
                  background
                );

                setBackground(
                  null
                );
              }}
              className="flex min-h-[42px] items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-1 text-xs font-semibold text-red-300">
              Remove Image
              </button>
            </div>

          <div className="mt-3">
            <p className="mb-0.5 text-[10px] font-semibold text-white/50">
              Background Color
            </p>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {BACKGROUND_COLORS.map(
                (color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setBackgroundColor(
                        color
                      );

                      revokeIfBlob(
                        background
                      );

                      setBackground(
                        null
                      );
                    }}
                    className={`h-9 w-9 shrink-0 rounded-full border-2 ${
                      backgroundColor ===
                      color
                        ? 'border-[#f3ad61]'
                        : 'border-white/20'
                    }`}
                    style={{
                      backgroundColor:
                        color,
                    }}
                  />
                )
              )}

              <label className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-white/10">
                <input
                  type="color"
                  value={
                    backgroundColor
                  }
                  onChange={(
                    event
                  ) =>
                    setBackgroundColor(
                      event.target.value
                    )
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0 opacity-0"
                />

                <span className="pointer-events-none text-sm">
                  RGB
                </span>
              </label>
            </div>
          </div>
        </section>
      )}

      {/* SIZE OVERLAY */}
      {activeTool ===
        'size' && (
        <section
          data-photo-editor-panel
          className={overlayPanelClass}>
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">
                 Choose output Ratio
              </h2>

              {/*<p className="text-[10px] text-white/40">
                Ratio
              </p>*/}
            </div>

            <button
              type="button"
              onClick={() =>
                setActiveTool(
                  null
                )
              }
              className="text-lg text-white/50">
              ×
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {SIZE_PRESETS.map(
              (preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setCanvasSize(
                      preset
                    );

                    setActiveTool(
                      null
                    );
                  }}
                  className={`rounded-lg border px-3 py-2 text-center ${
                    canvasSize.id ===
                    preset.id
                      ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
                      : 'border-white/10 bg-[#2b3238] text-white'
                  }`}
                >
                  <div className="text-sm font-bold">
                    {preset.label}
                  </div>

                  <div className="mt-0 text-[6px] opacity-60">
                    {preset.width} ×{' '}
                    {preset.height}
                  </div>
                </button>
              )
            )}
          </div>
        </section>
      )}

                         {/* TEXT OVERLAY */}


{activeTool === 'text' && (
  <section
    data-photo-editor-panel
    className={`${overlayPanelClass} w-[min(94vw,620px)] max-h-[52vh] overflow-y-auto p-2`}
    style={{
      bottom: '87px',
      maxHeight: '52vh',
    }}
  >
    {/* HEADER */}
    <div className="mb-0 flex items-center justify-between">
    {/*<div className="flex flex-row items-center gap-7">
    <h2 className="text-xs font-bold">
    {selectedText ? 'Edit Text' : 'Add Text'}
    </h2>

    <p className="text-[8px] text-white/60 whitespace-nowrap">
    Select any word or sentence to change its color
  </p>
</div>*/}

      
    </div>

    {/* TEXT */}
    <textarea
      ref={textareaRef}
      value={selectedTextValue}
      onChange={(e) => updateTextValue(e.target.value)}
      onSelect={(e) => {
        const start = e.currentTarget.selectionStart;
        const end = e.currentTarget.selectionEnd;

        if (start !== end) {
          setSelectedWordRange({
          layerId: selectedText?.id ?? 0,
          start,
          end,
         });
        } else {
          setSelectedWordRange(null);
        }
      }}
      rows={2}
      placeholder="Type your text..."
      className="w-full resize-none rounded-lg border border-white/10 bg-[#161a1f] px-2 py-1.5 text-xs text-white outline-none focus:border-[#f3ad61]"
    />

    {/* BASIC FORMAT */}
    <div className="mt-2 flex gap-1 overflow-x-auto scrollbar-hide">

      {/* BOLD */}
      <button
        type="button"
        onClick={() => {
          const value = selectedText
            ? !selectedText.bold
            : !textBold;

          if (selectedText) {
            updateSelectedText({
              bold: value,
            });
          }

          setTextBold(value);
        }}
        className={`${panelButtonClass} h-7 min-w-8 px-2 text-xs ${
          (selectedText ? selectedText.bold : textBold)
            ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
            : ''
        }`}
      >
        B
      </button>

      {/* ITALIC */}
      <button
        type="button"
        onClick={() => {
          const value = selectedText
            ? !selectedText.italic
            : !textItalic;

          if (selectedText) {
            updateSelectedText({
              italic: value,
            });
          }

          setTextItalic(value);
        }}
        className={`${panelButtonClass} h-7 min-w-8 px-2 text-xs ${
          (selectedText ? selectedText.italic : textItalic)
            ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
            : ''
        }`}
      >
        I
      </button>

      {/* UNDERLINE */}
      <button
        type="button"
        onClick={() => {
          const value = selectedText
            ? !selectedText.underline
            : textUnderline;

          if (selectedText) {
            updateSelectedText({
              underline: value,
            });
          }

          setTextUnderline(value);
        }}
        className={`${panelButtonClass} h-7 min-w-8 px-2 text-xs ${
          (selectedText ? selectedText.underline : textUnderline)
            ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
            : ''
        }`}
      >
        U
      </button>

      {/* ALIGN */}
      {(['left', 'center', 'right'] as const).map((align) => (
        <button
          key={align}
          type="button"
          onClick={() => {
            if (selectedText) {
              updateSelectedText({ align });
            }

            setTextAlign(align);
          }}
          className={`${panelButtonClass} h-7 min-w-8 px-2 text-xs ${
            (selectedText ? selectedText.align : textAlign) === align
              ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
              : ''
          }`}
        >
          {align === 'left'
            ? 'L'
            : align === 'center'
            ? 'C'
            : 'R'}
        </button>
      ))}
    </div>

    {/* FONT + FULL COLOR */}
    <div className="mt-2 grid grid-cols-2 gap-2">

      <div>
        <label className="mb-1 block text-[9px] text-white/70">
          Font
        </label>

        <select
          value={
            selectedText
              ? selectedText.fontFamily
              : fontFamily
          }
          onChange={(e) => {
            const value = e.target.value;

            if (selectedText) {
              updateSelectedText({
                fontFamily: value,
              });
            }

            setFontFamily(value);
          }}
          className="h-8 w-full rounded-lg border border-white/10 bg-[#2b3238] px-2 text-[10px] text-white outline-none"
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[9px] text-white/70">
          Full Text Color
        </label>

        <div className="flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-[#2b3238] px-2">
          <input
            type="color"
            value={
              selectedText
                ? selectedText.color
                : textColor
            }
            onChange={(e) => {
              const value = e.target.value;

              if (selectedText) {
                updateSelectedText({
                  color: value,
                });
              }

              setTextColor(value);
            }}
            className="h-6 w-8 cursor-pointer border-0 bg-transparent"/>

           <span className="text-[9px] text-white/70">
            All
           </span>
        </div>
      </div>
    </div>

  

    {/* SELECTED WORD COLOR */}
    <div className="mt-2 rounded-lg border border-white/10 bg-[#161a1f] p-2">

      <div className="mb-1 flex items-center justify-between">
        <span className="text-[9px] font-bold text-white/60">
          Selected Word / Sentence
        </span>

        <span className="text-[8px] text-white/40">
          {selectedWordRange
            ? `${selectedWordRange.end - selectedWordRange.start} chars`
            : 'Select text first'}
        </span>
      </div>

      <div className="flex items-center gap-2">

        <input
          type="color"
          value={wordColor}
          onChange={(e) =>
            setWordColor(e.target.value)
          }
          className="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent"
        />

        <button
          type="button"
          disabled={!selectedWordRange}
          onClick={() => {
            if (!selectedText || !selectedWordRange) {
              return;
            }

            const oldRanges =
              selectedText.colorRanges ?? [];

            const newRange = {
              start: selectedWordRange.start,
              end: selectedWordRange.end,
              color: wordColor,
            };

            /*
             * Remove/rebuild overlapping ranges.
             * This prevents duplicate colors over same text.
             */
            const updatedRanges = oldRanges.filter(
              (range) =>
                range.end <= newRange.start ||
                range.start >= newRange.end
            );

            updatedRanges.push(newRange);

            updatedRanges.sort(
              (a, b) => a.start - b.start
            );

            updateSelectedText({
              colorRanges: updatedRanges,
            });

            setSelectedWordRange(null);
          }}
          className={`h-8 rounded-lg px-3 text-[10px] font-bold ${
            selectedWordRange
              ? 'bg-[#f3ad61] text-black'
              : 'bg-[#2b3238] text-white/30'
          }`}
        >
          Apply
        </button>

        <button
          type="button"
          disabled={!selectedWordRange}
          onClick={() => {
            if (!selectedText || !selectedWordRange) {
              return;
            }

            const range = selectedWordRange;

            const updatedRanges =
              (selectedText.colorRanges ?? []).filter(
                (item) =>
                  item.end <= range.start ||
                  item.start >= range.end
              );

            updateSelectedText({
              colorRanges: updatedRanges,
            });

            setSelectedWordRange(null);
          }}
          className="h-8 rounded-lg bg-[#2b3238] px-3 text-[10px] font-bold text-white disabled:opacity-30"
        >
          Clear
        </button>
      </div>
    </div>

    {/* ADD / DONE *
    <div className="mt-2 flex gap-2">

      {!selectedText ? (
        <button
          type="button"
          onClick={() => addText()}
          className="h-8 flex-1 rounded-lg bg-[#f3ad61] text-[10px] font-black text-black">
          + Add Text
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setSelectedTextId(null);
            setSelectedWordRange(null);
            setEditingTextId(null);
            setNewText('');
            setActiveTool(null);
          }}
          className="h-8 flex-1 rounded-lg bg-[#f3ad61] text-[10px] font-black text-black"
        >
          Done
        </button>
      )}
    </div>*/}
  </section>
)}
                        {/* Text Ending */}


      {/* EDIT OVERLAY */}
      {activeTool ==='edit' && photo && (
      <section data-photo-editor-panel className={overlayPanelClass}>
         <div className="mb-2 flex items-center justify-between">
           <div>
             <h2 className="text-sm font-bold">
               Edit Photo
             </h2>
             <p className="text-[10px] text-white/40">
                Adjustments and filters
             </p>
            
            </div>
              <button
                type="button"
                onClick={
                  resetEdits
                }
                className="rounded-lg border border-white/10 bg-[#2b3238] px-3 py-1 text-[10px] font-bold">
                Reset
              </button>
            </div>

          <div className="flex gap-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {(
            [
            [
            'brightness',
            'Brightness',
            -100,
            100,
            ],
            [
            'contrast',
            'Contrast',
            -100,
            100,
            ],
            [
           'saturation',
           'Saturation',
           -100,
           100,
           ],
           [
           'blur',
           'Blur',
           0,
           20,
           ],
           [
           'grayscale',
           'Grayscale',
           0,
           100,
           ],
           [
           'sepia',
           'Sepia',
           0,
           100,
           ],
           ] as const
           ).map(
           ([
           key,
           label,
           min,
           max,
           ]) => (
           <div
           key={key}
           className="w-[140px] shrink-0"
           >
           <div className="mb-1 flex justify-between">
           <label className="text-[10px] font-semibold text-white/50">
            {label}
           </label>

           <span className="text-[10px] text-white/40">
            {adjustments[key]}
           </span>
           </div>

            <input
            type="range"
            min={min}
            max={max}
            value={adjustments[key]}
            onChange={(event) =>
            updateAdjustment(
              key,
              Number(event.target.value)
            )
             }
            className="w-full accent-[#f3ad61]"
            />
            </div>
              )
             )}
       </div>

            <div className="mt-4">
              <div className="mb-2 text-[10px] font-bold text-white/50">
                Filters
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTER_PRESETS.map(
                  (filter) => (
                    <button
                      key={
                        filter.id
                      }
                      type="button"
                      onClick={() =>
                        setFilterPreset(
                          filter.id
                        )
                      }
                      className={`shrink-0 rounded-lg border px-4 py-2 text-xs font-bold ${
                        filterPreset ===
                        filter.id
                          ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
                          : 'border-white/10 bg-[#2b3238]'
                      }`}>
                      {
                        filter.label
                      }
                    </button>
                  )
                )}
              </div>
            </div>

         <div className="mt-2 flex gap-3 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button
            type="button"
            onClick={startCrop}
            className={`${panelButtonClass} shrink-0`}>
            Re-Crop
            </button>

           <button
           type="button"
           onClick={removePhoto}
           className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-bold text-red-300">
           Remove
           </button>

           <button
           type="button"
           onClick={() => rotatePhoto(-90)}
           className={`${panelButtonClass} shrink-0`}>
           ↶ Rotate L
           </button>

            <button
            type="button"
            onClick={() => rotatePhoto(90)}
            className={`${panelButtonClass} shrink-0`}>
            ↷ Rotate R
            </button>
         </div>
      </section>
        )}

      {/* PHOTO OVERLAY */}
      {activeTool ===
        'photo' &&
        photo && (
          <section
            data-photo-editor-panel
            className={overlayPanelClass}
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={
                  startCrop
                }
                className={
                  panelButtonClass
                }
              >
                Crop Again
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTool(
                    'edit'
                  )
                }
                className={
                  panelButtonClass
                }
              >
                Open Edit Board
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  rotatePhoto(
                    -90
                  )
                }
                className={
                  panelButtonClass
                }
              >
                ↶ Rotate
              </button>

              <button
                type="button"
                onClick={() =>
                  rotatePhoto(
                    90
                  )
                }
                className={
                  panelButtonClass
                }
              >
                ↷ Rotate
              </button>
            </div>

            <button
              type="button"
              onClick={
                removePhoto
              }
              className="mt-2 w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-bold text-red-300"
            >
              Remove Photo
            </button>
</section>
        )}

               {/*         {/* COMPACT DOWNLOAD + RESET 
      <div
        data-photo-editor-actions className={exportActionClass}>
        <button
          type="button"onClick={ downloadImage}
            className={`flex h-9  flex-1 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-black transition ${
            downloadComplete
              ? 'bg-emerald-500 text-black'
              : 'bg-[#f3ad61] text-black'
          }`}>
          {downloadComplete
            ? '✓ Saved'
            : '↓ Download'}
         </button>

         <button
          type="button"
          onClick={
            resetAll
          }
          className="flex h-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#2b3238] px-3 text-[10px] font-bold text-white"
        >
          Reset
        </button>
      </div>*/}

                           {/* FOOTER TOOLBAR */}
       <footer
        data-photo-editor-toolbar
        className="fixed bottom-0 left-0 right-0 z-[200] border-t border-white/10 bg-[#20242c]/98 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.25)] backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 overflow-x-auto px-1 py-0 sm:justify-center sm:gap-2">
          {/* BACKGROUND */}
          <button
            type="button"
            onClick={() =>
              selectTool(
                'background'
              )
            }
            className={`${footerButtonClass} ${
              activeTool ===
              'background'
                ? 'bg-[#f3ad61] text-black'
                : 'text-white/70 hover:bg-white/5'
            }`}
          >
            <span className="text-lg">
              ◐
            </span>

            <span>
              Background
            </span>
          </button>

                                       {/* PHOTO */}
          <button
            type="button"
            onClick={() =>
              selectTool(
                'photo'
              )
            }
            className={`${footerButtonClass} ${
              activeTool ===
              'photo'
                ? 'bg-[#f3ad61] text-black'
                : 'text-white/70 hover:bg-white/5'
            }`}
          >
            <span className="text-lg">
              ▣
            </span>

            <span>
              Photo
            </span>
          </button>

          {/* SIZE */}
          <button
            type="button"
            onClick={() =>
              selectTool(
                'size'
              )
            }
            className={`${footerButtonClass} ${
              activeTool ===
              'size'
                ? 'bg-[#f3ad61] text-black'
                : 'text-white/70 hover:bg-white/5'
            }`}
          >
            <span className="text-lg">
              ⛶
            </span>

            <span>
              Size
            </span>
          </button>


                                   {/* TEXT */}
          <button
            type="button"
            onClick={() =>
              selectTool(
                'text'
              )
            }
            className={`${footerButtonClass} ${
              activeTool ===
              'text'
                ? 'bg-[#f3ad61] text-black'
                : 'text-white/70 hover:bg-white/5'
            }`}
          >
            <span className="text-lg font-black">
              T
            </span>

            <span>
              Text
            </span>
          </button>

          {/* EDIT */}
          <button
            type="button"
            disabled={!photo}
            onClick={() =>
              setActiveTool(
                'edit'
              )
            }
            className={`${footerButtonClass} ${
              activeTool ===
              'edit'
                ? 'bg-[#f3ad61] text-black'
                : photo
                ? 'text-white/70 hover:bg-white/5'
                : 'cursor-not-allowed text-white/20'
            }`}
          >
            <span className="text-lg">
              ✎
            </span>

            <span>
              Edit
            </span>
          </button>

          {/* DOWNLOAD 
          <button
            type="button"
            onClick={
              downloadImage
            }
            className={`${footerButtonClass} ${
              downloadComplete
                ? 'bg-emerald-500 text-black'
                : 'bg-[#f3ad61] text-black'
            }`}>

            <span className="text-lg">
              {downloadComplete
                ? '✓'
                : '↓'}
            </span>

            <span>
              {downloadComplete
                ? 'Saved'
                : 'Download'}
            </span>
          </button>*/}
        </div>
      </footer>

      {/* HIDDEN FILE INPUTS */}
      <input
        ref={
          backgroundInputRef
        }
        type="file"
        accept="image/*"
        onChange={
          selectBackground
        }
        className="hidden"
      />

      <input
        ref={
          photoInputRef
        }
        type="file"
        accept="image/*"
        multiple
        onChange={
          selectPhoto
        }
        className="hidden"
      />
    </div>
  );
}
