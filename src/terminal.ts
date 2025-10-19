/**
 * Terminal abstraction for input/output operations
 */
export interface Terminal {
   /**
    * Start the terminal, enabling raw mode and setting up event handlers
    * @param onInput Callback for input data (key presses, paste events)
    * @param onResize Callback when terminal is resized
    */
   start(onInput: (data: string) => void, onResize: () => void): void;

   /**
    * Stop the terminal, restoring normal mode and cleaning up
    */
   stop(): void;

   /**
    * Write data to the terminal
    */
   write(data: string): void;

   /**
    * Current terminal width in columns
    */
   get columns(): number;

   /**
    * Current terminal height in rows
    */
   get rows(): number;
}

/**
 * Terminal implementation using process.stdin/stdout
 */
export class ProcessTerminal implements Terminal {
   private onInputCallback?: (data: string) => void;
   private onResizeCallback?: () => void;
   private resizeHandler?: () => void;

   start(onInput: (data: string) => void, onResize: () => void): void {
      this.onInputCallback = onInput;
      this.onResizeCallback = onResize;

      // Enable raw mode for character-by-character input
      if (process.stdin.isTTY) {
         process.stdin.setRawMode(true);
      }
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", this.handleData);

      // Handle resize events
      this.resizeHandler = () => {
         this.onResizeCallback?.();
      };
      process.stdout.on("resize", this.resizeHandler);

      // Resume stdin (in case it was paused)
      process.stdin.resume();
   }

   stop(): void {
      // Restore normal mode
      if (process.stdin.isTTY) {
         process.stdin.setRawMode(false);
      }

      // Remove event handlers
      process.stdin.off("data", this.handleData);
      if (this.resizeHandler) {
         process.stdout.off("resize", this.resizeHandler);
      }

      // Pause stdin
      process.stdin.pause();

      this.onInputCallback = undefined;
      this.onResizeCallback = undefined;
      this.resizeHandler = undefined;
   }

   write(data: string): void {
      process.stdout.write(data);
   }

   get columns(): number {
      return process.stdout.columns || 80;
   }

   get rows(): number {
      return process.stdout.rows || 24;
   }

   private handleData = (data: string): void => {
      this.onInputCallback?.(data);
   };
}
