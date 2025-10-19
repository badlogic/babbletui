import chalk from "chalk";
import type { Component } from "./component.js";

export type MenuEntry =
   | {
        type: "toggle";
        label: string;
        value: boolean;
        onChange?: (value: boolean) => void;
     }
   | {
        type: "enum";
        label: string;
        value: string;
        options: string[];
        onChange?: (value: string) => void;
     };

export interface MenuOptions {
   /** Callback when menu is closed (Escape key) */
   onClose?: () => void;
}

/**
 * Menu component for configuration, model selection, etc.
 * Entries can be navigated with up/down arrows
 * Enter toggles/cycles the selected entry
 * Escape closes the menu
 */
export class Menu implements Component {
   private entries: MenuEntry[];
   private selectedIndex: number = 0;
   private options: MenuOptions;

   constructor(entries: MenuEntry[], options: MenuOptions = {}) {
      this.entries = entries;
      this.options = options;
   }

   /**
    * Set the menu entries
    */
   setEntries(entries: MenuEntry[]): void {
      this.entries = entries;
      // Clamp selected index
      this.selectedIndex = Math.min(this.selectedIndex, entries.length - 1);
   }

   /**
    * Get the current entries
    */
   getEntries(): MenuEntry[] {
      return this.entries;
   }

   render(width: number): string[] {
      const lines: string[] = [];

      // Title
      lines.push(chalk.bold("Menu") + chalk.gray(" (↑↓ navigate, Enter select, Esc close)"));
      lines.push("");

      // Render each entry
      for (let i = 0; i < this.entries.length; i++) {
         const entry = this.entries[i];
         const isSelected = i === this.selectedIndex;

         // Selection indicator
         const indicator = isSelected ? chalk.cyan("→ ") : "  ";

         let entryLine = "";

         if (entry.type === "toggle") {
            const value = entry.value ? chalk.green("✓") : chalk.gray("✗");
            entryLine = `${indicator}${entry.label}: ${value}`;
         } else if (entry.type === "enum") {
            const valueIndex = entry.options.indexOf(entry.value);
            const valueDisplay = chalk.yellow(entry.value);
            const position = chalk.gray(`(${valueIndex + 1}/${entry.options.length})`);
            entryLine = `${indicator}${entry.label}: ${valueDisplay} ${position}`;
         }

         lines.push(entryLine);
      }

      return lines;
   }

   handleInput(data: string): void {
      // Up arrow
      if (data === "\x1b[A") {
         this.selectedIndex = Math.max(0, this.selectedIndex - 1);
         return;
      }

      // Down arrow
      if (data === "\x1b[B") {
         this.selectedIndex = Math.min(this.entries.length - 1, this.selectedIndex + 1);
         return;
      }

      // Enter - toggle/cycle selected entry
      if (data === "\r" || data === "\n") {
         const entry = this.entries[this.selectedIndex];
         if (!entry) return;

         if (entry.type === "toggle") {
            entry.value = !entry.value;
            entry.onChange?.(entry.value);
         } else if (entry.type === "enum") {
            // Cycle to next option
            const currentIndex = entry.options.indexOf(entry.value);
            const nextIndex = (currentIndex + 1) % entry.options.length;
            entry.value = entry.options[nextIndex] || entry.value;
            entry.onChange?.(entry.value);
         }
         return;
      }

      // Escape - close menu
      if (data === "\x1b") {
         this.options.onClose?.();
         return;
      }
   }
}
