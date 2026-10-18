import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import { MAX_FILE_BYTES, MAX_PAGES, MAX_FILES, MIN_PDF_BYTES } from './limits';

export { MAX_FILE_BYTES, MAX_PAGES, MAX_FILES, MIN_PDF_BYTES } from './limits';

// Point PDF.js at the worker so PDF-to-PNG rendering works in the browser.
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export async function validatePdf(file: File): Promise<Uint8Array> {
  if (file.size > MAX_FILE_BYTES) throw new Error('File is over the 50 MB limit.');
  if (file.size < MIN_PDF_BYTES) throw new Error('This file is too small to be a PDF.');
  const bytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const head = new TextDecoder().decode(bytes);
  if (!head.includes('%PDF-')) throw new Error('This file does not have a PDF signature.');
  return new Uint8Array(await file.arrayBuffer());
}

export async function loadPdf(file: File): Promise<PDFDocument> {
  const bytes = await validatePdf(file);
  let doc: PDFDocument;
  try { doc = await PDFDocument.load(bytes, { throwOnInvalidObject: true, updateMetadata: false }); }
  catch { throw new Error('Could not read this PDF. It may be malformed or password protected.'); }
  if (doc.getPageCount() < 1 || doc.getPageCount() > MAX_PAGES) throw new Error('PDF must contain 1–300 pages.');
  return doc;
}

export function parseRanges(input: string, pageCount: number): number[] {
  const result: number[] = [];
  const pieces = input.split(',').map((p) => p.trim()).filter(Boolean);
  if (!pieces.length) throw new Error('Enter page numbers such as 1, 3-5.');
  for (const part of pieces) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!match) throw new Error(`Invalid page range: ${part}`);
    const start = Number(match[1]); const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > pageCount) throw new Error(`Pages must be between 1 and ${pageCount}.`);
    for (let page = start; page <= end; page++) if (!result.includes(page - 1)) result.push(page - 1);
  }
  return result;
}

export async function pageTool(file: File, action: string, ranges = '', rotation = 90): Promise<Uint8Array> {
  const source = await loadPdf(file);
  const count = source.getPageCount();
  const output = await PDFDocument.create();
  if (action === 'extract') {
    const selected = parseRanges(ranges, count);
    const pages = await output.copyPages(source, selected); pages.forEach((p) => output.addPage(p));
  } else if (action === 'split') {
    const selected = parseRanges(ranges, count);
    const pages = await output.copyPages(source, selected); pages.forEach((p) => output.addPage(p));
  } else if (action === 'delete') {
    const remove = new Set(parseRanges(ranges, count));
    if (remove.size === count) throw new Error('At least one page must remain.');
    const selected = Array.from({ length: count }, (_, i) => i).filter((i) => !remove.has(i));
    (await output.copyPages(source, selected)).forEach((p) => output.addPage(p));
  } else if (action === 'reorder') {
    const selected = parseRanges(ranges, count);
    if (selected.length !== count) throw new Error('Reorder needs every page number exactly once, in the new order.');
    (await output.copyPages(source, selected)).forEach((p) => output.addPage(p));
  } else {
    const pages = await output.copyPages(source, Array.from({ length: count }, (_, i) => i));
    pages.forEach((p) => output.addPage(p));
    if (action === 'rotate') for (const page of output.getPages()) page.setRotation(degrees(((page.getRotation().angle + rotation) % 360 + 360) % 360));
  }
  return output.save({ useObjectStreams: true });
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  if (files.length < 2 || files.length > MAX_FILES) throw new Error('Choose 2–20 PDFs.');
  const out = await PDFDocument.create();
  for (const file of files) {
    const doc = await loadPdf(file);
    if (out.getPageCount() + doc.getPageCount() > MAX_PAGES) throw new Error('Combined result exceeds the 300-page limit.');
    (await out.copyPages(doc, doc.getPageIndices())).forEach((p) => out.addPage(p));
  }
  return out.save({ useObjectStreams: true });
}

export async function compressPdf(file: File): Promise<Uint8Array> {
  const doc = await loadPdf(file);
  return doc.save({ useObjectStreams: true, objectsPerTick: 50 });
}

export async function numberPdf(file: File, start: number, position: 'bottom' | 'top'): Promise<Uint8Array> {
  const doc = await loadPdf(file); const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.getPages().forEach((page, index) => {
    const { width, height } = page.getSize(); const label = String(start + index);
    page.drawText(label, { x: Math.max(20, (width - font.widthOfTextAtSize(label, 10)) / 2), y: position === 'bottom' ? 18 : height - 28, size: 10, font, color: rgb(0.25, 0.3, 0.36) });
  });
  return doc.save({ useObjectStreams: true });
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  if (!files.length || files.length > MAX_FILES) throw new Error('Choose 1–20 images.');
  const doc = await PDFDocument.create();
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) throw new Error('An image is over the 50 MB limit.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    let image;
    if (file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)) image = await doc.embedJpg(bytes);
    else if (file.type === 'image/png' || /\.png$/i.test(file.name)) image = await doc.embedPng(bytes);
    else throw new Error('Only JPG and PNG images are supported.');
    const page = doc.addPage([image.width, image.height]); page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  return doc.save({ useObjectStreams: true });
}

export async function pdfToImages(file: File, scale = 1.5): Promise<{ name: string; blob: Blob }[]> {
    const bytes = await validatePdf(file);
  ensureMapCompat();
  const pdfjs = await import('pdfjs-dist');
  // This uses the rendering API only; the scripting-capable viewer is not included.
  const task = pdfjs.getDocument({ data: bytes, maxImageSize: 30_000_000 });
    const pdf = await task.promise;
  if (pdf.numPages > MAX_PAGES) { await task.destroy(); throw new Error('PDF must contain no more than 300 pages.'); }
  const results: { name: string; blob: Blob }[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n); const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas is unavailable in this browser.');
    await page.render({ canvasContext: context, viewport, canvas } as never).promise;
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Image export failed.')), 'image/png'));
    results.push({ name: `${file.name.replace(/\.pdf$/i, '')}-page-${n}.png`, blob }); canvas.width = 0; canvas.height = 0;
  }
    await task.destroy(); return results;
}

function ensureMapCompat() {
  if (typeof Map.prototype.getOrInsertComputed === 'function') return;
  Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
    configurable: true,
    writable: true,
    value<T>(this: Map<unknown, T>, key: unknown, callback: (key: unknown, map: Map<unknown, T>) => T): T {
      if (this.has(key)) return this.get(key)!;
      const value = callback(key, this);
      if (!this.has(key)) this.set(key, value);
      return this.get(key)!;
    },
  });
}

export async function protectPdf(file: File, userPassword: string): Promise<Uint8Array> {
  if (userPassword.length < 8) throw new Error('Use a password of at least 8 characters.');
  const bytes = await validatePdf(file);
  const { load } = await import('@wasm-zoo/qpdf'); const qpdf = await load();
  try {
    const result = await qpdf.exec(['--encrypt', userPassword, userPassword, '256', '--', '/input.pdf', '/output.pdf'], { files: [{ name: '/input.pdf', data: bytes }], outputs: ['/output.pdf'] });
    if (result.exitCode !== 0 || !result.files?.length) throw new Error('PDF encryption failed.');
    return result.files[0].data;
  } finally { qpdf.dispose(); }
}

export async function unlockPdf(file: File, password: string, authorized: boolean): Promise<Uint8Array> {
  if (!authorized) throw new Error('Confirm that you own the document or have authorization to modify it.');
  if (!password) throw new Error('Enter the document password.');
  const bytes = await validatePdf(file);
  const { load } = await import('@wasm-zoo/qpdf'); const qpdf = await load();
  try {
    const result = await qpdf.exec(['--password=' + password, '--decrypt', '/input.pdf', '/output.pdf'], { files: [{ name: '/input.pdf', data: bytes }], outputs: ['/output.pdf'] });
    if (result.exitCode !== 0 || !result.files?.length) throw new Error('Could not unlock the PDF. Check the password and authorization.');
    return result.files[0].data;
  } finally { qpdf.dispose(); }
}

export function downloadBytes(bytes: Uint8Array, name: string, type = 'application/pdf') {
  const safeName = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 120);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([buffer], { type }));
  const link = document.createElement('a'); link.href = url; link.download = safeName; link.hidden = true;
  document.body.append(link); link.click();
  window.setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 30_000);
}

export function downloadBlob(blob: Blob, name: string) {
  const safeName = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 120);
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = safeName; link.hidden = true;
  document.body.append(link); link.click();
  window.setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 30_000);
}

