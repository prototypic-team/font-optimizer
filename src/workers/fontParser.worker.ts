import { parseFontFromBuffer } from "../modules/fonts/parser";

import type { TParsedFont } from "Types";

type TParseRequest = {
  fontId: string;
  file: File;
};

type TParseSuccess = {
  fontId: string;
  parsed: TParsedFont;
};

type TParseError = {
  fontId: string;
  error: string;
};

self.onmessage = async (e: MessageEvent<TParseRequest>) => {
  const { fontId, file } = e.data;
  try {
    const buffer = await file.arrayBuffer();
    const parsed = parseFontFromBuffer(buffer);
    (self as Worker).postMessage({ fontId, parsed } satisfies TParseSuccess);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    (self as Worker).postMessage({ fontId, error } satisfies TParseError);
  }
};
