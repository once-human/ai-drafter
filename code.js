// --- OpenAI API Key (placeholder, replace with env or settings in future) ---
const OPENAI_API_KEY = 'sk-...'; // TODO: Replace with your OpenAI API key

/**
 * Generate UI layout from prompt using OpenAI GPT-4o
 * @param {string} prompt
 * @returns {Promise<GeneratedUI>}
 */
async function generateUIFromPrompt(prompt) {
  const systemMessage = {
    role: 'system',
    content: `You are a UI layout generator. Return a minimal JSON structure for a Figma-like UI. Use only 'screen', 'frame', and 'text' types. Use 'layout' as 'vertical' or 'horizontal' for frames. Example:\n{\n  "type": "screen",\n  "name": "Generated Screen",\n  "components": [\n    {\n      "type": "frame",\n      "name": "Header",\n      "layout": "horizontal",\n      "items": [\n        {\n          "type": "text",\n          "value": "Welcome!",\n          "style": { "fontSize": 24, "fontWeight": "bold" }\n        }\n      ]\n    }\n  ]\n}`
  };
  const userMessage = { role: 'user', content: prompt };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [systemMessage, userMessage],
      temperature: 0.2,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    throw new Error('OpenAI API error: ' + response.status);
  }
  const data = await response.json();
  let jsonText = data.choices?.[0]?.message?.content;
  // Try to extract JSON if model returns markdown
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json|```/g, '').trim();
  }
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Invalid JSON from OpenAI');
  }
}

/**
 * Render the generated UI JSON in Figma
 * @param {GeneratedUI} ui
 */
async function renderUIInFigma(ui) {
  // Remove previous selection
  figma.currentPage.selection = [];
  // Start at (100, 100)
  const root = await createNodeFromComponent(ui, { x: 100, y: 100 });
  figma.currentPage.appendChild(root);
  figma.viewport.scrollAndZoomIntoView([root]);
  figma.currentPage.selection = [root];
}

/**
 * Recursively create Figma nodes from component JSON
 */
async function createNodeFromComponent(component, pos) {
  if (component.type === 'screen' || component.type === 'frame') {
    const frame = figma.createFrame();
    frame.name = component.name || 'Frame';
    frame.x = pos.x;
    frame.y = pos.y;
    frame.layoutMode = component.layout === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL';
    frame.counterAxisSizingMode = 'AUTO';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.paddingLeft = frame.paddingRight = frame.paddingTop = frame.paddingBottom = 24;
    frame.itemSpacing = 16;
    if (component.items || component.components) {
      const children = (component.items || component.components).map((child, i) =>
        createNodeFromComponent(child, { x: 0, y: 0 })
      );
      const nodes = await Promise.all(children);
      nodes.forEach(n => frame.appendChild(n));
    }
    return frame;
  } else if (component.type === 'text') {
    const text = figma.createText();
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    text.characters = component.value || '';
    if (component.style) {
      if (component.style.fontSize) text.fontSize = component.style.fontSize;
      if (component.style.fontWeight) text.fontName = { family: 'Inter', style: component.style.fontWeight === 'bold' ? 'Bold' : 'Regular' };
    }
    return text;
  } else {
    // Unknown type, skip
    return figma.createFrame();
  }
}

figma.showUI(__html__, { width: 360, height: 520 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate-ui') {
    const prompt = msg.prompt?.trim();
    if (!prompt) {
      figma.notify('Please enter a prompt.');
      return;
    }
    figma.ui.postMessage({ type: 'loading', loading: true });
    try {
      const ui = await generateUIFromPrompt(prompt);
      await renderUIInFigma(ui);
      figma.notify('UI generated!');
    } catch (e) {
      figma.notify('Error: ' + e.message);
    } finally {
      figma.ui.postMessage({ type: 'loading', loading: false });
    }
  }
}; 