# @mariozechner/babbletui

Minimal TUI library for chat interfaces

## Installation

```bash
npm install @mariozechner/babbletui
```

## Usage

### As a library

```javascript
import { hello, Example } from "@mariozechner/babbletui";

console.log(hello("World"));

const example = new Example("Test");
console.log(example.greet());
```

### As a CLI tool

```bash
npx @mariozechner/babbletui [name]
```

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

## Build Output

Running `npm run build` creates:

- `dist/index.js` - Main library file
- `dist/cli.js` - CLI executable
- `dist/index.d.ts` - TypeScript definitions
- Source maps for debugging

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

The script will:

1. Check for uncommitted changes
2. Run checks (format, lint, type-check)
3. Build the project
4. Bump version in package.json
5. Commit and tag the version
6. Push to GitHub with tags
7. Publish to npm
