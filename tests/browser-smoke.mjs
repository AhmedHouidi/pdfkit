import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const origin = process.env.PDFKIT_TEST_ORIGIN || 'http://127.0.0.1:4173';
const temp = await mkdtemp(join(tmpdir(), 'pdfkit-e2e-'));
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.addInitScript(() => {
    window.__pdfkitBlobs = [];
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => { const url = original(blob); window.__pdfkitBlobs.push({ blob, url }); return url; };
  });
  const makePdf = async (n) => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < n; i++) { const p = doc.addPage([300, 400]); p.drawText(`Page ${i + 1}`); }
    const bytes = await doc.save(); const path = join(temp, `sample-${n}.pdf`); await writeFile(path, bytes); return path;
  };
  const source = await makePdf(2);
  const second = await makePdf(1);
  const takeOutput = async (name, statusPrefix = 'Done.', timeoutMs = 20000) => {
    try { await page.waitForFunction((prefix) => document.querySelector('.status-message')?.textContent?.startsWith(prefix), statusPrefix, { timeout: timeoutMs }); }
    catch { throw new Error(`Operation ${name} did not finish. Error: ${(await page.locator('.error-message').allTextContents()).join('; ')}. Status: ${(await page.locator('.status-message').allTextContents()).join('; ')}. Browser: ${errors.join('; ')}`); }
    const data = await page.evaluate(async (filename) => {
      const anchor = Array.from(document.querySelectorAll('a[download]')).find((item) => item.download === filename);
      if (!anchor) throw new Error(`No download link was created for ${filename}.`);
      const index = window.__pdfkitBlobs.findIndex((item) => item.url === anchor.href);
      if (index < 0) throw new Error('The download link did not match an in-memory result.');
      const [{ blob }] = window.__pdfkitBlobs.splice(index, 1);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return { base64: btoa(binary), type: blob.type, linked: Boolean(anchor) };
    }, name);
    if (!data.linked) throw new Error(`No download link was created for ${name}.`);
    const path = join(temp, name); await writeFile(path, Buffer.from(data.base64, 'base64')); return path;
  };
  await page.goto(origin, { waitUntil: 'networkidle' });
  if (await page.getByRole('button', { name: /Merge PDF/ }).count() !== 1) throw new Error('Home page tool list did not render.');

  await page.getByRole('button', { name: /Merge PDF/ }).click();
  await page.locator('input[type=file]').setInputFiles([source, second]);
  await page.getByRole('button', { name: /Process PDF/ }).click();
  const mergedPath = await takeOutput('merged.pdf');
  if ((await PDFDocument.load(await readFile(mergedPath))).getPageCount() !== 3) throw new Error('Merge output did not contain 3 pages.');

  await page.getByRole('button', { name: /Back to tools/ }).click();
  await page.getByRole('button', { name: /Protect PDF/ }).click();
  await page.locator('input[type=file]').setInputFiles(source);
  await page.locator('input[type=password]').fill('correct horse battery');
  await page.locator('.workbench').getByRole('button', { name: /Protect PDF/ }).click();
  const protectedPath = await takeOutput('sample-2-protected.pdf');
  const encrypted = await readFile(protectedPath);
  if (!encrypted.subarray(0, 8).toString('latin1').includes('%PDF-')) throw new Error('Protected output did not have a PDF signature.');
  if (!encrypted.toString('latin1').includes('/Encrypt')) throw new Error('Protected output did not contain an encryption dictionary.');

  await page.getByRole('button', { name: /Back to tools/ }).click();
  await page.getByRole('button', { name: /Unlock PDF/ }).click();
  await page.locator('input[type=file]').setInputFiles(protectedPath);
  await page.locator('input[type=password]').fill('correct horse battery');
  await page.getByRole('checkbox').check();
  await page.locator('.workbench').getByRole('button', { name: /Unlock PDF/ }).click();
  const unlockedPath = await takeOutput('sample-2-protected-unlocked.pdf');
  if ((await PDFDocument.load(await readFile(unlockedPath))).getPageCount() !== 2) throw new Error('Decrypted output was not a valid 2-page PDF.');

  await page.getByRole('button', { name: /Back to tools/ }).click();
  await page.getByRole('button', { name: /Unlock PDF/ }).click();
  await page.locator('input[type=file]').setInputFiles(protectedPath);
  await page.locator('input[type=password]').fill('incorrect password');
  await page.getByRole('checkbox').check();
  if (!(await page.locator('.workbench').getByRole('button', { name: /Unlock PDF/ }).isEnabled())) throw new Error('Unlock did not enable after authorized password entry.');
  await page.locator('.workbench').getByRole('button', { name: /Unlock PDF/ }).click();
  await page.locator('.error-message').waitFor({ state: 'visible', timeout: 20_000 });
  if (!/password/i.test(await page.locator('.error-message').innerText())) throw new Error('Incorrect password did not produce a useful error.');

  await page.getByRole('button', { name: /Back to tools/ }).click();
  await page.getByRole('button', { name: /Split PDF/ }).click();
  await page.locator('input[type=file]').setInputFiles(source);
  await page.getByPlaceholder('Example: 1, 3-5').fill('2');
  await page.getByRole('button', { name: /Process PDF/ }).click();
  const splitPath = await takeOutput('sample-2-split.pdf');
  if ((await PDFDocument.load(await readFile(splitPath))).getPageCount() !== 1) throw new Error('Split output did not contain the selected page.');

  await page.getByRole('button', { name: /Back to tools/ }).click();
  await page.getByRole('button', { name: /PDF to PNG/ }).click();
  await page.locator('input[type=file]').setInputFiles(source);
  await page.locator('.workbench').getByRole('button', { name: /Process PDF/ }).click();
  const pngPath = await takeOutput('sample-2-page-1.png', '2 PNG images', 90000);
  const pngBytes = await readFile(pngPath);
  if (pngBytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('PDF-to-PNG output was not a valid PNG.');

  const sourcePng = join(temp, 'pixel.png');
  await writeFile(sourcePng, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvRkAAAAASUVORK5CYII=', 'base64'));
  await page.getByRole('button', { name: /Back to tools/ }).click();
  await page.getByRole('button', { name: /JPG \/ PNG to PDF/ }).click();
  await page.locator('input[type=file]').setInputFiles(sourcePng);
  await page.locator('.workbench').getByRole('button', { name: /Process PDF/ }).click();
  const imagesPdf = await takeOutput('images.pdf');
  if ((await PDFDocument.load(await readFile(imagesPdf))).getPageCount() !== 1) throw new Error('Image-to-PDF output was not a valid one-page PDF.');

  const externalRequest = requests.find((url) => !url.startsWith(origin) && !url.startsWith(`blob:${origin}`));
  if (externalRequest) throw new Error(`Unexpected external network request: ${externalRequest}`);
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  console.log('Browser smoke passed: home, merge, protect, correct/wrong password unlock, split, PDF↔PNG, generated download blobs, output integrity, same-origin requests; no page errors.');
} finally {
  await browser.close();
  await rm(temp, { recursive: true, force: true });
}
