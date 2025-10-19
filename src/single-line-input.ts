import type { Component } from "./component.js";
import { getVisibleLength } from "./utils.js";

export interface SingleLineInputOptions {
   /** Prompt to display before the input */
   prompt?: string;
   /** Callback when user presses Enter */
   onSubmit?: (value: string) => void;
   /** Callback when value changes */
   onChange?: (value: string) => void;
}

/**
 * Single-line text input with cursor and horizontal scrolling
 */
export class SingleLineInput implements Component {
   private value: string = "";
   private cursorPosition: number = 0; // Position in the value string
   private scrollOffset: number = 0; // Horizontal scroll offset
   private options: SingleLineInputOptions;

   constructor(options: SingleLineInputOptions = {}) {
      this.options = options;
   }

   /**
    * Get the current value
    */
   getValue(): string {
      return this.value;
   }

   /**
    * Set the value
    */
   setValue(value: string): void {
      this.value = value;
      this.cursorPosition = Math.min(this.cursorPosition, value.length);
      this.options.onChange?.(this.value);
   }

   /**
    * Clear the input
    */
   clear(): void {
      this.value = "";
      this.cursorPosition = 0;
      this.scrollOffset = 0;
      this.options.onChange?.(this.value);
   }

   render(width: number): string[] {
      const prompt = this.options.prompt ?? "> ";
      const promptLen = getVisibleLength(prompt);
      const availableWidth = Math.max(1, width - promptLen);

      // Adjust scroll offset to keep cursor visible
      if (this.cursorPosition < this.scrollOffset) {
         this.scrollOffset = this.cursorPosition;
      } else if (this.cursorPosition >= this.scrollOffset + availableWidth) {
         this.scrollOffset = this.cursorPosition - availableWidth + 1;
      }

      // Extract visible portion of value
      const visibleValue = this.value.substring(this.scrollOffset, this.scrollOffset + availableWidth);
      const cursorInVisible = this.cursorPosition - this.scrollOffset;

      // Build the line with cursor
      let line = prompt;

      // Add characters before cursor
      line += visibleValue.substring(0, cursorInVisible);

      // Add cursor (block cursor)
      if (cursorInVisible < visibleValue.length) {
         // Cursor on a character
         line += "\x1b[7m" + visibleValue[cursorInVisible] + "\x1b[0m"; // Reverse video
         line += visibleValue.substring(cursorInVisible + 1);
      } else {
         // Cursor at end
         line += "\x1b[7m \x1b[0m"; // Reverse video space
      }

      return [line];
   }

   handleInput(data: string): void {
      // Handle special keys
      if (data === "\r" || data === "\n") {
         // Enter - submit
         this.options.onSubmit?.(this.value);
         return;
      }

      if (data === "\x7f" || data === "\x08") {
         // Backspace
         if (this.cursorPosition > 0) {
            this.value = this.value.substring(0, this.cursorPosition - 1) + this.value.substring(this.cursorPosition);
            this.cursorPosition--;
            this.options.onChange?.(this.value);
         }
         return;
      }

      if (data === "\x1b[C") {
         // Right arrow
         if (this.cursorPosition < this.value.length) {
            this.cursorPosition++;
         }
         return;
      }

      if (data === "\x1b[D") {
         // Left arrow
         if (this.cursorPosition > 0) {
            this.cursorPosition--;
         }
         return;
      }

      if (data === "\x1b[H" || data === "\x01") {
         // Home or Ctrl+A
         this.cursorPosition = 0;
         return;
      }

      if (data === "\x1b[F" || data === "\x05") {
         // End or Ctrl+E
         this.cursorPosition = this.value.length;
         return;
      }

      if (data === "\x1b[3~") {
         // Delete
         if (this.cursorPosition < this.value.length) {
            this.value = this.value.substring(0, this.cursorPosition) + this.value.substring(this.cursorPosition + 1);
            this.options.onChange?.(this.value);
         }
         return;
      }

      if (data === "\x15") {
         // Ctrl+U - clear line
         this.value = "";
         this.cursorPosition = 0;
         this.scrollOffset = 0;
         this.options.onChange?.(this.value);
         return;
      }

      // Regular character input
      if (data.length === 1 && data >= " " && data <= "~") {
         this.value = this.value.substring(0, this.cursorPosition) + data + this.value.substring(this.cursorPosition);
         this.cursorPosition++;
         this.options.onChange?.(this.value);
      }
   }
}
