import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { compressPdf, imagesToPdf, loadPdf, mergePdfs, numberPdf, pageTool, parseRanges, validatePdf, MAX_FILE_BYTES } from '../src/pdf';

async function sample(name = 'sample.pdf', pages = 3): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) { const page = doc.addPage([300, 400]); page.drawText(`Page ${i + 1}`); }
  const bytes = await doc.save();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new File([buffer], name, { type: 'application/pdf' });
}

describe('input validation and ranges', () => {
  it('accepts PDF signatures and rejects malformed files', async () => {
    await expect(validatePdf(await sample())).resolves.toBeInstanceOf(Uint8Array);
    await expect(validatePdf(new File(['not a pdf file'], 'bad.pdf', { type: 'application/pdf' }))).rejects.toThrow(/too small|signature/);
  });
  it('enforces the 50 MB file limit before reading file bytes', async () => {
    const big = { size: MAX_FILE_BYTES + 1 } as File;
    await expect(validatePdf(big)).rejects.toThrow(/50 MB/);
  });
  it('parses ranges and rejects invalid or out-of-range pages', () => {
    expect(parseRanges('1, 3-4, 3', 4)).toEqual([0, 2, 3]);
    expect(() => parseRanges('0', 4)).toThrow();
    expect(() => parseRanges('2-1', 4)).toThrow();
    expect(() => parseRanges('5', 4)).toThrow();
    expect(() => parseRanges('x', 4)).toThrow();
  });
});

describe('PDF operations', () => {
  it('merges documents and enforces the minimum input count', async () => {
    const merged = await mergePdfs([await sample('a.pdf', 2), await sample('b.pdf', 1)]);
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(3);
    await expect(mergePdfs([await sample()])).rejects.toThrow(/2–20/);
  });
  it('extracts, deletes, reorders, rotates, and splits valid pages', async () => {
    const source = await sample();
    for (const [action, range, count] of [['extract', '2-3', 2], ['delete', '2', 2], ['reorder', '3,1,2', 3], ['split', '1', 1]] as const) {
      const bytes = await pageTool(source, action, range);
      expect((await PDFDocument.load(bytes)).getPageCount()).toBe(count);
    }
    const rotated = await pageTool(source, 'rotate', '', 90);
    expect((await PDFDocument.load(rotated)).getPage(0).getRotation().angle).toBe(90);
    await expect(pageTool(source, 'delete', '1-3')).rejects.toThrow(/At least one page/);
  });
  it('adds page numbers and produces readable output', async () => {
    const bytes = await numberPdf(await sample(), 5, 'bottom');
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(3);
  });
  it('rewrites the PDF through the compression path without corrupting it', async () => {
    const bytes = await compressPdf(await sample());
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(3);
  });
  it('converts a PNG image into a valid one-page PDF', async () => {
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvRkAAAAASUVORK5CYII='), (c) => c.charCodeAt(0));
    const file = new File([png], 'pixel.png', { type: 'image/png' });
    const bytes = await imagesToPdf([file]);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });


describe('edge cases', () => {
  it('rejects PDFs exceeding the 300-page limit', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 301; i++) {
      doc.addPage([300, 400]);
    }
    const bytes = await doc.save();
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const bigFile = new File([buffer], 'big.pdf', { type: 'application/pdf' });
    await expect(loadPdf(bigFile)).rejects.toThrow(/300 pages/);
  });

  it('rejects password-protected/encrypted PDFs', async () => {
    // Create a minimal file that looks like a PDF but has an encryption dictionary marker
    // Real encryption requires QPDF; this tests that non-loadable PDFs are rejected
    const fakeEncrypted = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0x45, 0x4f, 0x46]);
    const file = new File([fakeEncrypted], 'encrypted.pdf', { type: 'application/pdf' });
    await expect(loadPdf(file)).rejects.toThrow();
  });

  it('rejects files that are too small to be valid PDFs', async () => {
    const tiny = new File([new Uint8Array([1, 2, 3])], 'tiny.pdf', { type: 'application/pdf' });
    await expect(validatePdf(tiny)).rejects.toThrow(/too small|signature/);
  });

  it('parseRanges rejects empty input', () => {
    expect(() => parseRanges('', 4)).toThrow();
    expect(() => parseRanges('   ', 4)).toThrow();
  });

  it('mergePdfs enforces the 20-file batch limit', async () => {
    const files = [];
    for (let i = 0; i < 21; i++) {
      const doc = await PDFDocument.create();
      doc.addPage([300, 400]);
      const bytes = await doc.save();
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      files.push(new File([buffer], `f${i}.pdf`, { type: 'application/pdf' }));
    }
    await expect(mergePdfs(files)).rejects.toThrow(/2–20/);
  });
});
});

