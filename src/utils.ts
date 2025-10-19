/**
 * Utility functions for ANSI-aware text handling
 */

/**
 * Get the visible length of a string, excluding ANSI escape codes
 */
export function getVisibleLength(str: string): number {
   // Remove ANSI escape codes
   const withoutAnsi = str.replace(/\x1b\[[0-9;]*m/g, "");
   return withoutAnsi.length;
}

/**
 * Wrap text to fit within a given width, preserving ANSI codes
 * @param text Text to wrap (may contain ANSI codes)
 * @param width Maximum width per line
 * @returns Array of wrapped lines
 */
export function wrapText(text: string, width: number): string[] {
   if (width <= 0) return [];

   const lines: string[] = [];
   const inputLines = text.split("\n");

   for (const line of inputLines) {
      if (getVisibleLength(line) <= width) {
         lines.push(line);
         continue;
      }

      // Need to wrap this line
      let currentLine = "";
      let currentVisibleLength = 0;
      let activeAnsiCodes = ""; // Track active ANSI codes to carry over to next line

      let i = 0;
      while (i < line.length) {
         // Check for ANSI escape sequence
         if (line[i] === "\x1b" && line[i + 1] === "[") {
            let j = i + 2;
            while (j < line.length && line[j] !== "m") {
               j++;
            }
            if (j < line.length) {
               // Found complete ANSI sequence
               const ansiCode = line.substring(i, j + 1);
               currentLine += ansiCode;

               // Track active codes (reset on \x1b[0m, otherwise accumulate)
               if (ansiCode === "\x1b[0m") {
                  activeAnsiCodes = "";
               } else {
                  activeAnsiCodes += ansiCode;
               }

               i = j + 1;
               continue;
            }
         }

         // Regular character
         if (currentVisibleLength >= width) {
            // Line is full, push it and start new line
            lines.push(currentLine);
            currentLine = activeAnsiCodes; // Carry over active ANSI codes
            currentVisibleLength = 0;
         }

         currentLine += line[i];
         currentVisibleLength++;
         i++;
      }

      // Push remaining content
      if (currentLine.length > 0 || lines.length === 0) {
         lines.push(currentLine);
      }
   }

   return lines;
}

/**
 * Word-wrap text to fit within a given width, preserving ANSI codes
 * Tries to break on word boundaries when possible
 */
export function wordWrapText(text: string, width: number): string[] {
   if (width <= 0) return [];

   const lines: string[] = [];
   const inputLines = text.split("\n");

   for (const line of inputLines) {
      if (getVisibleLength(line) <= width) {
         lines.push(line);
         continue;
      }

      // Split into words while preserving ANSI codes
      const words: Array<{ text: string; visibleLength: number }> = [];
      let currentWord = "";
      let currentVisibleLength = 0;
      let activeAnsiCodes = "";

      let i = 0;
      while (i < line.length) {
         // Check for ANSI escape sequence
         if (line[i] === "\x1b" && line[i + 1] === "[") {
            let j = i + 2;
            while (j < line.length && line[j] !== "m") {
               j++;
            }
            if (j < line.length) {
               const ansiCode = line.substring(i, j + 1);
               currentWord += ansiCode;

               if (ansiCode === "\x1b[0m") {
                  activeAnsiCodes = "";
               } else {
                  activeAnsiCodes += ansiCode;
               }

               i = j + 1;
               continue;
            }
         }

         // Check for word boundary (space)
         if (line[i] === " ") {
            if (currentWord.length > 0) {
               words.push({ text: currentWord + " ", visibleLength: currentVisibleLength + 1 });
               currentWord = activeAnsiCodes;
               currentVisibleLength = 0;
            } else {
               // Multiple spaces
               words.push({ text: " ", visibleLength: 1 });
            }
            i++;
            continue;
         }

         // Regular character
         currentWord += line[i];
         currentVisibleLength++;
         i++;
      }

      // Push last word
      if (currentWord.length > 0) {
         words.push({ text: currentWord, visibleLength: currentVisibleLength });
      }

      // Now wrap words into lines
      let currentLine = "";
      let currentLineVisibleLength = 0;
      activeAnsiCodes = "";

      for (const word of words) {
         // If word itself is longer than width, force break it
         if (word.visibleLength > width) {
            if (currentLine.length > 0) {
               lines.push(currentLine);
               currentLine = activeAnsiCodes;
               currentLineVisibleLength = 0;
            }

            // Force wrap the long word
            const wrappedWord = wrapText(word.text, width);
            lines.push(...wrappedWord.slice(0, -1));
            currentLine = wrappedWord[wrappedWord.length - 1];
            currentLineVisibleLength = getVisibleLength(currentLine);
            continue;
         }

         // Check if word fits on current line
         if (currentLineVisibleLength + word.visibleLength <= width) {
            currentLine += word.text;
            currentLineVisibleLength += word.visibleLength;

            // Update active ANSI codes
            const ansiMatches = word.text.matchAll(/\x1b\[[0-9;]*m/g);
            for (const match of ansiMatches) {
               if (match[0] === "\x1b[0m") {
                  activeAnsiCodes = "";
               } else {
                  activeAnsiCodes += match[0];
               }
            }
         } else {
            // Word doesn't fit, start new line
            if (currentLine.length > 0) {
               lines.push(currentLine.trimEnd()); // Remove trailing space
            }
            currentLine = activeAnsiCodes + word.text;
            currentLineVisibleLength = word.visibleLength;
         }
      }

      // Push remaining content
      if (currentLine.length > 0) {
         lines.push(currentLine.trimEnd());
      }
   }

   return lines;
}
