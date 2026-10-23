import { useEffect, useMemo, useState } from 'react';
import { MAX_FILE_BYTES, MAX_FILES } from '../limits';

type ToolId = 'merge' | 'split' | 'compress' | 'images-pdf' | 'pdf-images' | 'rotate' | 'reorder' | 'delete' | 'extract' | 'number' | 'protect' | 'unlock';
type Route = ToolId | 'home' | 'privacy' | 'terms' | 'cookies' | 'about' | 'contact' | 'accessibility' | 'processing' | 'copyright' | 'guides';
type ToolInfo = { id: ToolId; title: string; description: string; icon: string; multiple?: boolean; accept?: string; action: string };
const tools: ToolInfo[] = [
  { id: 'merge', title: 'Merge PDF', description: 'Join PDFs in the order you choose.', icon: '▤', multiple: true, accept: '.pdf,application/pdf', action: 'merge' },
  { id: 'split', title: 'Split PDF', description: 'Save selected pages as a new PDF.', icon: '⤓', accept: '.pdf,application/pdf', action: 'split' },
  { id: 'compress', title: 'Compress PDF', description: 'Rewrite and recompress PDF structures.', icon: '⌁', accept: '.pdf,application/pdf', action: 'compress' },
  { id: 'images-pdf', title: 'JPG / PNG to PDF', description: 'Turn images into a portable document.', icon: '▧', multiple: true, accept: 'image/jpeg,image/png,.jpg,.jpeg,.png', action: 'images-pdf' },
  { id: 'pdf-images', title: 'PDF to PNG', description: 'Render each page to a PNG image.', icon: '▨', accept: '.pdf,application/pdf', action: 'pdf-images' },
  { id: 'rotate', title: 'Rotate pages', description: 'Rotate every page by 90 degrees.', icon: '↻', accept: '.pdf,application/pdf', action: 'rotate' },
  { id: 'reorder', title: 'Reorder pages', description: 'Set a new order for all pages.', icon: '↕', accept: '.pdf,application/pdf', action: 'reorder' },
  { id: 'delete', title: 'Delete pages', description: 'Remove the pages you specify.', icon: '⌫', accept: '.pdf,application/pdf', action: 'delete' },
  { id: 'extract', title: 'Extract pages', description: 'Keep only selected pages.', icon: '⎘', accept: '.pdf,application/pdf', action: 'extract' },
  { id: 'number', title: 'Add page numbers', description: 'Add simple numbers at top or bottom.', icon: '№', accept: '.pdf,application/pdf', action: 'number' },
  { id: 'protect', title: 'Protect PDF', description: 'Encrypt with a password using QPDF.', icon: '◇', accept: '.pdf,application/pdf', action: 'protect' },
  { id: 'unlock', title: 'Unlock PDF', description: 'Remove encryption with a correct password.', icon: '◈', accept: '.pdf,application/pdf', action: 'unlock' },
];

const legalTitles: Record<string, string> = {
  privacy: 'Privacy policy', terms: 'Terms of service', cookies: 'Cookie policy', about: 'About PDFKit', contact: 'Contact & privacy inquiries',
  accessibility: 'Accessibility statement', processing: 'File processing & deletion', copyright: 'Copyright complaints', guides: 'PDF guides',
};

const toolRoutes = new Set(tools.map((t) => t.id));

// Configurable support/donation link. Set VITE_SUPPORT_LINK in your environment
// (e.g. .env file or Netlify env vars) to connect Ko-fi, Buy Me a Coffee, etc.
// Leave empty to hide the support section entirely.
const SUPPORT_LINK = import.meta.env.VITE_SUPPORT_LINK || '';
const BRAND_NAME = 'PDFKit';

function routeNow(): Route {
  const p = location.pathname.replace(/^\//, '') || 'home';
  if (p === 'home' || p in legalTitles || toolRoutes.has(p as ToolId)) return p as Route;
  return 'home';
}
function Footer({ navigate }: { navigate: (path: string) => void }) {
  return (
    <footer>
      <div className="footer-inner">
        <div>
          <div className="brand"><span className="brand-mark">P</span> {BRAND_NAME}</div>
          <p className="subtle">Useful PDF tools. Your files stay in your browser while you process them.</p>
          <p className="subtle">Independent project; not affiliated with Adobe or other PDF software providers.</p>
        </div>
        <nav aria-label="Legal and information">{Object.entries(legalTitles).filter(([key]) => key !== 'guides').map(([key, title]) => <a href={`/${key}`} onClick={(e) => { e.preventDefault(); navigate(key); }} key={key}>{title}</a>)}</nav>
        {SUPPORT_LINK && <a href={SUPPORT_LINK} rel="nofollow" target="_blank" className="support-link">Support {BRAND_NAME} →</a>}
      </div>
      <div className="copyright-line">© {new Date().getFullYear()} PDFKit · Ahmed, Algeria · <a href="/contact">Contact</a></div>
    </footer>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeNow);
  const [files, setFiles] = useState<File[]>([]);
  const [range, setRange] = useState('1');
  const [angle, setAngle] = useState(90);
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [pageStart, setPageStart] = useState(1);
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [pageKey, setPageKey] = useState(0);
  const current = useMemo(() => tools.find((t) => t.id === route), [route]);
  useEffect(() => { const listener = () => { setRoute(routeNow()); setPageKey((k) => k + 1); }; addEventListener('popstate', listener); return () => removeEventListener('popstate', listener); }, []);
  useEffect(() => { document.title = route === 'home' ? 'PDFKit — PDF tools that stay on your device' : `${legalTitles[route] ?? route.charAt(0).toUpperCase() + route.slice(1)} — PDFKit`; }, [route]);
  function navigate(path: string) { const url = path === 'home' ? '/' : `/${path}`; history.pushState(null, '', url); setRoute(routeNow()); setPageKey((k) => k + 1); window.scrollTo(0, 0); }
  function startTool(id: ToolId) { navigate(id); }
  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    if (incoming.some((file) => file.size > MAX_FILE_BYTES)) { setError('A selected file is over the 50 MB per-file limit.'); return; }
    if (incoming.length > MAX_FILES) { setError(`Choose no more than ${MAX_FILES} files at once.`); return; }
    if (current?.multiple) setFiles(incoming); else setFiles(incoming.slice(0, 1));
    setError(''); setStatus(incoming.length ? `${incoming.length} file${incoming.length === 1 ? '' : 's'} ready. Processing happens in this browser.` : '');
  }
  async function process() {
    if (!current || !files.length || busy) return;
    setBusy(true); setError(''); setStatus('Processing locally in this browser…');
    try {
      const base = (files[0].name.replace(/\.[^.]+$/, '') || 'document').replace(/[\\/:*?"<>|]/g, '_').slice(0, 100);
      let output: Uint8Array;
      const pdf = await import('../pdf');
      switch (current.id) {
        case 'merge': output = await pdf.mergePdfs(files); pdf.downloadBytes(output, 'merged.pdf'); break;
        case 'compress': output = await pdf.compressPdf(files[0]); pdf.downloadBytes(output, `${base}-compressed.pdf`); break;
        case 'images-pdf': output = await pdf.imagesToPdf(files); pdf.downloadBytes(output, 'images.pdf'); break;
        case 'pdf-images': {
          const images = await pdf.pdfToImages(files[0]); images.forEach((image) => pdf.downloadBlob(image.blob, image.name));
          setStatus(`${images.length} PNG image${images.length === 1 ? '' : 's'} downloaded.`); return;
        }
        case 'number': output = await pdf.numberPdf(files[0], pageStart, position); pdf.downloadBytes(output, `${base}-numbered.pdf`); break;
        case 'protect': output = await pdf.protectPdf(files[0], password); pdf.downloadBytes(output, `${base}-protected.pdf`); break;
        case 'unlock': output = await pdf.unlockPdf(files[0], password, authorized); pdf.downloadBytes(output, `${base}-unlocked.pdf`); break;
        default: output = await pdf.pageTool(files[0], current.id, range, angle); pdf.downloadBytes(output, `${base}-${current.id}.pdf`);
      }
      setStatus('Done. Your download has started. The source file was not uploaded.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The operation failed. Try another file.'); setStatus(''); }
    finally { setBusy(false); }
  }

  function workbench() {
    if (!current) return null;
    return (
      <section className="workbench page" key={pageKey} aria-labelledby="workbench-title">
        <div className="workbench-head"><div><span className="eyebrow">PDF TOOL</span><h2 id="workbench-title">{current.title}</h2><p>{current.description} Files are processed on this device.</p></div><button className="icon-button" onClick={() => navigate('home')} aria-label="Back to tools">←</button></div>
        <label className="drop-zone" htmlFor="files" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}><span className="upload-icon">↑</span><strong>Choose {current.multiple ? 'files' : 'a file'} to get started</strong><span>or drop them here · up to 50 MB per file</span><span className="browse-button">Browse files</span><input id="files" type="file" accept={current.accept} multiple={current.multiple} onChange={(e) => addFiles(e.currentTarget.files)} /></label>
        {files.length > 0 && <div className="file-list" aria-label="Selected files">{files.map((file, i) => <div className="file-row" key={`${file.name}-${i}`}><span className="file-icon">PDF</span><span className="file-name">{file.name}</span><span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span><button aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter((_, index) => index !== i))}>×</button></div>)}</div>}
        {['split', 'reorder', 'delete', 'extract'].includes(current.id) && <label className="field"><span>{current.id === 'delete' ? 'Pages to remove' : current.id === 'reorder' ? 'New order (include every page)' : 'Pages to keep'}</span><input value={range} onChange={(e) => setRange(e.target.value)} placeholder="Example: 1, 3-5" /><small>Use comma-separated page numbers and ranges, for example 1, 3-5.</small></label>}
        {current.id === 'rotate' && <label className="field"><span>Rotation</span><select value={angle} onChange={(e) => setAngle(Number(e.target.value))}><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">270° clockwise</option></select></label>}
        {current.id === 'number' && <div className="field-row"><label className="field"><span>First page number</span><input type="number" min="0" max="999999" value={pageStart} onChange={(e) => setPageStart(Math.max(0, Number(e.target.value)))} /></label><label className="field"><span>Position</span><select value={position} onChange={(e) => setPosition(e.target.value as 'top' | 'bottom')}><option value="bottom">Bottom center</option><option value="top">Top center</option></select></label></div>}
        {['protect', 'unlock'].includes(current.id) && <label className="field"><span>PDF password</span><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={current.id === 'protect' ? 'At least 8 characters' : 'Enter the correct password'} /><small>{current.id === 'protect' ? 'Use a strong password and save it somewhere safe. PDFKit cannot recover it.' : 'Password is used locally and discarded after processing.'}</small></label>}
        {current.id === 'unlock' && <label className="check-field"><input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} /><span>I own this document or have permission to modify it, and I have supplied the correct password.</span></label>}
        <div className="processing-note"><span>ⓘ</span> Browser-based processing. Files and passwords are not sent to a PDFKit server. Malicious PDFs may still exploit browser or library defects.</div>
        {error && <div className="error-message" role="alert">{error}</div>}{status && <div className="status-message" role="status" aria-live="polite">{status}</div>}
        <div className="workbench-actions"><button className="primary" disabled={!files.length || busy || (current.id === 'protect' && password.length < 8) || (current.id === 'unlock' && (!password || !authorized))} onClick={process}>{busy ? 'Processing…' : current.id === 'protect' ? 'Protect PDF' : current.id === 'unlock' ? 'Unlock PDF' : 'Process PDF'} <span>→</span></button><span>Max {MAX_FILES} files · {current.multiple ? '50 MB each' : '50 MB'}</span></div>
      </section>
    );
  }

  function legalPage() {
    if (route === 'privacy') return <article className="legal-content page" key={pageKey}><p>PDFKit processes files entirely in your browser. Nothing is uploaded to a server, no account is required, and no files or passwords are stored or seen by anyone. For details, see <a href="/processing">File processing & deletion</a>.</p><h2>Advertising & Cookies</h2><p>PDFKit may display advertisements served by third-party advertising partners, including Google AdSense. These partners may use cookies and similar technologies to serve ads, measure ad performance, and show you ads based on your browsing activity. You can manage or disable cookies through your browser settings. For more information about how Google uses data when you use sites or apps with Google advertising, visit Google’s Privacy & Terms page.</p></article>;
    if (route === 'terms') return <article className="legal-content page" key={pageKey}><p>Use of PDFKit is free and at your own risk. The app runs locally in your browser; PDFKit provides no warranty and accepts no liability for lost or corrupted files. These terms are a template and need legal review before launch.</p></article>;
    if (route === 'cookies') return <article className="legal-content page" key={pageKey}><p>PDFKit does not set cookies, does not run analytics, and does not use advertising or tracking scripts. No cookie consent banner is required for this build.</p></article>;
    if (route === 'about') return (
      <article className="legal-content page" key={pageKey}>
        <p>PDFKit is a local-first set of browser tools for common PDF tasks. The application uses PDF.js, pdf-lib, and QPDF WebAssembly. PDFs and passwords are processed on the user’s device; the app does not include a PDF upload backend.</p>
        <p>PDFKit is operated by Ahmed, based in Algeria. PDFKit is independent and is not affiliated with Adobe or other PDF software providers.</p>
        {SUPPORT_LINK && <p>This project is free to use. If you find it helpful, please consider <a href={SUPPORT_LINK} rel="nofollow" target="_blank">supporting PDFKit</a> to keep it running.</p>}
      </article>
    );
    if (route === 'contact') return <article className="legal-content page" key={pageKey}><h2>Contact PDFKit</h2><p>For privacy inquiries, data protection requests, accessibility feedback, advertising questions, or general support, email: <strong>support@pdfkit.app</strong>.</p><p>Operator: Ahmed (PDFKit)</p><p>Jurisdiction: Algeria</p><p>For copyright complaints, see <a href="/copyright">Copyright complaints</a>.</p><h2>Privacy inquiry details</h2><p>Explain the request, the relevant jurisdiction, and a reply address. Do not send passwords or sensitive documents. Because processing is local, PDFKit support normally cannot retrieve your source or result file.</p></article>;
    if (route === 'copyright') return <article className="legal-content page" key={pageKey}><h2>Copyright Complaints</h2><p>Send complaints to: <strong>copyright@pdfkit.app</strong></p><p>Include identification of the copyrighted work, the material allegedly infringing it and its location, your contact details, a good-faith statement, an accuracy/authority statement if required, and signature. We will assess and respond under applicable law. Do not claim DMCA safe-harbor eligibility or registration unless verified by counsel. PDFKit currently processes files in the browser and has no public file library or sharing feature.</p></article>;
    if (route === 'accessibility') return <article className="legal-content page" key={pageKey}><p>PDFKit aims to support WCAG 2.2 AA. The interface uses semantic controls, keyboard-operable tools, visible focus, labels, and live status messages. Automated and manual evaluation is still required before claiming conformance.</p><p>Report an accessibility barrier to <strong>accessibility@pdfkit.app</strong>. Include the page, task, assistive technology or browser if relevant, and a preferred response method. We aim to respond within 5 business days and provide an alternative service path where possible.</p></article>;
    if (route === 'processing') return <article className="legal-content page" key={pageKey}><p>Selected files are read into the page’s JavaScript memory and processed locally. The app does not upload files or passwords. It creates a temporary download link for the result and revokes that link after download begins. Closing the tab releases application memory; downloaded files remain wherever your browser saves them.</p><h2>Limits and safety</h2><p>Files over 50 MB and PDFs over 300 pages are rejected by the PDF operations that inspect pages; batches are limited to 20 files. Local processing avoids transmission to a PDFKit file server but does not make a malicious PDF harmless. Parsing software and browsers can have vulnerabilities. Keep your browser updated, use trusted files, and do not treat processing as malware disinfection. Some unusual or encrypted PDFs are unsupported by ordinary edit operations.</p><h2>Deletion</h2><p>PDFKit does not retain a copy to delete. You control downloaded results and the browser’s download history. The website host may hold connection logs; add provider names and actual retention details before launch.</p></article>;
    if (route === 'guides') return <article className="legal-content guide-list page" key={pageKey}><h2>How to merge PDFs</h2><p>Select the Merge PDF tool, add two or more files, arrange their order in the picker before selecting if needed, and download the combined result. The merge follows the selected file order. Check page order and forms before relying on the result.</p><h2>Compression trade-offs</h2><p>The built-in compression operation rewrites document structure and uses object streams. It does not downsample images or guarantee a smaller file. Image-heavy PDFs may stay the same size or grow slightly. For stronger compression, image quality and resolution must be reduced, which can lower readability or accessibility.</p><h2>PDF, JPG, and PNG</h2><p>PDF preserves multi-page layout and text features. JPG is typically smaller for photographs but loses detail with repeated edits. PNG preserves crisp edges and transparency but can create large files. PDF-to-PNG renders pages as images, so selectable text and vectors are not preserved.</p><h2>Working with sensitive files</h2><p>Local processing means your chosen file is handled in the browser rather than uploaded to a PDFKit application backend. Browser processing is not a guarantee that every malicious document is safe. Protect files you can authorize with a strong password; keep that password separately because it cannot be recovered.</p></article>;
    return null;
  }

  return <div className="site-shell">
    <header className="topbar"><a className="brand" href="/" onClick={(e) => { e.preventDefault(); navigate('home'); }}><span className="brand-mark">P</span> {BRAND_NAME}</a><nav className="main-nav" aria-label="Main navigation"><a href="/" onClick={(e) => { e.preventDefault(); navigate('home'); }}>Tools</a><a href="/guides" onClick={(e) => { e.preventDefault(); navigate('guides'); }}>Guides</a><a href="/about" onClick={(e) => { e.preventDefault(); navigate('about'); }}>About</a></nav><span className="local-badge"><span /> Files stay local</span></header>
    {route === 'home' ? (
      <main className="page" key={pageKey}>
        <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="shield">▣</span> PRIVATE BY DESIGN</div><h1>PDF work, <em>made simple.</em></h1><p>Every tool runs in your browser. Your documents are not uploaded to a PDFKit server.</p><div className="hero-actions"><button className="primary" onClick={() => document.getElementById('tool-grid')?.scrollIntoView({ behavior: 'smooth' })}>Explore PDF tools <span>↓</span></button><span className="no-account"><span>✓</span> No account needed</span></div><div className="trust-row"><span>✧ Browser-based processing</span><span>◉ No file storage</span><span>⌘ Free to use</span></div></div><div className="hero-art" aria-hidden="true"><div className="paper paper-back"><div /><div /><div /></div><div className="paper paper-front"><span className="pdf-chip">PDF</span><div className="paper-title"/><div className="paper-lines"><i/><i/><i/><i/></div><div className="paper-foot">YOUR FILE STAYS HERE</div></div><div className="spark spark-one">✳</div><div className="spark spark-two">✦</div><div className="art-caption">Processed on your device <span>↗</span></div></div></section>
        <section className="privacy-strip"><div className="privacy-icon">⌑</div><div><strong>Your files never leave this tab.</strong><span>Processing happens locally in your browser. We don’t store, share, or see your documents.</span></div><a href="/processing" onClick={(e) => { e.preventDefault(); navigate('processing'); }}>How it works <b>→</b></a></section>
        <section className="tools-section" id="tool-grid"><div className="section-heading"><div><span className="eyebrow">THE TOOLKIT</span><h2>Everything you need for PDF</h2><p>A focused set of free tools to keep your document workflow moving.</p></div><div className="tool-count">12 TOOLS</div></div><div className="tool-grid">{tools.map((tool) => <button key={tool.id} className={`tool-card ${(route as string) === tool.id ? 'selected' : ''}`} onClick={() => startTool(tool.id)}><span className="tool-icon">{tool.icon}</span><span className="tool-title">{tool.title}</span><span className="tool-description">{tool.description}</span><span className="tool-arrow" aria-hidden="true">↗</span></button>)}</div></section>
      </main>
    ) : toolRoutes.has(route as ToolId) ? workbench() : legalPage() ? legalPage() : <div className="not-found page" key={pageKey}><p>This page isn’t here.</p><a href="/" onClick={(e) => { e.preventDefault(); navigate('home'); }}>Return to PDF tools →</a></div>}
    <Footer navigate={navigate}/>
  </div>;
}


