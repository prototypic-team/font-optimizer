import type { TParsedFont } from "Types";

type TParseRequest = {
  fontId: string;
  file: File;
};

type TParseResponse = {
  fontId: string;
  parsed?: TParsedFont;
  error?: string;
};

type TQueueItem = {
  fontId: string;
  file: File;
};

type TPendingCallbacks = {
  resolve: (parsed: TParsedFont) => void;
  reject: (error: Error) => void;
};

const queue: TQueueItem[] = [];
const pending = new Map<string, TPendingCallbacks>();
let processing = false;
let worker: Worker | null = null;

const getWorker = (): Worker => {
  if (!worker) {
    worker = new Worker(
      new URL("../../workers/fontParser.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (e: MessageEvent<TParseResponse>) => {
      const callbacks = pending.get(e.data.fontId);
      if (callbacks) {
        pending.delete(e.data.fontId);
        if (e.data.error) {
          callbacks.reject(new Error(e.data.error));
        } else {
          callbacks.resolve(e.data.parsed!);
        }
      }
      processing = false;
      processNext();
    };
  }
  return worker;
};

const processNext = () => {
  if (processing || queue.length === 0) return;

  processing = true;
  const item = queue.shift();

  if (!item) {
    processing = false;
    return;
  }
  getWorker().postMessage(item satisfies TParseRequest);
};

/**
 * Enqueue a font for parsing. The returned promise resolves
 * when this specific font has been parsed by the worker.
 */
export const parseFontInWorker = (
  fontId: string,
  file: File
): Promise<TParsedFont> =>
  new Promise((resolve, reject) => {
    pending.set(fontId, { resolve, reject });
    queue.push({ fontId, file });

    processNext();
  });

/**
 * Move a font to the front of the queue so it is parsed next.
 * Has no effect if the font is already being parsed or is not queued.
 */
export const prioritizeFont = (fontId: string): void => {
  const idx = queue.findIndex((item) => item.fontId === fontId);
  if (idx > 0) {
    const [item] = queue.splice(idx, 1);
    queue.unshift(item);
  }
};
