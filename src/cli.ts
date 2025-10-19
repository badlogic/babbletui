#!/usr/bin/env node

import chalk from "chalk";
import {
   TUI,
   Container,
   TextComponent,
   MarkdownComponent,
   TextEditor,
   SingleLineInput,
   Menu,
   type MenuEntry,
} from "./index.js";

// Demo application showcasing all components
function main() {
   const ui = new TUI();

   // Message container
   const messages = new Container();

   // Add a welcome message
   messages.addChild(new TextComponent(chalk.bold.cyan("Welcome to BabbleTUI!"), { paddingTop: 1, paddingBottom: 1 }));

   // Add a markdown example
   const markdown = new MarkdownComponent(`
# Example Chat Interface

This is a demo of **babbletui**, a minimal TUI library for chat interfaces.

## Features

- **Two-buffer differential rendering** - only updates changed lines
- **Natural terminal scrollback** - works with terminal's native scrollback
- **Rich components** - text, markdown, editors, menus

Try typing a message below and pressing Enter!
`);
   messages.addChild(markdown);

   // Status line
   const statusLine = new TextComponent(chalk.gray("Ready"), { paddingTop: 1 });

   // Text editor
   const editor = new TextEditor({
      onSubmit: (text) => {
         if (!text.trim()) return;

         // Add user message
         messages.addChild(new TextComponent(chalk.green("You: ") + text, { paddingTop: 1 }));

         // Add a response
         messages.addChild(
            new TextComponent(chalk.blue("Assistant: ") + `You said: "${text}"`, { paddingTop: 1, paddingBottom: 1 }),
         );

         ui.requestRender();
      },
      onChange: (text) => {
         const charCount = text.length;
         statusLine.setText(chalk.gray(`${charCount} characters`));
         ui.requestRender();
      },
   });

   // Menu (hidden by default)
   let menuVisible = false;
   const menuEntries: MenuEntry[] = [
      {
         type: "toggle",
         label: "Dark mode",
         value: true,
         onChange: (value) => {
            console.log("Dark mode:", value);
         },
      },
      {
         type: "enum",
         label: "Model",
         value: "gpt-4",
         options: ["gpt-3.5", "gpt-4", "claude-3"],
         onChange: (value) => {
            console.log("Model changed to:", value);
         },
      },
   ];

   const menu = new Menu(menuEntries, {
      onClose: () => {
         menuVisible = false;
         ui.removeChild(menu);
         ui.setFocus(editor);
         ui.requestRender();
      },
   });

   // Build UI
   ui.addChild(messages);
   ui.addChild(statusLine);
   ui.addChild(editor);

   // Set focus to editor
   ui.setFocus(editor);

   // Global input handler for Ctrl+C and Ctrl+M
   ui.setGlobalInputHandler((data) => {
      // Ctrl+C - exit
      if (data === "\x03") {
         ui.stop();
         process.exit(0);
         return true;
      }

      // Ctrl+M - toggle menu
      if (data === "\x0d" && data.length === 1 && !menuVisible) {
         // Don't intercept plain Enter when menu is visible
         return false;
      }

      // Ctrl+P - toggle menu
      if (data === "\x10") {
         if (menuVisible) {
            ui.removeChild(menu);
            ui.setFocus(editor);
         } else {
            ui.addChild(menu);
            ui.setFocus(menu);
         }
         menuVisible = !menuVisible;
         ui.requestRender();
         return true;
      }

      return false;
   });

   // Start the UI
   ui.start();
}

main();
