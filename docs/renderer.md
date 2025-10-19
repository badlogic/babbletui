# Renderer Design

## Problem Statement

Most TUI libraries take over the terminal viewport and manually implement scrolling:
- They render to specific coordinates within the terminal viewport
- Scrolling requires tracking position, calculating visibility, and handling input events
- Any update requires recalculating visible content and re-rendering

This works for full-screen apps but is painful for chat interfaces where natural terminal scrollback is desired.

## Chat Interface Structure

A typical chat interface has these components from top to bottom:

1. **Chat messages** - vertical list spanning viewport width
   - Can have complex internal layouts with padding
   - Can update (LLM streaming, animations)
   - Typically only the last message is "live" - everything above is frozen/immutable by default, though interactions (message expansion, surfacing tool-call output) can invalidate earlier content

2. **Status line** - single or multi-line block showing current state
   - Example: "Streaming..." or "Ready" with metadata

3. **Multi-line text editor** - user input area
   - Grows dynamically as user types
   - Constrained to viewport to avoid rendering artifacts

4. **Bottom info/chrome** - additional UI elements
   - Help text, mode indicators, etc.

## Terminal Model

### Key Concepts

- **Scrollback buffer** - everything the terminal remembers (potentially thousands of lines)
- **Viewport** - the bottom N lines (where N = terminal height, e.g., 24 lines)
- **Addressable portion** - same as viewport; where we can move cursor and overwrite content
- **Above viewport** - lines in scrollback; frozen forever, cannot be modified

### Terminal Behavior

When we output new lines at the bottom:
- Those new lines become part of the addressable viewport
- The top lines of the previous viewport get pushed into frozen scrollback
- We have a new "window" of N lines we can address

**Critical constraint:** We can ONLY render within the current viewport. Once content scrolls above the viewport into scrollback, it's immutable from the terminal's perspective.
When upstream state mutates lines that have already scrolled away, the renderer must rebuild the entire history by clearing scrollback and replaying every line.

## Renderer Approach

### Two-Buffer System

**Core idea:** Maintain two buffers and diff them to determine minimal updates needed.

1. **Old buffer** - all previously rendered lines (could be 1000+ lines)
2. **New buffer** - freshly rendered lines for current frame

### Render Cycle

1. **Build new buffer:**
   - Ask each UI element (messages, status, editor, footer) to render themselves
   - Elements can cache their rendered output and skip re-rendering if props unchanged

2. **Diff old vs new buffer:**
   - Compare line by line from start to finish
   - Identify which lines changed and where

3. **Apply updates:**
   - Based on diff results, either do partial update or full re-render
   - Use smart cursor positioning for consecutive changed lines

4. **Swap buffers:**
   - New buffer becomes old buffer for next cycle

### Update Decision Logic

User scroll position is irrelevant - we only care about the cursor-addressable portion (last N lines).

#### Case 1: Same number of lines (old.length == new.length)

**Sub-case 1a: Changes above viewport**
- Changed lines are in frozen scrollback, cannot modify them
- **Action: Full re-render**
  - Clear scrollback (CSI `3J`) so we can rebuild history with updated content
  - Output all new buffer lines from top to bottom
  - Old content is abandoned; the rebuilt stream becomes the new scrollback

**Sub-case 1b: Changes only within viewport**
- Changed lines are in the addressable portion (bottom N lines)
- **Action: Partial update**
  - Use cursor positioning to jump to first changed line
  - Write consecutive changed lines without repositioning
  - Minimal terminal writes

#### Case 2: Buffer grew (old.length < new.length)

New lines were added somewhere in the buffer.

**Step 1: Compare first old.length lines**
- Compare `oldBuffer[0..oldLength-1]` with `newBuffer[0..oldLength-1]`

**Sub-case 2a: First old.length lines identical**
- New lines are pure additions at bottom
- **Action: Append new lines**
  - Just output the new lines at the bottom
  - They push viewport down, old lines move into scrollback naturally

**Sub-case 2b: First old.length lines differ**
- Something changed or was inserted above
- Check if changes are above viewport or within viewport:
  - **Changes above viewport** → Full re-render
  - **Changes only within viewport** → Partial update of viewport + append new lines

#### Case 3: Buffer shrank (old.length > new.length)

Lines were removed from somewhere in the buffer.

**Action: Always full re-render**
- Terminal still has old lines displayed
- Need to overwrite/clear them
- Clear scrollback (CSI `3J`) and output all new buffer lines
- This "collapses" the display properly and guarantees scrollback reflects current state

Full re-render cycles are expensive and can cause visible flashes, so callers should debounce rapid sequences (e.g., tool output streaming) before asking the renderer to rebuild history.

### Optimizations

**Smart cursor positioning:**
- For consecutive changed lines, position cursor once at first line
- Write all consecutive lines without additional cursor moves
- Reduces escape sequence overhead

**Element-level caching:**
- Each UI element (message, status, editor, footer) maintains its own rendered line cache
- If element props haven't changed, return cached lines
- Avoids re-rendering unchanged content

**Special case: Streaming last message**
- Only the last message changes (appending content)
- Messages above are frozen
- Usually results in Case 2a (append new lines)
- Very efficient - just output new lines, no diffing needed

## Implementation Considerations

### What we need to track:

- Terminal height (for viewport size)
- Old buffer (all previously rendered lines)
- New buffer (current render output)
- Each UI element's cached rendered lines + dirty flags

### Terminal operations needed:

- Clear screen/scrollback
- Move cursor to position (row, col)
- Write text at cursor
- Get terminal size (detect resize)

### Edge cases:

- **Terminal resize** - always triggers full re-render with new dimensions
- **Empty buffer** - initial render is always full re-render
- **User scrolls terminal scrollback** - irrelevant, they're viewing frozen history
- **Multi-line wrapping** - elements must handle width constraints and emit proper line breaks

## Benefits of This Approach

1. **Minimal terminal writes** - only changed lines updated
2. **Natural scrollback** - uses terminal's native scrollback buffer
3. **Simple mental model** - render everything, diff, patch
4. **Handles all cases uniformly** - streaming, resizing, updates all use same logic
5. **Element encapsulation** - UI elements control their own rendering and caching
6. **No manual cursor math** - diff tells us exactly what to update
