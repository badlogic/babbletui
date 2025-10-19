import type { Component } from "./component.js";
import { Container } from "./container.js";
import type { Terminal } from "./terminal.js";
import { ProcessTerminal } from "./terminal.js";

/**
 * Main TUI class with two-buffer differential rendering
 */
export class TUI {
   private terminal: Terminal;
   private root: Container;
   private oldBuffer: string[] = [];
   private focusedComponent?: Component;
   private onGlobalInput?: (data: string) => boolean; // Return true to consume input
   private renderRequested = false;
   private isFirstRender = true;

   constructor(terminal?: Terminal) {
      this.terminal = terminal ?? new ProcessTerminal();
      this.root = new Container();
   }

   /**
    * Start the TUI
    */
   start(): void {
      // Hide cursor
      this.terminal.write("\x1b[?25l");

      // Start terminal
      this.terminal.start(this.handleInput, this.handleResize);

      // Initial render
      this.requestRender();
   }

   /**
    * Stop the TUI
    */
   stop(): void {
      // Show cursor
      this.terminal.write("\x1b[?25h");

      // Stop terminal
      this.terminal.stop();
   }

   /**
    * Add a component to the root container
    */
   addChild(component: Component): void {
      this.root.addChild(component);
   }

   /**
    * Remove a component from the root container
    */
   removeChild(component: Component): void {
      this.root.removeChild(component);
   }

   /**
    * Clear all components
    */
   clear(): void {
      this.root.clear();
   }

   /**
    * Set the focused component (receives input)
    */
   setFocus(component: Component | undefined): void {
      this.focusedComponent = component;
   }

   /**
    * Get the currently focused component
    */
   getFocus(): Component | undefined {
      return this.focusedComponent;
   }

   /**
    * Set global input handler (called before focused component)
    * Return true to consume the input and prevent focused component from receiving it
    */
   setGlobalInputHandler(handler: (data: string) => boolean): void {
      this.onGlobalInput = handler;
   }

   /**
    * Request a render on the next tick
    */
   requestRender(): void {
      if (this.renderRequested) return;

      this.renderRequested = true;
      process.nextTick(() => {
         this.renderRequested = false;
         this.renderToScreen();
      });
   }

   /**
    * Get the root container
    */
   getRoot(): Container {
      return this.root;
   }

   /**
    * Get terminal dimensions
    */
   getTerminalSize(): { width: number; height: number } {
      return {
         width: this.terminal.columns,
         height: this.terminal.rows,
      };
   }

   private handleInput = (data: string): void => {
      // Check global handler first
      if (this.onGlobalInput?.(data)) {
         return;
      }

      // Pass to focused component
      if (this.focusedComponent?.handleInput) {
         this.focusedComponent.handleInput(data);
         this.requestRender();
      }
   };

   private handleResize = (): void => {
      // Terminal resize always triggers full re-render
      this.isFirstRender = true;
      this.oldBuffer = [];
      this.requestRender();
   };

   private renderToScreen(): void {
      const width = this.terminal.columns;
      const height = this.terminal.rows;

      // Render all components to new buffer
      const newBuffer = this.root.render(width);

      if (this.isFirstRender) {
         this.renderFull(newBuffer);
         this.isFirstRender = false;
      } else {
         this.renderDiff(newBuffer, height);
      }

      this.oldBuffer = newBuffer;
   }

   /**
    * Full re-render: clear scrollback and output everything
    */
   private renderFull(newBuffer: string[]): void {
      // Clear scrollback
      this.terminal.write("\x1b[3J");
      // Clear screen
      this.terminal.write("\x1b[2J");
      // Move cursor to home
      this.terminal.write("\x1b[H");

      // Output all lines
      for (let i = 0; i < newBuffer.length; i++) {
         if (i > 0) {
            this.terminal.write("\n");
         }
         this.terminal.write(newBuffer[i]);
      }
   }

   /**
    * Differential render based on two-buffer comparison
    */
   private renderDiff(newBuffer: string[], viewportHeight: number): void {
      const oldLen = this.oldBuffer.length;
      const newLen = newBuffer.length;

      // Case 1: Same number of lines
      if (oldLen === newLen) {
         this.renderSameLength(newBuffer, viewportHeight);
         return;
      }

      // Case 2: Buffer grew
      if (oldLen < newLen) {
         this.renderGrew(newBuffer, viewportHeight);
         return;
      }

      // Case 3: Buffer shrank - always full re-render
      this.renderFull(newBuffer);
   }

   /**
    * Handle case where buffer length is the same
    */
   private renderSameLength(newBuffer: string[], viewportHeight: number): void {
      const len = newBuffer.length;

      // Find first changed line
      let firstChanged = -1;
      for (let i = 0; i < len; i++) {
         if (this.oldBuffer[i] !== newBuffer[i]) {
            firstChanged = i;
            break;
         }
      }

      // No changes
      if (firstChanged === -1) return;

      // Check if changed line is above viewport
      const viewportStart = Math.max(0, len - viewportHeight);
      if (firstChanged < viewportStart) {
         // Changes in scrollback - full re-render
         this.renderFull(newBuffer);
         return;
      }

      // Changes only in viewport - partial update
      this.updateViewportLines(newBuffer, firstChanged);
   }

   /**
    * Handle case where buffer grew
    */
   private renderGrew(newBuffer: string[], viewportHeight: number): void {
      const oldLen = this.oldBuffer.length;

      // Compare first oldLen lines
      let firstChanged = -1;
      for (let i = 0; i < oldLen; i++) {
         if (this.oldBuffer[i] !== newBuffer[i]) {
            firstChanged = i;
            break;
         }
      }

      // If first oldLen lines are identical, just append new lines
      if (firstChanged === -1) {
         // Append new lines
         for (let i = oldLen; i < newBuffer.length; i++) {
            this.terminal.write("\n" + newBuffer[i]);
         }
         return;
      }

      // Something changed in existing lines
      const viewportStart = Math.max(0, oldLen - viewportHeight);
      if (firstChanged < viewportStart) {
         // Changes above viewport - full re-render
         this.renderFull(newBuffer);
         return;
      }

      // Changes in viewport - update those lines and append new ones
      this.updateViewportLines(newBuffer, firstChanged);

      // Append new lines
      for (let i = oldLen; i < newBuffer.length; i++) {
         this.terminal.write("\n" + newBuffer[i]);
      }
   }

   /**
    * Update specific lines in the viewport using cursor positioning
    */
   private updateViewportLines(newBuffer: string[], fromLine: number): void {
      const totalLines = newBuffer.length;

      // Group consecutive changed lines for efficient updates
      let currentGroup: number[] = [];

      for (let i = fromLine; i < Math.min(newBuffer.length, this.oldBuffer.length); i++) {
         if (newBuffer[i] !== this.oldBuffer[i]) {
            currentGroup.push(i);
         } else if (currentGroup.length > 0) {
            // Write the group
            this.writeLineGroup(newBuffer, currentGroup, totalLines);
            currentGroup = [];
         }
      }

      // Write remaining group
      if (currentGroup.length > 0) {
         this.writeLineGroup(newBuffer, currentGroup, totalLines);
      }
   }

   /**
    * Write a group of consecutive lines
    */
   private writeLineGroup(newBuffer: string[], lines: number[], totalLines: number): void {
      if (lines.length === 0) return;

      const firstLine = lines[0];

      // Calculate row position (1-indexed, from bottom)
      const rowFromBottom = totalLines - firstLine;

      // Move cursor to position
      // Save cursor position
      this.terminal.write("\x1b[s");

      // Move cursor up
      this.terminal.write(`\x1b[${rowFromBottom}A`);
      // Move to start of line
      this.terminal.write("\r");

      // Write consecutive lines
      for (let i = 0; i < lines.length; i++) {
         const lineIdx = lines[i];

         // Clear line and write content
         this.terminal.write("\x1b[2K" + newBuffer[lineIdx]);

         // Move to next line if not last
         if (i < lines.length - 1) {
            this.terminal.write("\n");
         }
      }

      // Restore cursor position
      this.terminal.write("\x1b[u");
   }
}
