interface Map<K, V> {
  getOrInsertComputed?<T = V>(key: K, callback: (key: K, map: Map<K, V>) => T): T;
}

declare module '@wasm-zoo/qpdf' {
  export type QpdfResult = { exitCode: number; files?: Array<{ name: string; data: Uint8Array }> };
  export type QpdfInstance = {
    exec(args: string[], options: { files: Array<{ name: string; data: Uint8Array }>; outputs: string[] }): Promise<QpdfResult>;
    dispose(): void;
  };
  export function load(options?: Record<string, unknown>): Promise<QpdfInstance>;
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs';
