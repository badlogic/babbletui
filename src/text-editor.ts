import chalk from "chalk";
import type { Component } from "./component.js";

interface EditorState {
   lines: string[];
   cursorLine: number;
   cursorCol: number;
}

interface LayoutLine {
   text: string;
   hasCursor: boolean;
   cursorPos?: number;
}

export interface TextEditorOptions {
   /** Callback when user presses Enter */
   onSubmit?: (text: string) => void;
   /** Callback when content changes */
   onChange?: (text: string) => void;
   /** Disable submission (Enter key) */
   disableSubmit?: boolean;
}

/**
 * Multi-line text editor with box border
 * Ported from pi-mono/packages/tui (without autocomplete)
 */
export class TextEditor implements Component {
   private state: EditorState = {
      lines: [""],
      cursorLine: 0,
      cursorCol: 0,
   };
   private options: TextEditorOptions;

   constructor(options: TextEditorOptions = {}) {
      this.options = options;
   }

   getText(): string {
      return this.state.lines.join("\n");
   }

   setText(text: string): void {
      // Split text into lines, handling different line endings
      const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

      // Ensure at least one empty line
      this.state.lines = lines.length === 0 ? [""] : lines;

      // Reset cursor to end of text
      this.state.cursorLine = this.state.lines.length - 1;
      this.state.cursorCol = this.state.lines[this.state.cursorLine]?.length || 0;

      this.options.onChange?.(this.getText());
   }

   clear(): void {
      this.state = {
         lines: [""],
         cursorLine: 0,
         cursorCol: 0,
      };
      this.options.onChange?.(this.getText());
   }

   render(width: number): string[] {
      // Box drawing characters
      const topLeft = chalk.gray("╭");
      const topRight = chalk.gray("╮");
      const bottomLeft = chalk.gray("╰");
      const bottomRight = chalk.gray("╯");
      const horizontal = chalk.gray("─");
      const vertical = chalk.gray("│");

      // Calculate box width - leave 1 char margin to avoid edge wrapping
      const boxWidth = width - 1;
      const contentWidth = boxWidth - 4; // Account for "│ " and " │"

      // Layout the text
      const layoutLines = this.layoutText(contentWidth);

      const result: string[] = [];

      // Render top border
      result.push(topLeft + horizontal.repeat(boxWidth - 2) + topRight);

      // Render each layout line
      for (const layoutLine of layoutLines) {
         let displayText = layoutLine.text;
         let visibleLength = layoutLine.text.length;

         // Add cursor if this line has it
         if (layoutLine.hasCursor && layoutLine.cursorPos !== undefined) {
            const before = displayText.slice(0, layoutLine.cursorPos);
            const after = displayText.slice(layoutLine.cursorPos);

            if (after.length > 0) {
               // Cursor is on a character - replace it with highlighted version
               const cursor = `\x1b[7m${after[0]}\x1b[0m`;
               const restAfter = after.slice(1);
               displayText = before + cursor + restAfter;
            } else {
               // Cursor is at the end - add highlighted space
               const cursor = "\x1b[7m \x1b[0m";
               displayText = before + cursor;
               visibleLength = layoutLine.text.length + 1;
            }
         }

         // Calculate padding based on actual visible length
         const padding = " ".repeat(Math.max(0, contentWidth - visibleLength));

         // Render the line
         result.push(`${vertical} ${displayText}${padding} ${vertical}`);
      }

      // Render bottom border
      result.push(bottomLeft + horizontal.repeat(boxWidth - 2) + bottomRight);

      return result;
   }

   handleInput(data: string): void {
      // Handle paste - detect when we get a lot of text at once
      const isPaste = data.length > 10 || (data.length > 2 && data.includes("\n"));
      if (isPaste) {
         this.handlePaste(data);
         return;
      }

      // Ctrl+K - Delete current line
      if (data.charCodeAt(0) === 11) {
         this.deleteCurrentLine();
      }
      // Ctrl+A - Move to start of line
      else if (data.charCodeAt(0) === 1) {
         this.moveToLineStart();
      }
      // Ctrl+E - Move to end of line
      else if (data.charCodeAt(0) === 5) {
         this.moveToLineEnd();
      }
      // Shift+Enter variants - new line
      else if (
         (data.charCodeAt(0) === 10 && data.length > 1) ||
         data === "\x1b\r" ||
         data === "\x1b[13;2~" ||
         (data.length > 1 && data.includes("\x1b") && data.includes("\r")) ||
         (data === "\n" && data.length === 1) ||
         data === "\\\r"
      ) {
         this.addNewLine();
      }
      // Plain Enter - submit
      else if (data.charCodeAt(0) === 13 && data.length === 1) {
         if (this.options.disableSubmit) {
            return;
         }

         const result = this.state.lines.join("\n").trim();

         // Reset editor
         this.state = {
            lines: [""],
            cursorLine: 0,
            cursorCol: 0,
         };

         this.options.onChange?.("");
         this.options.onSubmit?.(result);
      }
      // Backspace
      else if (data.charCodeAt(0) === 127 || data.charCodeAt(0) === 8) {
         this.handleBackspace();
      }
      // Home key
      else if (data === "\x1b[H" || data === "\x1b[1~" || data === "\x1b[7~") {
         this.moveToLineStart();
      }
      // End key
      else if (data === "\x1b[F" || data === "\x1b[4~" || data === "\x1b[8~") {
         this.moveToLineEnd();
      }
      // Delete key
      else if (data === "\x1b[3~") {
         this.handleForwardDelete();
      }
      // Arrow keys
      else if (data === "\x1b[A") {
         this.moveCursor(-1, 0);
      } else if (data === "\x1b[B") {
         this.moveCursor(1, 0);
      } else if (data === "\x1b[C") {
         this.moveCursor(0, 1);
      } else if (data === "\x1b[D") {
         this.moveCursor(0, -1);
      }
      // Regular characters
      else if (data.charCodeAt(0) >= 32 && data.charCodeAt(0) <= 126) {
         this.insertCharacter(data);
      }
   }

   private layoutText(contentWidth: number): LayoutLine[] {
      const layoutLines: LayoutLine[] = [];

      if (this.state.lines.length === 0 || (this.state.lines.length === 1 && this.state.lines[0] === "")) {
         // Empty editor
         layoutLines.push({
            text: "> ",
            hasCursor: true,
            cursorPos: 2,
         });
         return layoutLines;
      }

      // Process each logical line
      for (let i = 0; i < this.state.lines.length; i++) {
         const line = this.state.lines[i] || "";
         const isCurrentLine = i === this.state.cursorLine;
         const prefix = i === 0 ? "> " : "  ";
         const prefixedLine = prefix + line;
         const maxLineLength = contentWidth;

         if (prefixedLine.length <= maxLineLength) {
            // Line fits in one layout line
            if (isCurrentLine) {
               layoutLines.push({
                  text: prefixedLine,
                  hasCursor: true,
                  cursorPos: prefix.length + this.state.cursorCol,
               });
            } else {
               layoutLines.push({
                  text: prefixedLine,
                  hasCursor: false,
               });
            }
         } else {
            // Line needs wrapping
            const chunks = [];
            for (let pos = 0; pos < prefixedLine.length; pos += maxLineLength) {
               chunks.push(prefixedLine.slice(pos, pos + maxLineLength));
            }

            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
               const chunk = chunks[chunkIndex];
               if (!chunk) continue;

               const chunkStart = chunkIndex * maxLineLength;
               const chunkEnd = chunkStart + chunk.length;
               const cursorPos = prefix.length + this.state.cursorCol;
               const hasCursorInChunk = isCurrentLine && cursorPos >= chunkStart && cursorPos < chunkEnd;

               if (hasCursorInChunk) {
                  layoutLines.push({
                     text: chunk,
                     hasCursor: true,
                     cursorPos: cursorPos - chunkStart,
                  });
               } else {
                  layoutLines.push({
                     text: chunk,
                     hasCursor: false,
                  });
               }
            }
         }
      }

      return layoutLines;
   }

   private insertCharacter(char: string): void {
      const line = this.state.lines[this.state.cursorLine] || "";
      const before = line.slice(0, this.state.cursorCol);
      const after = line.slice(this.state.cursorCol);

      this.state.lines[this.state.cursorLine] = before + char + after;
      this.state.cursorCol += char.length;

      this.options.onChange?.(this.getText());
   }

   private handlePaste(pastedText: string): void {
      // Clean the pasted text
      const cleanText = pastedText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      // Convert tabs to spaces
      const tabExpandedText = cleanText.replace(/\t/g, "    ");

      // Filter out non-printable characters except newlines
      const filteredText = tabExpandedText
         .split("")
         .filter((char) => char === "\n" || (char >= " " && char <= "~"))
         .join("");

      // Split into lines
      const pastedLines = filteredText.split("\n");

      if (pastedLines.length === 1) {
         // Single line - just insert each character
         const text = pastedLines[0] || "";
         for (const char of text) {
            this.insertCharacter(char);
         }
         return;
      }

      // Multi-line paste
      const currentLine = this.state.lines[this.state.cursorLine] || "";
      const beforeCursor = currentLine.slice(0, this.state.cursorCol);
      const afterCursor = currentLine.slice(this.state.cursorCol);

      const newLines: string[] = [];

      // Add all lines before current line
      for (let i = 0; i < this.state.cursorLine; i++) {
         newLines.push(this.state.lines[i] || "");
      }

      // Add the first pasted line merged with before cursor text
      newLines.push(beforeCursor + (pastedLines[0] || ""));

      // Add all middle pasted lines
      for (let i = 1; i < pastedLines.length - 1; i++) {
         newLines.push(pastedLines[i] || "");
      }

      // Add the last pasted line with after cursor text
      newLines.push((pastedLines[pastedLines.length - 1] || "") + afterCursor);

      // Add all lines after current line
      for (let i = this.state.cursorLine + 1; i < this.state.lines.length; i++) {
         newLines.push(this.state.lines[i] || "");
      }

      this.state.lines = newLines;
      this.state.cursorLine += pastedLines.length - 1;
      this.state.cursorCol = (pastedLines[pastedLines.length - 1] || "").length;

      this.options.onChange?.(this.getText());
   }

   private addNewLine(): void {
      const currentLine = this.state.lines[this.state.cursorLine] || "";
      const before = currentLine.slice(0, this.state.cursorCol);
      const after = currentLine.slice(this.state.cursorCol);

      this.state.lines[this.state.cursorLine] = before;
      this.state.lines.splice(this.state.cursorLine + 1, 0, after);

      this.state.cursorLine++;
      this.state.cursorCol = 0;

      this.options.onChange?.(this.getText());
   }

   private handleBackspace(): void {
      if (this.state.cursorCol > 0) {
         // Delete character in current line
         const line = this.state.lines[this.state.cursorLine] || "";
         const before = line.slice(0, this.state.cursorCol - 1);
         const after = line.slice(this.state.cursorCol);

         this.state.lines[this.state.cursorLine] = before + after;
         this.state.cursorCol--;
      } else if (this.state.cursorLine > 0) {
         // Merge with previous line
         const currentLine = this.state.lines[this.state.cursorLine] || "";
         const previousLine = this.state.lines[this.state.cursorLine - 1] || "";

         this.state.lines[this.state.cursorLine - 1] = previousLine + currentLine;
         this.state.lines.splice(this.state.cursorLine, 1);

         this.state.cursorLine--;
         this.state.cursorCol = previousLine.length;
      }

      this.options.onChange?.(this.getText());
   }

   private moveToLineStart(): void {
      this.state.cursorCol = 0;
   }

   private moveToLineEnd(): void {
      const currentLine = this.state.lines[this.state.cursorLine] || "";
      this.state.cursorCol = currentLine.length;
   }

   private handleForwardDelete(): void {
      const currentLine = this.state.lines[this.state.cursorLine] || "";

      if (this.state.cursorCol < currentLine.length) {
         // Delete character at cursor position
         const before = currentLine.slice(0, this.state.cursorCol);
         const after = currentLine.slice(this.state.cursorCol + 1);
         this.state.lines[this.state.cursorLine] = before + after;
      } else if (this.state.cursorLine < this.state.lines.length - 1) {
         // At end of line - merge with next line
         const nextLine = this.state.lines[this.state.cursorLine + 1] || "";
         this.state.lines[this.state.cursorLine] = currentLine + nextLine;
         this.state.lines.splice(this.state.cursorLine + 1, 1);
      }

      this.options.onChange?.(this.getText());
   }

   private deleteCurrentLine(): void {
      if (this.state.lines.length === 1) {
         // Only one line - just clear it
         this.state.lines[0] = "";
         this.state.cursorCol = 0;
      } else {
         // Multiple lines - remove current line
         this.state.lines.splice(this.state.cursorLine, 1);

         // Adjust cursor position
         if (this.state.cursorLine >= this.state.lines.length) {
            this.state.cursorLine = this.state.lines.length - 1;
         }

         // Clamp cursor column to new line length
         const newLine = this.state.lines[this.state.cursorLine] || "";
         this.state.cursorCol = Math.min(this.state.cursorCol, newLine.length);
      }

      this.options.onChange?.(this.getText());
   }

   private moveCursor(deltaLine: number, deltaCol: number): void {
      if (deltaLine !== 0) {
         const newLine = this.state.cursorLine + deltaLine;
         if (newLine >= 0 && newLine < this.state.lines.length) {
            this.state.cursorLine = newLine;
            // Clamp cursor column to new line length
            const line = this.state.lines[this.state.cursorLine] || "";
            this.state.cursorCol = Math.min(this.state.cursorCol, line.length);
         }
      }

      if (deltaCol !== 0) {
         const newCol = this.state.cursorCol + deltaCol;
         const currentLine = this.state.lines[this.state.cursorLine] || "";
         const maxCol = currentLine.length;
         this.state.cursorCol = Math.max(0, Math.min(maxCol, newCol));
      }
   }
}
