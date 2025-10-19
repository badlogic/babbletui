import type { Component } from "./component.js";
import { wordWrapText } from "./utils.js";

export interface TextComponentOptions {
   /** Padding in number of characters on the left */
   paddingLeft?: number;
   /** Padding in number of characters on the right */
   paddingRight?: number;
   /** Padding in number of lines at the top */
   paddingTop?: number;
   /** Padding in number of lines at the bottom */
   paddingBottom?: number;
}

/**
 * Simple text component with padding and word wrapping
 */
export class TextComponent implements Component {
   private text: string;
   private options: TextComponentOptions;

   constructor(text: string, options: TextComponentOptions = {}) {
      this.text = text;
      this.options = options;
   }

   /**
    * Update the text content
    */
   setText(text: string): void {
      this.text = text;
   }

   /**
    * Get the current text
    */
   getText(): string {
      return this.text;
   }

   /**
    * Update options
    */
   setOptions(options: TextComponentOptions): void {
      this.options = options;
   }

   render(width: number): string[] {
      const lines: string[] = [];

      const paddingLeft = this.options.paddingLeft ?? 0;
      const paddingRight = this.options.paddingRight ?? 0;
      const paddingTop = this.options.paddingTop ?? 0;
      const paddingBottom = this.options.paddingBottom ?? 0;

      // Add top padding
      for (let i = 0; i < paddingTop; i++) {
         lines.push("");
      }

      // Calculate available width for text
      const availableWidth = Math.max(1, width - paddingLeft - paddingRight);

      // Wrap text
      const wrappedLines = wordWrapText(this.text, availableWidth);

      // Add wrapped lines with left/right padding
      const leftPad = " ".repeat(paddingLeft);
      const rightPad = " ".repeat(paddingRight);

      for (const line of wrappedLines) {
         lines.push(leftPad + line + rightPad);
      }

      // Add bottom padding
      for (let i = 0; i < paddingBottom; i++) {
         lines.push("");
      }

      return lines;
   }
}
