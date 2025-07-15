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