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

export const exportFont = (
  fontBuffer: ArrayBuffer,
  codePoints: number[],
  fontName: string
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (codePoints.length === 0) {
      reject(new Error("No glyphs selected for export"));
      return;
    }

    const w = getWorker();

    const onMessage = async (
      e: MessageEvent<{
        woff?: Uint8Array;
        woff2?: Uint8Array;
        error?: string;
      }>
    ) => {
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

      const safeName =
        fontName.replace(/[^a-zA-Z0-9\s-]/g, "").trim() || "font";

      const zipBytes = zipSync({
        [`${safeName}.woff`]: woff,
        [`${safeName}.woff2`]: woff2,
      });
      const zipBlob = new Blob([new Uint8Array(zipBytes)], {
        type: "application/zip",
      });

      await downloadBlob(zipBlob, `${safeName}.zip`);
      resolve();
    };

    w.addEventListener("message", onMessage);
    w.postMessage({ fontBuffer, codePoints }, [fontBuffer]);
  });
