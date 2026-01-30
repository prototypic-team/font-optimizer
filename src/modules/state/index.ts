import { createStore } from "solid-js/store";

import type { TFont } from "Types";

const FONT_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf"];

const normalizeName = (fileName: string): string => {
  let name = fileName;
  const lower = name.toLowerCase();
  for (const ext of FONT_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      name = name.slice(0, -ext.length);
      break;
    }
  }
  return name.replace(/[-_]+/g, " ").trim();
};

const MIME_TO_EXT: Record<string, string> = {
  "font/woff2": "woff2",
  "font/woff": "woff",
  "font/ttf": "ttf",
  "font/otf": "otf",
  "application/font-woff2": "woff2",
  "application/font-woff": "woff",
  "application/x-font-ttf": "ttf",
  "application/x-font-otf": "otf",
};

const extensionFromFile = (fileName: string, mimeType: string): string => {
  const lower = fileName.toLowerCase();
  for (const ext of FONT_EXTENSIONS) {
    if (lower.endsWith(ext)) return ext.slice(1);
  }
  return MIME_TO_EXT[mimeType] ?? "";
};

const createFontFromFile = (file: File): TFont => ({
  id: crypto.randomUUID(),
  name: normalizeName(file.name),
  fileName: file.name,
  size: file.size,
  extension: extensionFromFile(file.name, file.type),
  file,
});

type FontsState = {
  fonts: TFont[];
};

const [store, setStore] = createStore<FontsState>({
  fonts: [],
});

const addFonts = (files: File[]) => {
  const newFiles = [...files];

  // We are deferring the state update to avoid freezing UI during
  // file processing.
  setTimeout(() => {
    setStore("fonts", (prev) => {
      const existingKeys = new Set(prev.map((f) => f.fileName));
      const newFonts = newFiles
        .filter((f) => !existingKeys.has(f.name))
        .map(createFontFromFile);
      return [...prev, ...newFonts].sort(
        (a, b) =>
          a.name.localeCompare(b.name) || a.extension.localeCompare(b.extension)
      );
    });
  }, 0);
};

export { addFonts, store };
