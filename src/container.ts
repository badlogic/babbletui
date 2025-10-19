import type { Component } from "./component.js";

/**
 * Container for grouping components
 * Renders all children sequentially and aggregates their output
 */
export class Container implements Component {
   private children: Component[] = [];

   /**
    * Add a component to the container
    */
   addChild(component: Component): void {
      this.children.push(component);
   }

   /**
    * Remove a component from the container
    */
   removeChild(component: Component): void {
      const index = this.children.indexOf(component);
      if (index !== -1) {
         this.children.splice(index, 1);
      }
   }

   /**
    * Remove all children
    */
   clear(): void {
      this.children = [];
   }

   /**
    * Get all children
    */
   getChildren(): Component[] {
      return this.children;
   }

   /**
    * Render all children and aggregate their lines
    */
   render(width: number): string[] {
      const lines: string[] = [];

      for (const child of this.children) {
         const childLines = child.render(width);
         lines.push(...childLines);
      }

      return lines;
   }
}
