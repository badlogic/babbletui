import { test, expect } from "vitest";
import { getVisibleLength, wrapText, wordWrapText } from "./index.js";

test("getVisibleLength strips ANSI codes", () => {
   expect(getVisibleLength("hello")).toBe(5);
   expect(getVisibleLength("\x1b[31mhello\x1b[0m")).toBe(5);
   expect(getVisibleLength("\x1b[1m\x1b[31mhello\x1b[0m")).toBe(5);
});

test("wrapText wraps long lines", () => {
   const result = wrapText("hello world", 5);
   expect(result).toEqual(["hello", " worl", "d"]);
});

test("wordWrapText wraps on word boundaries", () => {
   const result = wordWrapText("hello world", 10);
   expect(result).toEqual(["hello", "world"]);
});
