import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';

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

const SIZE_PRESETS = [
  { id: '9:16', label: '9:16', width: 1080, height: 1920 },
  { id: '16:9', label: '16:9', width: 1920, height: 1080 },
  { id: '1:1', label: '1:1', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5', width: 1080, height: 1350 },
  { id: '3:4', label: '3:4', width: 1080, height: 1440 },
  { id: '4:3', label: '4:3', width: 1440, height: 1080 },
  { id: '3:2', label: '3:2', width: 1620, height: 1080 },
];

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
  const backgroundInputRef =
    useRef<HTMLInputElement | null>(null);

  const photoInputRef =
    useRef<HTMLInputElement | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const canvasAreaRef =
    useRef<HTMLDivElement | null>(null);

  const cropFrameRef =
    useRef<HTMLDivElement | null>(null);

  const cropAnimationFrameRef =
    useRef<number | null>(null);

  const cropLatestPointRef =
    useRef<{
      clientX: number;
      clientY: number;
    } | null>(null);

  const [background, setBackground] =
    useState<string | null>(null);

  const [photo, setPhoto] =
    useState<string | null>(null);

  const [backgroundColor, setBackgroundColor] =
    useState('#ffffff');

  const [activeTool, setActiveTool] =
    useState<Tool>(null);

  const [canvasSize, setCanvasSize] =
    useState(SIZE_PRESETS[4]);

  const [textLayers, setTextLayers] =
    useState<TextLayer[]>([]);

  const [selectedTextId, setSelectedTextId] =
    useState<number | null>(null);
const [editingTextId, setEditingTextId] =
  useState<number | null>(null);
  const textPointersRef = useRef<
  Map<number, { x: number; y: number }>
>(new Map());

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

  const [photoTransform, setPhotoTransform] =
    useState<PhotoTransform>(
      DEFAULT_PHOTO_TRANSFORM
    );

  const [adjustments, setAdjustments] =
    useState<Adjustments>(
      DEFAULT_ADJUSTMENTS
    );

  const [filterPreset, setFilterPreset] =
    useState<FilterPreset>('original');

  const [photoNaturalSize, setPhotoNaturalSize] =
    useState({
      width: 1,
      height: 1,
    });

  const [isCropping, setIsCropping] =
    useState(false);

  /*
   * Crop starts exactly at the image edges.
   * This also makes the first crop feel natural.
   */
  const [cropRect, setCropRect] =
    useState<CropRect>({
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    });

  const cropInteractionRef = useRef<{
    mode:
      | 'move'
      | 'nw'
      | 'ne'
      | 'sw'
      | 'se';
    startX: number;
    startY: number;
    original: CropRect;
  } | null>(null);

  const [dragging, setDragging] =
    useState<{
      type: 'photo' | 'text';
      id?: number;
      startX: number;
      startY: number;
      originalX: number;
      originalY: number;
    } | null>(null);

  const [downloadComplete, setDownloadComplete] =
    useState(false);

  const [exportMessage, setExportMessage] =
    useState('');

  const hasImage = Boolean(photo);

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

  const getFilterString = () => {
    const preset =
      FILTER_PRESETS.find(
        (item) =>
          item.id === filterPreset
      )?.filter ?? '';

    const parts = [
      `brightness(${
        1 + adjustments.brightness / 100
      })`,
      `contrast(${
        1 + adjustments.contrast / 100
      })`,
      `saturate(${
        1 + adjustments.saturation / 100
      })`,
      adjustments.blur > 0
        ? `blur(${adjustments.blur}px)`
        : '',
      adjustments.grayscale > 0
        ? `grayscale(${
            adjustments.grayscale / 100
          })`
        : '',
      adjustments.sepia > 0
        ? `sepia(${
            adjustments.sepia / 100
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
      revokeIfBlob(background);
      revokeIfBlob(photo);

      if (
        cropAnimationFrameRef.current !== null
      ) {
        cancelAnimationFrame(
          cropAnimationFrameRef.current
        );
      }
    };
  }, [background, photo]);

  /*
   * Close overlay when user clicks outside.
   * Popup itself and footer toolbar remain protected.
   */
  useEffect(() => {
    if (!activeTool) return;

    const handleOutsideClick = (
      event: MouseEvent
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

      setActiveTool(null);
    };

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );
    };
  }, [activeTool]);

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
    const file =
      event.target.files?.[0];

    if (!file) return;

    const url =
      URL.createObjectURL(file);

    try {
      const image =
        await loadImage(url);

      revokeIfBlob(photo);

      setPhoto(url);

      setPhotoNaturalSize({
        width:
          image.naturalWidth || 1,
        height:
          image.naturalHeight || 1,
      });

      setPhotoTransform(
        DEFAULT_PHOTO_TRANSFORM
      );

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
      revokeIfBlob(url);

      setExportMessage(
        'Unable to load image.'
      );
    }

    event.target.value = '';
  };

  const startCrop = () => {
    if (!photo) return;

    /*
     * Always start a fresh crop from
     * the complete image.
     */
    setCropRect({
      x: 0,
      y: 0,
      w: 1,
      h: 1,
    });

    setIsCropping(true);
    setActiveTool(null);
  };

  const handleCropPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    mode:
      | 'move'
      | 'nw'
      | 'ne'
      | 'sw'
      | 'se'
  ) => {
    if (!canvasAreaRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    /*
     * Capture pointer on the actual crop stage.
     * This prevents losing the crop handle
     * while dragging quickly.
     */
    try {
      canvasAreaRef.current.setPointerCapture(
        event.pointerId
      );
    } catch {
      // Ignore pointer capture errors.
    }

    cropInteractionRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      original: {
        ...cropRect,
      },
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
    const dx =
      ((clientX -
        interaction.startX) /
        rect.width) *
      100;

    const dy =
      ((clientY -
        interaction.startY) /
        rect.height) *
      100;

    const original =
      interaction.original;

    const mode =
      interaction.mode;

    let next: CropRect = {
      ...original,
    };

    if (mode === 'move') {
      next.x = clamp(
        original.x + dx,
        0,
        100 - original.w
      );

      next.y = clamp(
        original.y + dy,
        0,
        100 - original.h
      );
    }

    if (mode === 'se') {
      next.w = clamp(
        original.w + dx,
        1,
        100 - original.x
      );

      next.h = clamp(
        original.h + dy,
        1,
        100 - original.y
      );
    }

    if (mode === 'nw') {
      const right =
        original.x +
        original.w;

      const bottom =
        original.y +
        original.h;

      const nextX =
        clamp(
          original.x + dx,
          0,
          right - 1
        );

      const nextY =
        clamp(
          original.y + dy,
          0,
          bottom - 1
        );

      next.x = nextX;
      next.y = nextY;
      next.w =
        right - nextX;
      next.h =
        bottom - nextY;
    }

    if (mode === 'ne') {
      const right =
        clamp(
          original.x +
            original.w +
            dx,
          original.x + 1,
          100
        );

      const nextY =
        clamp(
          original.y + dy,
          0,
          original.y +
            original.h -
            1
        );

      next.y = nextY;
      next.w =
        right -
        original.x;
      next.h =
        original.y +
        original.h -
        nextY;
    }

    if (mode === 'sw') {
      const bottom =
        clamp(
          original.y +
            original.h +
            dy,
          original.y + 1,
          100
        );

      const nextX =
        clamp(
          original.x + dx,
          0,
          original.x +
            original.w -
            1
        );

      next.x = nextX;
      next.w =
        original.x +
        original.w -
        nextX;
      next.h =
        bottom -
        original.y;
    }

    /*
     * Final safety clamp.
     */
    next.x = clamp(
      next.x,
      0,
      100
    );

    next.y = clamp(
      next.y,
      0,
      100
    );

    next.w = clamp(
      next.w,
      1,
      100 - next.x
    );

    next.h = clamp(
      next.h,
      1,
      100 - next.y
    );

    setCropRect(next);
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
      dragging.type ===
      'photo'
    ) {
      setPhotoTransform(
        (previous) => ({
          ...previous,
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
        })
      );
    }

    if (
      dragging.type ===
        'text' &&
      dragging.id !== undefined
    ) {
      setTextLayers(
        (previous) =>
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

      revokeIfBlob(photo);

      setPhoto(croppedData);

      setPhotoNaturalSize({
        width:
          outputCanvas.width,
        height:
          outputCanvas.height,
      });

      setPhotoTransform({
        x: 50,
        y: 50,
        width: 76,
        rotation: 0,
      });

      setIsCropping(false);

      setAdjustments(
        DEFAULT_ADJUSTMENTS
      );

      setFilterPreset(
        'original'
      );

      setActiveTool('edit');

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

    if (photo) {
      setActiveTool('edit');
    }
  };

  const addText = () => {
    const value =
      newText.trim();

    if (!value) return;

    const id = makeId();

    const layer: TextLayer = {
      id,
      text: value,
      x: 50,
      y: 50,
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

    setSelectedTextId(id);
    setSelectedWordRange(null);
    setNewText(value);

    setActiveTool('text');
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
                layer.id !==
                selectedTextId
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
    event: ReactPointerEvent<HTMLImageElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

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
      type: 'photo',
      startX: event.clientX,
      startY: event.clientY,
      originalX:
        photoTransform.x,
      originalY:
        photoTransform.y,
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

    setPhoto(null);

    setPhotoNaturalSize({
      width: 1,
      height: 1,
    });

    setIsCropping(false);
    setActiveTool(null);
  };

  const resetEdits = () => {
    setAdjustments(
      DEFAULT_ADJUSTMENTS
    );

    setFilterPreset(
      'original'
    );

    setPhotoTransform({
      ...DEFAULT_PHOTO_TRANSFORM,
    });

    setExportMessage(
      'Photo adjustments reset.'
    );
  };

  const resetAll = () => {
    revokeIfBlob(background);
    revokeIfBlob(photo);

    setBackground(null);
    setPhoto(null);

    setBackgroundColor(
      '#ffffff'
    );

    setTextLayers([]);
    setSelectedTextId(null);
    setSelectedWordRange(null);

    setNewText('');

    setPhotoTransform({
      ...DEFAULT_PHOTO_TRANSFORM,
    });

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
    height: number
  ) => {
    const photoWidth =
      width *
      (photoTransform.width /
        100);

    const photoRatio =
      image.naturalWidth /
      image.naturalHeight;

    const photoHeight =
      photoWidth /
      photoRatio;

    const centerX =
      width *
      (photoTransform.x /
        100);

    const centerY =
      height *
      (photoTransform.y /
        100);

    context.save();

    context.filter =
      getFilterString();

    context.translate(
      centerX,
      centerY
    );

    context.rotate(
      (photoTransform.rotation *
        Math.PI) /
        180
    );

    context.drawImage(
      image,
      -photoWidth / 2,
      -photoHeight / 2,
      photoWidth,
      photoHeight
    );

    context.restore();
  };

  const drawTextLayer = (
    context: CanvasRenderingContext2D,
    layer: TextLayer,
    width: number,
    height: number
  ) => {
    const centerX =
      width *
      (layer.x / 100);

    const centerY =
      height *
      (layer.y / 100);

    const fontSize =
      Math.max(
        10,
        layer.fontSize *
          (width / 1080)
      );

    const lines =
      layer.text.split('\n');

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

    const lineData =
      lines.map(
        (line) => ({
          line,
          width:
            context.measureText(
              line
            ).width,
        })
      );

    const totalHeight =
      lineData.length *
      lineHeight;

    const startY =
      centerY -
      totalHeight / 2 +
      lineHeight / 2;

    let globalOffset = 0;

    lineData.forEach(
      (
        {
          line,
          width: lineWidth,
        },
        lineIndex
      ) => {
        let startX =
          centerX;

        if (
          layer.align ===
          'left'
        ) {
          startX =
            centerX -
            lineWidth / 2;
        }

        if (
          layer.align ===
          'right'
        ) {
          startX =
            centerX +
            lineWidth / 2;
        }

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

        const lineStart =
          globalOffset;

        const lineEnd =
          globalOffset +
          line.length;

        const boundaries =
          new Set<number>();

        boundaries.add(0);
        boundaries.add(
          line.length
        );

        layer.highlightedWords.forEach(
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
            layer.highlightedWords.find(
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

        let cursorX =
          centerX -
          fullWidth / 2;

        if (
          layer.align ===
          'left'
        ) {
          cursorX =
            centerX -
            fullWidth / 2;
        }

        if (
          layer.align ===
          'right'
        ) {
          cursorX =
            centerX -
            fullWidth / 2;
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

        globalOffset +=
          line.length + 1;
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

      if (photo) {
        const photoImage =
          await loadImage(
            photo
          );

        drawPhoto(
          context,
          photoImage,
          outputCanvas.width,
          outputCanvas.height
        );
      }

      textLayers.forEach(
        (layer) => {
          drawTextLayer(
            context,
            layer,
            outputCanvas.width,
            outputCanvas.height
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
      if (
        !hasImage &&
        textLayers.length === 0
      ) {
        setExportMessage(
          'Add a photo or text first.'
        );

        return;
      }

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
      } catch {
        setExportMessage(
          'Download failed. Please try again.'
        );
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

    if (
      tool === 'text' &&
      selectedTextId === null
    ) {
      setNewText('');
      setTextColor(
        '#ffffff'
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
    const cropStageStyle:
      CSSProperties = {
        aspectRatio: `${photoNaturalSize.width}/${photoNaturalSize.height}`,
        touchAction: 'none',
      };

    return (
      <div className="fixed inset-0 z-[999] flex min-h-dvh flex-col bg-[#161a1f] text-white">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#20242c] px-3 sm:px-5">
          <div>
            <h1 className="text-sm font-bold">
              Crop Photo
            </h1>

            <p className="text-[10px] text-white/50">
              Drag crop area or use the corner handles
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
            onPointerMove={
              handlePointerMove
            }
            onPointerUp={
              handlePointerUp
            }
            onPointerCancel={
              handlePointerUp
            }
            className="relative w-full max-w-[760px] overflow-hidden rounded-x bg-black shadow-2xl"
            style={cropStageStyle}>
            <img
              src={photo}
              alt="Crop preview"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"/>

            <div className="pointer-events-none absolute inset-0 bg-black/35" />

            <div
              ref={cropFrameRef}
              onPointerDown={(
                event
              ) =>
                handleCropPointerDown(
                  event,
                  'move'
                )
              }
              className="absolute cursor-move border-2 border-white bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.38)]"
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

              {(
                [
                  [
                    'nw',
                    'left-[-8px] top-[-8px]',
                  ],
                  [
                    'ne',
                    'right-[-8px] top-[-8px]',
                  ],
                  [
                    'sw',
                    'left-[-8px] bottom-[-8px]',
                  ],
                  [
                    'se',
                    'right-[-8px] bottom-[-8px]',
                  ],
                ] as const
              ).map(
                ([
                  mode,
                  position,
                ]) => (
                  <div
                    key={mode}
                    onPointerDown={(
                      event
                    ) => {
                      event.preventDefault();
                      event.stopPropagation();

                      handleCropPointerDown(
                        event,
                        mode
                      );
                    }}
                    className={`absolute ${position} h-4 w-4 touch-none rounded-sm border-2 border-white bg-[#f3ad61] shadow-lg`}
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
    <div className="fixed inset-0 z-50 flex min-h-dvh flex-col overflow-hidden bg-[#161a1f] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#20242c] px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f3ad61] text-sm font-black text-black">
            PE
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold sm:text-base">
              Photo-Equality
            </h1>
             <p className="hidden text-[9px] text-white/40 sm:block">
              Photo Editing Studio
             </p>
          </div>
        </div>
          <button type="button" onClick={
            handleDone
             }
            className="rounded-lg bg-[#737373] px-1 py-0.5 text-xs font-bold text-white transition hover:brightness-110"
            >
            Done
          </button>
                                {/* COMPACT DOWNLOAD + RESET */}
<div
  data-photo-editor-actions
  className="inline-flex w-fit gap-2">
   <button
     type="button"
     onClick={downloadImage}
     className={`flex h-8 w-15 items-center justify-center rounded-md px-2 text-[9px] font-black transition ${
      downloadComplete
        ? 'bg-emerald-500 text-black'
        : 'bg-[#f3ad61] text-black'
     }`}>
     {downloadComplete ? '✓' :  'Save↓'}
   </button>

  <button
    type="button"
    onClick={resetAll}
    className="flex h-7 w-13 items-center justify-center rounded-md border border-white/10 bg-[#2b3238] px-2 text-[9px] font-bold text-white">
    Reset
  </button>
</div>
          
        
  </header>

      {/* MAIN */}
      <main className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex min-h-full w-full max-w-[1100px] flex-col px-2 pb-36 pt-2 sm:px-5 sm:pt-5">
          {/* CANVAS */}
          <div className="flex min-h-[300px] flex-1 items-center justify-center">
            <div
              ref={canvasAreaRef}
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

              {photo && (
                <div
                  className="absolute relative"
                  style={{
                    left: `${photoTransform.x}%`,
                    top: `${photoTransform.y}%`,
                    width: `${photoTransform.width}%`,
                    transform:
                      `translate(-50%, -50%) rotate(${photoTransform.rotation}deg)`,
                    transformOrigin:
                      'center center',
                    zIndex: 10,
                  }}
                >
                  <img
                    src={photo}
                    alt="Selected"
                    draggable={false}
                    onPointerDown={
                      beginPhotoDrag
                    }
                    style={{
                      width: '100%',
                      height: 'auto',
                      filter:
                        getFilterString(),
                      touchAction:
                        'none',
                    }}
                    className="block cursor-move select-none rounded-sm"/>

          {!isCropping && (
          <button type="button"
            onPointerDown={(event) => {event.preventDefault();event.stopPropagation();}}
            onClick={() => setPhoto(null)}
            className="absolute left-[-10px] top-[-10px] z-30 flex h-6.5 w-6 items-center justify-center rounded-sm bg-gray-300 text-lg font-bold leading-none text-white shadow-lg">
            ×
          </button>
        )}

                  <div className="pointer-events-none absolute inset-0 rounded-sm border-2 border-dashed border-[#f3ad61]" />

                  <button
                    type="button"
                    onPointerDown={(
                      event
                    ) => {
                      event.stopPropagation();
                      event.preventDefault();
                    }}
                    onClick={() =>
                      rotatePhoto(
                        90
                      )
                    }
                    className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#20242c] bg-[#f3ad61] text-xs font-black text-black shadow"
                  >
                    ↻
                  </button>
                </div>
              )}

  {textLayers.map((layer) => (
  <div
    key={layer.id}
    onPointerDown={(event) => {
      const el = event.currentTarget as HTMLDivElement & {
        __textPointers?: Map<
          number,
          { x: number; y: number }
        >;
        __moveStartX?: number;
        __moveStartY?: number;
        __moveStartLayerX?: number;
        __moveStartLayerY?: number;
        __pinchStartDistance?: number;
        __pinchStartFontSize?: number;
        __isPinching?: boolean;
      };

      event.preventDefault();
      event.stopPropagation();

      setSelectedTextId(layer.id);

      if (!el.__textPointers) {
        el.__textPointers = new Map();
      }

      el.__textPointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      try {
        el.setPointerCapture(event.pointerId);
      } catch {}

      /*
       * =========================
       * 1 FINGER = MOVE
       * =========================
       */
      if (el.__textPointers.size === 1) {
        el.__isPinching = false;

        el.__moveStartX = event.clientX;
        el.__moveStartY = event.clientY;

        el.__moveStartLayerX = layer.x;
        el.__moveStartLayerY = layer.y;

        return;
      }

      /*
       * =========================
       * 2 FINGERS = ZOOM
       * =========================
       */
      if (el.__textPointers.size === 2) {
        const points = Array.from(
          el.__textPointers.values()
        );

        const [a, b] = points;

        const distance = Math.hypot(
          b.x - a.x,
          b.y - a.y
        );

        el.__pinchStartDistance = distance;
        el.__pinchStartFontSize = layer.fontSize;

        el.__isPinching = true;
      }
    }}

    onPointerMove={(event) => {
      const el = event.currentTarget as HTMLDivElement & {
        __textPointers?: Map<
          number,
          { x: number; y: number }
        >;
        __moveStartX?: number;
        __moveStartY?: number;
        __moveStartLayerX?: number;
        __moveStartLayerY?: number;
        __pinchStartDistance?: number;
        __pinchStartFontSize?: number;
        __isPinching?: boolean;
      };

      if (!el.__textPointers) return;

      /*
       * Update current finger position
       */
      el.__textPointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      /*
       * =========================
       * 2 FINGERS = ZOOM ONLY
       * =========================
       */
      if (
        el.__textPointers.size >= 2 &&
        el.__isPinching
      ) {
        const points = Array.from(
          el.__textPointers.values()
        );

        const [a, b] = points;

        const currentDistance = Math.hypot(
          b.x - a.x,
          b.y - a.y
        );

        const startDistance =
          el.__pinchStartDistance ?? 0;

        const startFontSize =
          el.__pinchStartFontSize ??
          layer.fontSize;

        if (startDistance > 0) {
          const scale =
            currentDistance /
            startDistance;

          const newFontSize = Math.min(
            160,
            Math.max(
              12,
              startFontSize * scale
            )
          );

          updateSelectedText({
            fontSize:
              Math.round(newFontSize),
          });
        }

        /*
         * VERY IMPORTANT:
         * Zoom ke waqt MOVE bilkul nahi
         */
        return;
      }

      /*
       * =========================
       * 1 FINGER = MOVE ONLY
       * =========================
       */
      if (
        el.__textPointers.size === 1 &&
        !el.__isPinching
      ) {
        const parent =
          el.parentElement;

        if (!parent) return;

        const rect =
          parent.getBoundingClientRect();

        if (
          rect.width <= 0 ||
          rect.height <= 0
        ) {
          return;
        }

        if (
          el.__moveStartX === undefined ||
          el.__moveStartY === undefined ||
          el.__moveStartLayerX === undefined ||
          el.__moveStartLayerY === undefined
        ) {
          return;
        }

        const deltaX =
          event.clientX -
          el.__moveStartX;

        const deltaY =
          event.clientY -
          el.__moveStartY;

        const deltaXPercent =
          (deltaX / rect.width) * 100;

        const deltaYPercent =
          (deltaY / rect.height) * 100;

        const newX = Math.max(
          0,
          Math.min(
            100,
            el.__moveStartLayerX +
              deltaXPercent
          )
        );

        const newY = Math.max(
          0,
          Math.min(
            100,
            el.__moveStartLayerY +
              deltaYPercent
          )
        );

        updateSelectedText({
          x: newX,
          y: newY,
        });
      }
    }}

    onPointerUp={(event) => {
      const el = event.currentTarget as HTMLDivElement & {
        __textPointers?: Map<
          number,
          { x: number; y: number }
        >;
        __isPinching?: boolean;
        __moveStartX?: number;
        __moveStartY?: number;
        __moveStartLayerX?: number;
        __moveStartLayerY?: number;
      };

      if (!el.__textPointers) return;

      el.__textPointers.delete(
        event.pointerId
      );

      try {
        el.releasePointerCapture(
          event.pointerId
        );
      } catch {}

      /*
       * Agar ab sirf 1 finger bachi hai,
       * to MOVE ko fresh position se restart karo.
       */
      if (
        el.__textPointers.size === 1
      ) {
        const remaining =
          Array.from(
            el.__textPointers.values()
          )[0];

        el.__isPinching = false;

        el.__moveStartX =
          remaining.x;

        el.__moveStartY =
          remaining.y;

        /*
         * Current layer position ko
         * fresh starting point banao.
         */
        el.__moveStartLayerX =
          layer.x;

        el.__moveStartLayerY =
          layer.y;

        return;
      }

      /*
       * No fingers
       */
      if (
        el.__textPointers.size === 0
      ) {
        el.__isPinching = false;
      }
    }}

    onPointerCancel={(event) => {
      const el = event.currentTarget as HTMLDivElement & {
        __textPointers?: Map<
          number,
          { x: number; y: number }
        >;
        __isPinching?: boolean;
      };

      el.__textPointers?.delete(
        event.pointerId
      );

      el.__isPinching = false;

      try {
        el.releasePointerCapture(
          event.pointerId
        );
      } catch {}
    }}

    onDoubleClick={() => {
      setSelectedTextId(layer.id);

      setNewText(
        layer.text
      );

      setActiveTool(
        'text'
      );
    }}

    className={`absolute max-w-[90%] cursor-move select-none whitespace-pre-wrap break-words px-2 py-1 text-center ${
      selectedTextId === layer.id
        ? 'ring-2 ring-[#f3ad61] ring-offset-2 ring-offset-transparent'
        : ''
    }`}

    style={{
      left: `${layer.x}%`,
      top: `${layer.y}%`,
      transform:
        'translate(-50%, -50%)',

      color:
        layer.color,

      fontFamily:
        layer.fontFamily,

      fontSize: `${Math.max(
        10,
        layer.fontSize *
          (window.innerWidth < 600
            ? 0.65
            : 1)
      )}px`,

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
    {layer.text}

    {selectedTextId === layer.id && (
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
        className="absolute -right-4 -top-4 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-sm font-black text-white shadow-lg"
      >
        ×
      </button>
    )}
  </div>
))}
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

                <span className="pointer-events-none text-lg">
                  +
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
    className={`${overlayPanelClass} max-h-[58vh] p-2 sm:max-h-[70vh] sm:p-3`}
  >
    {/* HEADER */}
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-xs font-bold sm:text-sm">
          {selectedText ? 'Edit Text' : 'Add Text'}
        </h2>

        <p className="truncate text-[9px] text-white/40">
          Select words in the text box to color only those words
        </p>
      </div>

      {selectedText && (
        <button
          type="button"
          onClick={deleteSelectedText}
          className="shrink-0 rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-300"
        >
          Delete
        </button>
      )}
    </div>

    {/* TEXT INPUT */}
    <textarea
      ref={textareaRef}
      value={selectedTextValue}
      onChange={(event) =>
        updateTextValue(event.target.value)
      }
      onSelect={handleTextareaSelect}
      rows={2}
      placeholder="Type your text here..."
      inputMode="text"
      enterKeyHint="done"
      className="w-full resize-none rounded-lg border border-white/10 bg-[#161a1f] p-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#f3ad61]"
    />

    {/* BOLD / ITALIC / UNDERLINE / ALIGNMENT */}
    <div className="mt-2 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-hide">
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
        className={`${panelButtonClass} h-8 min-w-8 shrink-0 px-2 text-xs ${
          (selectedText
            ? selectedText.bold
            : textBold)
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
        className={`${panelButtonClass} h-8 min-w-8 shrink-0 px-2 text-xs ${
          (selectedText
            ? selectedText.italic
            : textItalic)
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
        className={`${panelButtonClass} h-8 min-w-8 shrink-0 px-2 text-xs ${
          (selectedText
            ? selectedText.underline
            : textUnderline)
            ? 'border-[#f3ad61] bg-[#f3ad61] text-black'
            : ''
        }`}
      >
        U
      </button>

      {/* ALIGNMENT */}
      {(['left', 'center', 'right'] as const).map(
        (align) => (
          <button
            key={align}
            type="button"
            onClick={() => {
              if (selectedText) {
                updateSelectedText({
                  align,
                });
              }

              setTextAlign(align);
            }}
            className={`${panelButtonClass} h-8 min-w-8 shrink-0 px-2 text-xs ${
              (selectedText
                ? selectedText.align
                : textAlign) === align
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
        )
      )}
    </div>

    {/* FONT + FULL TEXT COLOR */}
    <div className="mt-2 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
      {/* FONT */}
      <div className="min-w-[145px] shrink-0">
        <label className="mb-1 block text-[9px] font-semibold text-white/50">
          Font
        </label>

        <select
          value={
            selectedText
              ? selectedText.fontFamily
              : fontFamily
          }
          onChange={(event) => {
            const value = event.target.value;

            if (selectedText) {
              updateSelectedText({
                fontFamily: value,
              });
            }

            setFontFamily(value);
          }}
          className="h-8 w-full rounded-lg border border-white/10 bg-[#2b3238] px-2 text-[10px] font-semibold text-white outline-none"
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

      {/* FULL TEXT COLOR */}
      <div className="min-w-[145px] shrink-0">
        <label className="mb-1 block text-[9px] font-semibold text-white/50">
          Text Color
        </label>

        <div className="flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-[#2b3238] px-2">
          <input
            type="color"
            value={
              selectedText
                ? selectedText.color
                : textColor
            }
            onChange={(event) => {
              const value = event.target.value;

              if (selectedText) {
                updateSelectedText({
                  color: value,
                });
              }

              setTextColor(value);
            }}
            className="h-6 w-8 cursor-pointer border-0 bg-transparent"
          />

          <span className="text-[10px]">
            Full Text
          </span>
        </div>
      </div>
    </div>

    {/* SIZE + OPACITY */}
    <div className="mt-2 flex gap-3 overflow-x-auto whitespace-nowrap scrollbar-hide">
      {/* SIZE */}
      <div className="min-w-[175px] shrink-0">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[9px] font-semibold text-white/50">
            Text Size
          </label>

          <span className="text-[9px] text-white/50">
            {selectedText
              ? selectedText.fontSize
              : textSize}
            px
          </span>
        </div>

        <input
          type="range"
          min="12"
          max="160"
          value={
            selectedText
              ? selectedText.fontSize
              : textSize
          }
          onChange={(event) => {
            const value =
              Number(event.target.value);

            if (selectedText) {
              updateSelectedText({
                fontSize: value,
              });
            }

            setTextSize(value);
          }}
          className="w-full accent-[#f3ad61]"
        />
      </div>

      {/* OPACITY */}
      <div className="min-w-[175px] shrink-0">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[9px] font-semibold text-white/50">
            Opacity
          </label>

          <span className="text-[9px] text-white/50">
            {Math.round(
              (selectedText
                ? selectedText.opacity
                : textOpacity) * 100
            )}
            %
          </span>
        </div>

        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={
            selectedText
              ? selectedText.opacity
              : textOpacity
          }
          onChange={(event) => {
            const value =
              Number(event.target.value);

            if (selectedText) {
              updateSelectedText({
                opacity: value,
              });
            }

            setTextOpacity(value);
          }}
          className="w-full accent-[#f3ad61]"
        />
      </div>
    </div>

    {/* SELECTED WORD / SENTENCE COLOR */}
    <div className="mt-2 rounded-lg border border-white/10 bg-[#161a1f] p-2">
      <div className="mb-1 text-[9px] font-bold text-white/50">
        Selected Word / Sentence Color
      </div>

      <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
        {/* WORD COLOR */}
        <input
          type="color"
          value={wordColor}
          onChange={(event) =>
            setWordColor(event.target.value)
          }
          className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-white/10 bg-transparent"
        />

        {/* APPLY */}
        <button
          type="button"
          onClick={applyWordColor}
          disabled={!selectedWordRange}
          className={`h-8 shrink-0 rounded-lg px-3 text-[10px] font-bold ${
            selectedWordRange
              ? 'bg-[#f3ad61] text-black'
              : 'bg-[#2b3238] text-white/30'
          }`}
        >
          Apply
        </button>

        {/* CLEAR */}
        <button
          type="button"
          onClick={clearWordColor}
          disabled={!selectedWordRange}
          className="h-8 shrink-0 rounded-lg border border-white/10 bg-[#2b3238] px-3 text-[10px] font-bold text-white"
        >
          Clear
        </button>
        
        {/* ADD / DONE */}
    <div className="mt-0 flex gap-2">
      {!selectedText ? (
        <button
          type="button"
          onClick={addText}
          className="h-8 w-25 flex-1 rounded-lg bg-[#f3ad61] text-[10px] font-black text-black"
        >
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
          className="h-9 flex-1 rounded-lg bg-[#f3ad61] text-[10px] font-black text-black"
        >
          Done Editing
        </button>
      )}
    </div>
      </div>
    </div>

    
  </section>
)}



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
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 overflow-x-auto px-1 py-1.5 sm:justify-center sm:gap-2">
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
        onChange={
          selectPhoto
        }
        className="hidden"
      />
    </div>
  );
}
