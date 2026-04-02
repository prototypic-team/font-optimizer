import { zipSync } from "fflate";

let worker: Worker | null = null;

const getWorker = (): Worker => {
  if (!worker) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
  }
  return worker;
};

const downloadBlob = async (blob: Blob, fileName: string): Promise<void> => {
  if (
    "showSaveFilePicker" in window &&
    typeof window.showSaveFilePicker === "function"
  ) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "ZIP archive",
            accept: { "application/zip": [".zip"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      throw err;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  a.addEventListener("click", (e) => e.stopPropagation(), { once: true });
  document.body.appendChild(a);
  setTimeout(() => {
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 0);
};

const processFont = (
  fontBuffer: ArrayBuffer,
  codePoints: number[]
): Promise<{ woff: Uint8Array; woff2: Uint8Array }> => {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const w = getWorker();

    const onMessage = (
      e: MessageEvent<{
        id: string;
        woff?: Uint8Array;
        woff2?: Uint8Array;
        error?: string;
      }>
    ) => {
      if (e.data.id !== id) return;
      w.removeEventListener("message", onMessage);
      const { woff, woff2, error } = e.data;
      if (error) {
        reject(new Error(error));
        return;
      }
      if (!woff || !woff2) {
        reject(new Error("Export failed: missing WOFF or WOFF2 data"));
        return;
      }
      resolve({ woff, woff2 });
    };

    w.addEventListener("message", onMessage);
    w.postMessage({ id, fontBuffer, codePoints }, [fontBuffer]);
  });
};

export const measureFontSize = async (
  fontBuffer: ArrayBuffer,
  codePoints: number[]
): Promise<number> => {
  const { woff2 } = await processFont(fontBuffer.slice(0), codePoints);
  return woff2.byteLength;
};

export const exportFont = async (
  fontBuffer: ArrayBuffer,
  codePoints: number[],
  fontName: string
): Promise<void> => {
  if (codePoints.length === 0) {
    throw new Error("No glyphs selected for export");
  }

  const { woff, woff2 } = await processFont(fontBuffer, codePoints);
  const safeName = fontName.replace(/[^a-zA-Z0-9\s-]/g, "").trim() || "font";

  const zipBytes = zipSync({
    [`${safeName}.woff`]: woff,
    [`${safeName}.woff2`]: woff2,
  });
  const zipBlob = new Blob([new Uint8Array(zipBytes)], {
    type: "application/zip",
  });

  await downloadBlob(zipBlob, `${safeName}.zip`);
};

export const exportFonts = async (
  fonts: { buffer: ArrayBuffer; codePoints: number[]; name: string }[]
): Promise<void> => {
  const zipEntries: Record<string, Uint8Array> = {};

  for (const { buffer, codePoints, name } of fonts) {
    if (codePoints.length === 0) continue;
    const { woff, woff2 } = await processFont(buffer, codePoints);
    const safeName = name.replace(/[^a-zA-Z0-9\s-]/g, "").trim() || "font";
    zipEntries[`${safeName}.woff`] = woff;
    zipEntries[`${safeName}.woff2`] = woff2;
  }

  if (Object.keys(zipEntries).length === 0) {
    throw new Error("No glyphs selected for export");
  }

  const zipBytes = zipSync(zipEntries);
  const zipBlob = new Blob([new Uint8Array(zipBytes)], {
    type: "application/zip",
  });

  await downloadBlob(zipBlob, "fonts.zip");
};
