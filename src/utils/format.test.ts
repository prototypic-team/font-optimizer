import { describe, expect, it } from "bun:test";

import { formatFileSize } from "./format";

describe("formatFileSize", () => {
	it("uses bytes below 1 KiB", () => {
		expect(formatFileSize(0)).toBe("0 B");
		expect(formatFileSize(1023)).toBe("1023 B");
	});

	it("switches to KiB at 1024 bytes", () => {
		expect(formatFileSize(1024)).toBe("1.0 KB");
	});

	it("shows one decimal for small KiB values and rounds at 10 KiB", () => {
		expect(formatFileSize(1536)).toBe("1.5 KB");
		expect(formatFileSize(10 * 1024)).toBe("10 KB");
	});

	it("uses MiB with the same rounding rules", () => {
		expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
		expect(formatFileSize(10 * 1024 * 1024)).toBe("10 MB");
	});
});
