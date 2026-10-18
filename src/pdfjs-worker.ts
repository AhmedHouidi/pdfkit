if (typeof Map.prototype.getOrInsertComputed !== 'function') {
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

await import('pdfjs-dist/build/pdf.worker.min.mjs');
export {};
