import { test, expect } from "vitest";
import { hello, Example } from "./index.js";

test("hello function", () => {
   expect(hello("World")).toBe("Hello, World!");
});

test("Example class", () => {
   const example = new Example("Test");
   expect(example.greet()).toBe("Hello, Test!");
});
