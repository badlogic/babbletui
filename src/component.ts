/**
 * Component interface - anything that can render itself
 */
export interface Component {
   /**
    * Render the component to an array of lines
    * @param width Available width in columns
    * @returns Array of strings, one per line
    */
   render(width: number): string[];

   /**
    * Handle input (optional)
    * Only called if this component has focus
    * @param data Input data (key press, escape sequence, etc.)
    */
   handleInput?(data: string): void;
}
