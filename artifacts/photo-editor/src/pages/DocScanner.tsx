import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {DocumentScanner,ScannerMode,ResponseType,} from "@capgo/capacitor-document-scanner";
import { PDFDocument } from "pdf-lib";
import {
  ArrowLeft, ArrowDown, ArrowUp, Camera, Check, ChevronRight, Clock3,
  FileDown, FileImage, Folder, FolderPlus, Heart, Home,
  Images, MoreVertical, Plus, RotateCw, Search, Star, Trash2,
  X, BriefcaseBusiness, Contact, Pencil, Download,
} from "lucide-react";

type ScanFilter = "original" | "grayscale" | "bw";
type ScanPage = { id: string; dataUrl: string; name: string; rotation: number; size: number };
type ScanDocument = { id: string; name: string; createdAt: number; pages: ScanPage[]; folderId: string | null; favorite: boolean; filter: ScanFilter };
type ScanFolder = { id: string; name: string; createdAt: number };
type DBState = { documents: ScanDocument[]; folders: ScanFolder[] };

const DB_NAME = "photo-equality-scanner-v1";
const STORE = "workspace";
const STATE_KEY = "state";
const initialState: DBState = {
  documents: [],
  folders: [
    { id: "folder-id-cards", name: "ID Cards", createdAt: Date.now() },
    { id: "folder-bills", name: "Bills", createdAt: Date.now() },
  ],
};

function openScannerDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("This browser does not support local document storage."));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open document storage."));
  });
}
async function readSavedState(): Promise<DBState | null> {
  const db = await openScannerDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(STATE_KEY);
    request.onsuccess = () => { db.close(); resolve((request.result as DBState | undefined) ?? null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}
async function writeSavedState(state: DBState): Promise<void> {
  const db = await openScannerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, STATE_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Could not save documents.")); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Saving documents was cancelled.")); };
  });
}
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image."));
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}
function scanBase64ToDataUrl(value: string): { dataUrl: string; size: number } {
  if (value.startsWith("data:image/")) {
    const base64 = value.split(",", 2)[1] ?? "";
    return { dataUrl: value, size: Math.floor((base64.length * 3) / 4) };
  }
  // The native scanner can return raw base64 when responseType is "base64".
  const base64 = value.replace(/^data:[^,]*,/, "");
  return {
    dataUrl: `data:image/jpeg;base64,${base64}`,
    size: Math.floor((base64.length * 3) / 4),
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 100 * 1024 ? 2 : 0)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "Just now";
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))} hours ago`;
  if (diff < 7 * 24 * 60 * 60_000) return `${Math.floor(diff / (24 * 60 * 60_000))} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function filterCss(filter: ScanFilter): string {
  return filter === "grayscale" ? "grayscale(1)" : filter === "bw" ? "grayscale(1) contrast(2)" : "none";
}

export default function PdfScanner() {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [dbState, setDbState] = useState<DBState>(initialState);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "tools" | "idphoto">("home");
  const [category, setCategory] = useState<"all" | "recent" | "favorite" | "business">("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showMainAdd, setShowMainAdd] = useState(false);
  const [showPageAdd, setShowPageAdd] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [menuDocId, setMenuDocId] = useState<string | null>(null);
  const [menuFolderId, setMenuFolderId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftName, setDraftName] = useState("Photo-Equality-Scan");
  const [filter, setFilter] = useState<ScanFilter>("original");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ kind: "document" | "folder"; id: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    let alive = true;
    readSavedState().then((saved) => {
      if (!alive) return;
      if (saved) setDbState(saved);
      setLoaded(true);
    }).catch((error) => {
      console.error("Scanner storage load failed:", error);
      if (alive) { setLoaded(true); setMessage("Local storage could not be opened. Please use a supported browser."); }
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    writeSavedState(dbState).catch((error) => {
      console.error("Scanner storage save failed:", error);
      setMessage("Could not save changes. Your browser storage may be full.");
    });
  }, [dbState, loaded]);

  const activeDocument = dbState.documents.find((doc) => doc.id === activeDocumentId) ?? null;
  const activeFolder = dbState.folders.find((folder) => folder.id === activeFolderId) ?? null;
  const visibleDocuments = useMemo(() => {
    let docs = [...dbState.documents];
    if (activeFolderId) docs = docs.filter((doc) => doc.folderId === activeFolderId);
    if (category === "favorite") docs = docs.filter((doc) => doc.favorite);
    if (category === "recent") docs.sort((a, b) => b.createdAt - a.createdAt);
    if (category === "business") docs = docs.filter((doc) => /business|card|visiting/i.test(doc.name));
    const query = searchText.trim().toLowerCase();
    if (query) docs = docs.filter((doc) => doc.name.toLowerCase().includes(query));
    return docs;
  }, [dbState.documents, activeFolderId, category, searchText]);

  async function addFiles(fileList: FileList | null, targetDocumentId: string | null = activeDocumentId, source: "camera" | "gallery" = "gallery") {
    if (!fileList?.length) return;
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (!files.length) { setMessage("Please choose image files."); return; }
    setBusy(true); setMessage("");
    try {
      const newPages: ScanPage[] = await Promise.all(files.map(async (file, index) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        dataUrl: await fileToDataUrl(file),
        // Some phone/browser cameras return a meaningless name like 100000000000000000000000.01.
        // Use a clean, predictable name for camera captures; preserve real gallery filenames.
        name: source === "camera" ? `Scanned page ${index + 1}.jpg` : file.name,
        rotation: 0,
        size: file.size,
      })));
      if (targetDocumentId) {
        setDbState((current) => ({
          ...current,
          documents: current.documents.map((doc) => doc.id === targetDocumentId ? { ...doc, pages: [...doc.pages, ...newPages] } : doc),
        }));
        setActiveDocumentId(targetDocumentId);
        setMessage(`${newPages.length} page(s) added.`);
      } else {
        const firstName = source === "camera"
          ? `Scan ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "") : `Scan ${new Date().toLocaleDateString()}`;
        const doc: ScanDocument = { id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: firstName || "Untitled scan", createdAt: Date.now(), pages: newPages, folderId: activeFolderId, favorite: false, filter: "original" };
        setDbState((current) => ({ ...current, documents: [doc, ...current.documents] }));
        setActiveDocumentId(doc.id);
        setDraftName(doc.name);
        setFilter("original");
        setMessage(`${newPages.length} page(s) added. Tap Create PDF to export.`);
      }
      setShowMainAdd(false); setShowPageAdd(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add images.");
    } finally { setBusy(false); }
  }

  async function startDocumentScan() {
    // Native Android: use Google ML Kit for automatic document detection,
    // perspective correction, rotation, multi-page capture, and high-quality output.
    // Web preview/browser: fall back to the normal camera file input.
    if (Capacitor.getPlatform() !== "android") {
      cameraRef.current?.click();
      return;
    }
    if (busy) return;
    setBusy(true);
    setMessage("Opening document scanner…");
    try {
      const result = await DocumentScanner.scanDocument({
        croppedImageQuality: 100,
        letUserAdjustCrop: true,
        maxNumDocuments: 24,
        responseType: ResponseType.Base64,
        scannerMode: ScannerMode.Full,
      });
      const scannedImages = result.scannedImages ?? [];
      if (!scannedImages.length) {
        setMessage("Scan cancelled or no pages were captured.");
        return;
      }
      setMessage("Saving high-quality scanned pages…");
      const newPages: ScanPage[] = scannedImages.map((imageData, index) => {
        const image = scanBase64ToDataUrl(imageData);
        return {
          id: `scan-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
          dataUrl: image.dataUrl,
          name: `Scanned page ${index + 1}.jpg`,
          rotation: 0,
          size: image.size,
        };
      });
      const targetDocumentId = activeDocumentId;
      if (targetDocumentId) {
        setDbState((current) => ({
          ...current,
          documents: current.documents.map((doc) => doc.id === targetDocumentId ? { ...doc, pages: [...doc.pages, ...newPages] } : doc),
        }));
        setActiveDocumentId(targetDocumentId);
        setMessage(`${newPages.length} high-quality page(s) added.`);
      } else {
        const name = `Scan ${new Date().toLocaleDateString()}`;
        const doc: ScanDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name,
          createdAt: Date.now(),
          pages: newPages,
          folderId: activeFolderId,
          favorite: false,
          filter: "original",
        };
        setDbState((current) => ({ ...current, documents: [doc, ...current.documents] }));
        setActiveDocumentId(doc.id);
        setDraftName(name);
        setFilter("original");
        setMessage(`${newPages.length} high-quality page(s) scanned. You can now export the PDF.`);
      }
      setShowMainAdd(false);
      setShowPageAdd(false);
    } catch (error) {
      console.error("Document scan failed:", error);
      setMessage(error instanceof Error ? error.message : "Could not scan document. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function updateDocument(id: string, updater: (doc: ScanDocument) => ScanDocument) {
    setDbState((current) => ({ ...current, documents: current.documents.map((doc) => doc.id === id ? updater(doc) : doc) }));
  }
  function updatePage(docId: string, pageId: string, updater: (page: ScanPage) => ScanPage) {
    updateDocument(docId, (doc) => ({ ...doc, pages: doc.pages.map((page) => page.id === pageId ? updater(page) : page) }));
  }
  function removePage(docId: string, pageId: string) {
    const doc = dbState.documents.find((item) => item.id === docId);
    if (!doc) return;
    const remaining = doc.pages.filter((page) => page.id !== pageId);
    if (!remaining.length) {
      setDbState((current) => ({ ...current, documents: current.documents.filter((item) => item.id !== docId) }));
      setActiveDocumentId(null);
    } else updateDocument(docId, (item) => ({ ...item, pages: remaining }));
  }
  function movePage(docId: string, index: number, direction: -1 | 1) {
    updateDocument(docId, (doc) => {
      const next = [...doc.pages]; const target = index + direction;
      if (target < 0 || target >= next.length) return doc;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...doc, pages: next };
    });
  }
  function createFolder() {
    const name = folderName.trim();
    if (!name) return;
    setDbState((current) => ({ ...current, folders: [...current.folders, { id: `folder-${Date.now()}`, name, createdAt: Date.now() }] }));
    setFolderName(""); setShowNewFolder(false); setMessage(`Folder “${name}” created.`);
  }
  function deleteDocument(id: string) {
    setDbState((current) => ({ ...current, documents: current.documents.filter((doc) => doc.id !== id) }));
    if (activeDocumentId === id) setActiveDocumentId(null);
    setMenuDocId(null);
  }
  function deleteFolder(id: string) {
    setDbState((current) => ({ ...current, folders: current.folders.filter((folder) => folder.id !== id), documents: current.documents.map((doc) => doc.folderId === id ? { ...doc, folderId: null } : doc) }));
    if (activeFolderId === id) setActiveFolderId(null);
    setMenuFolderId(null);
  }
  function saveRename() {
    const name = renameValue.trim(); if (!name || !renameTarget) return;
    if (renameTarget.kind === "document") updateDocument(renameTarget.id, (doc) => ({ ...doc, name }));
    else setDbState((current) => ({ ...current, folders: current.folders.map((folder) => folder.id === renameTarget.id ? { ...folder, name } : folder) }));
    setRenameTarget(null); setRenameValue("");
  }

  async function makePdf(doc: ScanDocument) {
    if (!doc.pages.length || busy) return;
    setBusy(true); setMessage("Creating your PDF...");
    try {
      const pdf = await PDFDocument.create();
      for (const item of doc.pages) {
        const image = new Image(); image.src = item.dataUrl;
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error(`Could not read ${item.name || "an image"}.`)); });
        const sourceWidth = image.naturalWidth; const sourceHeight = image.naturalHeight;
        const canvas = document.createElement("canvas"); const sideways = item.rotation % 180 !== 0;
        canvas.width = sideways ? sourceHeight : sourceWidth; canvas.height = sideways ? sourceWidth : sourceHeight;
        const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas is not supported.");
        ctx.filter = filterCss(doc.filter); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.drawImage(image, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image conversion failed.")), "image/jpeg", 0.98));
        const embedded = await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        const pageWidth = 595.28; const pageHeight = 841.89; const margin = 24;
        const scale = Math.min((pageWidth - margin * 2) / embedded.width, (pageHeight - margin * 2) / embedded.height);
        const drawWidth = embedded.width * scale; const drawHeight = embedded.height * scale;
        const page = pdf.addPage([pageWidth, pageHeight]);
        page.drawImage(embedded, { x: (pageWidth - drawWidth) / 2, y: (pageHeight - drawHeight) / 2, width: drawWidth, height: drawHeight });
      }
      const bytes = await pdf.save(); const pdfBuffer = new ArrayBuffer(bytes.byteLength); new Uint8Array(pdfBuffer).set(bytes); const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = `${(draftName.trim() || doc.name || "Photo-Equality-Scan").replace(/[\\/:*?"<>|]/g, "-")}.pdf`;
      document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMessage("PDF created. If it did not save, check your downloads.");
    } catch (error) { console.error("PDF creation failed:", error); setMessage(error instanceof Error ? error.message : "Could not create PDF."); }
    finally { setBusy(false); }
  }

  const totalPages = (doc: ScanDocument) => doc.pages.length;
  const totalSize = (doc: ScanDocument) => doc.pages.reduce((sum, page) => sum + page.size, 0);
  const buttonBase = "inline-flex items-center justify-center gap-2 rounded-xl transition active:scale-[.98]";

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#263238]">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void addFiles(e.target.files, activeDocumentId, "camera"); e.currentTarget.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void addFiles(e.target.files); e.currentTarget.value = ""; }} />

      <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 bg-[#1d3947] px-4 text-white shadow-md">
        {activeDocument ? (
          <button className="rounded-full p-2 hover:bg-white/10" aria-label="Back to documents" onClick={() => { setActiveDocumentId(null); setMessage(""); }}><ArrowLeft size={25} /></button>
        ) : (
          <button className="rounded-full p-2 hover:bg-white/10" aria-label="Open menu" onClick={() => setMessage("Photo-Equality PDF Scanner")}> <span className="text-2xl leading-none">☰</span> </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold sm:text-2xl">{activeDocument ? activeDocument.name : activeFolder ? activeFolder.name : "Doc Scanner"}</h1>
          {activeDocument && <p className="text-xs text-white/65">{activeDocument.pages.length} pages · {formatDate(activeDocument.createdAt)}</p>}
        </div>
        {activeDocument ? (
          <>
            <button className="rounded-full p-2 hover:bg-white/10" title="Create PDF" onClick={() => void makePdf(activeDocument)}><FileDown size={23} /></button>
            <button className="rounded-full p-2 hover:bg-white/10" title="Document options" onClick={() => setMenuDocId(menuDocId === activeDocument.id ? null : activeDocument.id)}><MoreVertical size={24} /></button>
          </>
        ) : (
          <>
            <button className="rounded-full p-2 hover:bg-white/10" aria-label="Search documents" onClick={() => setSearchOpen((open) => !open)}><Search size={25} /></button>
            <button className="rounded-full p-2 hover:bg-white/10" aria-label="Settings" onClick={() => setMessage("Scans are saved on this device using browser storage.")}><MoreVertical size={24} /></button>
          </>
        )}
      </header>

      {!activeDocument && (
        <nav className="sticky top-[68px] z-20 grid grid-cols-3 border-b border-gray-200 bg-white shadow-sm">
          <button onClick={() => { setActiveTab("home"); setActiveFolderId(null); }} className={`flex items-center justify-center gap-2 border-b-2 px-2 py-4 text-sm sm:text-base ${activeTab === "home" ? "border-sky-600 font-semibold text-sky-700" : "border-transparent text-gray-500"}`}><Home size={22} />Home</button>
          <button onClick={() => setActiveTab("tools")} className={`flex items-center justify-center gap-2 border-b-2 px-2 py-4 text-sm sm:text-base ${activeTab === "tools" ? "border-sky-600 font-semibold text-sky-700" : "border-transparent text-gray-500"}`}><BriefcaseBusiness size={22} />PDF Tools</button>
          <button onClick={() => setActiveTab("idphoto")} className={`flex items-center justify-center gap-2 border-b-2 px-2 py-4 text-sm sm:text-base ${activeTab === "idphoto" ? "border-sky-600 font-semibold text-sky-700" : "border-transparent text-gray-500"}`}><Contact size={22} />ID Photo</button>
        </nav>
      )}

      <div className="mx-auto max-w-5xl px-4 pb-32 pt-5 sm:px-6">
        {searchOpen && !activeDocument && <div className="mb-4 flex items-center gap-2 rounded-xl border bg-white px-3"><Search size={19} className="text-gray-400" /><input autoFocus value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search documents..." className="w-full bg-transparent py-3 outline-none" /><button onClick={() => { setSearchText(""); setSearchOpen(false); }}><X size={18} /></button></div>}

        {activeDocument ? (
          <div className="space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Pages ({activeDocument.pages.length})</h2><p className="text-sm text-gray-500">Reorder, rotate, or remove pages.</p></div><button className={`${buttonBase} border border-gray-200 px-3 py-2 text-sm`} onClick={() => setShowPageAdd((open) => !open)}><Plus size={17} />Add pages</button></div>
              {showPageAdd && <div className="mb-4 flex flex-wrap gap-2 rounded-xl bg-gray-50 p-3"><button className={`${buttonBase} bg-sky-600 px-4 py-2 text-white`} onClick={() => { setShowPageAdd(false); void startDocumentScan(); }}><Camera size={18} />Camera</button><button className={`${buttonBase} border border-gray-300 bg-white px-4 py-2`} onClick={() => { setShowPageAdd(false); galleryRef.current?.click(); }}><Images size={18} />Gallery</button></div>}
              {activeDocument.pages.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-gray-500">No pages yet. Tap Add pages to scan or select images.</p> : <div className="space-y-3">{activeDocument.pages.map((page, index) => <article key={page.id} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:gap-5 sm:p-4"><div className="flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-gray-50 sm:h-32 sm:w-28"><img src={page.dataUrl} alt={`Page ${index + 1}`} className="max-h-full max-w-full object-contain" style={{ transform: `rotate(${page.rotation}deg)`, filter: filterCss(activeDocument.filter) }} /></div><div className="min-w-0 flex-1"><p className="font-medium">{page.name || `Page ${index + 1}`}</p><p className="mt-1 text-sm text-gray-500">Page {index + 1}</p><p className="mt-1 text-sm text-gray-500">{formatBytes(page.size)}</p><div className="mt-3 flex flex-wrap gap-1"><button title="Move up" disabled={index === 0} onClick={() => movePage(activeDocument.id, index, -1)} className="rounded-lg border p-2 disabled:opacity-30"><ArrowUp size={16} /></button><button title="Move down" disabled={index === activeDocument.pages.length - 1} onClick={() => movePage(activeDocument.id, index, 1)} className="rounded-lg border p-2 disabled:opacity-30"><ArrowDown size={16} /></button><button title="Rotate" onClick={() => updatePage(activeDocument.id, page.id, (item) => ({ ...item, rotation: (item.rotation + 90) % 360 }))} className="rounded-lg border p-2"><RotateCw size={16} /></button><button title="Delete page" onClick={() => removePage(activeDocument.id, page.id)} className="rounded-lg border border-red-100 p-2 text-red-600"><Trash2 size={16} /></button></div></div></article>)}</div>}
            </section>
            <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold">PDF settings</h2>
              <label className="block space-y-2 text-sm"><span className="font-medium">Document filter</span><select value={activeDocument.filter} onChange={(e) => updateDocument(activeDocument.id, (doc) => ({ ...doc, filter: e.target.value as ScanFilter }))} className="w-full rounded-xl border border-gray-300 bg-white p-3"><option value="original">Original Color</option><option value="grayscale">Grayscale</option><option value="bw">Black &amp; White</option></select></label>
              <label className="block space-y-2 text-sm"><span className="font-medium">PDF file name</span><input value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={100} className="w-full rounded-xl border border-gray-300 p-3" placeholder="Enter PDF name" /></label>
              <button disabled={!activeDocument.pages.length || busy} onClick={() => void makePdf(activeDocument)} className={`${buttonBase} w-full bg-[#f3ad61] px-4 py-3 font-bold text-[#20252d] disabled:cursor-not-allowed disabled:opacity-50`}><FileDown size={20} />{busy ? "Creating PDF..." : "Create & Download PDF"}</button>
            </section>
          </div>
        ) : activeTab === "tools" ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">PDF Tools</h2><p className="mt-1 text-sm text-gray-500">Choose images to create a PDF, or open a saved scan to export it again.</p><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => galleryRef.current?.click()} className={`${buttonBase} min-h-28 flex-col border border-gray-200 p-4`}><Images size={28} className="text-sky-600" />Images to PDF</button><button onClick={() => void startDocumentScan()} className={`${buttonBase} min-h-28 flex-col border border-gray-200 p-4`}><Camera size={28} className="text-sky-600" />Scan to PDF</button></div><h3 className="mt-6 font-semibold">Saved documents</h3><div className="mt-2 space-y-2">{dbState.documents.map((doc) => <button key={doc.id} onClick={() => { setActiveDocumentId(doc.id); setDraftName(doc.name); }} className="flex w-full items-center gap-3 rounded-xl border p-3 text-left"><FileImage className="text-sky-600" /><span className="min-w-0 flex-1 truncate">{doc.name}</span><ChevronRight size={18} /></button>)}</div></section>
        ) : activeTab === "idphoto" ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Import ID Photo</h2><p className="mt-1 text-sm text-gray-500">Select an ID card or photo to save it as a document, then export it as PDF.</p><button onClick={() => galleryRef.current?.click()} className={`${buttonBase} mt-5 w-full bg-sky-600 px-4 py-3 font-semibold text-white`}><Images size={20} />Choose ID photo</button><button onClick={() => void startDocumentScan()} className={`${buttonBase} mt-2 w-full border border-gray-300 px-4 py-3 font-semibold`}><Camera size={20} />Take photo</button></section>
        ) : (
          <>
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {([{ id: "all", label: "All docs", icon: <FileImage size={17} /> }, { id: "recent", label: "Recent", icon: <Clock3 size={17} /> }, { id: "favorite", label: "Favourite", icon: <Star size={17} /> }, { id: "business", label: "Business Card", icon: <Contact size={17} /> }] as const).map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`${buttonBase} shrink-0 rounded-full border px-4 py-2 text-sm ${category === item.id ? "border-sky-600 bg-sky-600 text-white" : "border-gray-300 bg-white text-gray-600"}`}>{item.icon}{item.label}</button>)}
            </div>
            {!activeFolder && <section className="mb-7"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-gray-700">Folders ({dbState.folders.length})</h2><button title="Create folder" onClick={() => setShowNewFolder(true)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-200"><FolderPlus size={26} /></button></div>
              {showNewFolder && <form className="mb-3 flex gap-2 rounded-xl border bg-white p-3" onSubmit={(e) => { e.preventDefault(); createFolder(); }}><input autoFocus value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Folder name" className="min-w-0 flex-1 rounded-lg border px-3 py-2" /><button className="rounded-lg bg-sky-600 px-3 py-2 text-white"><Check size={18} /></button><button type="button" onClick={() => setShowNewFolder(false)} className="rounded-lg border px-3"><X size={18} /></button></form>}
              <div className="space-y-3">{dbState.folders.map((folder) => { const count = dbState.documents.filter((doc) => doc.folderId === folder.id).length; return <article key={folder.id} className="relative flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><button onClick={() => setActiveFolderId(folder.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left"><Folder size={58} strokeWidth={1.5} fill="#1d3947" color="#1d3947" className="shrink-0" /><span className="min-w-0"><span className="block truncate text-lg text-gray-700">{folder.name}</span><span className="mt-1 block text-sm text-gray-500">{formatDate(folder.createdAt)} · {count} {count === 1 ? "document" : "documents"}</span></span></button><button onClick={() => setMenuFolderId(menuFolderId === folder.id ? null : folder.id)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><MoreVertical size={22} /></button>{menuFolderId === folder.id && <div className="absolute right-3 top-14 z-20 w-40 rounded-xl border bg-white p-1 shadow-xl"><button onClick={() => { setRenameTarget({ kind: "folder", id: folder.id }); setRenameValue(folder.name); setMenuFolderId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"><Pencil size={15} />Rename</button><button onClick={() => deleteFolder(folder.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={15} />Delete folder</button></div>}</article>; })}</div>
            </section>}
            <section><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-gray-700">Documents ({visibleDocuments.length})</h2>{activeFolder && <button onClick={() => setActiveFolderId(null)} className="text-sm text-sky-700">All folders</button>}</div>
              {visibleDocuments.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center"><FileImage size={38} className="mx-auto text-gray-300" /><p className="mt-3 font-medium text-gray-600">No documents yet</p><p className="mt-1 text-sm text-gray-500">Tap the + button to scan a document or choose photos.</p></div> : <div className="space-y-3">{visibleDocuments.map((doc) => <article key={doc.id} className="relative flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-4"><button onClick={() => { setActiveDocumentId(doc.id); setDraftName(doc.name); setFilter(doc.filter); setMessage(""); }} className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4"><div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-gray-50 sm:h-24 sm:w-24">{doc.pages[0] ? <img src={doc.pages[0].dataUrl} alt="Document thumbnail" className="max-h-full max-w-full object-contain" style={{ transform: `rotate(${doc.pages[0].rotation}deg)` }} /> : <FileImage size={32} className="text-gray-300" />}</div><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-base font-medium text-gray-700 sm:text-lg">{doc.name}</span>{doc.favorite && <Star size={15} fill="#f3ad61" color="#d9913d" className="shrink-0" />}</span><span className="mt-1 block text-sm text-gray-500">{formatDate(doc.createdAt)}</span><span className="mt-1 block text-sm text-gray-500">{totalPages(doc)} {totalPages(doc) === 1 ? "page" : "pages"} · {formatBytes(totalSize(doc))}</span></span></button><button onClick={() => setMenuDocId(menuDocId === doc.id ? null : doc.id)} className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label={`Options for ${doc.name}`}><MoreVertical size={22} /></button>{menuDocId === doc.id && <div className="absolute right-3 top-14 z-20 w-48 rounded-xl border bg-white p-1 shadow-xl"><button onClick={() => { updateDocument(doc.id, (item) => ({ ...item, favorite: !item.favorite })); setMenuDocId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"><Heart size={16} />{doc.favorite ? "Remove favourite" : "Add to favourite"}</button><button onClick={() => { setRenameTarget({ kind: "document", id: doc.id }); setRenameValue(doc.name); setMenuDocId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"><Pencil size={16} />Rename</button><button onClick={() => { setDbState((current) => ({ ...current, documents: current.documents.map((item) => item.id === doc.id ? { ...item, folderId: activeFolderId } : item) })); setMenuDocId(null); setMessage(activeFolderId ? "Document moved to folder." : "Document moved to All docs."); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"><Folder size={16} />{activeFolderId ? "Move to this folder" : "Move to root"}</button><button onClick={() => { setDraftName(doc.name); setActiveDocumentId(doc.id); setMenuDocId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"><Download size={16} />Open / export PDF</button><button onClick={() => deleteDocument(doc.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={16} />Delete document</button></div>}</article>)}</div>}
            </section>
          </>
        )}
        {message && <p role="status" className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">{message}</p>}
        {!loaded && <p className="mt-4 text-center text-sm text-gray-500">Loading saved documents…</p>}
      </div>

      {!activeDocument && activeTab === "home" && <div className="fixed bottom-6 right-5 z-40 sm:bottom-8 sm:right-8"><div className="relative"><button onClick={() => setShowMainAdd((open) => !open)} aria-label="Add scan" className="flex h-16 items-center gap-3 rounded-full bg-sky-600 px-6 text-white shadow-xl hover:bg-sky-700"><Camera size={25} /><span className="h-8 w-px bg-white/40" /><Plus size={30} /></button>{showMainAdd && <div className="absolute bottom-20 right-0 z-50 w-52 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl"><button onClick={() => { setShowMainAdd(false); void startDocumentScan(); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-gray-100"><Camera size={21} className="text-sky-700" /><span><span className="block font-medium">Camera</span><span className="text-xs text-gray-500">Scan a document</span></span></button><button onClick={() => { setShowMainAdd(false); galleryRef.current?.click(); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-gray-100"><Images size={21} className="text-sky-700" /><span><span className="block font-medium">Gallery</span><span className="text-xs text-gray-500">Choose photos</span></span></button></div>}</div></div>}

      {renameTarget && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"><form onSubmit={(e) => { e.preventDefault(); saveRename(); }} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><h2 className="text-lg font-semibold">Rename {renameTarget.kind}</h2><input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={100} className="mt-4 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-sky-500" /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setRenameTarget(null)} className="rounded-xl border px-4 py-2">Cancel</button><button type="submit" className="rounded-xl bg-sky-600 px-4 py-2 font-medium text-white">Save</button></div></form></div>}
      {busy && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 p-4"><div className="rounded-2xl bg-white px-6 py-4 font-medium shadow-xl">{message || "Working…"}</div></div>}
    </main>
  );
}
