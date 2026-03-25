import type { TParsedFont } from "Types";

type TPending = {
	resolve: (parsed: TParsedFont[]) => void;
	reject: (error: Error) => void;
};

const pending = new Map<string, TPending>();
const queue: { fontId: string; file: File }[] = [];
let processing = false;
let worker: Worker | null = null;

const getWorker = (): Worker => {
	if (!worker) {
		worker = new Worker(new URL("./worker.ts", import.meta.url), {
			type: "module",
		});
		worker.onmessage = (
			e: MessageEvent<{
				fontId: string;
				parsed?: TParsedFont[];
				error?: string;
			}>
		) => {
			const cb = pending.get(e.data.fontId);
			if (cb) {
				pending.delete(e.data.fontId);
				if (e.data.error) cb.reject(new Error(e.data.error));
				else cb.resolve(e.data.parsed!);
			}
			processing = false;
			processNext();
		};
		worker.onerror = () => {
			const err = new Error("Font worker crashed");
			for (const [, cb] of pending) cb.reject(err);
			pending.clear();
			processing = false;
			worker = null;
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
	getWorker().postMessage(item);
};

export const parseFontInWorker = (
	fontId: string,
	file: File
): Promise<TParsedFont[]> =>
	new Promise((resolve, reject) => {
		pending.set(fontId, { resolve, reject });
		queue.push({ fontId, file });
		processNext();
	});

export const prioritizeFont = (fontId: string): void => {
	const idx = queue.findIndex((item) => item.fontId === fontId);
	if (idx > 0) {
		const [item] = queue.splice(idx, 1);
		queue.unshift(item);
	}
};
