# ai-drafter

## AI Drafter - Phase 1

This is the initial setup of the AI Drafter Figma plugin.

### What's Included:
- Figma plugin manifest
- Sidebar UI for prompt, image, and design token input
- Basic controller that connects UI and shows placeholder message
- Styled sidebar using basic CSS

Phase 2 will include OpenAI API integration and UI rendering in Figma.

## Phase 2 - Prompt to UI Generation

This phase adds:
- Integration with OpenAI's GPT-4o via fetch
- Prompt-based UI generation
- Structured layout JSON returned and rendered using Figma Plugin API

Example prompt: “Create a login screen for a health app”

## Phase 3 - Screenshot to UI Generation

Users can now upload screenshots (e.g. desktop UI) and generate a mobile layout from it using OpenAI GPT-4o Vision API.

### How it works:
- User uploads image + optional prompt
- Plugin sends image + text to GPT-4o Vision
- GPT returns layout in JSON
- JSON is rendered into editable components inside Figma

## Phase 4 - Design System & API Key

This phase allows:
- Users to securely enter their own OpenAI API Key (saved using Figma client storage)
- Optional design token input to customize generated UIs

Example design token JSON:
{
  "primaryColor": "#007BFF",
  "fontFamily": "Inter",
  "buttonRadius": "8px",
  "padding": "16px"
}

## Phase 5 - Live Preview & Component Reuse

This phase introduces:
- UI layout preview before insertion
- Auto-generation of Figma components for buttons, cards, headers
- Insert or regenerate options for better control

## Phase 6 - Auto Layout, Constraints, and Responsive Rules

This phase introduces:
- Native Figma auto layout support for all frames
- Smart constraints for resizable and adaptive UIs
- Standardized padding, spacing, and alignment

AI-generated designs now behave like hand-made components.

## Phase 7 - Multi-Screen UI & Flow Arrows

AI Drafter now supports:
- Generating multiple screens from one prompt
- Adding prototype flow arrows between them
- Naming and spacing screens automatically

## Phase 8 - Design System Integration

This phase adds:
- Support for mapping generated UI elements to existing Figma component libraries
- Optional toggle: “Use Existing Components”
- Fallback rendering if no match is found

You can now plug AI Drafter into your real design systems.

## Phase 9 - Component Variants and States

This phase introduces:
- AI-generated UI components now support states like hover, pressed, disabled
- Plugin maps states to appropriate Figma variants
- Falls back gracefully if no variant match is found

## Phase 10 - Manual Tweak UI Before Insertion

This phase allows:
- Inline editing of AI-generated layout (text, inclusion, order)
- Users now control exactly what gets inserted
- Boosts trust and flexibility for designers

## Phase 12 - History, Undo & Session Memory

- Keeps track of all generated layouts in the session
- Users can re-insert or export from history
- “Undo Last Insert” removes previously inserted nodes
- Improves iteration workflow and design feedback loops