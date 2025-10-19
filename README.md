# @mariozechner/babbletui

Minimal TUI library for chat interfaces with two-buffer differential rendering.

## Features

- **Two-buffer differential rendering** - Only updates changed lines, minimizing terminal writes
- **Natural terminal scrollback** - Works with terminal's native scrollback buffer
- **Rich components** - Text, Markdown, single/multi-line editors, menus
- **Simple API** - Easy to build chat interfaces without manual cursor management
- **TypeScript** - Full type definitions included

## Installation

```bash
npm install @mariozechner/babbletui
```

## Quick Start

```typescript
import { TUI, TextComponent, TextEditor } from "@mariozechner/babbletui";

const ui = new TUI();

// Add a message
ui.addChild(new TextComponent("Welcome to BabbleTUI!"));

// Add a text editor
const editor = new TextEditor({
   onSubmit: (text) => {
      ui.addChild(new TextComponent(`You said: ${text}`));
      ui.requestRender();
   },
});

ui.addChild(editor);
ui.setFocus(editor);

// Handle Ctrl+C to exit
ui.setGlobalInputHandler((data) => {
   if (data === "\x03") {
      ui.stop();
      process.exit(0);
      return true;
   }
   return false;
});

ui.start();
```

## Components

### TextComponent

Simple text display with padding and word wrapping.

```typescript
import { TextComponent } from "@mariozechner/babbletui";

const text = new TextComponent("Hello, world!", {
   paddingLeft: 2,
   paddingRight: 2,
   paddingTop: 1,
   paddingBottom: 1,
});
```

### MarkdownComponent

Renders markdown with terminal styling (bold, italic, code blocks, lists, etc.).

```typescript
import { MarkdownComponent } from "@mariozechner/babbletui";

const markdown = new MarkdownComponent(`
# Heading

This is **bold** and this is *italic*.

- List item 1
- List item 2
`);
```

### TextEditor

Multi-line text editor with box border, full keyboard support, and paste handling.

```typescript
import { TextEditor } from "@mariozechner/babbletui";

const editor = new TextEditor({
   onSubmit: (text) => console.log("Submitted:", text),
   onChange: (text) => console.log("Changed:", text),
});
```

**Keys:**
- Enter: Submit (clears editor)
- Shift+Enter: New line
- Ctrl+A / Home: Start of line
- Ctrl+E / End: End of line
- Ctrl+K: Delete line
- Arrow keys: Navigate

### SingleLineInput

Simple single-line input with horizontal scrolling.

```typescript
import { SingleLineInput } from "@mariozechner/babbletui";

const input = new SingleLineInput({
   prompt: "> ",
   onSubmit: (value) => console.log("Submitted:", value),
});
```

### Menu

Interactive menu for configuration, model selection, etc.

```typescript
import { Menu } from "@mariozechner/babbletui";

const menu = new Menu(
   [
      {
         type: "toggle",
         label: "Dark mode",
         value: true,
         onChange: (value) => console.log("Dark mode:", value),
      },
      {
         type: "enum",
         label: "Model",
         value: "gpt-4",
         options: ["gpt-3.5", "gpt-4", "claude-3"],
         onChange: (value) => console.log("Model:", value),
      },
   ],
   {
      onClose: () => console.log("Menu closed"),
   },
);
```

**Keys:**
- ↑/↓: Navigate
- Enter: Toggle/cycle selected entry
- Escape: Close menu

### Container

Groups multiple components together.

```typescript
import { Container } from "@mariozechner/babbletui";

const container = new Container();
container.addChild(component1);
container.addChild(component2);
container.removeChild(component1);
```

## Demo

Run the demo to see all components in action:

```bash
npm run build
node dist/cli.js
```

**Demo controls:**
- Type and press Enter to send a message
- Ctrl+P: Toggle menu
- Ctrl+C: Exit

## Architecture

See [docs/renderer.md](docs/renderer.md) for detailed information about the two-buffer differential rendering system.

**Key concepts:**
- Maintains old and new line buffers
- Diffs buffers to find changes
- Only updates changed lines within the viewport
- Full re-render when changes occur above viewport (in scrollback)
- Efficient handling of streaming content (appends new lines)

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Format and lint
npm run check
```

## Publishing

The `publish.sh` script handles versioning, tagging, and publishing:

```bash
# Patch release (1.0.0 -> 1.0.1)
./publish.sh

# Minor release (1.0.1 -> 1.1.0)
./publish.sh minor

# Major release (1.1.0 -> 2.0.0)
./publish.sh major
```

## License

MIT
